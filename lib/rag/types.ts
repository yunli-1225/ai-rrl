/**
 * ============================================================
 * RAG（检索增强生成）类型定义
 * ============================================================
 *
 *  文档分块 ──→ 向量编码 ──→ 向量存储 ──→ 相似度召回 ──→ Prompt 增强
 *  (chunker)   (embeddings)  (vectorStore)  (retriever)    (prompts.ts)
 *
 * ============================================================
 */

/** 文档来源类型 */
export type DocSource = 'jd-library' | 'ats-rules';

/** 文档来源文件 */
export interface SourceFile {
  filename: string;
  type: DocSource;
}

/** 文档分块元数据 */
export interface ChunkMetadata {
  source: string;
  type: DocSource;
  chunkIndex: number;
  totalChunks: number;
}

/** 单个文档分块（文本 + 元数据） */
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

/** 向量记录 —— 持久化到磁盘的核心单元 */
export interface VectorRecord {
  id: string;
  vector: number[];
  text: string;
  metadata: ChunkMetadata;
}

/** 检索结果条目 */
export interface SearchResult {
  text: string;
  metadata: ChunkMetadata;
  score: number;
}

/**
 * RAG 上下文 —— 最终注入到 LLM Prompt 的结构化信息
 * 由 retriever.retrieve() 产出，被 prompts.ts 消费
 */
export interface RAGContext {
  /** 从 JD 库中检索到的岗位关键词 / 技能要求 */
  keywords: string[];
  /** 从 ATS 规则库中检索到的筛选规则提示 */
  atsRules: string[];
  /** 相关行业 JD 片段（原文，供 LLM 参考用语风格） */
  relatedJdSnippets: string[];
}

/** 向量存储快照 —— 序列化到 JSON 文件的格式 */
export interface StoreSnapshot {
  version: number;
  records: VectorRecord[];
  sources: SourceFile[];
  updatedAt: string;
}
