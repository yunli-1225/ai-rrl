import { logger } from '@/lib/logger';

const MODULE = 'FileParser';
const MAX_CHUNK_SIZE = 3000;
const OVERLAP_CHARS = 200;

export interface ParsedResume {
  chunks: string[];
  totalLength: number;
  chunkCount: number;
}

export function parseLongResume(rawText: string): ParsedResume {
  const text = rawText.trim();
  if (!text) {
    logger.warn(MODULE, '简历文本为空');
    return { chunks: [], totalLength: 0, chunkCount: 0 };
  }

  if (text.length <= MAX_CHUNK_SIZE) {
    logger.info(MODULE, `简历文本较短 (${text.length}字符)，无需分片`);
    return { chunks: [text], totalLength: text.length, chunkCount: 1 };
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + MAX_CHUNK_SIZE;

    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }

    const slice = text.slice(start, end);
    const lastBreak = Math.max(
      slice.lastIndexOf('\n'),
      slice.lastIndexOf('。'),
      slice.lastIndexOf('！'),
      slice.lastIndexOf('？'),
    );

    const breakPos = lastBreak > MAX_CHUNK_SIZE * 0.5 ? lastBreak : MAX_CHUNK_SIZE;
    end = start + breakPos + 1;

    chunks.push(text.slice(start, end));
    start = end - OVERLAP_CHARS;
  }

  logger.info(MODULE, `简历文本分片完成`, { total: text.length, chunks: chunks.length });
  return { chunks, totalLength: text.length, chunkCount: chunks.length };
}

export function mergeParsedContent(chunks: string[]): string {
  return chunks.join('\n');
}
