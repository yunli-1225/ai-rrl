export const KEYWORD_LIB: Record<string, string[]> = {
  tech: [
    'Python', 'Java', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#',
    'React', 'Vue', 'Angular', 'Node.js', 'Next.js', 'Express', 'Spring Boot',
    'Django', 'Flask', 'FastAPI', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB',
    'Redis', 'Elasticsearch', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Linux', 'Nginx', 'Git', 'CI/CD', 'RESTful API', 'GraphQL', 'WebSocket',
    'Microservices', 'Serverless', 'Agile', 'Scrum', 'DevOps', 'TDD',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow',
    'PyTorch', 'Scikit-learn', 'Pandas', 'NumPy', 'Spark', 'Flink', 'Kafka',
    'RabbitMQ', 'gRPC', 'OAuth', 'JWT', 'TypeORM', 'Prisma', 'Tailwind CSS',
    'Sass', 'Webpack', 'Vite', 'Jest', 'Cypress', 'Playwright', 'Selenium',
  ],
  finance: [
    '尽职调查', '风控', '估值建模', '财务报表', '对账', '审计', '税务',
    '合规', '投资分析', '资产管理', '信贷', '量化分析', '财务建模',
    'DCF', 'LBO', 'IPO', '并购', '投行', '券商', '基金', '债券',
    '衍生品', '风险管理', '内部控制', '审计报告', '现金流量表',
  ],
  marketing: [
    '用户增长', 'SEO', 'SEM', '转化率', 'KOL', '内容营销', '品牌策划',
    '社交媒体', '私域流量', '数据驱动', 'A/B测试', '活动策划', '社群运营',
    '用户画像', 'ROI', 'CPA', 'CAC', 'LTV', 'GMV', '复购率', '留存率',
    '裂变', '公域', '精准营销', '投放优化', '媒介策划', 'PR',
  ],
  design: [
    'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'After Effects',
    '用户研究', '交互设计', '信息架构', '原型设计', '可用性测试', '产品路线图',
    'PRD', '竞品分析', '需求文档', '埋点', '用户旅程', '线框图', '设计系统',
    '组件库', '无障碍设计', '响应式设计', '视觉设计', '动效设计',
  ],
  government: [
    '公文写作', '党建', '政策研究', '行政管理', '后勤保障', '档案管理',
    '会务组织', '保密', '督察督办', '信访', '机要', '党务', '组织生活',
    '主题教育', '三会一课', '民主生活会', '两学一做', '巡视', '审计整改',
    '国企改革', '十四五规划', '高质量发展', '乡村振兴', '共同富裕',
  ],
  management: [
    '项目管理', 'PMP', '项目规划', '跨部门协作', '进度管理', '预算控制',
    '风险评估', '干系人沟通', '里程碑', 'WBS', 'OKR', 'KPI', '敏捷管理',
    '精益管理', '流程优化', '供应链', '采购管理', '质量管理', 'ISO',
  ],
  general: [
    '沟通能力', '团队协作', '抗压能力', '时间管理', '解决问题', '逻辑思维',
    '学习能力', '数据分析', '报告撰写', 'PPT', 'Excel', 'Word',
    '英语', 'CET-4', 'CET-6', '雅思', '托福', '普通话',
    '领导力', '组织协调', '执行力', '创新', '战略思维', '客户导向',
  ],
};

export function getAllKeywords(): string[] {
  return Object.values(KEYWORD_LIB).flat();
}

export function extractMatchedKeywords(jdText: string): { word: string; count: number }[] {
  const allKeywords = getAllKeywords();
  const result: { word: string; count: number }[] = [];
  for (const kw of allKeywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    const matches = jdText.match(regex);
    if (matches) {
      result.push({ word: kw, count: matches.length });
    }
  }
  return result.sort((a, b) => b.count - a.count);
}

export function calculateMatchRate(
  keywords: string[],
  userData: { skills: { name: string }[]; work: { description: string }[]; projects: { description: string }[] }
): number {
  if (keywords.length === 0) return 0;
  const allUserText = [
    ...userData.skills.map(s => s.name),
    ...userData.work.map(w => w.description),
    ...userData.projects.map(p => p.description),
  ].join(' ');
  const matched = keywords.filter(kw => {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i').test(allUserText);
  });
  return matched.length / keywords.length;
}
