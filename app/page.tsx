'use client';

import { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import TemplateSelector, { getStoredTemplatePreference } from '@/components/TemplateSelector';
import MaterialLibrary, { loadUserData } from '@/components/MaterialLibrary';
import JDInput from '@/components/JDInput';
import GenerateButton from '@/components/GenerateButton';
import ResumePreview from '@/components/ResumePreview';
import ImprovementPanel from '@/components/ImprovementPanel';
import Toolbar from '@/components/Toolbar';
import type { ResumeResult, TemplateType, UserData } from '@/lib/schema';

// ===== Tab Config =====
const TABS = [
  { id: 'materials', label: '素材', icon: '📋' },
  { id: 'jd', label: '职位', icon: '📝' },
  { id: 'generate', label: '生成', icon: '⚡' },
] as const;

type TabId = typeof TABS[number]['id'];

// ===== useReducer =====
type State = { result: ResumeResult | null; loading: boolean; error: string | null };
type Action =
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: ResumeResult }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'RESET' };

function resumeReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GENERATE_START': return { result: null, loading: true, error: null };
    case 'GENERATE_SUCCESS': return { result: action.payload, loading: false, error: null };
    case 'GENERATE_ERROR': return { ...state, loading: false, error: action.payload };
    case 'RESET': return { result: null, loading: false, error: null };
  }
}

export default function HomePage() {
  const [state, dispatch] = useReducer(resumeReducer, { result: null, loading: false, error: null });
  const [template, setTemplate] = useState<TemplateType>('zh-classic');
  const [jdList, setJdList] = useState<string[]>(['']);
  const [activeJDIndex, setActiveJDIndex] = useState(0);
  const [materialKey, setMaterialKey] = useState(0);
  const [tab, setTab] = useState<TabId>('materials');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTemplate(getStoredTemplatePreference()); }, []);
  useEffect(() => { contentRef.current?.scrollTo(0, 0); }, [tab]);

  const handleGenerate = useCallback(async () => {
    const validJDs = jdList.filter(jd => jd.trim().length >= 10);
    if (validJDs.length === 0) {
      dispatch({ type: 'GENERATE_ERROR', payload: '请至少填写一个职位描述（JD），不少于10个字符' });
      return;
    }
    const activeJD = jdList[activeJDIndex]?.trim();
    if (!activeJD || activeJD.length < 10) {
      dispatch({ type: 'GENERATE_ERROR', payload: '当前选中的 JD 内容过少，请补充完整' });
      return;
    }
    const userData: UserData = loadUserData();
    const hasData = userData.work.length > 0 || userData.projects.length > 0 ||
      userData.skills.length > 0 || userData.education.length > 0;
    if (!hasData) {
      dispatch({ type: 'GENERATE_ERROR', payload: '请先在素材库中填写经历和技能信息' });
      return;
    }
    dispatch({ type: 'GENERATE_START' });
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userData: {
            personal: userData.personal, education: userData.education,
            work: userData.work, projects: userData.projects,
            skills: userData.skills, certificates: userData.certificates,
            schoolActivities: userData.schoolActivities,
            portfolio: userData.portfolio, rawResume: userData.rawResume,
          },
          jdText: activeJD, template,
        }),
      });
      const json = await res.json();
      if (!res.ok) { dispatch({ type: 'GENERATE_ERROR', payload: json.error || `请求失败 (${res.status})` }); return; }
      dispatch({ type: 'GENERATE_SUCCESS', payload: json.data });
    } catch (err) {
      dispatch({ type: 'GENERATE_ERROR', payload: err instanceof Error ? err.message : '网络请求失败' });
    }
  }, [jdList, activeJDIndex, template]);

  const handleReset = useCallback(() => { dispatch({ type: 'RESET' }); }, []);

  // GapBooster listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.name) {
        try {
          const existing = loadUserData();
          existing.skills = [
            ...existing.skills.filter((s: { name: string }) => s.name !== detail.name),
            { name: detail.name, proficiency: detail.proficiency || '了解' },
          ];
          localStorage.setItem('ai-rrl-material-library', JSON.stringify(existing));
          setMaterialKey(k => k + 1);
          alert(`已添加技能「${detail.name}」到素材库！`);
        } catch {}
      }
    };
    window.addEventListener('ai-rrl-add-skill', handler);
    return () => window.removeEventListener('ai-rrl-add-skill', handler);
  }, []);

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="header-accent-line" />
        <div className="header-content">
          <h1>AI <span className="header-sub">RRL</span></h1>
          <p className="header-tagline">智能简历定制助手</p>
        </div>
      </header>

      {/* Tab Content */}
      <div className="tab-content" ref={contentRef}>
        {/* Tab: Materials */}
        {tab === 'materials' && (
          <div className="tab-page">
            <div className="tab-page-label">
              <span className="tpl-icon">📋</span>
              <span className="tpl-text">素材管理</span>
              <span className="tpl-badge">个人信息 · 经历 · 技能</span>
            </div>
            <MaterialLibrary key={materialKey} />
          </div>
        )}

        {/* Tab: JD */}
        {tab === 'jd' && (
          <div className="tab-page">
            <JDInput
              jdList={jdList}
              onChange={setJdList}
              activeIndex={activeJDIndex}
              onActiveIndexChange={setActiveJDIndex}
            />
          </div>
        )}

        {/* Tab: Generate */}
        {tab === 'generate' && (
          <div className="tab-page">
            {/* Template */}
            <TemplateSelector value={template} onChange={setTemplate} />

            {/* Error */}
            {state.error && <div className="error-banner">{state.error}</div>}

            {/* Generate Button */}
            <div style={{ marginBottom: 16 }}>
              <GenerateButton
                loading={state.loading}
                disabled={jdList.every(jd => !jd.trim())}
                onClick={handleGenerate}
              />
            </div>

            {/* Preview + Toolbar */}
            {state.result && (
              <>
                <Toolbar result={state.result} template={template} onReset={handleReset} />
                <div style={{ marginBottom: 16 }}>
                  <ResumePreview result={state.result} template={template} />
                </div>
                <ImprovementPanel analysis={state.result?.analysis ?? null} />
              </>
            )}

            {/* Empty state */}
            {!state.result && !state.loading && (
              <div className="generate-empty">
                <div className="ge-icon">⚡</div>
                <div className="ge-title">准备好生成简历了吗？</div>
                <div className="ge-desc">确保已填写素材和职位描述，点击上方按钮开始</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tab Bar */}
      <nav className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === 'generate' && state.result && <span className="tab-dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
