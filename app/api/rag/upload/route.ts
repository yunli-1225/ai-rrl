// export const runtime = "edge";
import { NextRequest, NextResponse } from 'next/server';
import { chunkDocument, embedTexts, addRecords, loadFromDisk, getStats, clearAll, removeBySource, getSources } from '@/lib/rag';
import type { VectorRecord } from '@/lib/rag';
import { logger } from '@/lib/logger';

const MODULE = 'RAG-API';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content, filename } = body;

    if (!type || !['jd-library', 'ats-rules'].includes(type)) {
      return NextResponse.json({ error: 'type 必须为 jd-library 或 ats-rules' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.length < 20) {
      return NextResponse.json({ error: 'content 过短，至少 20 个字符' }, { status: 400 });
    }
    if (!filename) {
      return NextResponse.json({ error: '缺少 filename' }, { status: 400 });
    }

    await loadFromDisk();
    const chunks = chunkDocument(content, filename, type);
    if (chunks.length === 0) {
      return NextResponse.json({ error: '文档分块失败，内容可能为空' }, { status: 400 });
    }

    const texts = chunks.map(c => c.text);
    const vectors = await embedTexts(texts);
    const records: VectorRecord[] = chunks.map((chunk, i) => ({
      id: chunk.id,
      vector: vectors[i] || [],
      text: chunk.text,
      metadata: chunk.metadata,
    }));

    const validRecords = records.filter(r => r.vector.some(v => v !== 0));
    if (validRecords.length === 0) {
      return NextResponse.json({ error: '向量编码失败，所有向量为空' }, { status: 502 });
    }

    await addRecords(validRecords);
    const stats = getStats();

    logger.info(MODULE, `上传成功`, { filename, chunks: validRecords.length, type, total: stats.totalRecords });

    return NextResponse.json({
      ok: true,
      chunks: validRecords.length,
      total: stats.totalRecords,
      sources: stats.totalSources,
      type,
      filename,
    });
  } catch (err: any) {
    logger.error(MODULE, '上传失败', err);
    return NextResponse.json({ error: err.message || '知识库上传失败' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await loadFromDisk();
    const stats = getStats();
    const sources = getSources();
    return NextResponse.json({ ok: true, ...stats, sources });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    const clear = searchParams.get('clear');

    await loadFromDisk();

    if (clear === 'true') {
      await clearAll();
      logger.info(MODULE, '已清空全部知识库');
      return NextResponse.json({ ok: true, action: 'cleared' });
    }

    if (filename) {
      const removed = await removeBySource(filename);
      logger.info(MODULE, `已删除文档`, { filename, removedChunks: removed });
      return NextResponse.json({ ok: true, action: 'deleted', filename, removed });
    }

    return NextResponse.json({ error: '请指定 filename 或 clear=true' }, { status: 400 });
  } catch (err: any) {
    logger.error(MODULE, '删除失败', err);
    return NextResponse.json({ error: err.message || '删除失败' }, { status: 500 });
  }
}
