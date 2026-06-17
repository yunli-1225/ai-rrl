import type { UserData } from './schema';

export type AdvantageType = 'work' | 'project' | 'education' | 'skills';

export type SectionKey = 'skills' | 'work' | 'project' | 'education';

export interface AdvantageProfile {
  topAdvantage: AdvantageType;
  scores: Record<AdvantageType, number>;
  summary: string;
}

export function analyzeAdvantages(userData: UserData): AdvantageProfile {
  const scores: Record<AdvantageType, number> = { work: 0, project: 0, education: 0, skills: 0 };

  // Work experience
  const work = userData.work || [];
  for (const w of work) {
    if (w.company) scores.work += 10;
    if (w.description && w.description.length > 30) scores.work += 8;
    if (/字节跳动|腾讯|阿里|百度|华为|京东|美团|蚂蚁|大厂|央企|国企|总部/.test(w.description || '')) scores.work += 10;
    if (w.position) scores.work += 5;
    if (w.startDate && w.endDate) {
      const s = parseInt(w.startDate.slice(0, 4));
      const e = parseInt(w.endDate.slice(0, 4));
      if (!isNaN(s) && !isNaN(e) && e - s >= 2) scores.work += 8;
    }
  }
  if (work.length >= 2) scores.work += 8;

  // Projects
  const projects = userData.projects || [];
  for (const p of projects) {
    if (p.description && p.description.length > 40) scores.project += 10;
    if (p.award) scores.project += 12;
    if (p.name) scores.project += 5;
  }
  if (projects.length >= 2) scores.project += 8;

  // Education
  const edu = userData.education || [];
  for (const e of edu) {
    if (e.school) scores.education += 15;
    if (e.gpa && parseFloat(e.gpa) >= 3.5) scores.education += 12;
    if (e.gpa && parseFloat(e.gpa) >= 3.8) scores.education += 8;
    if (e.degree === '硕士' || e.degree === '博士') scores.education += 18;
    if (e.major) scores.education += 5;
  }

  // Skills (certs boost skills)
  const skills = userData.skills || [];
  if (skills.length >= 3) scores.skills += 10;
  if (skills.length >= 6) scores.skills += 8;
  for (const s of skills) {
    if (s.proficiency === '精通') scores.skills += 6;
    else if (s.proficiency === '熟练') scores.skills += 3;
  }
  const certs = userData.certificates || [];
  if (certs.length > 0) scores.skills += 8;
  if (certs.length >= 3) scores.skills += 6;
  if (userData.personal?.politics === '中共党员') scores.skills += 5;

  // Fallback: if total work+project is low, boost education or skills
  if (scores.work + scores.project < 20 && scores.education > 10) scores.education += 5;

  const sorted = (Object.entries(scores) as [AdvantageType, number][]).sort((a, b) => b[1] - a[1]);
  const topAdvantage = sorted[0][0];

  const summary = ((t: AdvantageType) => {
    switch (t) {
      case 'education': return `学历背景优秀（${edu[0]?.school || ''} · ${edu[0]?.degree || ''}）`;
      case 'work': return `丰富工作经验（${work[0]?.company || ''} · ${work[0]?.position || ''}）`;
      case 'project': return '优质项目成果突出';
      case 'skills': return `技能扎实（含${certs.length}项证书）`;
    }
  })(topAdvantage);

  return { topAdvantage, scores, summary };
}

/** Determine module order: personal(fixed)→skills→work→project→education→evaluation(fixed last) */
export function determineModuleOrder(top: AdvantageType): SectionKey[] {
  const movable: SectionKey[] = ['skills', 'work', 'project', 'education'];
  const rest = movable.filter(s => s !== top);
  // Convert top to SectionKey mapping
  const topKey: SectionKey = top === 'education' ? 'education' : top === 'work' ? 'work' : top === 'project' ? 'project' : 'skills';
  return [topKey, ...rest];
}
