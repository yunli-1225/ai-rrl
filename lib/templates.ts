import type { TemplateType } from './schema';

export type TemplateTrack = 'state-owned' | 'internet';
export type TemplateLayout = 'single' | 'double';

export interface TemplateConfig {
  id: TemplateType;
  label: string;
  layout: TemplateLayout;
  category: string;
  track: TemplateTrack;
  trackLabel: string;
  description: string;
  previewColor: string;
  getStyle: () => string;
  trackPrompt: string;
}

// ═══════════════════════════════════════════
// 极简打印风 — 纯白底色 · 黑色加粗标题 · 细分割线 · 实心圆点
// 无渐变 · 无色块 · 无花哨装饰 · A4 单页约束
// 每个模板使用自身 ID 作为 class 前缀（.resume-zh-classic 等）
// ═══════════════════════════════════════════

// ── ① 央国企·单栏版（zh-classic）──
const zhClassicStyle = `
.resume-zh-classic { font-family: '宋体','SimSun','STSong','Times New Roman',serif; color: #000; max-width: 780px; margin: 0 auto; padding: 10px 18px; font-size: 10px; line-height: 1.4; }
.resume-zh-classic .resume-header-centered { text-align: center; position: relative; padding: 4px 0 6px; margin-bottom: 6px; border-bottom: 1.5px solid #000; }
.resume-zh-classic .header-photo-right { position: absolute; top: 0; right: 0; width: 52px; height: 66px; background: #f5f5f5; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.resume-zh-classic .header-name { font-size: 18px; font-weight: 700; margin-bottom: 1px; }
.resume-zh-classic .header-subtitle { font-size: 9.5px; color: #333; margin-bottom: 3px; }
.resume-zh-classic .header-table { margin: 0 auto; font-size: 9px; border-collapse: collapse; }
.resume-zh-classic .header-table td { padding: 0 8px; color: #333; }
.resume-zh-classic .header-table td:first-child, .resume-zh-classic .header-table td:nth-child(3) { color: #666; font-weight: 500; text-align: right; }
.resume-zh-classic .header-table td:nth-child(2), .resume-zh-classic .header-table td:nth-child(4) { text-align: left; }
.resume-zh-classic .resume-section { margin-bottom: 5px; }
.resume-zh-classic .resume-section h2 { font-size: 11px; font-weight: 700; border-bottom: 1px solid #999; padding-bottom: 1px; margin: 5px 0 3px; color: #000; }
.resume-zh-classic .section-body { padding-left: 2px; }
.resume-zh-classic .section-body p { margin: 1px 0; line-height: 1.4; font-size: 10px; color: #222; }
.resume-zh-classic .section-body li { margin-left: 14px; padding-left: 1px; line-height: 1.35; font-size: 9.5px; list-style: disc; margin-bottom: 0; color: #222; }
.resume-zh-classic .section-body .exp-header { font-weight: 600; font-size: 10px; margin: 2px 0 0; color: #000; }
.resume-zh-classic .section-body .evaluation-text { font-size: 9.5px; line-height: 1.5; color: #333; }
.resume-zh-classic strong { font-weight: 700; }
`;

// ── ② 央国企·双栏版（zh-simple）——左窄右宽──
const zhSimpleStyle = `
.resume-zh-simple { font-family: '宋体','SimSun','STSong','Times New Roman',serif; color: #000; max-width: 780px; margin: 0 auto; font-size: 9.5px; line-height: 1.35; }
.resume-zh-simple .double-wrap { display: flex; min-height: 0; }
.resume-zh-simple .sidebar { width: 130px; flex-shrink: 0; background: #f5f5f5; padding: 14px 10px 14px 10px; }
.resume-zh-simple .main { flex: 1; padding: 10px 14px 10px 12px; }
/* 侧边栏头像区 */
.resume-zh-simple .sidebar-photo { width: 80px; height: 104px; background: #e8e8e8; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; }
.resume-zh-simple .sidebar-photo img { width: 100%; height: 100%; object-fit: cover; }
.resume-zh-simple .sidebar-name { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 3px; }
.resume-zh-simple .sidebar-title { text-align: center; font-size: 8px; color: #555; margin-bottom: 8px; }
/* 侧边栏章节 */
.resume-zh-simple .sidebar-section { margin-bottom: 6px; }
.resume-zh-simple .sidebar-section h2 { font-size: 8.5px; font-weight: 700; border-top: 1px solid #999; padding-top: 3px; margin: 4px 0 3px; color: #000; }
.resume-zh-simple .sidebar-body { font-size: 7.5px; color: #333; line-height: 1.4; }
.resume-zh-simple .sidebar-body .info-row { margin-bottom: 1px; }
.resume-zh-simple .sidebar-body p { margin: 0; line-height: 1.3; }
.resume-zh-simple .sidebar-body ul { padding-left: 0; margin: 0; }
.resume-zh-simple .sidebar-body li { font-size: 7.5px; margin-left: 8px; list-style: none; margin-bottom: 0; }
/* 右侧主栏 */
.resume-zh-simple .main h2 { font-size: 10px; font-weight: 700; border-bottom: 1px solid #999; padding-bottom: 1px; margin: 5px 0 3px; color: #000; }
.resume-zh-simple .main p { margin: 1px 0; line-height: 1.35; font-size: 9.5px; color: #222; }
.resume-zh-simple .main li { margin-left: 12px; line-height: 1.3; font-size: 9px; list-style: disc; margin-bottom: 0; }
/* 经历条目 */
.resume-zh-simple .exp-name { font-weight: bold; color: #0f172a; }
.resume-zh-simple .exp-date { text-align: right; color: #64748b; font-size: 0.85em; white-space: nowrap; font-weight: normal; }
.resume-zh-simple .resume-section { margin-bottom: 4px; }
.resume-zh-simple .section-body { word-break: break-word; }
.resume-zh-simple strong { font-weight: 700; }
`;

