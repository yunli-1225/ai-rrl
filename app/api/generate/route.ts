import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequestSchema, OptimizedResumeSchema } from '@/lib/schema';
import { SYSTEM_PROMPT_COMPRESSED, buildFullPrompt } from '@/lib/prompts';
import { retrieve, loadFromDisk } from '@/lib/rag';
import type { RAGContext } from '@/lib/rag';
import { callDeepSeek, callDeepSeekStream, validateEnvOrThrow } from '@/lib/ai/factory';
import { logger } from '@/lib/logger';
import { cache } from '@/lib/cache';
import { saveResume } from '@/lib/db';

const MODULE = 'Generate';
const PHASE2_TIMEOUT_MS = 60_000;
const PHASE2_MAIN_MAX_TOKENS = 2000;
const MAX_RETRIES = 1;
// 智能预提取
const EXTRACT_THRESHOLD = 5000;
const EXTRACT_MAX_TOKENS = 800;
const EXTRACT_TIMEOUT_MS = 30_000;

/**
 * 极端兜底：当 JSON 整体解析失败时，从原始 AI 文本中剥离 JSON 结构，
 * 提取可读中文正文段落，丢弃括号/引号/逗号等符号。
 */
function extractResumeFallback(raw: string): string {
  // 策略A：找 "优化后完整简历文本": "..." 并提取引号内的内容
  // 先把换行转为占位符再匹配（避免跨行问题）
  const flat = raw.replace(/\n/g, '\\n');
  const textMatch = flat.match(/"优化后完整简历文本"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (textMatch) {
    let content = textMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\r/g, '')
      .trim();
    if (content.length > 50) return content;
  }

  // 策略B：暴力删除所有 JSON 结构字符，只保留文本块
  let cleaned = raw
    // 删除括号（替换为换行分隔）
    .replace(/[{}[\]()]/g, '\n')
    // 删除 JSON key 模式 ("xxx":)
    .replace(/\s*"[^"]*"\s*:/g, '\n')
    // 删除剩余引号内容（保留中文文本）
    .replace(/\s*"[^"]*"\s*/g, ' ')
    // 清理残留引号
    .replace(/"/g, '')
    // 多余空白行
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  // 按行过滤，只保留含中文的行
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  const result: string[] = [];
  for (const line of lines) {
    // 跳过纯数字/null/true/false 行
    if (/^\d+[,.\s]*$/.test(line)) continue;
    if (/^(null|true|false)\s*[,.]?$/i.test(line)) continue;
    // 至少含一个中文字符
    if (/[一-鿿]/.test(line) && line.length > 3) {
      result.push(line);
    }
  }
  return result.join('\n');
}

validateEnvOrThrow();

function cleanLLMResponse(rawText: string): string {
  let text = rawText.trim();
  // 去掉 ```json / ``` / 代码块标记
  text = text.replace(/```json|```/g, '');

  // 策略1：括号深度匹配 — 从第一个 { 到匹配的 }
  const startIdx = text.indexOf('{');
  if (startIdx === -1) return '';

  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  if (endIdx !== -1) {
    const candidate = text.slice(startIdx, endIdx + 1);
    try {
      JSON.parse(candidate);
      return candidate; // 策略1 校验通过
    } catch { /* 括号匹配结果不是合法 JSON，继续策略2 */ }
  }

  // 策略2：用已知 JSON key 锚定起始位置
  const knownKeys = ['"简历标题"', '"基础信息"', '"优化后完整简历文本"'];
  for (const key of knownKeys) {
    const keyIdx = text.indexOf(key);
    if (keyIdx === -1) continue;
    // 从 key 往前找最近的 {
    const searchStart = Math.max(0, keyIdx - 200);
    const braceBefore = text.lastIndexOf('{', keyIdx);
    if (braceBefore === -1 || braceBefore < searchStart) continue;
    // 从这个 { 开始括号匹配
    let d = 0;
    for (let i = braceBefore; i < text.length; i++) {
      const ch = text[i];
      if (ch === '{') d++;
      else if (ch === '}') {
        d--;
        if (d === 0) {
          const candidate = text.slice(braceBefore, i + 1);
          try { JSON.parse(candidate); return candidate; } catch { /* 尝试下一个 key */ }
          break;
        }
      }
    }
  }

  // 策略3：找所有 { } 块，取最长的合法 JSON
  const blocks: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '{') continue;
    let d = 0;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '{') d++;
      else if (text[j] === '}') { d--; if (d === 0) { blocks.push(text.slice(i, j + 1)); break; } }
    }
  }
  if (blocks.length > 0) {
    // 按长度降序，取第一个能 parse 的
    blocks.sort((a, b) => b.length - a.length);
    for (const block of blocks) {
      try { JSON.parse(block); return block; } catch { /* continue */ }
    }
  }

  // 全部失败，返回原始提取（让调用方处理）
  return text.slice(startIdx, text.indexOf('}', startIdx) + 1);
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  const cleaned = cleanLLMResponse(raw);
  if (!cleaned) return null;
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getTemplateName(template: string): string {
  const names: Record<string, string> = {
    'zh-classic': '央国企经典版', 'zh-simple': '央国企简约版',
    'en-modern': '互联网现代版（双栏）', 'en-creative': '互联网创意版（双栏）',
  };
  return names[template] || template;
}

