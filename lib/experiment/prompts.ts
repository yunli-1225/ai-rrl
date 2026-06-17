import type { BuildPromptParams } from '@/lib/prompts';

export const CONTROL_SYSTEM_PROMPT = `根据用户信息和职位描述(JD)，生成一份完整的简历JSON。
简历应包含：简历标题、基础信息、教育经历、实习项目经历、专业技能标签、岗位匹配评分、优化后完整简历文本。
请直接输出JSON。`;

export function buildControlPrompt(params: BuildPromptParams): string {
  return `模板: ${params.templateName}
职位描述: ${params.jdText}
用户素材: ${params.userDataJson}
请根据以上信息生成完整简历JSON。`;
}

export { SYSTEM_PROMPT_BASIC, SYSTEM_PROMPT_FULL, buildBasicPrompt, buildFullPrompt } from '@/lib/prompts';
