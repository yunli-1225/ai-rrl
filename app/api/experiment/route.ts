// export const runtime = "edge";
import { NextRequest, NextResponse } from 'next/server';
import { callDeepSeek, validateEnvOrThrow } from '@/lib/ai/factory';
import { logger } from '@/lib/logger';
import { retrieve, loadFromDisk } from '@/lib/rag';
import { buildBasicPrompt, buildFullPrompt, SYSTEM_PROMPT_BASIC, SYSTEM_PROMPT_FULL } from '@/lib/experiment/prompts';
import type { BuildPromptParams } from '@/lib/prompts';
import { CONTROL_SYSTEM_PROMPT, buildControlPrompt } from '@/lib/experiment/prompts';
import { saveExperimentRecord, listExperiments, clearExperiments, deleteExperiment, exportCSV } from '@/lib/experiment/db';
import type { ExperimentGroup, ExperimentMetrics, ExperimentSummary } from '@/lib/experiment/types';

const MODULE = 'Experiment';
const PHASE1_TIMEOUT_MS = 30_000;
const PHASE2_TIMEOUT_MS = 60_000;
const PHASE1_MAX_TOKENS = 1024;
const PHASE2_MAX_TOKENS = 4096;
const CONTROL_MAX_TOKENS = 4096;

validateEnvOrThrow();

function cleanLLMResponse(rawText: string): string {
  let text = rawText.trim();
  text = text.replace(/```json|```/g, '');
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return '';
  return text.slice(startIdx, endIdx + 1);
}

function computeMetrics(records: { score_total: number; has_error: boolean; error_type: string; latency_ms: number; token_count: number; rag_keyword_hits: number }[]): { n: number; error_rate: number; score_mean: number; score_variance: number; score_std: number; latency_mean: number; token_mean: number; rag_hit_mean: number; scores: number[]; errors: string[] } {
  if (records.length === 0) {
    return { n: 0, error_rate: 0, score_mean: 0, score_variance: 0, score_std: 0, latency_mean: 0, token_mean: 0, rag_hit_mean: 0, scores: [], errors: [] };
  }
  const scores = records.filter(r => !r.has_error).map(r => r.score_total);
  const n = records.length;
  const errorCount = records.filter(r => r.has_error).length;
  const error_rate = errorCount / n;
  const score_mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const score_variance = scores.length > 0 ? scores.map(s => (s - score_mean) ** 2).reduce((a, b) => a + b, 0) / scores.length : 0;
  const score_std = Math.sqrt(score_variance);
  const latency_mean = records.reduce((a, b) => a + b.latency_ms, 0) / n;
  const token_mean = records.reduce((a, b) => a + b.token_count, 0) / n;
  const rag_hit_mean = records.filter(r => !r.has_error).reduce((a, b) => a + b.rag_keyword_hits, 0) / Math.max(1, scores.length);
  const errors = records.filter(r => r.has_error).map(r => r.error_type).filter(Boolean);
  return { n, error_rate, score_mean, score_variance, score_std, latency_mean, token_mean, rag_hit_mean, scores, errors };
}