async function getRAGContext(jdText: string): Promise<RAGContext | undefined> {
  const cacheKey = `rag:${jdText.slice(0, 100)}`;
  const cached = cache.get<RAGContext>('rag', cacheKey);
  if (cached) { logger.info(MODULE, 'RAG 缓存命中'); return cached; }
  try {
    await loadFromDisk();
    const ctx = await retrieve(jdText);
    if (ctx.keywords.length > 0 || ctx.atsRules.length > 0 || ctx.relatedJdSnippets.length > 0) {
      logger.info(MODULE, `RAG 检索到 ${ctx.keywords.length} 个关键词, ${ctx.atsRules.length} 条ATS规则`);
      cache.set('rag', cacheKey, ctx, 300_000);
      return ctx;
    }
  } catch (err) { logger.warn(MODULE, 'RAG 检索失败', err); }
  return undefined;
}

async function callWithRetry(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeoutMs: number,
  phase: string,
  retries = MAX_RETRIES,
): Promise<{ content: string; tokens: number }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await callDeepSeek(messages, maxTokens, timeoutMs);
      const parsed = safeJsonParse(result.content);
      if (parsed && Object.keys(parsed).length > 0) return { content: result.content, tokens: result.tokens };
      logger.warn(MODULE, `${phase} 第${attempt + 1}次解析失败`);
    } catch (err: any) {
      if (attempt < retries) { logger.warn(MODULE, `${phase} 第${attempt + 1}次异常，重试...`); continue; }
      throw err;
    }
  }
  throw new Error('PARSE_FAILED');
}

const EXTRACT_SYSTEM = `你是一位简历素材精简专家。请将以下用户素材提取为结构化JSON，保留全部关键信息，去除冗余描述。

必须输出以下JSON结构（只输出一行纯JSON，不要任何注释或说明）：
{
  "个人信息": {"姓名":"","电话":"","邮箱":"","求职意向":"","Base地":"","到岗时间":"","实习月数":""},
  "技能清单": ["技能1","技能2"],
  "经历列表": [
    {"类型":"实习或项目","名称":"","角色":"","时间":"","关键成果":"保留全部数字和量化数据"}
  ]
}

约束：
1. 经历列表必须保留全部量化数据（数字、百分比、金额、时间等数字信息不得遗漏）
2. 技能清单严格去重、同类合并，按与JD岗位匹配度从高到低排序
3. 不改变语义，只做压缩提取，不添加素材中不存在的信息
4. 所有字段值从素材原文提取，禁止编造`;

