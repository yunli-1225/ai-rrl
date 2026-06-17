export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const ERROR_MAP: Record<string, { message: string; httpStatus: number }> = {
  QUOTA_EXHAUSTED:     { message: 'QUOTA_EXHAUSTED:当前DeepSeek接口调用额度已耗尽，可更换API Key后继续使用', httpStatus: 402 },
  RATE_LIMITED:        { message: '请求太频繁，请稍后再试', httpStatus: 429 },
  MODEL_TIMEOUT:       { message: 'AI响应超时，请简化素材后重试', httpStatus: 504 },
  MODEL_ALL_FAILED:    { message: 'AI响应超时，请简化素材后重试', httpStatus: 504 },
  JSON_PARSE_ERROR:    { message: 'AI生成格式异常，请重新提交素材，或更换简历模板重试', httpStatus: 502 },
  SCHEMA_VALIDATE_ERROR: { message: 'AI生成格式异常，请重新提交素材，或更换简历模板重试', httpStatus: 502 },
  API_KEY_MISSING:     { message: '服务端未配置API密钥，请联系管理员', httpStatus: 500 },
  ENV_VALIDATE_ERROR:  { message: '', httpStatus: 500 },
  VECTOR_STORE_ERROR:  { message: '知识库检索异常，请检查上传文档格式', httpStatus: 502 },
  DB_SAVE_ERROR:       { message: '保存失败，请重试', httpStatus: 500 },
  DB_QUERY_ERROR:      { message: '查询失败，请重试', httpStatus: 500 },
  FILE_PARSE_ERROR:    { message: '文件解析失败，请检查内容格式', httpStatus: 400 },
  FILE_TOO_LARGE:      { message: '文件过大，请控制在 500KB 以内', httpStatus: 400 },
  FILE_FORMAT_ERROR:   { message: '不支持的文件格式，仅支持 txt、md', httpStatus: 400 },
  NETWORK_ERROR:       { message: '网络异常，请检查连接后重试', httpStatus: 0 },
  UNKNOWN:             { message: '服务器内部错误，请稍后重试', httpStatus: 500 },
};

export function classifyError(err: unknown): { code: string; message: string; httpStatus: number } {
  if (err instanceof AppError) {
    const mapped = ERROR_MAP[err.code] || ERROR_MAP.UNKNOWN;
    return { code: err.code, message: err.message || mapped.message, httpStatus: mapped.httpStatus };
  }
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg.includes('401') || msg.includes('402') || msg.includes('insufficient_quota') || msg.includes('rate_limit') || msg.includes('额度')) {
    return { code: 'QUOTA_EXHAUSTED', ...ERROR_MAP.QUOTA_EXHAUSTED, httpStatus: 429 };
  }
  if (msg.includes('abort') || msg.includes('timeout') || msg.includes('超时')) {
    return { code: 'MODEL_TIMEOUT', ...ERROR_MAP.MODEL_TIMEOUT };
  }
  if (msg.includes('403') || msg.includes('unauthorized') || msg.includes('apikey')) {
    return { code: 'API_KEY_MISSING', ...ERROR_MAP.API_KEY_MISSING };
  }
  if (msg.includes('env') || msg.includes('环境变量')) {
    return { code: 'ENV_VALIDATE_ERROR', ...ERROR_MAP.ENV_VALIDATE_ERROR, httpStatus: 500 };
  }
  if (msg.includes('解析') || msg.includes('parse') || msg.includes('格式异常')) {
    return { code: 'JSON_PARSE_ERROR', ...ERROR_MAP.JSON_PARSE_ERROR };
  }
  if (msg.includes('向量') || msg.includes('embedding') || msg.includes('rag')) {
    return { code: 'VECTOR_STORE_ERROR', ...ERROR_MAP.VECTOR_STORE_ERROR };
  }
  if (msg.includes('db') || msg.includes('database') || msg.includes('存储') || msg.includes('persist')) {
    return { code: 'DB_SAVE_ERROR', ...ERROR_MAP.DB_SAVE_ERROR };
  }
  if (msg.includes('429') || msg.includes('too many')) {
    return { code: 'RATE_LIMITED', ...ERROR_MAP.RATE_LIMITED };
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused')) {
    return { code: 'NETWORK_ERROR', ...ERROR_MAP.NETWORK_ERROR };
  }
  return { code: 'UNKNOWN', ...ERROR_MAP.UNKNOWN };
}
