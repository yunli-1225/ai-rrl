'use client';

import { useState } from 'react';
import type { ResumeResult } from '@/lib/schema';

// ===== Gap Booster =====
function GapBooster({ gapBoosters }: { gapBoosters: ResumeResult['analysis']['gapBoosters'] }) {
  if (!gapBoosters || gapBoosters.length === 0) return null;

  const levelLabel: Record<string, string> = { high: '⭐⭐⭐', medium: '⭐⭐', low: '⭐' };

  const handleAddSkill = (keyword: string) => {
    window.dispatchEvent(new CustomEvent('ai-rrl-add-skill', { detail: { name: keyword, proficiency: '了解' } }));
  };

  return (
    <div className="imp-section">
      <div className="imp-section-title">🚀 差距激励 — 让简历更匹配这个 JD！</div>
      {gapBoosters.map((g, i) => (
        <div key={i} className={`gap-item level-${g.level}`}>
          <span className="gap-level">{levelLabel[g.level] || '⭐'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{g.keyword}</div>
            <div style={{ fontSize: '0.78rem', color: '#666', margin: '2px 0' }}>{g.tip}</div>
            {g.category === 'skill' && (
              <button
                className="btn btn-sm btn-secondary"
                style={{ marginTop: 4, fontSize: '0.72rem' }}
                onClick={() => handleAddSkill(g.keyword)}
              >
                📥 一键添加技能
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== Match Overview =====
function MatchOverview({ analysis }: { analysis: ResumeResult['analysis'] }) {
  const pct = Math.round(analysis.matchRate * 100);
  const fillColor = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="imp-section">
      <div className="imp-section-title">📋 匹配概览</div>
      <div className="status-bar">
        <span className="stat">✅ 已匹配: <strong>{analysis.matchedCount}</strong>/{analysis.totalCount} 项经历</span>
        <span className="stat">🔑 关键词覆盖率: <strong>{pct}%</strong></span>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fillColor, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ===== STAR Checklist =====
function STARChecklist({ starChecklist }: { starChecklist: ResumeResult['analysis']['starChecklist'] }) {
  if (!starChecklist || starChecklist.length === 0) return null;

  return (
    <div className="imp-section">
      <div className="imp-section-title">⭐ STAR 完整性检查</div>
      <div className="star-row" style={{ fontWeight: 600, fontSize: '0.75rem', color: '#94a3b8' }}>
        <span>经历名称</span><span className="text-center">S</span><span className="text-center">T</span><span className="text-center">A</span><span className="text-center">R</span>
      </div>
      {starChecklist.map((sc, i) => (
        <div key={i} className="star-row" title={sc.suggestion}>
          <span className="star-label">{sc.item}</span>
          <span className="text-center"><span className={`star-dot ${sc.s ? 'pass' : 'fail'}`} /></span>
          <span className="text-center"><span className={`star-dot ${sc.t ? 'pass' : 'fail'}`} /></span>
          <span className="text-center"><span className={`star-dot ${sc.a ? 'pass' : 'fail'}`} /></span>
          <span className="text-center"><span className={`star-dot ${sc.r ? 'pass' : 'fail'}`} /></span>
        </div>
      ))}
      {starChecklist.some(sc => !sc.s || !sc.t || !sc.a || !sc.r) && (
        <div style={{ fontSize: '0.75rem', color: 'var(--warning)', marginTop: 6 }}>
          💡 标记为红色的成分建议补充完善
        </div>
      )}
    </div>
  );
}

// ===== Missing Keywords =====
function MissingKeywords({ missingKeywords }: { missingKeywords: ResumeResult['analysis']['missingKeywords'] }) {
  if (!missingKeywords || missingKeywords.length === 0) return null;

  return (
    <div className="imp-section">
      <div className="imp-section-title">⛏️ JD 中缺失的关键词</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {missingKeywords.map((mk, i) => (
          <span
            key={i}
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: '0.75rem',
              background: mk.importance === 'high' ? '#fef2f2' : mk.importance === 'medium' ? '#fffbeb' : '#f1f5f9',
              border: `1px solid ${mk.importance === 'high' ? '#fecaca' : mk.importance === 'medium' ? '#fde68a' : '#e2e8f0'}`,
            }}
            title={mk.suggestion}
          >
            {mk.word}
          </span>
        ))}
      </div>
    </div>
  );
}

// ===== Main ImprovementPanel =====
interface Props {
  analysis: ResumeResult['analysis'] | null;
}

export default function ImprovementPanel({ analysis }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  if (!analysis) return null;

  return (
    <div className="imp-panel">
      <div className="imp-header" onClick={() => setCollapsed(!collapsed)}>
        <span>📊 简历分析报告</span>
        <span>{collapsed ? '▶ 展开' : '▼ 折叠'}</span>
      </div>
      {!collapsed && (
        <div className="imp-body">
          <GapBooster gapBoosters={analysis.gapBoosters} />
          <MatchOverview analysis={analysis} />
          <STARChecklist starChecklist={analysis.starChecklist} />
          <MissingKeywords missingKeywords={analysis.missingKeywords} />
        </div>
      )}
    </div>
  );
}
