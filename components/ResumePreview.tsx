'use client';

import { useMemo, useState, useEffect } from 'react';
import type { OptimizedResume } from '@/lib/schema';
import type { TemplateType } from '@/lib/schema';
import { getTemplateById } from '@/lib/templates';

// ===== 5 分区解析与渲染辅助函数 =====

/** 中文标题 → 模块标识符映射（必须与 prompt 中完全一致） */
const SECTION_HEADERS: Record<string, string> = {
  '专业技能': 'skills',
  '实习/工作经历': 'work',
  '实习经历': 'work',
  '工作经历': 'work',
  '项目经历': 'project',
  '项目经验': 'project',
  '教育经历': 'education',
  '教育背景': 'education',
  '教育': 'education',
  '学校经历': 'education',
  '个人评价': 'evaluation',
  '自我评价': 'evaluation',
  '个人总结': 'evaluation',
};

/** 模块标识符 → 中文标题 */
const MODULE_TITLES: Record<string, string> = {
  skills: '专业技能',
  work: '实习/工作经历',
  project: '项目经历',
  education: '教育经历',
  evaluation: '个人评价',
};

/** 模块排序默认值（AI 未提供时使用） */
const DEFAULT_MODULE_ORDER = ['skills', 'work', 'project', 'education', 'evaluation'];

/** 高亮 <!keyword> 和 **keyword** 标记转换，清除残留标记，对数字/百分比二次兜底加粗，转义换行符 */
function fmt(line: string): string {
  return line
    .replace(/<!([^>]+?)>/g, '<strong>$1</strong>')
    .replace(/!>/g, '')
    .replace(/<!加粗>/g, '')
    .replace(/<![一-鿿]+>/g, '')
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(\d+(?:\.\d+)?%?)/g, (m) => {
      if (m.length > 0 && /^\d/.test(m)) return `<b>${m}</b>`;
      return m;
    });
}

/** 将文本中的 \n 转义符替换为 <br> 换行标签，还原转义符 */
function normalizeLineBreaks(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ');
}

/**
 * 从优化后完整简历文本中按中文标题提取 5 个模块的内容。
 * 用 indexOf 定位标题位置，提取相邻标题之间的文本段。
 */
function parseResumeSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const headerPositions: { header: string; moduleKey: string; pos: number }[] = [];

  for (const [header, moduleKey] of Object.entries(SECTION_HEADERS)) {
    const idx = text.indexOf(header);
    if (idx !== -1) {
      headerPositions.push({ header, moduleKey, pos: idx });
    }
  }

  headerPositions.sort((a, b) => a.pos - b.pos);

  // 诊断：打印找到的模块标题
  if (headerPositions.length > 0) {
    console.log('=== parseResumeSections 找到的模块 ===', headerPositions.map(h => h.header).join(', '));
  } else {
    console.error('=== parseResumeSections 未找到任何模块标题 ===');
    console.error('文本前200字:', text.slice(0, 200));
  }
  // 如果未找到任何标题但文本不为空，将整个文本作为"专业技能"内容
  if (headerPositions.length === 0 && text.trim().length > 50) {
    console.warn('=== parseResumeSections 使用兜底：整段文本作为专业技能 ===');
    headerPositions.push({ header: '专业技能', moduleKey: 'skills', pos: 0 });
  }

  for (let i = 0; i < headerPositions.length; i++) {
    const cur = headerPositions[i];
    const contentStart = cur.pos + cur.header.length;
    const contentEnd = i + 1 < headerPositions.length
      ? headerPositions[i + 1].pos
      : text.length;
    let content = text.slice(contentStart, contentEnd).trim();
    // 去掉标题行后的冒号/换行前导
    content = content.replace(/^[：:]\s*\n?\s*/, '').trim();
    sections.set(cur.moduleKey, content);
  }

  return sections;
}

/**
 * 将模块内容渲染为 HTML。
 * - 经历标题行（含 | 分隔） → exp-entry > exp-header（名称加粗左 + 时间右）
 * - 圆点行 → exp-entry > ul > li
 * - 无圆点行 → 每行 p
 * 每个经历条目整体包裹 exp-entry，条目间自动留空
 */
