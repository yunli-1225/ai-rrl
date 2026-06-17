'use client';

import { useState, useEffect, useRef } from 'react';
import { TEMPLATES, TEMPLATE_TRACKS, getTemplateById } from '@/lib/templates';
import type { TemplateType } from '@/lib/schema';

const STORAGE_KEY = 'ai-rrl-template-preference';

interface Props {
  value: TemplateType;
  onChange: (id: TemplateType) => void;
}

export default function TemplateSelector({ value, onChange }: Props) {
  const [previewModal, setPreviewModal] = useState<TemplateType | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setPreviewModal(null);
      }
    };
    if (previewModal) {
      setTimeout(() => document.addEventListener('click', handleClick), 0);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [previewModal]);

  const handleSelect = (id: TemplateType) => {
    onChange(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  };

  const selected = getTemplateById(value);
  const selectedTrack = TEMPLATE_TRACKS.find(t => t.templates.some(tp => tp.id === value));

  // Mobile: dropdown selector
  if (isMobile) {
    return (
      <div className="card">
        <div className="card-label"><span className="section-icon">📐</span> 简历模板</div>
        <select
          className="template-mobile-select"
          value={value}
          onChange={e => handleSelect(e.target.value as TemplateType)}
        >
          {TEMPLATE_TRACKS.map(track => (
            <optgroup key={track.track} label={track.label}>
              {track.templates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="template-mobile-hint">{selected.description}</div>
        <style jsx>{`
          .template-mobile-select {
            width: 100%; padding: 10px 12px; border: 2px solid var(--border);
            border-radius: 8px; font-size: 0.95rem; background: var(--card-bg);
            appearance: auto; margin-bottom: 8px;
          }
          .template-mobile-hint { font-size: 0.78rem; color: var(--text-muted); }
        `}</style>
      </div>
    );
  }

  // Desktop: visual track cards
  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">📐</span> 选择简历赛道与模板
        <span className="badge">{TEMPLATES.length}款</span>
      </div>

      <div className="template-tracks">
        {TEMPLATE_TRACKS.map(track => (
          <div
            key={track.track}
            className={`template-track-card ${selectedTrack?.track === track.track ? 'active' : ''}`}
          >
            <div className="track-header">{track.label}</div>
            <div className="track-desc">{track.description}</div>
            <div className="track-templates">
              {track.templates.map(t => (
                <div
                  key={t.id}
                  className={`track-template-item ${value === t.id ? 'active' : ''}`}
                  onClick={() => handleSelect(t.id)}
                >
                  <div className="tpl-preview-dot" style={{ background: t.previewColor }} />
                  <div className="tpl-info">
                    <div className="tpl-name">{t.label}</div>
                    <div className="tpl-desc">{t.description}</div>
                  </div>
                  <button
                    className="tpl-preview-btn"
                    onClick={e => { e.stopPropagation(); setPreviewModal(t.id); }}
                    title="预览样式"
                  >👁️</button>
                  {value === t.id && <div className="tpl-check">✓</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewModal && (
        <div className="template-modal-overlay">
          <div className="template-modal" ref={modalRef}>
            <div className="template-modal-header">
              <span>{getTemplateById(previewModal).label} 样式预览</span>
              <button className="tpl-modal-close" onClick={() => setPreviewModal(null)}>✕</button>
            </div>
            <div className="template-modal-body">
              <style>{getTemplateById(previewModal).getStyle()}</style>
              <div className={`resume-${previewModal}`}>
                <div className="header">
                  <h1>张三</h1>
                  <p>13800138000 | zhangsan@email.com | 北京</p>
                </div>
                <section>
                  <h2>教育经历</h2>
                  <div className="item">
                    <div className="item-header"><span>北京大学 · 计算机科学与技术</span><span className="item-date">2019.09 - 2023.07</span></div>
                    <div style={{ fontSize: '13px', color: '#555' }}>GPA: 3.8/4.0 · 本科</div>
                  </div>
                </section>
                <section>
                  <h2>实习经历</h2>
                  <div className="item">
                    <div className="item-header"><span>字节跳动 · 前端开发实习生</span><span className="item-date">2022.06 - 2022.12</span></div>
                    <ul>
                      <li>使用 <strong>React</strong> 和 <strong>TypeScript</strong> 搭建数据可视化看板，日均 PV 10万+</li>
                      <li>优化渲染性能，页面加载时间降低 40%，获团队技术分享奖</li>
                    </ul>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .template-tracks { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 768px) { .template-tracks { grid-template-columns: 1fr; } }
        .template-track-card {
          padding: 16px; border: 2px solid var(--border); border-radius: 12px;
          background: var(--card-bg); transition: all 0.2s;
        }
        .template-track-card:hover { border-color: #cbd5e1; }
        .template-track-card.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 4%, transparent); }
        .track-header { font-size: 1rem; font-weight: 700; margin-bottom: 4px; }
        .track-desc { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4; }
        .track-templates { display: flex; flex-direction: column; gap: 6px; }
        .track-template-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          border: 1.5px solid transparent; border-radius: 8px; cursor: pointer;
          transition: all 0.15s; position: relative;
        }
        .track-template-item:hover { border-color: var(--border); background: color-mix(in srgb, var(--bg) 60%, transparent); }
        .track-template-item.active { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, transparent); }
        .tpl-preview-dot { width: 20px; height: 20px; border-radius: 4px; flex-shrink: 0; }
        .tpl-info { flex: 1; min-width: 0; }
        .tpl-name { font-weight: 600; font-size: 0.85rem; }
        .tpl-desc { font-size: 0.7rem; color: var(--text-muted); margin-top: 1px; }
        .tpl-preview-btn { background: none; border: none; cursor: pointer; font-size: 0.9rem; padding: 2px; opacity: 0.6; }
        .tpl-preview-btn:hover { opacity: 1; }
        .tpl-check {
          width: 22px; height: 22px; border-radius: 50%; background: var(--primary);
          color: #fff; display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
        }
        .template-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 1000; display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .template-modal {
          background: #fff; border-radius: 12px; max-width: 700px; width: 100%;
          max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .template-modal-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 20px; border-bottom: 1px solid #e2e8f0;
          font-weight: 600; font-size: 0.95rem;
        }
        .tpl-modal-close { background: none; border: none; cursor: pointer; font-size: 1.1rem; opacity: 0.5; }
        .tpl-modal-close:hover { opacity: 1; }
        .template-modal-body {
          padding: 20px; overflow-y: auto; max-height: calc(85vh - 56px);
        }
      `}</style>
    </div>
  );
}

export function getStoredTemplatePreference(): TemplateType {
  if (typeof window === 'undefined') return 'zh-classic';
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as TemplateType | null;
    if (stored && TEMPLATES.some(t => t.id === stored)) return stored;
  } catch {}
  return 'zh-classic';
}
