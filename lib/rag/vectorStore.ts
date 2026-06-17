/**
 * ============================================================
 * 本地向量存储 (Local Vector Store)
 * ============================================================
 *
 * RAG 流程第三步：将编码后的向量持久化到本地文件，
 * 支持增量添加、全量检索、重启恢复。
 *
 * 存储格式：data/rag/vector-store.json
 *   每次 addRecords() 自动落盘
 *   服务启动时 loadFromDisk() 恢复
 *
 * 结构：
 *   {
 *     version: 1,
 *     records: [{ id, vector, text, metadata }],
 *     sources: [{ filename, type }],
 *     updatedAt: "2026-06-16T..."
 *   }
 *
 * ============================================================
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { VectorRecord, SourceFile, StoreSnapshot } from './types';

/** 持久化文件路径 */
const STORE_FILE = path.join(process.cwd(), 'data', 'rag', 'vector-store.json');

/** 内存向量库 */
let records: VectorRecord[] = [];
let sources: SourceFile[] = [];
let loaded = false;

/**
 * 从磁盘加载向量库
 * 每次服务启动时调用
 */
export async function loadFromDisk(): Promise<void> {
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf-8');
    const snapshot: StoreSnapshot = JSON.parse(raw);
    records = snapshot.records || [];
    sources = snapshot.sources || [];
    loaded = true;
    console.log(`[RAG VectorStore] 已加载 ${records.length} 条向量记录, ${sources.length} 个来源`);
  } catch {
    // 首次启动，文件不存在属于正常情况
    records = [];
    sources = [];
    loaded = true;
    console.log('[RAG VectorStore] 初始化空向量库');
  }
}

/**
 * 持久化当前内存状态到磁盘
 */
async function persistToDisk(): Promise<void> {
  const snapshot: StoreSnapshot = {
    version: 1,
    records,
    sources,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
}

/**
 * 批量添加向量记录
 * @param newRecords - 向量记录列表
 */
export async function addRecords(newRecords: VectorRecord[]): Promise<void> {
  if (!loaded) await loadFromDisk();

  // 去重：已存在的 id 跳过
  const existingIds = new Set(records.map(r => r.id));
  const deduped = newRecords.filter(r => !existingIds.has(r.id));

  if (deduped.length === 0) return;

  records.push(...deduped);

  // 更新来源列表
  for (const r of deduped) {
    const exists = sources.some(s => s.filename === r.metadata.source && s.type === r.metadata.type);
    if (!exists) {
      sources.push({ filename: r.metadata.source, type: r.metadata.type });
    }
  }

  await persistToDisk();
}

/**
 * 获取所有向量记录
 */
export function getAllRecords(): VectorRecord[] {
  return records;
}

/**
 * 获取所有来源列表
 */
export function getSources(): SourceFile[] {
  return sources;
}

/**
 * 按来源类型过滤向量记录
 */
export function getRecordsByType(type: 'jd-library' | 'ats-rules'): VectorRecord[] {
  return records.filter(r => r.metadata.type === type);
}

/**
 * 获取向量库统计信息
 */
export function getStats(): { totalRecords: number; totalSources: number; jdCount: number; atsCount: number } {
  return {
    totalRecords: records.length,
    totalSources: sources.length,
    jdCount: records.filter(r => r.metadata.type === 'jd-library').length,
    atsCount: records.filter(r => r.metadata.type === 'ats-rules').length,
  };
}

/**
 * 清空向量库（重新索引时使用）
 */
export async function clearAll(): Promise<void> {
  records = [];
  sources = [];
  await persistToDisk();
}

/**
 * 删除指定来源的所有向量
 */
export async function removeBySource(filename: string): Promise<number> {
  const before = records.length;
  records = records.filter(r => r.metadata.source !== filename);
  sources = sources.filter(s => s.filename !== filename);
  const removed = before - records.length;
  if (removed > 0) await persistToDisk();
  return removed;
}
