/** Edge Runtime 兼容的实验数据持久化 */

let hasFs = true;
let fs: any, path: any;
let DATA_DIR = '', DATA_FILE = '';
try {
  fs = require('fs');
  path = require('path');
  DATA_DIR = path.join(process.cwd(), 'data', 'experiment');
  DATA_FILE = path.join(DATA_DIR, 'experiment-results.json');
} catch {
  hasFs = false;
}

import { logger } from '@/lib/logger';
import type { ExperimentRecord, ExperimentStoreData, ExperimentGroup, ExperimentModel } from './types';

const MODULE = 'EXP-DB';

let store: ExperimentStoreData | null = null;
let loaded = false;

async function getStore(): Promise<ExperimentStoreData> {
  if (loaded && store) return store;
  if (hasFs) {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const raw = await fs.readFile(DATA_FILE, 'utf-8');
      store = JSON.parse(raw) as ExperimentStoreData;
      loaded = true;
      logger.info(MODULE, `从文件加载 ${store.records.length} 条实验记录`);
      return store;
    } catch { /* fall through */ }
  }
  store = { version: 1, records: [], nextId: 1, updatedAt: new Date().toISOString() };
  loaded = true;
  logger.info(MODULE, '创建新实验数据库（内存模式）');
  return store;
}

async function persist(): Promise<void> {
  if (!store || !hasFs) return;
  store.updatedAt = new Date().toISOString();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch { /* silent */ }
}

export async function saveExperimentRecord(record: ExperimentRecord): Promise<number> {
  const s = await getStore();
  record.id = s.nextId++;
  s.records.unshift(record);
  await persist();
  logger.info(MODULE, `SAVE id=${record.id} model=${record.model} group=${record.group}`);
  return record.id;
}

export async function listExperiments(group?: string): Promise<ExperimentRecord[]> {
  const s = await getStore();
  let list = s.records;
  if (group) list = list.filter(r => r.group === group);
  return list;
}

export async function clearExperiments(): Promise<void> {
  const s = await getStore();
  s.records = [];
  s.nextId = 1;
  await persist();
  logger.info(MODULE, 'CLEAR_ALL');
}

export async function deleteExperiment(id: number): Promise<boolean> {
  const s = await getStore();
  const before = s.records.length;
  s.records = s.records.filter(r => r.id !== id);
  if (s.records.length < before) { await persist(); return true; }
  return false;
}

export async function exportCSV(): Promise<string> {
  const records = await listExperiments();
  const header = 'id,group,model,round,title,scoreTotal,scoreSkill,scoreExperience,latencyMs,tokens,errorType,createdAt';
  const rows = records.map(r => `"${r.id}","${r.group}","${r.model}","${r.round}","${r.title}","${r.score_total}","${r.score_skill}","${r.score_experience}","${r.latency_ms}","${r.token_count}","${r.error_type}","${r.created_at}"`);
  return [header, ...rows].join('\n');
}
