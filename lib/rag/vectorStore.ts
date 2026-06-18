/**
 * ============================================================
 * 本地向量存储 (Local Vector Store)
 * Edge Runtime 兼容 — 不支持 fs 时回落为纯内存存储
 * ============================================================
 */

let hasFs = true;
let fs: any, path: any;
let STORE_FILE = '';
try {
  fs = require('fs');
  path = require('path');
  STORE_FILE = path.join(process.cwd(), 'data', 'rag', 'vector-store.json');
} catch {
  hasFs = false;
}

import type { VectorRecord, SourceFile, StoreSnapshot } from './types';

/** 内存向量库 */
let records: VectorRecord[] = [];
let sources: SourceFile[] = [];
let loaded = false;

/**
 * 从磁盘加载向量库
 */
export async function loadFromDisk(): Promise<void> {
  if (!hasFs) {
    records = [];
    sources = [];
    loaded = true;
    console.log('[RAG VectorStore] Edge 模式，使用空向量库');
    return;
  }
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf-8');
    const snapshot: StoreSnapshot = JSON.parse(raw);
    records = snapshot.records || [];
    sources = snapshot.sources || [];
    loaded = true;
    console.log(`[RAG VectorStore] 已加载 ${records.length} 条向量记录, ${sources.length} 个来源`);
  } catch {
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
  if (!hasFs) return;
  const snapshot: StoreSnapshot = {
    version: 1,
    records,
    sources,
    updatedAt: new Date().toISOString(),
  };
  try {
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(snapshot, null, 2), 'utf-8');
  } catch { /* silent */ }
}

/**
 * 批量添加向量记录
 */
export async function addRecords(newRecords: VectorRecord[]): Promise<void> {
  if (!loaded) await loadFromDisk();

  const existingIds = new Set(records.map(r => r.id));
  const deduped = newRecords.filter(r => !existingIds.has(r.id));

  if (deduped.length === 0) return;

  records.push(...deduped);

  for (const r of deduped) {
    const exists = sources.some(s => s.filename === r.metadata.source && s.type === r.metadata.type);
    if (!exists) {
      sources.push({ filename: r.metadata.source, type: r.metadata.type });
    }
  }

  await persistToDisk();
}

export function getAllRecords(): VectorRecord[] {
  return records;
}

export function getSources(): SourceFile[] {
  return sources;
}

export function getRecordsByType(type: 'jd-library' | 'ats-rules'): VectorRecord[] {
  return records.filter(r => r.metadata.type === type);
}

export function getStats(): { totalRecords: number; totalSources: number; jdCount: number; atsCount: number } {
  return {
    totalRecords: records.length,
    totalSources: sources.length,
    jdCount: records.filter(r => r.metadata.type === 'jd-library').length,
    atsCount: records.filter(r => r.metadata.type === 'ats-rules').length,
  };
}

export async function clearAll(): Promise<void> {
  records = [];
  sources = [];
  await persistToDisk();
}

export async function removeBySource(filename: string): Promise<number> {
  const before = records.length;
  records = records.filter(r => r.metadata.source !== filename);
  sources = sources.filter(s => s.filename !== filename);
  const removed = before - records.length;
  if (removed > 0) await persistToDisk();
  return removed;
}
