'use client';

import { useReducer, useState, useCallback, useEffect } from 'react';
import TemplateSelector, { getStoredTemplatePreference } from '@/components/TemplateSelector';
import MaterialLibrary, { loadUserData } from '@/components/MaterialLibrary';
import JDInput, { parseMultiJD } from '@/components/JDInput';
import GenerateButton from '@/components/GenerateButton';
import ResumePreview from '@/components/ResumePreview';
import ImprovementPanel from '@/components/ImprovementPanel';
import Toolbar from '@/components/Toolbar';
import type { ResumeResult, TemplateType, UserData } from '@/lib/schema';

// === useReducer: exactly 3 states ===
type State = {
  result: ResumeResult | null;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: ResumeResult }
  | { type: 'GENERATE_ERROR'; payload: string }
  | { type: 'RESET' };

function resumeReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GENERATE_START':
      return { result: null, loading: true, error: null };
    case 'GENERATE_SUCCESS':
      return { result: action.payload, loading: false, error: null };
    case 'GENERATE_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'RESET':
      return { result: null, loading: false, error: null };
  }
}

export default function HomePage() {
  const [state, dispatch] = useReducer(resumeReducer, { result: null, loading: false, error: null });
  const [template, setTemplate] = useState<TemplateType>('zh-classic');
  const [jdText, setJdText] = useState('');
  const [selectedJD, setSelectedJD] = useState(0);
  const [materialKey, setMaterialKey] = useState(0);

  useEffect(() => {
    setTemplate(getStoredTemplatePreference());
  }, []);

  const handleGenerate = useCallback(async () => {
    const jds = parseMultiJD(jdText);
    if (jds.length === 0) {
      dispatch({ type: 'GENERATE_ERROR', payload: '请先粘贴职位描述（JD）' });
      return;
    }
    const activeJD = jds[selectedJD] || jds[0];

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
            personal: userData.personal,
            education: userData.education,
            work: userData.work,
            projects: userData.projects,
            skills: userData.skills,
            certificates: userData.certificates,
            portfolio: userData.portfolio,
            rawResume: userData.rawResume,
          },
          jdText: activeJD,
          template,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        dispatch({ type: 'GENERATE_ERROR', payload: json.error || `请求失败 (${res.status})` });
        return;
      }

      dispatch({ type: 'GENERATE_SUCCESS', payload: json.data });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '网络请求失败';
      dispatch({ type: 'GENERATE_ERROR', payload: msg });
    }
  }, [jdText, selectedJD, template]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // Listen for skill add events from GapBooster
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

  const jds = parseMultiJD(jdText);

  return (
    <div>
      <header className="app-header">
        <h1>AI <span>RRL</span></h1>
        <p>智能简历定制助手</p>
      </header>

      <div className="app-container">
        <TemplateSelector value={template} onChange={setTemplate} />

        <div className={`main-grid${state.result ? ' has-result' : ''}`}>
          {/* Left: Material Library */}
          <div>
            <MaterialLibrary key={materialKey} />
          </div>

          {/* Center: JD Input + Generate */}
          <div>
            <JDInput value={jdText} onChange={setJdText} />

            {jds.length > 1 && (
              <div className="card">
                <div className="card-label">📑 批量 JD ({jds.length}个)</div>
                <select
                  value={selectedJD}
                  onChange={e => setSelectedJD(Number(e.target.value))}
                >
                  {jds.map((jd, i) => (
                    <option key={i} value={i}>
                      JD #{i + 1}: {jd.slice(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
            )}

            {state.error && (
              <div className="error-banner">{state.error}</div>
            )}

            <GenerateButton
              loading={state.loading}
              disabled={!jdText.trim()}
              onClick={handleGenerate}
            />
          </div>

          {/* Right: Resume Preview */}
          {state.result && (
            <div>
              <Toolbar result={state.result} template={template} onReset={handleReset} />
              <ResumePreview result={state.result} template={template} />
            </div>
          )}
        </div>

        {/* Bottom: Improvement Panel */}
        <ImprovementPanel analysis={state.result?.analysis ?? null} />
      </div>
    </div>
  );
}
