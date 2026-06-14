import { z } from 'zod';

// ===== Request Schemas =====

export const PersonalSchema = z.object({
  name: z.string().default(''),
  phone: z.string().default(''),
  email: z.string().default(''),
  base: z.string().default(''),
  politics: z.string().default(''),
  status: z.string().default(''),
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
});

export const GenerateRequestSchema = z.object({
  userData: UserDataSchema,
  jdText: z.string().min(10, 'JD文本不能少于10个字符'),
  template: z.enum(['zh-classic', 'zh-simple', 'en-modern', 'en-creative']),
});

// ===== Response Schemas =====

export const StarBulletSchema = z.object({
  raw: z.string(),
  starCompleteness: z.number().min(0).max(4),
  missing: z.array(z.string()),
  highlightedNumbers: z.array(z.string()),
});

export const StarredItemSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  bullets: z.array(StarBulletSchema),
  matchScore: z.number().min(0).max(1),
});

export const EducationResultSchema = z.object({
  school: z.string(),
  major: z.string(),
  degree: z.string(),
  gpa: z.string().optional(),
  date: z.string(),
  highlight: z.boolean(),
});

export const SkillResultSchema = z.object({
  name: z.string(),
  proficiency: z.string(),
  matched: z.boolean(),
});

export const PortfolioResultSchema = z.object({
  title: z.string(),
  link: z.string().optional(),
  matched: z.boolean(),
});

export const MissingKeywordSchema = z.object({
  word: z.string(),
  importance: z.enum(['high', 'medium', 'low']),
  suggestion: z.string(),
});

export const STARCheckSchema = z.object({
  item: z.string(),
  s: z.boolean(),
  t: z.boolean(),
  a: z.boolean(),
  r: z.boolean(),
  suggestion: z.string(),
});

export const GapBoosterSchema = z.object({
  keyword: z.string(),
  level: z.enum(['high', 'medium', 'low']),
  tip: z.string(),
  category: z.enum(['skill', 'project', 'cert', 'experience']),
});

export const AnalysisSchema = z.object({
  matchedCount: z.number(),
  totalCount: z.number(),
  matchRate: z.number().min(0).max(1),
  missingKeywords: z.array(MissingKeywordSchema),
  starChecklist: z.array(STARCheckSchema),
  gapBoosters: z.array(GapBoosterSchema),
});

export const ResumeResultSchema = z.object({
  summary: z.string(),
  workExperiences: z.array(StarredItemSchema),
  projects: z.array(StarredItemSchema),
  education: z.array(EducationResultSchema),
  skills: z.array(SkillResultSchema),
  certificates: z.array(z.string()),
  portfolio: z.array(PortfolioResultSchema),
  analysis: AnalysisSchema,
});

// ===== Inferred Types =====
export type ResumeResult = z.infer<typeof ResumeResultSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type TemplateType = 'zh-classic' | 'zh-simple' | 'en-modern' | 'en-creative';
