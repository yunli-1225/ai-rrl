'use client';

import { TEMPLATES, getTemplateById } from '@/lib/templates';
import type { TemplateType } from '@/lib/schema';

const STORAGE_KEY = 'ai-rrl-template-preference';

interface Props {
  value: TemplateType;
  onChange: (id: TemplateType) => void;
}

export default function TemplateSelector({ value, onChange }: Props) {
  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <div>
      <div className="card-label">📐 简历模板</div>
      <div className="template-selector">
        {categories.map(cat => (
          <div key={cat} style={{ width: '100%', marginBottom: 4 }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
              {cat}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TEMPLATES.filter(t => t.category === cat).map(t => (
                <div
                  key={t.id}
                  className={`template-chip ${value === t.id ? 'active' : ''}`}
                  onClick={() => {
                    onChange(t.id);
                    try { localStorage.setItem(STORAGE_KEY, t.id); } catch {}
                  }}
                  title={t.description}
                >
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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
