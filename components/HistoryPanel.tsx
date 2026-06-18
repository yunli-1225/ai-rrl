'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OptimizedResume } from '@/lib/schema';

// ===== localStorage 操作工具 =====

const HISTORY_KEY = 'ai-rrl-resume-history';

interface ResumeRecord {
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

interface ResumeListItem {
  id: number;
  title: string;
  score_total: number;
  model_preference: string;
  created_at: string;
}

function loadRecords(): ResumeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecords(records: ResumeRecord[]): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(records)); } catch {}
}

/** 供外部调用的保存函数（page.tsx 生成成功后调用） */
export function saveResumeToLocal(params: {
  title: string;
  resumeJson: string;
  jdText: string;
  template: string;
  userDataJson: string;
  scoreTotal: number;
  scoreSkill: number;
  scoreExperience: number;
  modelPreference?: string;
  ragKeywords?: string[];
}): void {
  const records = loadRecords();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const createdAt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const maxId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
  const record: ResumeRecord = {
    id: maxId + 1,
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
  records.unshift(record);
  saveRecords(records);
}

// ===== 历史面板组件 =====

interface Props {
  onReuse: (record: ResumeRecord) => void;
  refreshKey: number;
}

const PAGE_SIZE = 15;

export default function HistoryPanel({ onReuse, refreshKey }: Props) {
  const [items, setItems] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ResumeRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchList = useCallback((p: number) => {
    setLoading(true);
    setError(null);
    try {
      const records = loadRecords();
      const totalRecords = records.length;
      const totalPg = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
      const clampedPage = Math.max(1, Math.min(p, totalPg));
      const offset = (clampedPage - 1) * PAGE_SIZE;
      const list: ResumeListItem[] = records.slice(offset, offset + PAGE_SIZE).map(r => ({
        id: r.id, title: r.title, score_total: r.score_total,
        model_preference: r.model_preference, created_at: r.created_at,
      }));
      setItems(list);
      setTotalPages(totalPg);
      setTotal(totalRecords);
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList(page);
  }, [fetchList, page, refreshKey]);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    setDetail(null);
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除这条历史记录？')) return;
    const records = loadRecords();
    const filtered = records.filter(r => r.id !== id);
    saveRecords(filtered);
    if (detail?.id === id) setDetail(null);
    fetchList(page);
  };

  const handleClearAll = () => {
    if (!confirm('确定清空全部历史记录？此操作不可恢复。')) return;
    saveRecords([]);
    setItems([]);
    setTotal(0);
    setTotalPages(1);
    setPage(1);
    setDetail(null);
  };

  const handleView = (id: number) => {
    if (detail?.id === id) { setDetail(null); return; }
    const records = loadRecords();
    const record = records.find(r => r.id === id) || null;
    setDetail(record);
  };

  const modelLabel = () => 'DeepSeek';
  const scoreColor = (s: number) => s >= 80 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="history-panel">
      <div className="history-header">
        <span className="history-title">📋 历史简历 <span className="history-count">({total})</span></span>
        <div className="history-header-actions">
          {total > 0 && (
            <button className="btn btn-xs btn-danger" onClick={handleClearAll} style={{ marginRight: 6 }}>🗑️ 清空</button>
          )}
          <button className="btn btn-sm btn-secondary" onClick={() => fetchList(page)} disabled={loading}>
            {loading ? '🔄' : '🔄 刷新'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!loading && total === 0 && (
        <div className="history-empty">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
          <div>暂无历史记录</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-muted)' }}>生成简历后自动保存到此</div>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="history-empty"><span className="spinner" /> 加载中...</div>
      )}

      {items.length > 0 && (
        <>
          <div className="history-list">
            {items.map(item => (
              <div
                key={item.id}
                className={`history-item ${detail?.id === item.id ? 'active' : ''}`}
                onClick={() => handleView(item.id)}
              >
                <div className="history-item-main">
                  <div className="history-item-title">{item.title}</div>
                  <div className="history-item-meta">
                    {item.created_at}
                    <span className="history-item-model">{modelLabel()}</span>
                  </div>
                </div>
                <div className="history-item-score" style={{ color: scoreColor(item.score_total) }}>
                  {item.score_total}
                </div>
                <button className="btn btn-xs btn-danger" onClick={(e) => handleDelete(item.id, e)} title="删除">✕</button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="history-pagination">
              <button className="btn btn-xs btn-secondary" onClick={() => goPage(page - 1)} disabled={page <= 1}>◀ 上一页</button>
              <span className="history-page-info">{page} / {totalPages}</span>
              <button className="btn btn-xs btn-secondary" onClick={() => goPage(page + 1)} disabled={page >= totalPages}>下一页 ▶</button>
            </div>
          )}
        </>
      )}

      {detail && (
        <div className="history-detail">
          <div className="history-detail-header">
            <span>📄 简历详情</span>
            <div className="history-detail-actions">
              <button className="btn btn-sm btn-primary" onClick={() => onReuse(detail)}>🔄 复用此简历</button>
            </div>
          </div>
          <div className="history-detail-info">
            <div><strong>标题：</strong>{detail.title}</div>
            <div><strong>模板：</strong>{detail.template}</div>
            <div><strong>选用模型：</strong><span className="tag-model">{modelLabel()}</span></div>
            <div><strong>评分：</strong>
              <span style={{ color: scoreColor(detail.score_total) }}>
                总分 {detail.score_total} / 技能 {detail.score_skill} / 经验 {detail.score_experience}
              </span>
            </div>
            {detail.rag_keywords && detail.rag_keywords.length > 0 && (
              <div><strong>RAG 检索关键词：</strong>
                <div className="history-tags">{detail.rag_keywords.map((kw, i) => <span key={i} className="tag">{kw}</span>)}</div>
              </div>
            )}
            <div><strong>JD 内容：</strong>
              <div className="history-detail-jd">{detail.jd_text || '(无)'}</div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .history-panel { padding: 0; }
        .history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 4px 0; }
        .history-title { font-weight: 600; font-size: 0.95rem; }
        .history-count { font-weight: 400; font-size: 0.8rem; color: var(--text-muted); }
        .history-header-actions { display: flex; align-items: center; }
        .history-empty { text-align: center; padding: 40px 16px; color: var(--text-muted); }
        .history-list { display: flex; flex-direction: column; gap: 6px; }
        .history-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.15s; }
        .history-item:hover { border-color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .history-item.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 6%, transparent); }
        .history-item-main { flex: 1; min-width: 0; }
        .history-item-title { font-weight: 500; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .history-item-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 6px; }
        .history-item-model { font-size: 0.65rem; background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px; }
        .history-item-score { font-weight: 700; font-size: 1.1rem; min-width: 32px; text-align: center; }
        .history-pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 12px; }
        .history-page-info { font-size: 0.8rem; color: var(--text-muted); min-width: 60px; text-align: center; }
        .history-detail { margin-top: 14px; padding: 14px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; }
        .history-detail-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 600; }
        .history-detail-actions { display: flex; gap: 6px; }
        .history-detail-info { font-size: 0.85rem; line-height: 1.7; }
        .history-detail-jd { background: var(--bg); padding: 8px 10px; border-radius: 6px; margin-top: 4px; max-height: 100px; overflow-y: auto; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all; }
        .history-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
        .tag { font-size: 0.7rem; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; }
        .tag-model { font-size: 0.75rem; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; }
      `}</style>
    </div>
  );
}
