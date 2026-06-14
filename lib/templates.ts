import type { TemplateType } from './schema';

export interface TemplateConfig {
  id: TemplateType;
  label: string;
  category: string;
  description: string;
  getStyle: () => string;
}

const zhClassicStyle = `
.resume-zh-classic {
  font-family: '宋体', 'SimSun', 'Times New Roman', serif;
  color: #000;
  line-height: 1.7;
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 50px;
}
.resume-zh-classic .header {
  text-align: center;
  border-bottom: 2px solid #1e40af;
  padding-bottom: 16px;
  margin-bottom: 20px;
}
.resume-zh-classic .header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: #1e40af;
}
.resume-zh-classic .header p {
  font-size: 13px;
  color: #333;
  margin: 0;
}
.resume-zh-classic section {
  margin-bottom: 18px;
}
.resume-zh-classic section h2 {
  font-size: 15px;
  font-weight: 700;
  color: #1e40af;
  border-bottom: 1px solid #ccc;
  padding-bottom: 4px;
  margin-bottom: 10px;
}
.resume-zh-classic .item {
  margin-bottom: 12px;
}
.resume-zh-classic .item-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 13.5px;
}
.resume-zh-classic .item-date {
  font-weight: 400;
  color: #555;
  font-size: 12px;
}
.resume-zh-classic ul {
  margin: 4px 0 0 18px;
  padding: 0;
}
.resume-zh-classic li {
  font-size: 13px;
  margin-bottom: 3px;
  list-style: disc;
}
.resume-zh-classic .summary-text {
  font-size: 13px;
  margin-bottom: 14px;
  line-height: 1.8;
}
.resume-zh-classic .skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 13px;
}
.resume-zh-classic .cert-list {
  font-size: 13px;
}
.resume-zh-classic strong {
  font-weight: 700;
  color: #000;
}
`;

const zhSimpleStyle = `
.resume-zh-simple {
  font-family: '微软雅黑', 'Microsoft YaHei', sans-serif;
  color: #333;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
  padding: 30px 40px;
}
.resume-zh-simple .header {
  margin-bottom: 18px;
}
.resume-zh-simple .header h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #222;
}
.resume-zh-simple .header p {
  font-size: 12px;
  color: #666;
  margin: 0;
}
.resume-zh-simple section {
  margin-bottom: 14px;
}
.resume-zh-simple section h2 {
  font-size: 14px;
  font-weight: 700;
  color: #444;
  margin-bottom: 6px;
}
.resume-zh-simple .item {
  margin-bottom: 10px;
}
.resume-zh-simple .item-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 13px;
}
.resume-zh-simple .item-date {
  font-weight: 400;
  color: #888;
  font-size: 12px;
}
.resume-zh-simple ul {
  margin: 3px 0 0 16px;
  padding: 0;
}
.resume-zh-simple li {
  font-size: 12.5px;
  margin-bottom: 2px;
  list-style: circle;
}
.resume-zh-simple .summary-text {
  font-size: 12.5px;
  margin-bottom: 12px;
}
.resume-zh-simple .skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 12.5px;
}
.resume-zh-simple strong {
  font-weight: 700;
}
`;

const enModernStyle = `
.resume-en-modern {
  font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif;
  color: #1e293b;
  line-height: 1.6;
  max-width: 850px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 30% 70%;
  background: #fff;
}
.resume-en-modern .sidebar {
  background: #f8fafc;
  padding: 30px 20px;
  border-right: 1px solid #e2e8f0;
}
.resume-en-modern .main {
  padding: 30px 25px;
}
.resume-en-modern .header h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #1e40af;
}
.resume-en-modern .header p {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 16px;
}
.resume-en-modern .sidebar h2 {
  font-size: 13px;
  font-weight: 700;
  color: #1e40af;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 2px solid #1e40af;
  padding-bottom: 4px;
  margin: 16px 0 8px;
}
.resume-en-modern .main h2 {
  font-size: 14px;
  font-weight: 700;
  color: #1e40af;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 4px;
  margin: 18px 0 10px;
}
.resume-en-modern .sidebar .skill-item {
  font-size: 12px;
  margin-bottom: 4px;
}
.resume-en-modern .sidebar .skill-item .proficiency {
  color: #94a3b8;
  font-size: 11px;
}
.resume-en-modern .item-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 13px;
}
.resume-en-modern .item-date {
  font-weight: 400;
  color: #94a3b8;
  font-size: 11.5px;
}
.resume-en-modern ul {
  margin: 4px 0 0 16px;
  padding: 0;
}
.resume-en-modern li {
  font-size: 12.5px;
  margin-bottom: 3px;
  list-style: disc;
}
.resume-en-modern .summary-text {
  font-size: 12.5px;
  margin-bottom: 14px;
  color: #475569;
}
.resume-en-modern strong {
  font-weight: 700;
  color: #1e40af;
}
`;

