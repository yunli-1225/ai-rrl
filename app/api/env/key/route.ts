// export const runtime = "edge";
import { NextRequest, NextResponse } from 'next/server';
import { setTempApiKey } from '@/lib/ai/factory';
import { logger } from '@/lib/logger';

const MODULE = 'EnvAPI';

/**
 * POST /api/env/key
 * Body: { "apiKey": "sk-xxxx" }
 * 运行时临时替换 DeepSeek API Key（仅内存生效，不写入 .env 文件）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json({ error: 'API Key 格式无效' }, { status: 400 });
    }

    setTempApiKey(apiKey.trim());
    logger.info(MODULE, '用户通过前端界面更新了临时 API Key');

    return NextResponse.json({ ok: true, message: 'API Key 已更新，立即生效' });
  } catch (err: any) {
    logger.error(MODULE, '更新 API Key 失败', err);
    return NextResponse.json({ error: err.message || '更新失败' }, { status: 500 });
  }
}