function renderBulletContent(text: string): string {
  if (!text.trim()) return '';

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const hasBullets = lines.some(l => l.startsWith('•'));

  if (hasBullets) {
    let html = '';
    let inList = false;
    let inEntry = false;

    for (const line of lines) {
      if (line.startsWith('•')) {
        if (!inList) { html += '<ul class="resume-bullet-list">\n'; inList = true; }
        html += `  <li>${fmt(line.replace(/^•\s*/, ''))}</li>\n`;
      } else {
        // 关闭上个条目的列表和容器
        if (inList) { html += '</ul>\n'; inList = false; }
        if (inEntry) { html += '</div>\n'; inEntry = false; }

        // 新条目开始：用 | 拆分为左名(加粗) | 时间(右对齐不加粗)
        const pipeIdx = line.lastIndexOf('|');
        if (pipeIdx > 0) {
          const left = line.slice(0, pipeIdx).trim();
          const right = line.slice(pipeIdx + 1).trim();
          // 时间不经过 fmt（fmt 会给数字加 <b>，导致时间数字加粗）
          html += `<div class="exp-entry">\n  <div class="exp-header"><span class="exp-name">${fmt(left)}</span><span class="exp-date">${right}</span></div>\n`;
          inEntry = true;
        } else {
          const yearMatch = line.match(/^(.+?)\s{1,3}(\d{4}[\s.-]*\d{0,2}[\s.-]*\d{0,2}.*)$/);
          if (yearMatch && yearMatch[1].trim()) {
            html += `<div class="exp-entry">\n  <div class="exp-header"><span class="exp-name">${fmt(yearMatch[1].trim())}</span><span class="exp-date">${yearMatch[2].trim()}</span></div>\n`;
            inEntry = true;
          } else {
            html += `<div class="exp-entry">\n  <div class="exp-header exp-name">${fmt(line)}</div>\n`;
            inEntry = true;
          }
        }
      }
    }
    if (inList) html += '</ul>\n';
    if (inEntry) html += '</div>\n';
    return html;
  }

  return lines.map(l => `<p>${fmt(l)}</p>`).join('\n');
}

interface Props {
  result: OptimizedResume | null;
  templateId?: TemplateType;
}

