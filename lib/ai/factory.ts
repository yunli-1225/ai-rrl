import { logger } from '@/lib/logger';

const MODULE = 'AI';

export interface AIResult {
  content: string;
  latencyMs: number;
  tokens: number;
  error?: string;
}

/** 运行时临时 API Key 覆盖 */
let overrideApiKey: string | null = null;

export function setTempApiKey(key: string): void {
  overrideApiKey = key;
  logger.info(MODULE, '临时 API Key 已更新（运行时生效，不写入 .env）');
}

export function getEffectiveApiKey(): string {
  return overrideApiKey || process.env.DEEPSEEK_API_KEY || '';
}

function getDeepSeekConfig(stream = false) {
  return {
    apiUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1') + '/chat/completions',
    apiKey: getEffectiveApiKey(),
    model: 'deepseek-chat',
    label: 'DeepSeek',
    stream,
  };
}

export function validateEnvOrThrow(): void {
  const missing: string[] = [];
  if (!process.env.DEEPSEEK_API_KEY && !overrideApiKey) missing.push('DEEPSEEK_API_KEY');
  if (!process.env.DEEPSEEK_BASE_URL) missing.push('DEEPSEEK_BASE_URL');
  if (missing.length > 0) {
    throw new Error(`环境变量缺失: ${missing.join(', ')}。请配置 DeepSeek API 密钥和接口地址。`);
  }
  logger.info(MODULE, '环境变量校验通过');
}

export async function callDeepSeek(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeoutMs: number,
): Promise<AIResult> {
  const config = getDeepSeekConfig(false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });

    const elapsed = Date.now() - start;

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      logger.error(MODULE, `DeepSeek 错误(${status})`, { latency: elapsed, text: text.slice(0, 200) });
      if (status === 402 || status === 429 || text.toLowerCase().includes('insufficient_quota') || text.toLowerCase().includes('rate limit')) {
        throw new Error('DeepSeek_QUOTA_EXHAUSTED');
      }
      throw new Error(`DeepSeek API 调用失败: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokens = data.usage?.total_tokens || 0;

    if (!content) throw new Error('DeepSeek 返回为空');

    logger.info(MODULE, `DeepSeek 调用成功`, { latency: `${elapsed}ms`, tokens });
    return { content, latencyMs: elapsed, tokens };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    if (err.name === 'AbortError') {
      logger.warn(MODULE, 'DeepSeek 超时', { latency: elapsed });
      throw new Error('AI响应超时，请简化素材后重试');
    }
    if (err.message === 'DeepSeek_QUOTA_EXHAUSTED') throw err;
    logger.error(MODULE, 'DeepSeek 调用异常', { latency: elapsed, error: err.message });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 流式调用 DeepSeek API，通过 onChunk 回调逐段返回生成的文本。
 * 用于 Phase 2 实时打字预览效果。
 */
export async function callDeepSeekStream(
  messages: { role: string; content: string }[],
  maxTokens: number,
  timeoutMs: number,
  onChunk: (text: string) => void,
): Promise<{ content: string; tokens: number }> {
  const config = getDeepSeekConfig(true);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  let fullContent = '';
  let totalTokens = 0;

  try {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.3,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const status = response.status;
      logger.error(MODULE, `DeepSeek 流式错误(${status})`, { text: text.slice(0, 200) });
      if (status === 402 || status === 429 || text.toLowerCase().includes('insufficient_quota') || text.toLowerCase().includes('rate limit')) {
        throw new Error('DeepSeek_QUOTA_EXHAUSTED');
      }
      throw new Error(`DeepSeek API 调用失败: ${status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('DeepSeek 流式响应无 body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullContent += delta;
            onChunk(delta);
          }
          const usage = parsed.usage;
          if (usage?.total_tokens) totalTokens = usage.total_tokens;
        } catch {
          // Skip unparseable chunks (e.g. keepalive pings)
        }
      }
    }

    const elapsed = Date.now() - start;
    logger.info(MODULE, `DeepSeek 流式调用完成`, { latency: `${elapsed}ms`, chars: fullContent.length, tokens: totalTokens });
    return { content: fullContent, tokens: totalTokens };
  } catch (err: any) {
    const elapsed = Date.now() - start;
    if (err.name === 'AbortError') {
      logger.warn(MODULE, 'DeepSeek 流式超时', { latency: elapsed });
      throw new Error('AI响应超时，请简化素材后重试');
    }
    if (err.message === 'DeepSeek_QUOTA_EXHAUSTED') throw err;
    logger.error(MODULE, 'DeepSeek 流式异常', { latency: elapsed, error: err.message });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