async function runSingleRound(
  round: number,
  group: ExperimentGroup,
  promptParams: BuildPromptParams,
  userDataStr: string,
  jdText: string,
  templateName: string,
): Promise<{ record: Omit<import('@/lib/experiment/types').ExperimentRecord, 'id' | 'created_at'>, output: string }> {
  const startTime = Date.now();
  const model = 'deepseek';

  try {
    if (group === 'control') {
      const result = await callDeepSeek(
        [
          { role: 'system', content: CONTROL_SYSTEM_PROMPT },
          { role: 'user', content: buildControlPrompt(promptParams) + '\n请输出JSON格式简历。' },
        ],
        CONTROL_MAX_TOKENS,
        PHASE2_TIMEOUT_MS,
      );

      const output = result.content;
      const elapsed = Date.now() - startTime;
      const tokens = result.tokens;
      let has_error = true;
      let error_type = '';
      let title = '';
      let score_total = 0, score_skill = 0, score_experience = 0;

      try {
        const cleaned = cleanLLMResponse(output);
        if (!cleaned) throw new Error('empty');
        const parsed = JSON.parse(cleaned);
        if (parsed?.['岗位匹配评分']?.总分 !== undefined) {
          score_total = parsed['岗位匹配评分'].总分;
          score_skill = parsed['岗位匹配评分'].技能匹配分 || 0;
          score_experience = parsed['岗位匹配评分'].行业经验分 || 0;
        }
        title = parsed?.['简历标题'] || '';
        if (!title) throw new Error('no title');
        has_error = false;
      } catch (e: any) {
        has_error = true;
        error_type = e.message?.slice(0, 50) || 'parse_failed';
        score_total = 0;
      }

      return {
        record: { group, model, round, title, raw_output: output.slice(0, 500), score_total, score_skill, score_experience, has_error, error_type, latency_ms: elapsed, token_count: tokens, rag_keyword_hits: promptParams.ragContext?.keywords?.length || 0 },
        output,
      };
    } else {
      const ragContext = promptParams.ragContext;

      const p1 = await callDeepSeek(
        [{ role: 'system', content: SYSTEM_PROMPT_BASIC }, { role: 'user', content: buildBasicPrompt(promptParams) }],
        PHASE1_MAX_TOKENS, PHASE1_TIMEOUT_MS,
      );

      const p1Tokens = p1.tokens;
      let phase1Result: Record<string, unknown> = {};

      try {
        const cleaned = cleanLLMResponse(p1.content);
        phase1Result = JSON.parse(cleaned);
      } catch {
        phase1Result = {};
      }

      const p2 = await callDeepSeek(
        [
          { role: 'system', content: SYSTEM_PROMPT_FULL },
          { role: 'user', content: `模板: ${templateName}\n职位描述: ${jdText}\n用户素材: ${userDataStr}\n初步分析结果（请保持以下字段不变）:\n${JSON.stringify(phase1Result)}\n请根据以上信息，生成STAR格式的实习项目经历和完整优化简历文本。` },
        ],
        PHASE2_MAX_TOKENS, PHASE2_TIMEOUT_MS,
      );

      const elapsed = Date.now() - startTime;
      const tokens = p1Tokens + p2.tokens;
      const output = p2.content;
      let has_error = true;
      let error_type = '';
      let title = '';
      let score_total = 0, score_skill = 0, score_experience = 0;

      try {
        const cleaned = cleanLLMResponse(output);
        if (!cleaned) throw new Error('empty after clean');
        const parsed = JSON.parse(cleaned);
        if (parsed?.['岗位匹配评分']?.总分 !== undefined) {
          score_total = parsed['岗位匹配评分'].总分;
          score_skill = parsed['岗位匹配评分'].技能匹配分 || 0;
          score_experience = parsed['岗位匹配评分'].行业经验分 || 0;
        }
        title = parsed?.['简历标题'] || '';
        has_error = false;
      } catch (e: any) {
        has_error = true;
        error_type = e.message?.slice(0, 50) || 'parse_failed';
      }

      return {
        record: { group, model, round, title, raw_output: output.slice(0, 500), score_total, score_skill, score_experience, has_error, error_type, latency_ms: elapsed, token_count: tokens, rag_keyword_hits: ragContext?.keywords?.length || 0 },
        output,
      };
    }
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    logger.error(MODULE, `round=${round} ${group} 异常`, err.message);
    return {
      record: { group, model, round, title: '', raw_output: '', score_total: 0, score_skill: 0, score_experience: 0, has_error: true, error_type: err.message?.slice(0, 50) || 'exception', latency_ms: elapsed, token_count: 0, rag_keyword_hits: 0 },
      output: '',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rounds = Math.min(Math.max(1, body.rounds || 3), 20);
    const { userData, jdText, template } = body;
    const templateName = (() => {
      const names: Record<string, string> = { 'zh-classic': '央国企经典版', 'zh-simple': '央国企简约版', 'en-modern': '互联网现代版（双栏）', 'en-creative': '互联网创意版（双栏）' };
      return names[template] || template;
    })();

    await loadFromDisk();
    const ragContext = await retrieve(jdText);
    const promptParams: BuildPromptParams = { templateName, jdText, userDataJson: JSON.stringify(userData), ragContext, templateId: template };
    const userDataStr = JSON.stringify(userData);

    logger.info(MODULE, `消融实验开始 rounds=${rounds}`);

    const savedIds: number[] = [];

    for (let r = 1; r <= rounds; r++) {
      logger.info(MODULE, `Round ${r}/${rounds} 开始`);

      const [ctrlRes, exprRes] = await Promise.all([
        runSingleRound(r, 'control', promptParams, userDataStr, jdText, templateName),
        runSingleRound(r, 'experiment', promptParams, userDataStr, jdText, templateName),
      ]);

      const ctrlId = await saveExperimentRecord(ctrlRes.record);
      const exprId = await saveExperimentRecord(exprRes.record);
      if (ctrlId > 0) savedIds.push(ctrlId);
      if (exprId > 0) savedIds.push(exprId);

      logger.info(MODULE, `Round ${r}/${rounds} 完成`, {
        control: { score: ctrlRes.record.score_total, error: ctrlRes.record.has_error, latency: ctrlRes.record.latency_ms },
        experiment: { score: exprRes.record.score_total, error: exprRes.record.has_error, latency: exprRes.record.latency_ms },
      });
    }

    const allRecords = await (await import('@/lib/experiment/db')).listExperiments(10000);
    const all = allRecords.filter(r => savedIds.includes(r.id));
    const controlRecords = all.filter(r => r.group === 'control');
    const experimentRecords = all.filter(r => r.group === 'experiment');
    const ctrlMetrics = computeMetrics(controlRecords);
    const exprMetrics = computeMetrics(experimentRecords);

    let conclusion = '';
    if (ctrlMetrics.n > 0 && exprMetrics.n > 0) {
      const errImprove = ((ctrlMetrics.error_rate - exprMetrics.error_rate) * 100).toFixed(1);
      const scoreImprove = (exprMetrics.score_mean - ctrlMetrics.score_mean).toFixed(1);
      const stdImprove = ((ctrlMetrics.score_std - exprMetrics.score_std) / Math.max(ctrlMetrics.score_std, 0.01) * 100).toFixed(1);
      conclusion = `实验结论：实验组（链式Prompt+JSON强校验）相比对照组（极简无清洗Prompt）：`
        + `报错率降低 ${errImprove} 个百分点（${(ctrlMetrics.error_rate * 100).toFixed(1)}% → ${(exprMetrics.error_rate * 100).toFixed(1)}%）；`
        + `平均匹配得分提升 ${scoreImprove} 分（${ctrlMetrics.score_mean.toFixed(1)} → ${exprMetrics.score_mean.toFixed(1)}）；`
        + `评分标准差降低 ${stdImprove}%（${ctrlMetrics.score_std.toFixed(2)} → ${exprMetrics.score_std.toFixed(2)}）。`;
    } else {
      conclusion = '实验数据不足，无法生成对比结论。请增加轮次后重试。';
    }

    const summary: ExperimentSummary = {
      totalRounds: rounds,
      metrics: [
        { ...ctrlMetrics, group: 'control', model: 'deepseek' as const },
        { ...exprMetrics, group: 'experiment', model: 'deepseek' as const },
      ],
      conclusion,
    };

    logger.info(MODULE, `消融实验完成`, { rounds, control: { n: ctrlMetrics.n, errorRate: ctrlMetrics.error_rate, scoreMean: ctrlMetrics.score_mean }, experiment: { n: exprMetrics.n, errorRate: exprMetrics.error_rate, scoreMean: exprMetrics.score_mean } });

    return NextResponse.json({ ok: true, summary, savedIds });
  } catch (err: any) {
    logger.error(MODULE, '实验异常', err);
    return NextResponse.json({ error: err.message || '实验运行失败' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allRecords = await listExperiments(10000);
    const groups = ['control', 'experiment'] as const;
    const metrics: ExperimentMetrics[] = [];
    for (const g of groups) {
      const recs = allRecords.filter(r => r.group === g && r.model === 'deepseek');
      if (recs.length > 0) {
        metrics.push({ ...computeMetrics(recs), group: g, model: 'deepseek' as const });
      }
    }

    let conclusion = '';
    const ctrlM = metrics.find(m => m.group === 'control');
    const exprM = metrics.find(m => m.group === 'experiment');
    if (ctrlM && exprM && ctrlM.n > 0 && exprM.n > 0) {
      conclusion = `实验结论：报错率 ${(ctrlM.error_rate * 100).toFixed(1)}% → ${(exprM.error_rate * 100).toFixed(1)}%；评分均值 ${ctrlM.score_mean.toFixed(1)} → ${exprM.score_mean.toFixed(1)}；标准差 ${ctrlM.score_std.toFixed(2)} → ${exprM.score_std.toFixed(2)}。`;
    }

    return NextResponse.json({ ok: true, totalRecords: allRecords.length, metrics, conclusion });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get('id');
    const clear = searchParams.get('clear');
    if (clear === 'true') { await clearExperiments(); return NextResponse.json({ ok: true, action: 'cleared' }); }
    if (idParam) {
      const id = parseInt(idParam, 10);
      if (isNaN(id)) return NextResponse.json({ error: '无效id' }, { status: 400 });
      const ok = await deleteExperiment(id);
      if (!ok) return NextResponse.json({ error: '未找到' }, { status: 404 });
      return NextResponse.json({ ok: true, id });
    }
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
