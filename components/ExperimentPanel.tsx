'use client';

import { useState } from 'react';
import { TEMPLATES } from '@/lib/templates';
import type { TemplateType } from '@/lib/schema';

interface ExpRecord {
  id: number; group: string; model: string; round: number;
  title: string; score_total: number; has_error: boolean; error_type: string;
  latency_ms: number; token_count: number; rag_keyword_hits: number; created_at: string;
}

interface Metrics {
  group: string; model: string; n: number; error_rate: number;
  score_mean: number; score_variance: number; score_std: number;
  latency_mean: number; token_mean: number; rag_hit_mean: number;
  scores: number[]; errors: string[];
}

interface Summary { totalRounds: number; metrics: Metrics[]; conclusion: string; }

function SimpleBar({ label, ctrlVal, exprVal, unit, higherBetter }: { label: string; ctrlVal: number; exprVal: number; unit: string; higherBetter: boolean }) {
  const max = Math.max(ctrlVal, exprVal, 1);
  const improve = ctrlVal === 0 ? 0 : ((exprVal - ctrlVal) / ctrlVal * 100);
  const color = improve > 0 ? higherBetter ? 'var(--success)' : 'var(--error)' : improve < 0 ? higherBetter ? 'var(--error)' : 'var(--success)' : 'var(--text-muted)';
  return (
    <div className="exp-chart-row">
      <div className="exp-chart-label">{label}</div>
      <div className="exp-chart-bars">
        <div className="exp-bar-group">
          <div className="exp-bar-label">对照组</div>
          <div className="exp-bar-track"><div className="exp-bar-fill" style={{ width: `${(ctrlVal / max) * 100}%`, background: '#94a3b8' }} /></div>
          <div className="exp-bar-value">{ctrlVal.toFixed(1)}{unit}</div>
        </div>
        <div className="exp-bar-group">
          <div className="exp-bar-label">实验组</div>
          <div className="exp-bar-track"><div className="exp-bar-fill" style={{ width: `${(exprVal / max) * 100}%`, background: 'var(--primary)' }} /></div>
          <div className="exp-bar-value">{exprVal.toFixed(1)}{unit}</div>
        </div>
      </div>
      <div className="exp-chart-delta" style={{ color }}>{improve > 0 ? '↑' : '↓'} {Math.abs(improve).toFixed(1)}%</div>
    </div>
  );
}

function ScoreDistributionChart({ ctrlScores, exprScores }: { ctrlScores: number[]; exprScores: number[] }) {
  if (ctrlScores.length === 0 && exprScores.length === 0) return null;
  const allScores = [...ctrlScores, ...exprScores];
  const min = Math.floor(Math.min(...allScores) / 10) * 10;
  const max = Math.ceil(Math.max(...allScores) / 10) * 10;
  const bins = Math.max(3, Math.ceil((max - min) / 10));
  const binWidth = (max - min) / bins;

  const hist = (scores: number[]) => {
    const h = new Array(bins).fill(0);
    scores.forEach(s => { const i = Math.min(bins - 1, Math.floor((s - min) / binWidth)); h[i]++; });
    return h;
  };

  const ctrlHist = hist(ctrlScores);
  const exprHist = hist(exprScores);
  const maxCount = Math.max(1, ...ctrlHist, ...exprHist);

  return (
    <div className="exp-histogram">
      <div className="exp-chart-title">评分分布（每{binWidth.toFixed(0)}分区间）</div>
      <div className="exp-hist-bars">
        {Array.from({ length: bins }, (_, i) => (
          <div key={i} className="exp-hist-col" title={`${(min + i * binWidth).toFixed(0)}-${(min + (i + 1) * binWidth).toFixed(0)}分`}>
            <div className="exp-hist-bar-wrap">
              <div className="exp-hist-bar ctrl" style={{ height: `${(ctrlHist[i] / maxCount) * 100}%` }} />
              <div className="exp-hist-bar expr" style={{ height: `${(exprHist[i] / maxCount) * 100}%` }} />
            </div>
            <div className="exp-hist-label">{Math.round(min + i * binWidth + binWidth / 2)}</div>
          </div>
        ))}
      </div>
      <div className="exp-hist-legend">
        <span><span className="dot ctrl" /> 对照组</span>
        <span><span className="dot expr" /> 实验组</span>
      </div>
      <style jsx>{`
        .exp-histogram { margin-top: 12px; }
        .exp-chart-title { font-size: 0.8rem; font-weight: 600; margin-bottom: 8px; }
        .exp-hist-bars { display: flex; align-items: flex-end; gap: 4px; height: 120px; }
        .exp-hist-col { flex: 1; display: flex; flex-direction: column; align-items: center; }
        .exp-hist-bar-wrap { width: 100%; height: 100px; display: flex; align-items: flex-end; justify-content: center; gap: 2px; }
        .exp-hist-bar { width: 40%; border-radius: 3px 3px 0 0; transition: height 0.3s; min-height: 2px; }
        .exp-hist-bar.ctrl { background: #94a3b8; }
        .exp-hist-bar.expr { background: var(--primary); }
        .exp-hist-label { font-size: 0.6rem; color: var(--text-muted); margin-top: 4px; }
        .exp-hist-legend { display: flex; gap: 16px; justify-content: center; margin-top: 8px; font-size: 0.75rem; }
        .dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; }
        .dot.ctrl { background: #94a3b8; }
        .dot.expr { background: var(--primary); }
      `}</style>
    </div>
  );
}

