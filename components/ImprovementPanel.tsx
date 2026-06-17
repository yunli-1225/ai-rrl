'use client';

import { useState } from 'react';

interface Props {
  score: { 总分: number; 技能匹配分: number; 行业经验分: number } | null;
}

function MatchScore({ score }: { score: { 总分: number; 技能匹配分: number; 行业经验分: number } }) {
  const fillColor = score.总分 >= 80 ? 'var(--success)' : score.总分 >= 50 ? 'var(--warning)' : 'var(--error)';

  return (
    <div className="imp-section">
      <div className="imp-section-title">📋 岗位匹配评分</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>总分</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: fillColor }}>{score.总分}</div>
        </div>
        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>技能匹配</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: score.技能匹配分 >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score.技能匹配分}</div>
        </div>
        <div style={{ flex: 1, minWidth: 120, padding: '8px 12px', background: '#f1f5f9', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>行业经验</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: score.行业经验分 >= 70 ? 'var(--success)' : 'var(--warning)' }}>{score.行业经验分}</div>
        </div>
      </div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${score.总分}%`, height: '100%', background: fillColor, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function ImprovementPanel({ score }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  if (score === null || score === undefined) return null;

  return (
    <div className="imp-panel">
      <div className="imp-header" onClick={() => setCollapsed(!collapsed)}>
        <span>📊 岗位匹配报告</span>
        <span>{collapsed ? '▶ 展开' : '▼ 折叠'}</span>
      </div>
      {!collapsed && (
        <div className="imp-body">
          <MatchScore score={score} />
        </div>
      )}
    </div>
  );
}