const enCreativeStyle = `
.resume-en-creative {
  font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif;
  color: #1e293b;
  line-height: 1.6;
  max-width: 850px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 28% 72%;
  background: #fff;
  border: 1px solid #e2e8f0;
}
.resume-en-creative .sidebar {
  background: linear-gradient(180deg, #1e3a5f 0%, #2563eb 100%);
  color: #fff;
  padding: 30px 18px;
}
.resume-en-creative .sidebar h2 {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  border-bottom: 1px solid rgba(255,255,255,0.3);
  padding-bottom: 4px;
  margin: 18px 0 8px;
  color: #fff;
}
.resume-en-creative .sidebar .skill-item {
  font-size: 11.5px;
  margin-bottom: 4px;
  opacity: 0.9;
}
.resume-en-creative .sidebar .skill-item .proficiency {
  opacity: 0.6;
  font-size: 10.5px;
}
.resume-en-creative .sidebar .header-side h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #fff;
}
.resume-en-creative .sidebar .header-side p {
  font-size: 11px;
  opacity: 0.8;
  margin: 4px 0 0;
}
.resume-en-creative .main {
  padding: 30px 24px;
  background: #fafbfc;
}
.resume-en-creative .main h2 {
  font-size: 13px;
  font-weight: 700;
  color: #1e3a5f;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 3px;
  margin: 16px 0 8px;
}
.resume-en-creative .item-header {
  display: flex;
  justify-content: space-between;
  font-weight: 600;
  font-size: 12.5px;
}
.resume-en-creative .item-date {
  font-weight: 400;
  color: #94a3b8;
  font-size: 11px;
}
.resume-en-creative ul {
  margin: 4px 0 0 16px;
  padding: 0;
}
.resume-en-creative li {
  font-size: 12px;
  margin-bottom: 3px;
  list-style: disc;
}
.resume-en-creative .summary-text {
  font-size: 12px;
  margin-bottom: 12px;
  color: #475569;
  background: #f1f5f9;
  padding: 10px 14px;
  border-radius: 6px;
}
.resume-en-creative strong {
  font-weight: 700;
  color: #2563eb;
}
.resume-en-creative .sidebar .header-side .contact-item {
  font-size: 11px;
  opacity: 0.8;
  margin: 2px 0;
}
`;

export const TEMPLATES: TemplateConfig[] = [
  {
    id: 'zh-classic',
    label: '央国企·经典',
    category: '🏛️ 央国企赛道',
    description: '纵向单列，宋体为主，黑白素雅，适合体制内/银行/国企',
    getStyle: () => zhClassicStyle,
  },
  {
    id: 'zh-simple',
    label: '央国企·简约',
    category: '🏛️ 央国企赛道',
    description: '极简单列，弱化装饰，ATS友好，适合事业单位/研究所',
    getStyle: () => zhSimpleStyle,
  },
  {
    id: 'en-modern',
    label: '互联网·现代',
    category: '🚀 互联网/外企赛道',
    description: '双栏布局(30/70)，蓝灰主色，适合技术岗/工程师',
    getStyle: () => enModernStyle,
  },
  {
    id: 'en-creative',
    label: '互联网·创意',
    category: '🚀 互联网/外企赛道',
    description: '双栏可调，渐变侧栏，色块点缀，适合产品/设计/市场岗',
    getStyle: () => enCreativeStyle,
  },
];

export function getTemplateById(id: TemplateType): TemplateConfig {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
}