// ── ③ 互联网·单栏版（en-modern）──
const enModernStyle = `
.resume-en-modern { font-family: 'Segoe UI','Helvetica Neue',Arial,sans-serif; color: #000; max-width: 780px; margin: 0 auto; padding: 10px 18px; font-size: 10px; line-height: 1.4; }
.resume-en-modern .resume-header-centered { text-align: center; position: relative; padding: 4px 0 6px; margin-bottom: 6px; border-bottom: 1.5px solid #000; }
.resume-en-modern .header-photo-right { position: absolute; top: 0; right: 0; width: 52px; height: 66px; background: #f5f5f5; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; }
.resume-en-modern .header-name { font-size: 18px; font-weight: 700; margin-bottom: 1px; }
.resume-en-modern .header-subtitle { font-size: 9.5px; color: #333; margin-bottom: 3px; }
.resume-en-modern .header-table { margin: 0 auto; font-size: 9px; border-collapse: collapse; }
.resume-en-modern .header-table td { padding: 0 8px; color: #333; }
.resume-en-modern .header-table td:first-child, .resume-en-modern .header-table td:nth-child(3) { color: #666; font-weight: 500; text-align: right; }
.resume-en-modern .header-table td:nth-child(2), .resume-en-modern .header-table td:nth-child(4) { text-align: left; }
.resume-en-modern .resume-section { margin-bottom: 5px; }
.resume-en-modern .resume-section h2 { font-size: 11px; font-weight: 700; border-bottom: 1px solid #999; padding-bottom: 1px; margin: 5px 0 3px; color: #000; }
.resume-en-modern .section-body { padding-left: 2px; }
.resume-en-modern .section-body p { margin: 1px 0; line-height: 1.4; font-size: 10px; color: #222; }
.resume-en-modern .section-body li { margin-left: 14px; padding-left: 1px; line-height: 1.35; font-size: 9.5px; list-style: disc; margin-bottom: 0; color: #222; }
.resume-en-modern .section-body .exp-header { font-weight: 600; font-size: 10px; margin: 2px 0 0; color: #000; }
.resume-en-modern .section-body .evaluation-text { font-size: 9.5px; line-height: 1.5; color: #333; }
.resume-en-modern strong { font-weight: 700; }
`;

