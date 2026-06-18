/** Edge Runtime 兼容的数据持久化 — 不支持 fs 时回落为纯内存存储 */

let hasFs = true;
let fs: any, path: any;
let DATA_DIR = '', DATA_FILE = '';
try {
  fs = require('fs');
  path = require('path');
  DATA_DIR = path.join(process.cwd(), 'data', 'db');
  DATA_FILE = path.join(DATA_DIR, 'resume-history.json');
} catch {
  hasFs = false;
}

import { logger } from '@/lib/logger';

const MODULE = 'DB';

// ========== 类型定义 ==========

export interface ResumeRecord {
  id: number;
  title: string;
  resume_json: string;
  jd_text: string;
  template: string;
  user_data_json: string;
  score_total: number;
  score_skill: number;
  score_experience: number;
  model_preference: string;
  rag_keywords: string[];
  created_at: string;
}

export interface ResumeListItem {
  id: number;
  title: string;
  score_total: number;
  model_preference: string;
  created_at: string;
}

interface StoreData {
  version: number;
  records: ResumeRecord[];
  nextId: number;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========== 内存状态 ==========

let store: StoreData | null = null;
let loaded = false;

async function loadFromFs(): Promise<StoreData | null> {
  if (!hasFs) return null;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw) as StoreData;
    let upgraded = false;
    for (const r of data.records) {
      if (!('model_preference' in r)) { (r as any).model_preference = 'deepseek'; upgraded = true; }
      if (!('rag_keywords' in r)) { (r as any).rag_keywords = []; upgraded = true; }
    }
    if (upgraded) await persistToFs(data);
    logger.info(MODULE, `从文件加载 ${data.records.length} 条记录`);
    return data;
  } catch {
    return null;
  }
}

async function persistToFs(data: StoreData): Promise<void> {
  if (!hasFs || !data) return;
  data.updatedAt = new Date().toISOString();
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* silent */ }
}

async function getStore(): Promise<StoreData> {
  if (loaded && store) return store;
  store = await loadFromFs() || { version: 2, records: [], nextId: 1, updatedAt: new Date().toISOString() };
  loaded = true;
  return store;
}

async function persist(): Promise<void> {
  if (!store) return;
  store.updatedAt = new Date().toISOString();
  await persistToFs(store);
}

// ========== CRUD ==========

// ‒ 插入单条 ‒
export async function saveResume(params: {
  resumeJson: string;
  jdText: string;
  template: string;
  userDataJson: string;
  title: string;
  scoreTotal: number;
  scoreSkill: number;
  scoreExperience: number;
  modelPreference?: string;
  ragKeywords?: string[];
}): Promise<number> {
  const start = Date.now();
  try {
    const s = await getStore();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const record: ResumeRecord = {
      id: s.nextId++,
      title: params.title || '未命名简历',
      resume_json: params.resumeJson,
      jd_text: params.jdText || '',
      template: params.template || 'zh-classic',
      user_data_json: params.userDataJson || '{}',
      score_total: params.scoreTotal,
      score_skill: params.scoreSkill,
      score_experience: params.scoreExperience,
      model_preference: params.modelPreference || 'deepseek',
      rag_keywords: params.ragKeywords || [],
      created_at: createdAt,
    };
    s.records.unshift(record);
    await persist();
    const elapsed = Date.now() - start;
    logger.info(MODULE, `SAVE id=${record.id} title="${record.title}" 评分=${record.score_total} 模型=${record.model_preference}`, { latency: `${elapsed}ms` });
    return record.id;
  } catch (err) {
    logger.error(MODULE, `SAVE 失败 title="${params.title}"`, err);
    return -1;
  }
}

// ‒ 分页查询 ‒
export async function listResumesPaginated(page = 1, pageSize = 20): Promise<PaginatedResult<ResumeListItem>> {
  const start = Date.now();
  try {
    const s = await getStore();
    const total = s.records.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    const offset = (clampedPage - 1) * pageSize;
    const items: ResumeListItem[] = s.records.slice(offset, offset + pageSize).map(r => ({
      id: r.id,
      title: r.title,
      score_total: r.score_total,
      model_preference: r.model_preference,
      created_at: r.created_at,
    }));
    const elapsed = Date.now() - start;
    logger.info(MODULE, `LIST page=${clampedPage}/${totalPages} size=${pageSize} total=${total}`, { latency: `${elapsed}ms` });
    return { items, total, page: clampedPage, pageSize, totalPages };
  } catch (err) {
    logger.error(MODULE, 'LIST 失败', err);
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }
}

// ‒ 兼容旧版: 全量查询（最多 200 条） ‒
export async function listResumes(limit = 200): Promise<ResumeListItem[]> {
  const result = await listResumesPaginated(1, limit);
  return result.items;
}

// ‒ 单条详情 ‒
export async function getResume(id: number): Promise<ResumeRecord | null> {
  const start = Date.now();
  try {
    const s = await getStore();
    const record = s.records.find(r => r.id === id) || null;
    const elapsed = Date.now() - start;
    if (record) {
      logger.info(MODULE, `GET id=${id} title="${record.title}"`, { latency: `${elapsed}ms` });
    } else {
      logger.info(MODULE, `GET id=${id} 未找到`, { latency: `${elapsed}ms` });
    }
    return record;
  } catch (err) {
    logger.error(MODULE, `GET id=${id} 失败`, err);
    return null;
  }
}

// ‒ 删除单条 ‒
export async function deleteResume(id: number): Promise<boolean> {
  const start = Date.now();
  try {
    const s = await getStore();
    const before = s.records.length;
    s.records = s.records.filter(r => r.id !== id);
    if (s.records.length === before) {
      logger.info(MODULE, `DELETE id=${id} 未找到`, { latency: `${Date.now() - start}ms` });
      return false;
    }
    await persist();
    const elapsed = Date.now() - start;
    logger.info(MODULE, `DELETE id=${id}`, { latency: `${elapsed}ms` });
    return true;
  } catch (err) {
    logger.error(MODULE, `DELETE id=${id} 失败`, err);
    return false;
  }
}

// ‒ 清空全部 ‒
export async function clearAllResumes(): Promise<boolean> {
  const start = Date.now();
  try {
    const s = await getStore();
    const before = s.records.length;
    s.records = [];
    s.nextId = 1;
    await persist();
    const elapsed = Date.now() - start;
    logger.info(MODULE, `CLEAR_ALL 清空 ${before} 条记录`, { latency: `${elapsed}ms` });
    return true;
  } catch (err) {
    logger.error(MODULE, 'CLEAR_ALL 失败', err);
    return false;
  }
}

// ‒ 总条数 ‒
export async function countResumes(): Promise<number> {
  try {
    const s = await getStore();
    return s.records.length;
  } catch {
    return 0;
  }
}
