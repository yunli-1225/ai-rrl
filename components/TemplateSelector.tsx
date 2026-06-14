'use client';

import { TEMPLATES } from '@/lib/templates';
import type { TemplateType } from '@/lib/schema';

const STORAGE_KEY = 'ai-rrl-template-preference';

interface Props {
  value: TemplateType;
  onChange: (id: TemplateType) => void;
}

// Category icons and descriptions
const CATEGORY_META: Record<string, { icon: string; desc: string }> = {
  '🏛️ 央国企赛道': {
    icon: '🏛️',
    desc: '传统稳重风格，适合国企、银行、事业单位、体制内岗位',
  },
  '🚀 互联网/外企赛道': {
    icon: '🚀',
    desc: '现代双栏设计，适合技术、产品、设计、市场等岗位',
  },
};

export default function TemplateSelector({ value, onChange }: Props) {
  const categories = [...new Set(TEMPLATES.map(t => t.category))];

  return (
    <div className="card">
      <div className="card-label">
        <span className="section-icon">📐</span> 选择简历模板
        <span className="badge">{TEMPLATES.length}款</span>
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
        选择与目标岗位匹配的模板风格，AI将按对应格式生成内容
      </div>
      <div className="template-selector">
        {categories.map(cat => {
          const meta = CATEGORY_META[cat] || { icon: '📁', desc: '' };
          const catTemplates = TEMPLATES.filter(t => t.category === cat);
          return (
            <div key={cat} className="template-category">
              <div className="template-category-label">
                {meta.icon} {cat.replace(/^[^\s]+\s/, '')}
              </div>
              {meta.desc && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, paddingLeft: 2 }}>
                  {meta.desc}
                </div>
              )}
              <div className="template-chips">
                {catTemplates.map(t => (
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
          );
        })}
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
