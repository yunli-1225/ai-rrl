import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import type { ExperimentRecord, ExperimentStoreData, ExperimentGroup, ExperimentModel } from './types';

const MODULE = 'EXP-DB';
const DATA_DIR = path.join(process.cwd(), 'data', 'experiment');
const DATA_FILE = path.join(DATA_DIR, 'experiment-results.json');

let store: ExperimentStoreData | null = null;
let loaded = false;

async function getStore(): Promise<ExperimentStoreData> {
  if (loaded && store) return store;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    store = JSON.parse(raw) as ExperimentStoreData;
    loaded = true;
    logger.info(MODULE, `从文件加载 ${store.records.length} 条实验记录`);
  } catch {
    store = { version: 1, records: [], nextId: 1, updatedAt: new Date().toISOString() };
    loaded = true;
    logger.info(MODULE, '创建新实验数据库');
  }
  return store;
}

async function persist(): Promise<void> {
  if (!store) return;
  store.updatedAt = new Date().toISOString();
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function saveExperimentRecord(record: Omit<ExperimentRecord, 'id' | 'created_at'>): Promise<number> {
  const start = Date.now();
  try {
    const s = await getStore();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createdAt = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const r: ExperimentRecord = { id: s.nextId++, ...record, created_at: createdAt };
    s.records.push(r);
    await persist();
    logger.info(MODULE, `SAVE id=${r.id} group=${r.group} model=${r.model} round=${r.round} score=${r.score_total} error=${r.has_error}`, { latency: `${Date.now()-start}ms` });
    return r.id;
  } catch (err) {
    logger.error(MODULE, 'SAVE 失败', err);
    return -1;
  }
}

export async function listExperiments(limit = 200): Promise<ExperimentRecord[]> {
  const start = Date.now();
  try {
    const s = await getStore();
    const items = s.records.slice(-limit).reverse();
    logger.info(MODULE, `LIST ${items.length} 条`, { latency: `${Date.now()-start}ms` });
    return items;
  } catch (err) {
    logger.error(MODULE, 'LIST 失败', err);
    return [];
  }
}

export async function getExperimentsByGroup(group: ExperimentGroup, model: ExperimentModel): Promise<ExperimentRecord[]> {
  const s = await getStore();
  return s.records.filter(r => r.group === group && r.model === model);
}

export async function clearExperiments(): Promise<boolean> {
  const start = Date.now();
  try {
    const s = await getStore();
    s.records = [];
    s.nextId = 1;
    await persist();
    logger.info(MODULE, `CLEAR_ALL`, { latency: `${Date.now()-start}ms` });
    return true;
  } catch (err) {
    logger.error(MODULE, 'CLEAR 失败', err);
    return false;
  }
}

export async function deleteExperiment(id: number): Promise<boolean> {
  try {
    const s = await getStore();
    const before = s.records.length;
    s.records = s.records.filter(r => r.id !== id);
    if (s.records.length === before) return false;
    await persist();
    logger.info(MODULE, `DELETE id=${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function exportCSV(): Promise<string> {
  const items = await listExperiments(10000);
  const header = 'id,group,model,round,title,score_total,score_skill,score_experience,has_error,error_type,latency_ms,token_count,rag_keyword_hits,created_at';
  const rows = items.map(r =>
    `${r.id},${r.group},${r.model},${r.round},"${r.title.replace(/"/g,'""')}",${r.score_total},${r.score_skill},${r.score_experience},${r.has_error},"${r.error_type}",${r.latency_ms},${r.token_count},${r.rag_keyword_hits},"${r.created_at}"`
  );
  return [header, ...rows].join('\n');
}
