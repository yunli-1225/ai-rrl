import { z } from 'zod';

// ===== Request Schemas =====

export const PersonalSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  base: z.string().default(''),
  politics: z.string().default(''),
  status: z.string().default(''),
  求职意向: z.string().default(''),
  性别: z.string().default(''),
  实习月数: z.string().default(''),
});

export const EducationSchema = z.object({
  school: z.string().default(''),
  major: z.string().default(''),
  degree: z.string().default(''),
  gpa: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
});

export const WorkSchema = z.object({
  company: z.string().default(''),
  position: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
});

export const ProjectSchema = z.object({
  name: z.string().default(''),
  role: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
  award: z.string().default(''),
});

export const SkillSchema = z.object({
  name: z.string().default(''),
  proficiency: z.string().default(''),
});

export const SchoolActivitySchema = z.object({
  role: z.string().default(''),
  organization: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  description: z.string().default(''),
});

export const PortfolioSchema = z.object({
  title: z.string().default(''),
  link: z.string().default(''),
  fileData: z.string().default(''),
  fileType: z.string().default(''),
  fileName: z.string().default(''),
});

export const UserDataSchema = z.object({
  personal: PersonalSchema,
  education: z.array(EducationSchema).default([]),
  work: z.array(WorkSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillSchema).default([]),
  certificates: z.array(z.string()).default([]),
  schoolActivities: z.array(SchoolActivitySchema).default([]),
  portfolio: z.array(PortfolioSchema).default([]),
  rawResume: z.string().default(''),
  自我评价: z.string().default(''),
});

export const GenerateRequestSchema = z.object({
  userData: UserDataSchema,
  jdText: z.string().min(10, 'JD文本不能少于10个字符'),
  template: z.enum(['zh-classic', 'zh-simple', 'en-modern', 'en-creative']),
});

// ===== Response Schemas =====

export const ProjectExperienceSchema = z.object({
  公司: z.string().default(''),
  职位: z.string().default(''),
  时间: z.string().default(''),
  描述: z.array(z.string()).default([]),
});

export const OptimizedResumeSchema = z.object({
  简历标题: z.string().default(''),
  基础信息: z.record(z.string(), z.string()).default({}),
  教育经历: z.array(z.object({
    学校: z.string().default(''),
    专业: z.string().default(''),
    学历: z.string().default(''),
    时间: z.string().default(''),
  })).default([]),
  实习项目经历: z.array(ProjectExperienceSchema).default([]),
  专业技能标签: z.array(z.string()).default([]),
  岗位匹配评分: z.object({
    总分: z.number().default(0),
    技能匹配分: z.number().default(0),
    行业经验分: z.number().default(0),
  }).default({总分: 0, 技能匹配分: 0, 行业经验分: 0}),
  模块排序: z.array(z.string()).default([]),
  优化后完整简历文本: z.string().default(''),
});

// ===== Inferred Types =====
export type OptimizedResume = z.infer<typeof OptimizedResumeSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type TemplateType = 'zh-classic' | 'zh-simple' | 'en-modern' | 'en-creative';
