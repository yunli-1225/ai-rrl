import { logger } from '@/lib/logger';

const MODULE = 'Embedding';
export const EMBEDDING_DIM = 1024;
const BATCH_SIZE = 16;

async function callDeepSeekEmbedding(inputs: string[]): Promise<number[][]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

  const response = await fetch(baseUrl + '/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: 'deepseek-embedding', input: inputs }),
  });

  if (!response.ok) {
    logger.warn(MODULE, `DeepSeek Embedding API 错误 (${response.status})`);
    return [];
  }

  const data = await response.json();
  return (data.data || []).map((item: any) => item.embedding);
}

function fallbackEmbed(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  const chars = text.toLowerCase().replace(/\s+/g, '');
  const grams: string[] = [];
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i <= chars.length - n; i++) {
      grams.push(chars.slice(i, i + n));
    }
  }
  for (const gram of grams) {
    let hash = 0;
    for (let i = 0; i < gram.length; i++) {
      hash = ((hash << 5) - hash) + gram.charCodeAt(i);
      hash |= 0;
    }
    vec[Math.abs(hash) % EMBEDDING_DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const vectors = await callDeepSeekEmbedding([text]);
    if (vectors.length > 0 && vectors[0].length > 0) {
      return vectors[0];
    }
  } catch (err) {
    logger.warn(MODULE, 'DeepSeek Embedding 调用失败', err);
  }
  logger.warn(MODULE, '降级到本地向量');
  return fallbackEmbed(text);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const vectors = await callDeepSeekEmbedding(batch);
      if (vectors.length === batch.length) {
        results.push(...vectors);
      } else {
        results.push(...batch.map(t => fallbackEmbed(t)));
      }
    } catch {
      results.push(...batch.map(t => fallbackEmbed(t)));
    }
  }
  return results;
}
