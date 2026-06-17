'use client';

import { useState, useRef, useEffect } from 'react';
import type { TemplateType } from '@/lib/schema';

interface Props {
  currentTemplate: TemplateType;
  /** 关闭弹窗 */
  onClose: () => void;
  /** 查看演示简历 */
  onViewDemo: (templateId: TemplateType) => void;
  /** 密钥更换成功 */
  onKeyUpdated: () => void;
}

export default function ApiKeySwapModal({ currentTemplate, onClose, onViewDemo, onKeyUpdated }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showKeyInput) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showKeyInput]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [onClose]);

  const handleSubmit = async () => {
    const key = apiKey.trim();
    if (!key || key.length < 10) { setMsg({ type: 'error', text: '请输入有效的 API Key' }); return; }
    setSubmitting(true); setMsg(null);
    try {
      const res = await fetch('/api/env/key', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'ok', text: '✅ API Key 已更新，请关闭弹窗后重新生成' });
        setTimeout(() => onKeyUpdated(), 1200);
      } else {
        setMsg({ type: 'error', text: data.error || '更新失败' });
      }
    } catch {
      setMsg({ type: 'error', text: '网络异常，请重试' });
    } finally { setSubmitting(false); }
  };

  const trackLabel = currentTemplate === 'en-modern' || currentTemplate === 'en-creative' ? '互联网大厂赛道' : '央国企赛道';
  const handleDemo = () => onViewDemo(currentTemplate);

  return (
    <div className="api-key-overlay">
      <div className="api-key-modal" ref={modalRef}>
        <div className="api-key-header">
          <span className="api-key-icon">🔋</span>
          <span>API 额度已用尽</span>
        </div>
        <div className="api-key-desc">
          当前 DeepSeek API 接口的每日调用额度已用尽。
        </div>

        {!showKeyInput ? (
          <div className="demo-highlight">
            <div className="demo-highlight-title">📄 查看 {trackLabel} 成品演示</div>
            <div className="demo-highlight-desc">
              无需API Key即可体验完整简历优化效果，包含STAR经历、量化评分、模板渲染与PDF导出。
            </div>
            <button className="btn btn-primary demo-btn" onClick={handleDemo}>
              👁️ 查看{trackLabel}演示简历
            </button>
            <button className="btn btn-link demo-link" onClick={() => setShowKeyInput(true)}>
              或手动更换 API Key →
            </button>
          </div>
        ) : (
          <div className="api-key-form">
            {msg && <div className={`api-key-msg ${msg.type}`}>{msg.text}</div>}
            <label className="api-key-label">输入新的 DeepSeek API Key</label>
            <input
              ref={inputRef}
              className="api-key-input"
              type="text"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={submitting}
            />
            <div className="api-key-actions">
              <button className="btn btn-secondary" onClick={() => setShowKeyInput(false)} disabled={submitting}>← 返回</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !apiKey.trim()}>
                {submitting ? '⏳ 更新中...' : '✅ 更新密钥'}
              </button>
            </div>
          </div>
        )}

        <div className="api-key-footer">
          <button className="btn btn-sm btn-secondary" onClick={onClose}>关闭</button>
        </div>
      </div>

      <style jsx>{`
        .api-key-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 2000; display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .api-key-modal {
          background: #fff; border-radius: 14px; max-width: 480px; width: 100%;
          padding: 28px; box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        }
        .api-key-header { display: flex; align-items: center; gap: 8px; font-size: 1.05rem; font-weight: 700; margin-bottom: 10px; }
        .api-key-icon { font-size: 1.3rem; }
        .api-key-desc { font-size: 0.82rem; color: #64748b; line-height: 1.6; margin-bottom: 18px; }
        .demo-highlight { text-align: center; padding: 16px; background: #f0f5ff; border-radius: 10px; margin-bottom: 14px; }
        .demo-highlight-title { font-size: 0.95rem; font-weight: 700; color: #1e40af; margin-bottom: 6px; }
        .demo-highlight-desc { font-size: 0.78rem; color: #64748b; margin-bottom: 14px; line-height: 1.5; }
        .demo-btn { width: 100%; padding: 10px; font-size: 0.9rem; margin-bottom: 8px; }
        .demo-link { background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.78rem; padding: 4px; }
        .demo-link:hover { text-decoration: underline; }
        .api-key-msg { padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; margin-bottom: 10px; }
        .api-key-msg.ok { background: #d1fae5; color: #065f46; }
        .api-key-msg.error { background: #fee2e2; color: #991b1b; }
        .api-key-form { display: flex; flex-direction: column; gap: 8px; }
        .api-key-label { font-size: 0.78rem; font-weight: 600; color: #334155; }
        .api-key-input { width: 100%; padding: 10px 12px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; font-family: monospace; outline: none; }
        .api-key-input:focus { border-color: var(--primary); }
        .api-key-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px; }
        .api-key-footer { text-align: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
      `}</style>
    </div>
  );
}
