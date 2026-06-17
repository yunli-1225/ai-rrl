'use client';

import { useState, useEffect, useCallback } from 'react';

interface SourceInfo {
  filename: string;
  type: string;
}

interface StatsResponse {
  ok: boolean;
  totalRecords: number;
  totalSources: number;
  jdCount: number;
  atsCount: number;
  sources: SourceInfo[];
}

export default function KnowledgePanel() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('');
  const [docType, setDocType] = useState<'jd-library' | 'ats-rules'>('jd-library');
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/rag/upload');
      const data = await res.json();
      if (data.ok) setStats(data);
    } catch {
      setMessage({ type: 'error', text: '加载知识库失败' });
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  /** 文件上传校验 */
  const validateFile = (name: string, sizeBytes?: number): string | null => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext && !['txt', 'md'].includes(ext)) {
      return '不支持的文件格式，仅支持 .txt 和 .md';
    }
    if (sizeBytes && sizeBytes > 500 * 1024) {
      return '文件过大，请控制在 500KB 以内';
    }
    return null;
  };

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file.name, file.size);
    if (err) { setMessage({ type: 'error', text: err }); return; }
    setFilename(file.name);
    try {
      const text = await file.text();
      setContent(text);
      setMessage({ type: 'ok', text: `已读取文件: ${file.name} (${(file.size / 1024).toFixed(1)}KB)` });
    } catch {
      setMessage({ type: 'error', text: '文件读取失败，请检查文件编码' });
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    const fileErr = filename ? validateFile(filename) : null;
    if (fileErr) { setMessage({ type: 'error', text: fileErr }); return; }
    if (!content.trim() || content.trim().length < 20) {
      setMessage({ type: 'error', text: '内容至少 20 个字符' });
      return;
    }
    if (!filename.trim()) {
      setMessage({ type: 'error', text: '请输入文档名称或选择文件' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/rag/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: docType, content, filename: filename.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'ok', text: `上传成功，已分片 ${data.chunks} 块，知识库共 ${data.total} 条向量` });
        setContent('');
        setFilename('');
        fetchStats();
      } else {
        setMessage({ type: 'error', text: data.error || '上传失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络异常，上传失败' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fname: string) => {
    if (!confirm(`确定删除「${fname}」？`)) return;
    try {
      const res = await fetch(`/api/rag/upload?filename=${encodeURIComponent(fname)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'ok', text: `已删除 ${fname}` });
        fetchStats();
      }
    } catch {
      setMessage({ type: 'error', text: '删除失败' });
    }
  };

  const handleClearAll = async () => {
    if (!confirm('确定清空全部知识库？此操作不可恢复。')) return;
    try {
      const res = await fetch('/api/rag/upload?clear=true', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setMessage({ type: 'ok', text: '已清空知识库' });
        fetchStats();
      }
    } catch {
      setMessage({ type: 'error', text: '清空失败' });
    }
  };

  return (
    <div className="knowledge-panel">
      {message && (
        <div className={`kb-message ${message.type}`}>
          {message.text}
          <button className="kb-message-close" onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <div className="kb-section">
        <div className="kb-section-title">📤 上传文档到知识库</div>
        <div className="kb-form">
          <div className="kb-form-row">
            <div className="kb-label">文档类型</div>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as 'jd-library' | 'ats-rules')}
              className="kb-select"
            >
              <option value="jd-library">行业 JD 库</option>
              <option value="ats-rules">ATS 筛选规则</option>
            </select>
          </div>
          <div className="kb-form-row">
            <div className="kb-label">文档名称</div>
            <input
              type="text"
              className="kb-input"
              placeholder="如: 大厂JD-字节跳动.txt"
              value={filename}
              onChange={e => setFilename(e.target.value)}
            />
          </div>
          <div className="kb-form-row">
            <div className="kb-label">文档内容 <span className="kb-hint">支持 .txt .md，不超过 500KB</span></div>
            <div className="kb-file-picker">
              <label className="btn btn-sm btn-secondary" style={{ cursor: 'pointer' }}>
                📂 选择文件
                <input type="file" accept=".txt,.md" onChange={handleFilePicked} style={{ display: 'none' }} />
              </label>
              {filename && content && <span className="kb-file-name">{filename}</span>}
            </div>
            <textarea
              className="kb-textarea"
              rows={5}
              placeholder="粘贴文档全文，支持 txt / md 格式..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={uploading || !content.trim() || !filename.trim()}
            style={{ width: '100%' }}
          >
            {uploading ? '🔄 上传并向量化中...' : '📥 上传到知识库'}
          </button>
        </div>
      </div>

      <div className="kb-section">
        <div className="kb-section-title">
          📚 知识库概览
          <div className="kb-section-actions">
            <button className="btn btn-sm btn-secondary" onClick={fetchStats} disabled={loading}>🔄 刷新</button>
            {(stats?.totalRecords || 0) > 0 && (
              <button className="btn btn-sm btn-danger" onClick={handleClearAll}>🗑️ 清空</button>
            )}
          </div>
        </div>
        <div className="kb-stats">
          <div className="kb-stat-item"><strong>{stats?.totalRecords || 0}</strong> 条向量</div>
          <div className="kb-stat-item"><strong>{stats?.totalSources || 0}</strong> 个来源</div>
          <div className="kb-stat-item"><strong>{stats?.jdCount || 0}</strong> 条 JD</div>
          <div className="kb-stat-item"><strong>{stats?.atsCount || 0}</strong> 条 ATS</div>
        </div>
      </div>

      {(stats?.sources?.length || 0) > 0 && (
        <div className="kb-section">
          <div className="kb-section-title">📄 已上传文档</div>
          <div className="kb-doc-list">
            {stats!.sources.map((src, idx) => (
              <div className="kb-doc-item" key={idx}>
                <div className="kb-doc-info">
                  <div className="kb-doc-name">{src.filename}</div>
                  <div className="kb-doc-type">{src.type === 'jd-library' ? '行业JD' : 'ATS规则'}</div>
                </div>
                <button
                  className="btn btn-xs btn-danger"
                  onClick={() => handleDelete(src.filename)}
                  title="删除此文档"
                >✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .knowledge-panel { padding: 0; }
        .kb-message { padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
        .kb-message.ok { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
        .kb-message.error { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .kb-message-close { background: none; border: none; cursor: pointer; font-size: 1rem; opacity: 0.5; }
        .kb-section { margin-bottom: 16px; }
        .kb-section-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .kb-section-actions { display: flex; gap: 6px; }
        .kb-form { display: flex; flex-direction: column; gap: 10px; }
        .kb-form-row { display: flex; flex-direction: column; gap: 4px; }
        .kb-label { font-size: 0.8rem; color: var(--text-muted); }
        .kb-hint { font-size: 0.7rem; color: var(--text-muted); margin-left: 6px; opacity: 0.7; }
        .kb-file-picker { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .kb-file-name { font-size: 0.8rem; color: var(--primary); font-weight: 500; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kb-select, .kb-input, .kb-textarea {
          width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px;
          background: var(--card-bg); font-size: 0.85rem; font-family: inherit;
        }
        .kb-textarea { resize: vertical; min-height: 80px; }
        .kb-stats { display: flex; gap: 10px; flex-wrap: wrap; }
        .kb-stat-item { flex: 1; min-width: 80px; padding: 10px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; text-align: center; font-size: 0.8rem; }
        .kb-stat-item strong { font-size: 1.2rem; display: block; }
        .kb-doc-list { display: flex; flex-direction: column; gap: 6px; }
        .kb-doc-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; }
        .kb-doc-name { font-size: 0.85rem; font-weight: 500; }
        .kb-doc-type { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
      `}</style>
    </div>
  );
}