// ── ④ 互联网·双栏版（en-creative）——左窄右宽无衬线──
const enCreativeStyle = `
.resume-en-creative { font-family: 'Segoe UI','Helvetica Neue',Arial,'Noto Sans SC',sans-serif; color: #000; max-width: 780px; margin: 0 auto; font-size: 9.5px; line-height: 1.35; }
.resume-en-creative .double-wrap { display: flex; min-height: 0; }
.resume-en-creative .sidebar { width: 130px; flex-shrink: 0; background: #f0f4f8; padding: 14px 10px 14px 10px; }
.resume-en-creative .main { flex: 1; padding: 10px 14px 10px 12px; }
/* 侧边栏头像区 */
.resume-en-creative .sidebar-photo { width: 80px; height: 104px; background: #e2e8f0; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; border-radius: 4px; }
.resume-en-creative .sidebar-photo img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
.resume-en-creative .sidebar-name { text-align: center; font-size: 12px; font-weight: 700; margin-bottom: 3px; }
.resume-en-creative .sidebar-title { text-align: center; font-size: 8px; color: #64748b; margin-bottom: 8px; }
/* 侧边栏章节 */
.resume-en-creative .sidebar-section { margin-bottom: 6px; }
.resume-en-creative .sidebar-section h2 { font-size: 8.5px; font-weight: 700; border-top: 1px solid #94a3b8; padding-top: 3px; margin: 4px 0 3px; color: #0f172a; }
.resume-en-creative .sidebar-body { font-size: 7.5px; color: #334155; line-height: 1.4; }
.resume-en-creative .sidebar-body .info-row { margin-bottom: 1px; }
.resume-en-creative .sidebar-body p { margin: 0; line-height: 1.3; }
.resume-en-creative .sidebar-body ul { padding-left: 0; margin: 0; }
.resume-en-creative .sidebar-body li { font-size: 7.5px; margin-left: 8px; list-style: none; margin-bottom: 0; }
/* 右侧主栏 */
.resume-en-creative .main h2 { font-size: 10px; font-weight: 700; border-bottom: 1px solid #94a3b8; padding-bottom: 1px; margin: 5px 0 3px; color: #0f172a; }
.resume-en-creative .main p { margin: 1px 0; line-height: 1.35; font-size: 9.5px; color: #334155; }
.resume-en-creative .main li { margin-left: 12px; line-height: 1.3; font-size: 9px; list-style: disc; margin-bottom: 0; }
/* 经历条目 */
.resume-en-creative .exp-name { font-weight: bold; color: #0f172a; }
.resume-en-creative .exp-date { text-align: right; color: #64748b; font-size: 0.85em; white-space: nowrap; font-weight: normal; }
.resume-en-creative .resume-section { margin-bottom: 4px; }
.resume-en-creative .section-body { word-break: break-word; }
.resume-en-creative strong { font-weight: 700; }
`;

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'zh-classic', label: '央国企·单栏', layout: 'single',
    category: '🏛️ 央国企赛道', track: 'state-owned', trackLabel: '🏛️ 央国企赛道',
    description: '纵向单列，宋体，纯黑标题+分割线，适配体制内打印',
    previewColor: '#333',
    getStyle: () => zhClassicStyle,
    trackPrompt: '目标赛道：央国企/体制内。正式书面表述，纯黑标题分割线分区。重点：政治面貌、党建、荣誉、统筹能力。技能描述侧重公文写作、政策研究。',
  },
  {
    id: 'zh-simple', label: '央国企·双栏', layout: 'double',
    category: '🏛️ 央国企赛道', track: 'state-owned', trackLabel: '🏛️ 央国企赛道',
    description: '左右分区，侧边证件照/技能，主栏经历，极简打印',
    previewColor: '#555',
    getStyle: () => zhSimpleStyle,
    trackPrompt: '目标赛道：央国企/事业单位。双栏排版：左侧窄栏放头像、姓名、求职意向、个人简介（籍贯/学历/手机/邮箱/base地）、自我评价；右侧宽栏放教育背景、工作经历、项目经历、个人技能。侧边栏底色区分。主栏标题加粗+分割线。经历公司名加粗左对齐+时间右对齐。',
  },
  {
    id: 'en-modern', label: '互联网·单栏', layout: 'single',
    category: '🚀 互联网/外企赛道', track: 'internet', trackLabel: '🚀 互联网/外企赛道',
    description: '纵向单列，无衬线字体，突出量化数据',
    previewColor: '#333',
    getStyle: () => enModernStyle,
    trackPrompt: '目标赛道：互联网/外企大厂。数据驱动。重点：技术栈、项目量化成果。每条经历必有具体数字。使用"优化/重构/设计"行动词。',
  },
  {
    id: 'en-creative', label: '互联网·双栏', layout: 'double',
    category: '🚀 互联网/外企赛道', track: 'internet', trackLabel: '🚀 互联网/外企赛道',
    description: '轻量化左右分区，侧边技能栈，主栏经历',
    previewColor: '#555',
    getStyle: () => enCreativeStyle,
    trackPrompt: '目标赛道：互联网/外企方向。双栏排版：左侧窄栏放头像、姓名、求职意向、个人简介（籍贯/学历/手机/邮箱/base地）、自我评价；右侧宽栏放教育背景、工作经历、项目经历、个人技能。侧边栏底色区分。主栏标题加粗+分割线。经历公司名加粗左对齐+时间右对齐。突出技术栈、量化数据。',
  },
];

export const TEMPLATE_TRACKS = [
  { track: 'state-owned' as TemplateTrack, label: '🏛️ 央国企赛道', description: '正式稳重风格，适合国企、银行、事业单位', templates: TEMPLATES.filter(t => t.track === 'state-owned') },
  { track: 'internet' as TemplateTrack, label: '🚀 互联网/外企赛道', description: '现代数据驱动，适合技术、产品、设计等岗位', templates: TEMPLATES.filter(t => t.track === 'internet') },
];

export function getTemplateById(id: TemplateType): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
}
