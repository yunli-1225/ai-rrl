import type { OptimizedResume } from './schema';
import type { SectionKey } from './advantage';
import { getTemplateById } from './templates';
import type { TemplateType } from './schema';

export interface RenderOptions {
  order: SectionKey[];
  templateId?: TemplateType;
  showEvaluation: boolean;
  userData?: any;
}

function fmt(line: string): string {
  return line.replace(/<!(\S+?)>/g, '<strong>$1</strong>');
}

export function buildOrderedSections(result: OptimizedResume, opts: RenderOptions): string {
  const { order, templateId, showEvaluation, userData } = opts;
  const fullText = result.优化后完整简历文本;
  const info = result.基础信息 || {};
  const tpl = templateId ? getTemplateById(templateId) : null;
  const layout = tpl?.layout || 'single';
  const isDouble = layout === 'double';

  // ── Extract sections ──
  const headerRegex = /^([A-Z一-鿿一-鿿]{2,})[：:]?\s*$/gm;
  const matches: { header: string; idx: number }[] = [];
  let m;
  while ((m = headerRegex.exec(fullText)) !== null) {
    matches.push({ header: m[1].trim(), idx: m.index });
  }
  const sections: { header: string; text: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx + matches[i].header.length + (fullText[matches[i].idx + matches[i].header.length] === '：' || fullText[matches[i].idx + matches[i].header.length] === ':' ? 1 : 0);
    const lineEnd = fullText.indexOf('\n', start);
    const contentStart = lineEnd !== -1 ? lineEnd + 1 : start;
    const end = i + 1 < matches.length ? matches[i + 1].idx : fullText.length;
    const text = fullText.slice(contentStart, end).trim();
    if (text) sections.push({ header: matches[i].header, text });
  }

  // ── Classify ──
  const classify = (h: string): SectionKey | null => {
    const map: Record<string, SectionKey> = {
      '专业技能': 'skills', '技能标签': 'skills', '职业技能': 'skills', '专业能力': 'skills',
      '实习&工作经历': 'work', '工作经历': 'work', '实习经历': 'work',
      '项目&在校经历': 'project', '项目经历': 'project', '项目经验': 'project',
      '教育经历': 'education', '教育背景': 'education', '学历教育': 'education',
    };
    return map[h] || null;
  };

  const contentMap: Partial<Record<SectionKey, string>> = {};
  for (const s of sections) {
    const key = classify(s.header);
    if (key) {
      if (contentMap[key]) contentMap[key] += '\n' + s.text;
      else contentMap[key] = s.text;
    }
  }
  if (Object.keys(contentMap).length === 0) contentMap.work = fullText;

  // ── Merge certs/honors into skills ──
  const certs = userData?.certificates || [];
  const politics = userData?.personal?.politics || '';
  let skillsExtra = '';
  if (certs.length > 0) skillsExtra += `\n• 证书：${certs.join('、')}`;
  if (politics) skillsExtra += `\n• ${politics}`;
  if (contentMap.skills && skillsExtra) contentMap.skills += skillsExtra;

  // ── Render a section ──
  const renderSection = (key: SectionKey): string => {
    const raw = contentMap[key] || '';
    if (!raw.trim()) return '';
    const titleMap: Record<SectionKey, string> = {
      skills: '专业技能', work: '实习/工作经历', project: '项目经历', education: '教育经历',
    };
    const bodyLines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const body = bodyLines.map(l => {
      const f = fmt(l);
      const cleaned = f.replace(/^[A-Z一-鿿]{2,}[：:]?\s*/, '');
      if (cleaned.match(/^[-•·](\s|$)/) || cleaned.match(/^\d+[.、]/)) return `<li>${cleaned.replace(/^[-•·]\s*|^\d+[.、]\s*/, '')}</li>`;
      if (cleaned.length < 60 && !cleaned.includes('<') && !cleaned.includes('。') && !cleaned.includes('；')) return `<div class="exp-header">${cleaned}</div>`;
      return `<p>${cleaned}</p>`;
    }).join('\n');
    return `<div class="resume-section"><h2>${titleMap[key]}</h2><div class="section-body">${body}</div></div>`;
  };

  // ── Render evaluation ──
  const renderEval = (): string => {
    if (!showEvaluation) return '';
    const es = sections.find(s => s.header === '个人评价' || s.header === '自我评价' || s.header === '个人总结');
    if (!es) return '';
    const t = es.text.replace(/^个人评价[：:]?\s*/i, '').replace(/^自我评价[：:]?\s*/i, '');
    return `<div class="resume-section"><h2>个人评价</h2><div class="section-body"><p class="evaluation-text">${fmt(t.trim())}</p></div></div>`;
  };

  // ═══════════════════════════════════
  // DOUBLE-COLUMN (ref: dark sidebar)
  // Sidebar: photo → name → contact → skills
  // Main: education → work → project → evaluation
  // ═══════════════════════════════════
  if (isDouble) {
    const safePhoto = info['姓名'] ? '📷' : '';
    const sidebarHtml = `<div class="sidebar">
      <div class="sidebar-photo">${safePhoto}</div>
      <div class="sidebar-name">${info['姓名'] || ''}</div>
      ${info['求职意向'] ? `<div class="sidebar-title">${info['求职意向']}</div>` : ''}
      <div class="sidebar-contact">
        ${info['电话'] ? `<div>📞 ${info['电话']}</div>` : ''}
        ${info['邮箱'] ? `<div>✉️ ${info['邮箱']}</div>` : ''}
        ${(info['Base地'] || info['所在地']) ? `<div>📍 ${info['Base地'] || info['所在地']}</div>` : ''}
        ${info['性别'] ? `<div>${info['性别']}</div>` : ''}
        ${politics ? `<div>${politics}</div>` : ''}
      </div>
      ${renderSection('skills')}
    </div>`;

    let mainHtml = '';
    // Render education, work, project in given order (filtered)
    for (const key of order) {
      if (key === 'skills') continue; // skills already in sidebar
      mainHtml += renderSection(key);
    }
    mainHtml += renderEval();

    return `<div class="double-wrap">${sidebarHtml}<div class="main">${mainHtml}</div></div>`;
  }

  // ═══════════════════════════════════
  // SINGLE-COLUMN (ref: full-width single)
  // Header: centered with photo top-right
  // Modules: vertical stack by advantage order
  // ═══════════════════════════════════
  const personalHtml = `<div class="resume-header-centered">
    <div class="header-photo-right">📷</div>
    <div class="header-name">${info['姓名'] || ''}</div>
    <div class="header-subtitle">${info['求职意向'] || result.简历标题 || ''}</div>
    <table class="header-table">
      <tr><td>性别</td><td>${info['性别'] || ''}</td><td>电话</td><td>${info['电话'] || ''}</td></tr>
      <tr><td>邮箱</td><td>${info['邮箱'] || ''}</td><td>Base地</td><td>${info['Base地'] || info['所在地'] || ''}</td></tr>
    </table>
  </div>`;

  let body = personalHtml;
  for (const key of order) {
    body += renderSection(key);
  }
  body += renderEval();
  return body;
}
