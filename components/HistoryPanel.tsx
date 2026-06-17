'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OptimizedResume } from '@/lib/schema';

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

interface Props {
  onReuse: (record: ResumeRecord) => void;
  refreshKey: number;
}

const PAGE_SIZE = 15;

export default function HistoryPanel({ onReuse, refreshKey }: Props) {
  const [items, setItems] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<ResumeRecord | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchList = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/resume?page=${p}&pageSize=${PAGE_SIZE}`);
      const json = await res.json();
      if (json.ok) {
        setItems(json.items || []);
        setTotalPages(json.totalPages || 1);
        setTotal(json.total || 0);
      } else {
        setError(json.error || '加载失败');
      }
    } catch {
      setError('网络异常，请重试');
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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定删除这条历史记录？')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/resume?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setItems(prev => prev.filter(item => item.id !== id));
        setTotal(t => t - 1);
        if (detail?.id === id) setDetail(null);
      } else {
        alert(json.error || '删除失败');
      }
    } catch {
      alert('删除失败');
    } finally {
      setDeleting(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定清空全部历史记录？此操作不可恢复。')) return;
    try {
      const res = await fetch('/api/resume?clear=true', { method: 'DELETE' });
      const json = await res.json();
      if (json.ok) {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setPage(1);
        setDetail(null);
      } else {
        alert(json.error || '清空失败');
      }
    } catch {
      alert('清空失败');
    }
  };

  const handleView = async (id: number) => {
    if (detail?.id === id) { setDetail(null); return; }
    try {
      const res = await fetch(`/api/resume?id=${id}`);
      const json = await res.json();
      if (json.ok && json.record) setDetail(json.record);
    } catch {
      alert('加载详情失败');
    }
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
                <button className="btn btn-xs btn-danger" onClick={(e) => handleDelete(item.id, e)} disabled={deleting === item.id} title="删除">✕</button>
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