export default function ResumePreview({ result, templateId }: Props) {
  const [showEval, setShowEval] = useState(false);
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());
  const [userOrder, setUserOrder] = useState<string[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const tpl = templateId ? getTemplateById(templateId) : null;

  // 新生成简历时重置开关和排序
  useEffect(() => {
    setHiddenModules(new Set());
    setUserOrder(null);
  }, [result]);

  const toggleModule = (key: string) => {
    setHiddenModules(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const effectiveOrder = userOrder ?? (
    result?.模块排序 && result.模块排序.length >= 5 ? result.模块排序 : DEFAULT_MODULE_ORDER
  );

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...effectiveOrder];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setUserOrder(reordered);
    setDragIdx(idx);
  };
  const handleDragEnd = () => { setDragIdx(null); };

  const html = useMemo(() => {
    if (!result) return '';

    const fullText = (result.优化后完整简历文本 || '').replace(/！/g, '');
    const resumeData = result.基础信息 || {};
    const sections = parseResumeSections(fullText);

    // 从素材 personal 模块读取头部字段，不依赖 AI 输出
    const name = resumeData['姓名'] || '';
    const gender = resumeData['性别'] || '';
    const phone = resumeData['电话'] || '';
    const email = resumeData['邮箱'] || '';
    const target = resumeData['求职意向'] || '';
    const month = resumeData['实习月数'] || '3';
    const photoUrl = resumeData['照片'] || '';

    const renderSection = (key: string): string => {
      if (key === 'evaluation' && !showEval && tpl?.layout !== 'single') return '';
      if (hiddenModules.has(key)) return '';
      const content = sections.get(key);
      if (!content || !content.trim()) return '';
      // 先还原 \n 转义符，再传入渲染
      return `<div class="resume-section"><h2>${MODULE_TITLES[key] || key}</h2><div class="section-body">${renderBulletContent(normalizeLineBreaks(content))}</div></div>`;
    };

    // 简历头部：固定三行 + 右侧照片 100x130px
    const renderPersonalInfo = () => {
      const line1 = fmt(name);
      const line2 = fmt([gender, phone, email].filter(Boolean).join(' | '));
      const line3 = fmt('求职意向：' + target + ' | 立即到岗 | 可实习' + month + '个月');
      const photoHtml = photoUrl
        ? `<img src="${photoUrl}" alt="证件照" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`
        : '';
      return `<div class="resume-header-personal">
        <div class="header-info">
          <div class="header-line-1">${line1}</div>
          <div class="header-line-2">${line2}</div>
          <div class="header-line-3">${line3}</div>
        </div>
        <div class="header-photo-right">${photoHtml}</div>
      </div>`;
    };

    let body = renderPersonalInfo();
    for (const key of effectiveOrder) {
      body += renderSection(key);
    }

    // 单栏兜底：如果AI未输出评价模块但用户有自我评价数据，生成默认评价
    if (tpl?.layout === 'single' && !sections.get('evaluation')?.trim()) {
      const evalText = (resumeData['自我评价'] || result.教育经历?.[0]?.学校 || '');
      if (evalText) {
        sections.set('evaluation', evalText);
        body += renderSection('evaluation');
      }
    }

    // ═══════════════════════════════════════
    // 双栏排版：左窄栏（照片/姓名/个人简介/自我评价）+ 右宽栏（教育/工作/项目/技能）
    // ═══════════════════════════════════════
    if (tpl?.layout === 'double') {
      // 左侧栏：头像+姓名+求职意向
      const photoHtml = photoUrl
        ? `<img src="${photoUrl}" alt="证件照" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`
        : '';
      let sidebar = `<div class="sidebar">
        <div class="sidebar-photo">${photoHtml}</div>
        <div class="sidebar-name">${fmt(name)}</div>
        <div class="sidebar-title">${fmt(target)}</div>`;

      // 个人简介
      const degree = result.教育经历?.[0]?.学历 || '';
      const baseCity = resumeData['Base地'] || resumeData['base'] || '';
      const hometown = resumeData['籍贯'] || '';
      sidebar += `<div class="sidebar-section">
        <h2>个人简介</h2>
        <div class="sidebar-body">`;
      if (hometown) sidebar += `<div class="info-row">籍贯：${fmt(hometown)}</div>`;
      if (degree) sidebar += `<div class="info-row">学历：${fmt(degree)}</div>`;
      sidebar += `<div class="info-row">手机：${fmt(phone)}</div>`;
      sidebar += `<div class="info-row">邮箱：${fmt(email)}</div>`;
      if (baseCity) sidebar += `<div class="info-row">Base：${fmt(baseCity)}</div>`;
      sidebar += `</div></div>`;

      // 自我评价
      const evalContent = sections.get('evaluation');
      if (evalContent && evalContent.trim()) {
        sidebar += `<div class="sidebar-section">
          <h2>自我评价</h2>
          <div class="sidebar-body">${renderBulletContent(normalizeLineBreaks(evalContent))}</div>
        </div>`;
      }
      sidebar += `</div>`; // close sidebar

      // 右侧主栏：教育/工作/项目/技能（固定顺序）
      const mainKeys = ['education', 'work', 'project', 'skills'];
      let mainHtml = '<div class="main">';
      for (const key of mainKeys) {
        const sectionHtml = renderSection(key);
        if (sectionHtml) mainHtml += sectionHtml;
      }
      mainHtml += '</div>';

      body = `<div class="double-wrap">${sidebar}${mainHtml}</div>`;
    }

    return body;
  }, [result, templateId, showEval, tpl, effectiveOrder, hiddenModules]);

  if (!result) {
    return (
      <div className="resume-preview-wrapper">
        <div className="resume-preview-area" data-placeholder="简历将在这里生成..." />
      </div>
    );
  }

  return (
    <div className="resume-preview-wrapper">
      {tpl && <style>{tpl.getStyle()}</style>}
      <div className="resume-a4-wrap">
        <div className="resume-a4-page">
          <div className={`resume-preview-area resume-${templateId || 'zh-classic'}`} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <div className="resume-controls">
        <label className="eval-toggle">
          <input type="checkbox" checked={showEval} onChange={e => setShowEval(e.target.checked)} />
          <span>展示个人评价</span>
        </label>
        <div className="module-controls">
          {effectiveOrder.map((key, idx) => {
            const label = (MODULE_TITLES[key] || key).replace(/[／/]/g, '/');
            const hidden = hiddenModules.has(key);
            return (
              <div
                key={key}
                className={`module-chip${hidden ? ' hidden' : ''}${dragIdx === idx ? ' dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onClick={() => toggleModule(key)}
                title="拖拽排序 · 点击开关"
              >
                <span className="chip-drag">⠿</span>
                <span className="chip-label">{label}</span>
                <span className="chip-toggle">{hidden ? '👁‍🗨' : '✓'}</span>
              </div>
            );
          })}
        </div>
        <span className="a4-badge">📄 单页 A4 · 自适应排序 · {tpl?.layout === 'double' ? '双栏' : '单栏'}版式</span>
      </div>
      <style jsx>{`
        .resume-a4-wrap { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-width: 100%; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .resume-a4-page { width: 210mm; min-height: 297mm; padding: 8mm 10mm; margin: 0 auto; overflow-wrap: break-word; background: #fff; box-sizing: border-box; }
        .resume-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; padding: 6px 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
        .eval-toggle { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; cursor: pointer; color: #475569; }
        .eval-toggle input { width: 16px; height: 16px; cursor: pointer; }
        .a4-badge { margin-left: auto; font-size: 0.72rem; color: #94a3b8; white-space: nowrap; }
        /* 模块控制条 */
        .module-controls { display: flex; flex-wrap: wrap; gap: 4px; width: 100%; order: 10; }
        .module-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; cursor: grab; user-select: none; border: 1px solid #cbd5e1; background: #fff; transition: all 0.15s; }
        .module-chip:hover { border-color: #94a3b8; background: #f1f5f9; }
        .module-chip.hidden { opacity: 0.45; border-style: dashed; }
        .module-chip.dragging { opacity: 0.5; transform: scale(0.95); }
        .chip-drag { color: #94a3b8; font-size: 0.65rem; }
        .chip-label { color: #334155; }
        .chip-toggle { font-size: 0.6rem; margin-left: 2px; }
        /* 简历头部：固定三行 + 右侧照片 100x130px */
        :global(.resume-header-personal) { display: flex; align-items: center; justify-content: center; font-weight: bold; padding: 10px 0; border-bottom: 2px solid #1e293b; margin-bottom: 12px; text-align: center; gap: 16px; }
        :global(.header-photo-right) { width: 100px; height: 130px; display: flex; align-items: center; justify-content: center; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; flex-shrink: 0; }
        :global(.header-info) { }
        :global(.header-line-1) { font-size: 20px; color: #0f172a; font-weight: 700; }
        :global(.header-line-2) { font-size: 0.82rem; color: #1e293b; margin: 2px 0; }
        :global(.header-line-3) { font-size: 0.9rem; color: #0f172a; font-weight: 600; }
        /* 经历条目：左名加粗 + 右时间右对齐 */
        :global(.exp-entry) { margin-bottom: 14px; }
        :global(.exp-entry:last-child) { margin-bottom: 0; }
        :global(.exp-header) { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
        :global(.exp-name) { font-weight: bold !important; color: #0f172a; flex: 1; }
        :global(.exp-date) { text-align: right; color: #64748b; font-size: 0.85em; white-space: nowrap; font-weight: normal !important; flex-shrink: 0; }
        /* 圆点列表 — 标准 disc + inside 定位，统一行高 */
        :global(ul.resume-bullet-list) { list-style: disc; list-style-position: inside; padding-left: 0.5em; margin: 4px 0 8px 0; }
        :global(ul.resume-bullet-list li) { margin-bottom: 3px; line-height: 1.75; color: #1e293b; word-break: break-word; overflow-wrap: break-word; }
        :global(.resume-section) { margin-bottom: 12px !important; }
        :global(.section-body) { word-break: break-word; overflow-wrap: break-word; }
        /* 超长文本自动截断+省略号 */
        :global(.resume-preview-area) { overflow-x: hidden; }
        :global(.resume-section h2) { font-size: 0.95rem; font-weight: 700; padding-top: 10px; border-top: 4px solid #000 !important; margin: 16px 0 !important; }
        /* 单栏无衬线字体 */
        :global(.resume-preview-area) { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', sans-serif; }
        :global(.resume-preview-area strong), :global(.resume-preview-area b) { font-weight: 700; color: #0f172a; }
      `}</style>
    </div>
  );
}

export function getResumePlainText(result: OptimizedResume): string {
  return result.优化后完整简历文本;
}

export function getResumeHTML(result: OptimizedResume, templateId?: TemplateType): string {
  const rawText = result.优化后完整简历文本 || '';
  const fullText = rawText.replace(/！/g, '');
  const sections = parseResumeSections(fullText);
  const resumeData = result.基础信息 || {};
  const tpl = templateId ? getTemplateById(templateId) : null;
  const css = tpl?.getStyle() || '';

  // 从素材 personal 模块读取头部字段
  const name = resumeData['姓名'] || '';
  const gender = resumeData['性别'] || '';
  const phone = resumeData['电话'] || '';
  const email = resumeData['邮箱'] || '';
  const target = resumeData['求职意向'] || '';
  const month = resumeData['实习月数'] || '3';
  const photoUrl = resumeData['照片'] || '';

  const renderSection = (key: string): string => {
    if (key === 'evaluation') return '';
    const content = sections.get(key);
    if (!content || !content.trim()) return '';
    return `<div class="resume-section"><h2>${MODULE_TITLES[key] || key}</h2><div class="section-body">${renderBulletContent(normalizeLineBreaks(content))}</div></div>`;
  };

  const photoHtml = photoUrl
    ? `<img src="${photoUrl}" alt="证件照" style="width:100%;height:100%;object-fit:cover;border-radius:4px;" />`
    : '';

  let bodyHtml: string;

  if (tpl?.layout === 'double') {
    // 双栏
    let sidebar = `<div class="sidebar">
      <div class="sidebar-photo">${photoHtml}</div>
      <div class="sidebar-name">${fmt(name)}</div>
      <div class="sidebar-title">${fmt(target)}</div>`;

    const degree = result.教育经历?.[0]?.学历 || '';
    const baseCity = resumeData['Base地'] || resumeData['base'] || '';
    const hometown = resumeData['籍贯'] || '';

    sidebar += `<div class="sidebar-section">
      <h2>个人简介</h2>
      <div class="sidebar-body">`;
    if (hometown) sidebar += `<div class="info-row">籍贯：${fmt(hometown)}</div>`;
    if (degree) sidebar += `<div class="info-row">学历：${fmt(degree)}</div>`;
    sidebar += `<div class="info-row">手机：${fmt(phone)}</div>`;
    sidebar += `<div class="info-row">邮箱：${fmt(email)}</div>`;
    if (baseCity) sidebar += `<div class="info-row">Base：${fmt(baseCity)}</div>`;
    sidebar += `</div></div>`;

    const evalContent = sections.get('evaluation');
    if (evalContent && evalContent.trim()) {
      sidebar += `<div class="sidebar-section">
        <h2>自我评价</h2>
        <div class="sidebar-body">${renderBulletContent(normalizeLineBreaks(evalContent))}</div>
      </div>`;
    }
    sidebar += `</div>`;

    let mainHtml = '<div class="main">';
    for (const key of ['education', 'work', 'project', 'skills']) {
      const sectionHtml = renderSection(key);
      if (sectionHtml) mainHtml += sectionHtml;
    }
    mainHtml += '</div>';

    bodyHtml = `<div class="double-wrap">${sidebar}${mainHtml}</div>`;
  } else {
    // 单栏
    const headerHtml = `<div class="resume-header-personal">
      <div class="header-info">
        <div class="header-line-1">${fmt(name)}</div>
        <div class="header-line-2">${fmt([gender, phone, email].filter(Boolean).join(' | '))}</div>
        <div class="header-line-3">${fmt('求职意向：' + target + ' | 立即到岗 | 可实习' + month + '个月')}</div>
      </div>
      <div class="header-photo-right">${photoHtml}</div>
    </div>`;

    const moduleOrder = (result.模块排序 && result.模块排序.length >= 5)
      ? result.模块排序
      : DEFAULT_MODULE_ORDER;

    bodyHtml = headerHtml;
    for (const key of moduleOrder) {
      bodyHtml += renderSection(key);
    }
  }

  const pdfCoreStyle = `
    .resume-section h2 { font-size: 0.95rem; font-weight: 700; padding-top: 10px; border-top: 4px solid #000 !important; margin: 16px 0; }
    .section-body { word-break: break-word; }
    .exp-entry { margin-bottom: 14px; }
    .exp-entry:last-child { margin-bottom: 0; }
    .exp-header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .exp-name { font-weight: bold !important; color: #0f172a; flex: 1; }
    .exp-date { text-align: right; color: #64748b; font-size: 0.85em; white-space: nowrap; font-weight: normal !important; flex-shrink: 0; }
    ul.resume-bullet-list { list-style: disc; list-style-position: inside; padding-left: 0.5em; margin: 4px 0 8px 0; }
    ul.resume-bullet-list li { margin-bottom: 3px; line-height: 1.75; color: #1e293b; word-break: break-word; }
    .resume-header-personal { display: flex; align-items: center; justify-content: center; font-weight: bold; padding: 10px 0; border-bottom: 2px solid #1e293b; margin-bottom: 12px; text-align: center; gap: 16px; }
    .header-photo-right { width: 100px; height: 130px; display: flex; align-items: center; justify-content: center; background: #e2e8f0; border: 1px solid #cbd5e1; border-radius: 4px; flex-shrink: 0; }
    .header-line-1 { font-size: 20px; color: #0f172a; font-weight: 700; }
    .header-line-2 { font-size: 0.82rem; color: #1e293b; margin: 2px 0; }
    .header-line-3 { font-size: 0.9rem; color: #0f172a; font-weight: 600; }
    .resume-section { margin-bottom: 12px; }
    strong, b { font-weight: 700; color: #0f172a; }
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${result.简历标题 || 'AI简历'}</title>
<style>
@page { margin: 0; size: A4; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 210mm; min-height: 297mm; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'PingFang SC', sans-serif; padding: 8mm 10mm; margin: 0 auto; }
@media print { html, body { width: 210mm; height: 297mm; padding: 6mm 8mm; overflow: hidden; } }
.resume-section, .exp-entry, .sidebar-section, .double-wrap { page-break-inside: avoid; }
.resume-header-personal { page-break-after: avoid; }
${pdfCoreStyle}
${css}
</style></head><body>${bodyHtml}</body></html>`;
}

export function exportPDF(result: OptimizedResume, templateId?: TemplateType): boolean {
  try {
    const html = getResumeHTML(result, templateId);
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) { alert('请允许弹出窗口后重试'); return false; }
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => {
      try { win.print(); } catch { alert('PDF 导出失败，请使用下载 HTML 后手动打印'); }
    }, 800);
    return true;
  } catch {
    alert('PDF 导出异常，请使用下载 HTML 后手动打印');
    return false;
  }
}