async function smartPreExtract(rawDataStr: string, jdText: string): Promise<string | null> {
  const userPrompt = `用户素材数据：\n${rawDataStr}\n\n目标JD：\n${jdText}\n\n请提取结构化JSON。`;
  try {
    const result = await callDeepSeek(
      [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      EXTRACT_MAX_TOKENS,
      EXTRACT_TIMEOUT_MS,
    );
    const parsed = safeJsonParse(result.content);
    if (parsed && Object.keys(parsed).length > 0) {
      return JSON.stringify(parsed);
    }
    logger.warn(MODULE, '智能预提取解析失败，返回null');
    return null;
  } catch (err: any) {
    logger.warn(MODULE, '智能预提取异常', { error: err.message });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: '请求参数格式错误', details: parsed.error.flatten() }, { status: 400 });
    }

    const { userData, jdText, template } = parsed.data;
    const templateName = getTemplateName(template);
    const templateId = template;
    const phase = body.phase;
    const isStream = body.stream === true;
    const ragContext = await getRAGContext(jdText);
    // 透传个人信息扩展字段（Zod会剥离personal中非schema字段）
    const rawPersonal = body.userData?.personal || {};
    if (rawPersonal.求职意向) {
      (userData.personal as any).求职意向 = rawPersonal.求职意向;
    }
    if (rawPersonal.性别) {
      (userData.personal as any).性别 = rawPersonal.性别;
    }
    if (rawPersonal.实习月数) {
      (userData.personal as any).实习月数 = rawPersonal.实习月数;
    }
    // 压缩素材：description 截断前 5000 字，保留 rawResume
    const compressedUserData = {
      ...userData,
      rawResume: (userData.rawResume || '').slice(0, 10000),
      work: userData.work.map(w => ({ ...w, description: w.description.slice(0, 5000) })),
      projects: userData.projects.map(p => ({ ...p, description: p.description.slice(0, 5000) })),
      schoolActivities: userData.schoolActivities.map(s => ({ ...s, description: s.description.slice(0, 5000) })),
    };
    const userDataStr = JSON.stringify(compressedUserData);

    // ═══════════════════════════════════════════
    // 主流程 — 生成完整简历
    // ═══════════════════════════════════════════
    if (phase === 2 || phase === '2' || phase === 'full' || !phase) {
      const phase1Result = body.phase1Result;

      // ═══════════════════════════════════════════
      // 智能预提取：超过 5000 字符时先提取结构化信息
      // ═══════════════════════════════════════════
      let effectiveUserDataStr = userDataStr;
      if (userDataStr.length > EXTRACT_THRESHOLD) {
        logger.info(MODULE, `素材过长(${userDataStr.length}字符)，启动智能预提取`);
        const extracted = await smartPreExtract(userDataStr, jdText);
        if (extracted) {
          effectiveUserDataStr = extracted;
          logger.info(MODULE, `智能预提取完成，压缩至 ${extracted.length} 字符`);
        } else {
          logger.warn(MODULE, '智能预提取失败，使用原素材');
        }
      }

      if (isStream) {
        // ── 诊断日志：AI 调用前的数据链 ──
        console.log('=== 素材模块数据 ===', JSON.stringify({ work: compressedUserData.work, projects: compressedUserData.projects, skills: compressedUserData.skills, education: compressedUserData.education, personal: compressedUserData.personal }).slice(0, 500));
        console.log('=== PDF解析数据(rawResume) ===', JSON.stringify(userData.rawResume).slice(0, 500));
        console.log('=== 最终合并后数据(effectiveUserDataStr) ===', effectiveUserDataStr.slice(0, 800));
        // ── 结束诊断 ──
        logger.info(MODULE, 'Phase 2 流式模式开始');
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(streamController) {
            let fullStreamContent = '';
            try {
              await callDeepSeekStream(
                [{ role: 'system', content: SYSTEM_PROMPT_COMPRESSED }, { role: 'user', content: buildFullPrompt({ templateName, jdText, userDataJson: effectiveUserDataStr, phase1Result: JSON.stringify(phase1Result), ragContext, templateId, showEval: body.showEval, gender: rawPersonal.性别, internDuration: rawPersonal.实习月数 }) }],
                PHASE2_MAIN_MAX_TOKENS, PHASE2_TIMEOUT_MS,
                (chunk) => { fullStreamContent += chunk; streamController.enqueue(encoder.encode(JSON.stringify({ t: chunk }) + '\n')); },
              );

              const p2 = safeJsonParse(fullStreamContent);
              if (!p2) {
                logger.error(MODULE, '流式 AI 返回无法解析为 JSON');
                console.error('=== 流式 AI 原始输出(前500) ===', fullStreamContent.slice(0, 500));
                console.error('=== 流式 AI 原始输出(后200) ===', fullStreamContent.slice(-200));
              }
              const safeP2 = p2 || {}; // 防止 null 取值崩溃
              const p1 = typeof phase1Result === 'object' && phase1Result !== null ? phase1Result : {};
              const merged: Record<string, unknown> = {
                简历标题: String((p1 as any)['简历标题'] || (safeP2 as any)['简历标题'] || ''),
                基础信息: (p1 as any)['基础信息'] || {},
                教育经历: (p1 as any)['教育经历'] || [],
                专业技能标签: (p1 as any)['专业技能标签'] || [],
                岗位匹配评分: (p1 as any)['岗位匹配评分'] || { 总分: 0, 技能匹配分: 0, 行业经验分: 0 },
                实习项目经历: (safeP2 as any)['实习项目经历'] || (p1 as any)['实习项目经历'] || [],
                模块排序: (safeP2 as any)['模块排序'] || (p1 as any)['模块排序'] || [],
                优化后完整简历文本: String((safeP2 as any)['优化后完整简历文本'] || extractResumeFallback(fullStreamContent)),
              };
              const valid = OptimizedResumeSchema.safeParse(merged);
              console.log('=== 流式 validated.success ===', valid.success);
              console.log('=== 流式 validated.error ===', valid.error ? JSON.stringify(valid.error.issues) : 'null');
              const finalData = valid.success ? valid.data : merged;

              // 注入用户个人信息到基础信息（AI经常跳过此字段）
              if (!(finalData as any)['基础信息'] || Object.keys((finalData as any)['基础信息'] || {}).length === 0) {
                (finalData as any)['基础信息'] = {
                  '姓名': rawPersonal.name || rawPersonal['姓名'] || '',
                  '性别': rawPersonal.性别 || '',
                  '电话': rawPersonal.phone || rawPersonal['电话'] || '',
                  '邮箱': rawPersonal.email || rawPersonal['邮箱'] || '',
                  '求职意向': rawPersonal.求职意向 || '',
                  '实习月数': rawPersonal.实习月数 || '3',
                  '照片': rawPersonal.照片 || '',
                };
              }

              // 兜底：如果AI评分全为0，根据素材计算保底分
              if ((finalData as any).岗位匹配评分) {
                const s = (finalData as any).岗位匹配评分;
                if (s.总分 === 0 && s.技能匹配分 === 0 && s.行业经验分 === 0) {
                  const skillCount = (userData.skills?.length || 0) + (userData.certificates?.length || 0);
                  const workCount = userData.work?.length || 0;
                  const projectCount = userData.projects?.length || 0;
                  const hasJd = jdText && jdText.length > 20;
                  s.技能匹配分 = hasJd ? Math.min(100, skillCount * 12 + 20) : 70;
                  s.行业经验分 = hasJd ? Math.min(100, (workCount * 20 + projectCount * 10) + 20) : 60;
                  s.总分 = Math.round(s.技能匹配分 * 0.4 + 50 * 0.3 + s.行业经验分 * 0.3);
                }
              }

              try {
                const score = (finalData as any).岗位匹配评分;
                await saveResume({
                  resumeJson: JSON.stringify(finalData), jdText, template, userDataJson: effectiveUserDataStr,
                  title: (finalData as any).简历标题 || '未命名简历',
                  scoreTotal: score?.总分 || 0, scoreSkill: score?.技能匹配分 || 0, scoreExperience: score?.行业经验分 || 0,
                  modelPreference: 'deepseek', ragKeywords: ragContext?.keywords || [],
                });
              } catch { /* non-blocking */ }

              console.log('=== 流式模式最终数据 ===', JSON.stringify(finalData).slice(0, 800));

              streamController.enqueue(encoder.encode(JSON.stringify({ done: true, data: finalData }) + '\n'));
            } catch (err: any) {
              console.error('=== 流式模式异常 ===', err.message);
              console.error(err.stack);
              logger.error(MODULE, '流式模式异常', { error: err.message, stack: err.stack });
              streamController.enqueue(encoder.encode(JSON.stringify({ error: 'STREAM_FAILED', msg: err.message }) + '\n'));
            } finally {
              try { streamController.close(); } catch { /* already closed */ }
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Transfer-Encoding': 'chunked',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive',
          },
        });
      }

      // Non-stream fallback
      // ── 诊断日志：AI 调用前的数据链 ──
      console.log('=== 素材模块数据 ===', JSON.stringify({ work: compressedUserData.work, projects: compressedUserData.projects, skills: compressedUserData.skills, education: compressedUserData.education, personal: compressedUserData.personal }).slice(0, 500));
      console.log('=== PDF解析数据(rawResume) ===', JSON.stringify(userData.rawResume).slice(0, 500));
      console.log('=== 最终合并后数据(effectiveUserDataStr) ===', effectiveUserDataStr.slice(0, 800));
      // ── 结束诊断 ──
      const { content } = await callWithRetry(
        [{ role: 'system', content: SYSTEM_PROMPT_COMPRESSED }, { role: 'user', content: buildFullPrompt({ templateName, jdText, userDataJson: effectiveUserDataStr, phase1Result: JSON.stringify(phase1Result), ragContext, templateId, showEval: body.showEval, gender: rawPersonal.性别, internDuration: rawPersonal.实习月数 }) }],
        PHASE2_MAIN_MAX_TOKENS, PHASE2_TIMEOUT_MS, 'Phase2',
      );
      const phase2Parsed = safeJsonParse(content);
      if (!phase2Parsed) {
        console.error('=== 非流式 JSON 解析失败 ===');
        console.error('AI 原始输出(前300):', content.slice(0, 300));
        console.error('AI 原始输出(后200):', content.slice(-200));
        return NextResponse.json({ error: 'AI生成格式异常，JSON解析失败', code: 'PARSE_FAILED', rawPreview: content.slice(0, 200) }, { status: 422 });
      }
      const safePhase1 = typeof phase1Result === 'object' && phase1Result !== null ? phase1Result : {};
      const merged: Record<string, unknown> = {
        简历标题: String((safePhase1 as any)['简历标题'] || (phase2Parsed as any)['简历标题'] || ''),
        基础信息: (safePhase1 as any)['基础信息'] || {}, 教育经历: (safePhase1 as any)['教育经历'] || [],
        专业技能标签: (safePhase1 as any)['专业技能标签'] || [],
        岗位匹配评分: (safePhase1 as any)['岗位匹配评分'] || { 总分: 0, 技能匹配分: 0, 行业经验分: 0 },
        实习项目经历: (phase2Parsed as any)['实习项目经历'] || (safePhase1 as any)['实习项目经历'] || [],
        模块排序: (phase2Parsed as any)['模块排序'] || (safePhase1 as any)['模块排序'] || [],
        优化后完整简历文本: String((phase2Parsed as any)['优化后完整简历文本'] || (safePhase1 as any)['优化后完整简历文本'] || extractResumeFallback(content)),
      };
      console.log('=== 到达 validated 定义前 ===');
      const validated = OptimizedResumeSchema.safeParse(merged);
      console.log('=== validated.success ===', validated.success);
      console.log('=== validated.error ===', validated.error);
      if (!validated.success) {
        console.error('=== Zod 校验失败详情 ===');
        console.error(JSON.stringify(validated.error.issues, null, 2));
      }
      console.log('=== 已打印 validated.success ===');
              if (!validated.success) { logger.warn(MODULE, 'Phase 2 merge 校验失败，返回部分数据'); return NextResponse.json({ content: JSON.stringify(merged) }); }

      // 注入用户个人信息到基础信息（AI经常跳过此字段）
      if (!validated.data['基础信息'] || Object.keys(validated.data['基础信息'] || {}).length === 0) {
        (validated.data as any)['基础信息'] = {
          '姓名': rawPersonal.name || rawPersonal['姓名'] || '',
          '性别': rawPersonal.性别 || '',
          '电话': rawPersonal.phone || rawPersonal['电话'] || '',
          '邮箱': rawPersonal.email || rawPersonal['邮箱'] || '',
          '求职意向': rawPersonal.求职意向 || '',
          '实习月数': rawPersonal.实习月数 || '3',
          '照片': rawPersonal.照片 || '',
        };
      }

      // 兜底：如果AI评分全为0，根据素材计算保底分
      if (validated.data.岗位匹配评分) {
        const score = validated.data.岗位匹配评分;
        if (score.总分 === 0 && score.技能匹配分 === 0 && score.行业经验分 === 0) {
          const skillCount = (userData.skills?.length || 0) + (userData.certificates?.length || 0);
          const workCount = userData.work?.length || 0;
          const projectCount = userData.projects?.length || 0;
          const hasJd = jdText && jdText.length > 20;
          const skillScore = hasJd ? Math.min(100, skillCount * 12 + 20) : 70;
          const softScore = hasJd ? Math.min(100, (workCount + projectCount) * 15 + 20) : 65;
          const expScore = hasJd ? Math.min(100, (workCount * 20 + projectCount * 10) + 20) : 60;
          validated.data.岗位匹配评分 = {
            总分: Math.round(skillScore * 0.4 + softScore * 0.3 + expScore * 0.3),
            技能匹配分: skillScore,
            行业经验分: expScore,
          };
        }
      }

      try {
        const score = validated.data.岗位匹配评分;
        console.log('AI原始输出结构:', JSON.stringify(validated.data).slice(0, 500));
        await saveResume({ resumeJson: JSON.stringify(validated.data), jdText, template, userDataJson: effectiveUserDataStr, title: validated.data.简历标题 || '未命名简历', scoreTotal: score?.总分 || 0, scoreSkill: score?.技能匹配分 || 0, scoreExperience: score?.行业经验分 || 0, modelPreference: 'deepseek', ragKeywords: ragContext?.keywords || [], });
      } catch { /* non-blocking */ }
      return NextResponse.json({ content: JSON.stringify(validated.data) });
    }

    return NextResponse.json({ error: 'phase 参数无效' }, { status: 400 });
  } catch (err: any) {
    logger.error(MODULE, '处理异常', err);
    return NextResponse.json({ error: '服务器内部错误，请稍后重试' }, { status: 500 });
  }
}
