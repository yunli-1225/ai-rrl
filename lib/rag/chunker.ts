/**
 * ============================================================
 * 文档分块工具 (Document Chunker)
 * ============================================================
 *
 * RAG 流程第一步：将长篇文档切分为语义完整的短文本块。
 * 每个块保留原始上下文，支持滑动窗口重叠。
 *
 * 分块策略（针对中文优化）：
 *   1. 按句子边界切分（。！？；\n）
 *   2. 将句子聚合成块，每块约 200-500 字
 *   3. 相邻块保留 1-2 句重叠，保证上下文连续
 *
 * ============================================================
 */

import type { DocumentChunk, DocSource } from './types';

interface ChunkerOptions {
  /** 目标块大小（字符数），默认 400 */
  chunkSize: number;
  /** 块与块之间的重叠字符数，默认 80 */
  overlap: number;
  /** 最小块字符数，低于此值与前一块合并，默认 50 */
  minChunkSize: number;
}

const DEFAULT_OPTIONS: ChunkerOptions = {
  chunkSize: 400,
  overlap: 80,
  minChunkSize: 50,
};

/**
 * 按中英文句子边界拆分文本
 * 支持：
 *   - 中文句号、问号、感叹号、分号、冒号
 *   - 英文句点、问号、感叹号
 *   - 换行符（段落分隔）
 */
function splitSentences(text: string): string[] {
  const raw = text
    // 统一换行符
    .replace(/\r\n/g, '\n')
    // 多个连续换行压缩为段落标记
    .replace(/\n{2,}/g, '\n')
    .trim();

  if (!raw) return [];

  // 按中英文句子边界分割
  const segments = raw.split(/(?<=[。！？；：.!?;\n])\s*/);
  return segments.map(s => s.trim()).filter(Boolean);
}

/**
 * 将文本分块
 * @param text       - 原始文档全文
 * @param source     - 来源文件名
 * @param type       - 文档类型（jd-library / ats-rules）
 * @param options    - 分块参数
 */
export function chunkDocument(
  text: string,
  source: string,
  type: DocSource,
  options?: Partial<ChunkerOptions>,
): DocumentChunk[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sentences = splitSentences(text);

  if (sentences.length === 0) return [];

  const chunks: DocumentChunk[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;
  let overlapSentences: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceLen = sentence.length;

    // 如果当前块加上这句话超出目标大小，先保存当前块
    if (currentLength + sentenceLen > opts.chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join('');
      if (chunkText.length >= opts.minChunkSize) {
        chunks.push({
          id: `${source}:${chunks.length}`,
          text: chunkText,
          metadata: {
            source,
            type,
            chunkIndex: chunks.length,
            totalChunks: 0, // 暂填，下面重新赋值
          },
        });
      }

      // 滑动窗口：保留末尾句子作为重叠
      overlapSentences = getOverlapSentences(currentChunk, opts.overlap);
      currentChunk = [...overlapSentences];
      currentLength = currentChunk.reduce((sum, s) => sum + s.length, 0);
    }

    currentChunk.push(sentence);
    currentLength += sentenceLen;
  }

  // 处理最后一个块
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('');
    if (chunkText.length >= opts.minChunkSize) {
      chunks.push({
        id: `${source}:${chunks.length}`,
        text: chunkText,
        metadata: {
          source,
          type,
          chunkIndex: chunks.length,
          totalChunks: 0,
        },
      });
    }
  }

  // 修正 totalChunks
  return chunks.map((chunk, _, all) => ({
    ...chunk,
    metadata: { ...chunk.metadata, totalChunks: all.length },
  }));
}

/**
 * 从句子数组中提取末尾部分作为重叠窗口
 */
function getOverlapSentences(sentences: string[], overlapLen: number): string[] {
  const result: string[] = [];
  let len = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i];
    if (len + s.length > overlapLen && result.length > 0) break;
    result.unshift(s);
    len += s.length;
  }
  return result;
}

/**
 * 将多条文档批量分块
 */
export function chunkDocuments(
  documents: { text: string; filename: string; type: DocSource }[],
  options?: Partial<ChunkerOptions>,
): DocumentChunk[] {
  return documents.flatMap(doc =>
    chunkDocument(doc.text, doc.filename, doc.type, options),
  );
}
