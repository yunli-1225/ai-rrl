'use client';

import { useState, useRef } from 'react';

interface Props {
  jdList: string[];
  onChange: (list: string[]) => void;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}

export default function JDInput({ jdList, onChange, activeIndex, onActiveIndexChange }: Props) {
  const [open, setOpen] = useState(true);
  const [imageData, setImageData] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrTargetBox, setOcrTargetBox] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addJD = () => { onChange([...jdList, '']); onActiveIndexChange(jdList.length); };
  const removeJD = (index: number) => {
    if (jdList.length <= 1) return;
    const nl = jdList.filter((_, i) => i !== index);
    onChange(nl);
    if (activeIndex >= nl.length) onActiveIndexChange(Math.max(0, nl.length - 1));
  };
  const updateJD = (index: number, text: string) => { const nl = [...jdList]; nl[index] = text; onChange(nl); };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('文件过大，请选择10MB以内的图片'); return; }
    setOcrTargetBox(activeIndex);
    const r = new FileReader(); r.onload = (ev) => setImageData(ev.target?.result as string); r.readAsDataURL(file); e.target.value = '';
  };

  const handleOcr = async () => {
    if (!imageData) return;
    setOcrLoading(true); setOcrStatus('加载 OCR 引擎...');
    try {
      let tess = (window as any).Tesseract;
      if (!tess) {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        await new Promise<void>((res, rej) => { s.onload = () => res(); s.onerror = () => rej(); document.head.appendChild(s); });
        tess = (window as any).Tesseract;
      }
      setOcrStatus('识别中...');
      const result = await tess.recognize(imageData, 'chi_sim+eng', { logger: (m: any) => { if (m.status === 'recognizing text') setOcrStatus(`识别中: ${Math.round(m.progress * 100)}%`); } });
      const text = result.data.text.trim();
      if (text) {
        const target = ocrTargetBox >= 0 ? ocrTargetBox : 0;
        const nl = [...jdList];
        nl[target] = (nl[target] || '') ? nl[target] + '\n\n' + text : text;
        onChange(nl);
        setOcrStatus(`✅ 已提取 → NO.${target + 1}`);
      } else setOcrStatus('未识别出文字，请手动输入');
    } catch { setOcrStatus('❌ 识别失败，请手动输入'); }
    finally { setOcrLoading(false); setTimeout(() => setOcrStatus(''), 3000); }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: 'var(--radius-sm)', marginBottom: 14,
      border: '2px solid #f59e0b', boxShadow: 'var(--shadow)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
          cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1.5px solid #fef3c7' : 'none',
        }}
      >
        <span style={{ fontSize: '1rem' }}>📋</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy)', flex: 1, letterSpacing: '1px' }}>
          职位描述
        </span>
        <span style={{ fontFamily: 'var(--font-accent)', fontSize: '0.65rem', fontWeight: 600, background: '#fef3c7', color: '#d97706', padding: '2px 10px', borderRadius: 20, border: '1px solid rgba(217,119,6,0.15)' }}>
          {jdList.length}个JD
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
      </div>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          {/* NO.X Boxes */}
          {jdList.map((jd, i) => (
            <div key={i} style={{
              background: '#fafbfc', borderRadius: 'var(--radius-xs)',
              border: `1.5px solid ${activeIndex === i ? '#f59e0b' : 'var(--border)'}`,
              padding: 10, marginBottom: 8, transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-accent)', fontWeight: 700, fontSize: '0.8rem', color: activeIndex === i ? '#92400e' : 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  NO.{i + 1}
                  {activeIndex === i && (
                    <span style={{ marginLeft: 6, padding: '1px 8px', borderRadius: 10, background: '#f59e0b', color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>使用中</span>
                  )}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {activeIndex !== i && (
                    <button className="btn btn-sm btn-secondary" onClick={() => onActiveIndexChange(i)} style={{ fontSize: '0.68rem', padding: '3px 8px' }}>使用</button>
                  )}
                  <button
                    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '3px 8px', fontSize: '0.65rem', borderRadius: 6, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                    onClick={() => { onActiveIndexChange(i); fileInputRef.current?.click(); }}
                    onMouseOver={e => { (e.target as HTMLElement).style.borderColor = '#f59e0b'; (e.target as HTMLElement).style.color = '#92400e'; }}
                    onMouseOut={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
                    title="上传截图到本JD"
                  >
                    📸
                  </button>
                  {jdList.length > 1 && (
                    <button className="btn btn-sm btn-secondary" onClick={() => removeJD(i)} style={{ fontSize: '0.65rem', padding: '3px 8px' }}>🗑️</button>
                  )}
                </div>
              </div>
              <textarea
                placeholder={`粘贴职位描述 NO.${i + 1} ...`}
                value={jd}
                onChange={e => updateJD(i, e.target.value)}
                rows={4}
                style={{ fontSize: '0.78rem', minHeight: 80, borderColor: 'var(--border-light)' }}
              />
            </div>
          ))}

          {/* Add JD */}
          <div className="add-row" style={{ marginTop: 0, marginBottom: 8 }}>
            <button className="btn btn-sm btn-outline" onClick={addJD}>+ 添加职位描述</button>
          </div>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />

          {/* OCR preview */}
          {imageData && (
            <div style={{ marginBottom: 8 }}>
              <div className="upload-preview" style={{ padding: 6, marginTop: 0 }}>
                <img src={imageData} alt="截图" style={{ maxHeight: 60 }} />
                <div className="upload-preview-info">
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--navy)' }}>截图 → NO.{ocrTargetBox + 1}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-sm btn-gold" onClick={handleOcr} disabled={ocrLoading} style={{ padding: '3px 10px', fontSize: '0.7rem' }}>
                    {ocrLoading ? <><span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> 识别</> : '🔍 提取'}
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={() => { setImageData(null); setOcrStatus(''); }} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>✕</button>
                </div>
              </div>
              {ocrStatus && (
                <div style={{ fontSize: '0.7rem', marginTop: 4, padding: '4px 8px', borderRadius: 'var(--radius-xs)', background: ocrStatus.includes('✅') ? 'var(--success-bg)' : ocrStatus.includes('❌') ? 'var(--error-bg)' : '#f1f5f9', color: ocrStatus.includes('✅') ? 'var(--success)' : ocrStatus.includes('❌') ? 'var(--error)' : 'var(--text-secondary)' }}>
                  {ocrStatus}
                </div>
              )}
            </div>
          )}

          {/* Subtle hint */}
          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
            每个JD独立输入，截图自动识别文字
          </div>
        </div>
      )}
    </div>
  );
}

export function parseMultiJD(text: string): string[] {
  const parts = text.split(/===+/).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}