export default function ExperimentPanel() {
  const [rounds, setRounds] = useState(3);
  const [expTemplate, setExpTemplate] = useState<TemplateType>('zh-classic');
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [records, setRecords] = useState<ExpRecord[]>([]);
  const [progress, setProgress] = useState('');
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; text: string } | null>(null);

  const startExp = async () => {
    setRunning(true); setSummary(null); setRecords([]); setMsg(null);
    try {
      const userData = JSON.parse(localStorage.getItem('ai-rrl-material-library') || '{}');
      const jdText = prompt('请输入职位描述(JD)用于实验：') || '';
      if (!jdText || jdText.length < 10) { setMsg({ t: 'error', text: 'JD 内容不足' }); setRunning(false); return; }

      setProgress(`正在执行 ${rounds} 轮消融实验（模板: ${expTemplate}）...`);

      const res = await fetch('/api/experiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds, userData, jdText, template: expTemplate }),
      });
      const data = await res.json();
      if (!data.ok) { setMsg({ t: 'error', text: data.error || '实验失败' }); setRunning(false); return; }

      setSummary(data.summary);
      setProgress('实验完成，加载详情...');
      const listRes = await fetch('/api/experiment');
      const listData = await listRes.json();
      if (listData.ok) setRecords(listData.metrics ? [] : []);
      setProgress('');
      setMsg({ t: 'ok', text: `消融实验完成！共 ${rounds} 轮 × 2 组 = ${rounds * 2} 次生成。` });
    } catch (err: any) {
      setMsg({ t: 'error', text: err.message || '运行异常' });
    } finally {
      setRunning(false);
    }
  };

  const refreshStats = async () => {
    try {
      const res = await fetch('/api/experiment');
      const data = await res.json();
      if (data.ok) {
        setSummary({ totalRounds: 0, metrics: data.metrics || [], conclusion: data.conclusion || '' });
        setRecords([]);
      }
    } catch { setMsg({ t: 'error', text: '加载失败' }); }
  };

  const exportCSV = async () => {
    try {
      const res = await fetch('/api/experiment?export=csv');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'experiment-results.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('导出失败'); }
  };

  const clearAll = async () => {
    if (!confirm('确定清空全部实验数据？')) return;
    await fetch('/api/experiment?clear=true', { method: 'DELETE' });
    setSummary(null); setRecords([]); setMsg({ t: 'ok', text: '已清空' });
  };

  const ctrl = summary?.metrics?.find(m => m.group === 'control');
  const expr = summary?.metrics?.find(m => m.group === 'experiment');

  return (
    <div className="exp-panel">
      {msg && <div className={`exp-msg ${msg.t}`}>{msg.text}</div>}

      <div className="exp-section">
        <div className="exp-section-title">⚙️ 批量实验控制器</div>
        <div className="exp-controls">
          <div className="exp-control-row">
            <label>循环轮次：</label>
            <input type="number" min={1} max={20} value={rounds} onChange={e => setRounds(parseInt(e.target.value) || 3)} className="exp-input" style={{ width: 80 }} />
            <span className="exp-hint">每轮同时运行对照组+实验组，共 {rounds * 2} 次生成</span>
          </div>
          <div className="exp-control-row">
            <label>实验模板：</label>
            <select value={expTemplate} onChange={e => setExpTemplate(e.target.value as TemplateType)} className="exp-input" style={{ width: 140 }}>
              {TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <span className="exp-hint">选择实验使用的简历赛道模板</span>
          </div>
          <div className="exp-control-row" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={startExp} disabled={running}>
              {running ? '🔄 运行中...' : '🚀 一键启动消融实验'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={refreshStats}>🔄 刷新统计</button>
            <button className="btn btn-sm btn-secondary" onClick={exportCSV}>📥 导出 CSV</button>
            <button className="btn btn-sm btn-danger" onClick={clearAll}>🗑️ 清空</button>
          </div>
        </div>
      </div>

      {progress && <div className="exp-progress">{progress}</div>}

      {ctrl && expr && (
        <div className="exp-section">
          <div className="exp-section-title">📊 对照统计面板</div>
          <div className="exp-stat-grid">
            <div className="exp-stat-card">
              <div className="exp-stat-label">对照组 (极简Prompt)</div>
              <div className="exp-stat-val">{ctrl.n} 次</div>
              <div className="exp-stat-sub">报错 {(ctrl.error_rate * 100).toFixed(1)}% · 评分均值 {ctrl.score_mean.toFixed(1)}</div>
            </div>
            <div className="exp-stat-card">
              <div className="exp-stat-label">实验组 (链式Prompt+清洗)</div>
              <div className="exp-stat-val">{expr.n} 次</div>
              <div className="exp-stat-sub">报错 {(expr.error_rate * 100).toFixed(1)}% · 评分均值 {expr.score_mean.toFixed(1)}</div>
            </div>
          </div>

          <div className="exp-chart-section">
            <div className="exp-chart-title">📉 核心指标对比</div>
            <SimpleBar label="报错率" ctrlVal={ctrl.error_rate * 100} exprVal={expr.error_rate * 100} unit="%" higherBetter={false} />
            <SimpleBar label="平均匹配分" ctrlVal={ctrl.score_mean} exprVal={expr.score_mean} unit="分" higherBetter={true} />
            <SimpleBar label="评分标准差" ctrlVal={ctrl.score_std} exprVal={expr.score_std} unit="分" higherBetter={false} />
            <SimpleBar label="平均延迟" ctrlVal={ctrl.latency_mean / 1000} exprVal={expr.latency_mean / 1000} unit="s" higherBetter={false} />
            <SimpleBar label="关键词命中" ctrlVal={ctrl.rag_hit_mean} exprVal={expr.rag_hit_mean} unit="个" higherBetter={true} />
          </div>

          <ScoreDistributionChart ctrlScores={ctrl.scores} exprScores={expr.scores} />

          <div className="exp-conclusion">
            <div className="exp-chart-title">📝 统计结论</div>
            <div className="exp-conclusion-text">{summary?.conclusion || '数据加载中...'}</div>
          </div>
        </div>
      )}

      {records.length > 0 && (
        <div className="exp-section">
          <div className="exp-section-title">📋 实验记录</div>
          <div className="exp-records">
            {records.map(r => (
              <div key={r.id} className={`exp-record ${r.has_error ? 'error' : ''}`}>
                <div className="exp-rec-main">
                  <span className={`exp-rec-badge ${r.group}`}>{r.group === 'control' ? '对照' : '实验'}</span>
                  <span className="exp-rec-title">{r.title || '(无标题)'}</span>
                  <span className="exp-rec-score" style={{ color: r.score_total >= 80 ? 'var(--success)' : 'var(--warning)' }}>{r.score_total}</span>
                </div>
                <div className="exp-rec-meta">{r.model} · 第{r.round}轮 · {r.has_error ? `❌ ${r.error_type}` : '✅'} · {(r.latency_ms / 1000).toFixed(1)}s</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .exp-panel { padding: 0; }
        .exp-msg { padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 14px; }
        .exp-msg.ok { background: #d1fae5; color: #065f46; }
        .exp-msg.error { background: #fee2e2; color: #991b1b; }
        .exp-section { margin-bottom: 18px; }
        .exp-section-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 10px; }
        .exp-controls { display: flex; flex-direction: column; gap: 10px; }
        .exp-control-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .exp-input { padding: 6px 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.9rem; text-align: center; }
        .exp-hint { font-size: 0.75rem; color: var(--text-muted); }
        .exp-progress { padding: 10px 14px; background: #f0f5ff; border-radius: 8px; margin-bottom: 14px; font-size: 0.85rem; }
        .exp-stat-grid { display: flex; gap: 12px; margin-bottom: 14px; }
        .exp-stat-card { flex: 1; padding: 14px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 8px; }
        .exp-stat-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
        .exp-stat-val { font-size: 1.6rem; font-weight: 700; }
        .exp-stat-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
        .exp-chart-section { margin-top: 10px; }
        .exp-chart-title { font-size: 0.85rem; font-weight: 600; margin-bottom: 8px; }
        .exp-chart-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .exp-chart-label { width: 80px; font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; }
        .exp-chart-bars { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .exp-bar-group { display: flex; align-items: center; gap: 6px; }
        .exp-bar-label { width: 50px; font-size: 0.7rem; color: var(--text-muted); text-align: right; flex-shrink: 0; }
        .exp-bar-track { flex: 1; height: 16px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
        .exp-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
        .exp-bar-value { width: 50px; font-size: 0.75rem; font-weight: 600; text-align: right; flex-shrink: 0; }
        .exp-chart-delta { width: 60px; font-size: 0.75rem; font-weight: 600; text-align: center; flex-shrink: 0; }
        .exp-conclusion { margin-top: 14px; padding: 14px; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; }
        .exp-conclusion-text { font-size: 0.85rem; line-height: 1.7; white-space: pre-wrap; }
        .exp-records { display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto; }
        .exp-record { padding: 8px 10px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; font-size: 0.8rem; }
        .exp-record.error { border-color: #fecaca; background: #fef2f2; }
        .exp-rec-main { display: flex; align-items: center; gap: 8px; }
        .exp-rec-badge { font-size: 0.65rem; padding: 1px 6px; border-radius: 4px; font-weight: 600; }
        .exp-rec-badge.control { background: #e2e8f0; color: #475569; }
        .exp-rec-badge.experiment { background: #dbeafe; color: #1e40af; }
        .exp-rec-title { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .exp-rec-score { font-weight: 700; font-size: 0.9rem; min-width: 28px; text-align: center; }
        .exp-rec-meta { font-size: 0.7rem; color: var(--text-muted); margin-top: 2px; }
      `}</style>
    </div>
  );
}
