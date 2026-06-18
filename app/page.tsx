'use client';

import { useReducer, useState, useCallback, useEffect, useRef } from 'react';
import TemplateSelector, { getStoredTemplatePreference } from '@/components/TemplateSelector';
import MaterialLibrary, { loadUserData } from '@/components/MaterialLibrary';
import JDInput from '@/components/JDInput';
import GenerateButton from '@/components/GenerateButton';
import ResumePreview from '@/components/ResumePreview';
import ImprovementPanel from '@/components/ImprovementPanel';
import Toolbar from '@/components/Toolbar';
import HistoryPanel, { saveResumeToLocal } from '@/components/HistoryPanel';
import KnowledgePanel from '@/components/KnowledgePanel';
import Skeleton from '@/components/Skeleton';
import ExperimentPanel from '@/components/ExperimentPanel';
import { OptimizedResumeSchema } from '@/lib';
import type { OptimizedResume, TemplateType, UserData } from '@/lib/schema';

const LOADING_TEXTS = { rag: '正在检索行业关键词...', basic: '正在分析匹配度...', full: '正在生成简历内容...' } as const;

const TABS = [
  { id: 'materials', label: '素材', icon: '📋' }, { id: 'jd', label: '职位', icon: '📝' },
  { id: 'history', label: '历史', icon: '📂' }, { id: 'knowledge', label: '知识库', icon: '📚' },
  { id: 'experiment', label: '实验', icon: '🧪' }, { id: 'generate', label: '生成', icon: '⚡' },
] as const;

type TabId = typeof TABS[number]['id'];
type State = { result: OptimizedResume | null; loading: boolean; error: string | null };
type Action =
  | { type: 'GENERATE_START' }
  | { type: 'GENERATE_SUCCESS'; payload: OptimizedResume }
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

function cleanLLMJson(raw: string): Record<string, unknown> | null {
  let text = raw.trim();
  text = text.replace(/```json|```/g, '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  text = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function HomePage() {
  const [state, dispatch] = useReducer(resumeReducer, { result: null, loading: false, error: null });
  const [loadingText, setLoadingText] = useState<string>(LOADING_TEXTS.basic);
  const [template, setTemplate] = useState<TemplateType>('zh-classic');
  const [jdList, setJdList] = useState<string[]>(['']);
  const [activeJDIndex, setActiveJDIndex] = useState(0);
  const [materialKey, setMaterialKey] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [tab, setTab] = useState<TabId>('materials');
  const contentRef = useRef<HTMLDivElement>(null);
  const streamBufRef = useRef<string>('');

  useEffect(() => { setTemplate(getStoredTemplatePreference()); }, []);
  useEffect(() => { contentRef.current?.scrollTo(0, 0); }, [tab]);

  const handleGenerate = useCallback(async () => {
    let attempt = 0;
    const MAX_ATTEMPTS = 2;

    const doGenerate = async (): Promise<void> => {
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
      const hasData = (userData.work ?? []).length > 0 || (userData.projects ?? []).length > 0 ||
        (userData.skills ?? []).length > 0 || (userData.education ?? []).length > 0;
      if (!hasData) {
        dispatch({ type: 'GENERATE_ERROR', payload: '请先在素材库中填写经历和技能信息' });
        return;
      }

      const API_ERROR = 'AI生成格式异常';

      if (attempt === 0) {
        dispatch({ type: 'GENERATE_START' });
        setLoadingText(LOADING_TEXTS.rag);
        await new Promise(r => setTimeout(r, 50));
      }

      const payload = {
        userData: {
          personal: userData.personal, education: userData.education,
          work: userData.work, projects: userData.projects,
          skills: userData.skills, certificates: userData.certificates,
          schoolActivities: userData.schoolActivities,
          portfolio: userData.portfolio, rawResume: userData.rawResume,
        },
        jdText: activeJD, template,
        showEval: true,
      };

      try {
        // ═══════════════════════════════════════════
        // 单次流式调用 — 后端一次生成全部内容
        // ═══════════════════════════════════════════
        setLoadingText(LOADING_TEXTS.full);
        streamBufRef.current = '';

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, phase: 2, stream: true }),
        });

        if (!res.ok || !res.body) {
          const data = await res.json();
          dispatch({ type: 'GENERATE_ERROR', payload: data.error || API_ERROR });
          return;
        }

        // ── 流式读取：仅累积到 ref，不 dispatch ──
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';
        let finalData: OptimizedResume | null = null;
        let streamDone = false;

        while (!streamDone) {
          const { done, value } = await reader.read();
          if (done) { streamDone = true; break; }

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
              const msg = JSON.parse(trimmed);

              if (msg.t) {
                streamBufRef.current += msg.t;
              }

              if (msg.done === true && msg.data) {
                finalData = msg.data;
                streamDone = true;
              }

              if (msg.error === 'STREAM_FAILED') {
                if (attempt < MAX_ATTEMPTS - 1) {
                  attempt++;
                  await reader.cancel().catch(() => {});
                  return doGenerate();
                }
                console.log('=== 生成异常诊断 [STREAM_FAILED] ===');
                console.log('streamBufRef.current (前500):', streamBufRef.current.slice(0, 500));
                dispatch({ type: 'GENERATE_ERROR', payload: 'AI生成异常，请稍后重试' });
                streamDone = true;
              }
            } catch { /* skip */ }
          }
        }

        // ── 流结束后校验并渲染 ──
        if (finalData) {
          const validated = OptimizedResumeSchema.safeParse(finalData);
          if (validated.success) {
            dispatch({ type: 'GENERATE_SUCCESS', payload: validated.data });
            saveResumeToLocal({
              title: validated.data.简历标题 || '未命名简历',
              resumeJson: JSON.stringify(validated.data),
              jdText: activeJD,
              template,
              userDataJson: JSON.stringify(userData),
              scoreTotal: validated.data.岗位匹配评分?.总分 || 0,
              scoreSkill: validated.data.岗位匹配评分?.技能匹配分 || 0,
              scoreExperience: validated.data.岗位匹配评分?.行业经验分 || 0,
            });
            setHistoryKey(k => k + 1);
          } else {
            console.log('=== 生成异常诊断 [第一个 validated.success=false] ===');
            console.log('finalData keys:', Object.keys(finalData));
            console.log('validated.error:', JSON.stringify(validated.error?.issues));
            const rawText = streamBufRef.current;
            const parsed = cleanLLMJson(rawText);
            if (parsed) {
              let purifiedText = parsed['优化后完整简历文本'] as string || rawText;
              if (typeof purifiedText === 'string' && purifiedText.trim().startsWith('{')) {
                const inner = cleanLLMJson(purifiedText);
                if (inner && inner['优化后完整简历文本']) {
                  purifiedText = inner['优化后完整简历文本'] as string;
                }
              }
              const combined = {
                简历标题: (parsed as any)['简历标题'] || '',
                基础信息: (parsed as any)['基础信息'] || {},
                教育经历: (parsed as any)['教育经历'] || [],
                专业技能标签: (parsed as any)['专业技能标签'] || [],
                岗位匹配评分: (parsed as any)['岗位匹配评分'] || { 总分: 0, 技能匹配分: 0, 行业经验分: 0 },
                优化后完整简历文本: purifiedText,
                实习项目经历: (parsed as any)['实习项目经历'] || [],
                模块排序: (parsed as any)['模块排序'] || [],
              };
              const revalidated = OptimizedResumeSchema.safeParse(combined);
              if (revalidated.success) {
                dispatch({ type: 'GENERATE_SUCCESS', payload: revalidated.data });
                saveResumeToLocal({
                  title: revalidated.data.简历标题 || '未命名简历',
                  resumeJson: JSON.stringify(revalidated.data),
                  jdText: activeJD,
                  template,
                  userDataJson: JSON.stringify(userData),
                  scoreTotal: revalidated.data.岗位匹配评分?.总分 || 0,
                  scoreSkill: revalidated.data.岗位匹配评分?.技能匹配分 || 0,
                  scoreExperience: revalidated.data.岗位匹配评分?.行业经验分 || 0,
                });
                setHistoryKey(k => k + 1);
              } else {
                console.log('=== 生成异常诊断 [revalidated.success=false] ===');
                console.log('combined keys:', Object.keys(combined));
                console.log('revalidated.error:', JSON.stringify(revalidated.error?.issues));
                dispatch({ type: 'GENERATE_ERROR', payload: 'AI生成格式异常，请重试' });
              }
            } else {
              console.log('=== 生成异常诊断 [cleanLLMJson 返回 null] ===');
              console.log('rawText (前500):', rawText.slice(0, 500));
              dispatch({ type: 'GENERATE_ERROR', payload: 'AI生成格式异常，请重试' });
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          dispatch({ type: 'GENERATE_ERROR', payload: 'AI响应超时，请简化素材后重试' });
        } else if (attempt < MAX_ATTEMPTS - 1) { attempt++; return doGenerate(); }
        else {
          console.log('=== 生成异常诊断 [catch 捕获] ===');
          console.log('err:', err?.message || err);
          dispatch({ type: 'GENERATE_ERROR', payload: 'AI生成异常，请稍后重试' }); }
      }
    };

    await doGenerate();
  }, [jdList, activeJDIndex, template]);

  const handleReset = useCallback(() => { dispatch({ type: 'RESET' }); }, []);

  const handleReuse = useCallback((record: { jd_text: string; template: string; user_data_json: string }) => {
    if (record.user_data_json && record.user_data_json !== '{}') {
      try {
        const ud = JSON.parse(record.user_data_json);
        localStorage.setItem('ai-rrl-material-library', JSON.stringify(ud));
        setMaterialKey(k => k + 1);
      } catch {}
    }
    if (record.jd_text) { setJdList([record.jd_text]); setActiveJDIndex(0); }
    if (record.template) setTemplate(record.template as TemplateType);
    setTab('generate');
  }, []);

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
      <header className="app-header">
        <div className="header-accent-line" />
        <div className="header-content">
          <h1>AI <span className="header-sub">RRL</span></h1>
          <p className="header-tagline">智能简历定制助手</p>
        </div>
      </header>

      <div className="tab-content" ref={contentRef}>
        {tab === 'materials' && (
          <div className="tab-page">
            <div className="tab-page-label"><span className="tpl-icon">📋</span><span className="tpl-text">素材管理</span><span className="tpl-badge">个人信息 · 经历 · 技能</span></div>
            <MaterialLibrary key={materialKey} />
          </div>
        )}
        {tab === 'jd' && (
          <div className="tab-page">
            <JDInput jdList={jdList} onChange={setJdList} activeIndex={activeJDIndex} onActiveIndexChange={setActiveJDIndex} />
          </div>
        )}
        {tab === 'history' && (
          <div className="tab-page">
            <div className="tab-page-label"><span className="tpl-icon">📂</span><span className="tpl-text">历史简历</span><span className="tpl-badge">自动保存 · 一键复用</span></div>
            <HistoryPanel onReuse={handleReuse} refreshKey={historyKey} />
          </div>
        )}
        {tab === 'knowledge' && (
          <div className="tab-page"><div className="tab-page-label"><span className="tpl-icon">📚</span><span className="tpl-text">RAG 知识库</span><span className="tpl-badge">行业JD · ATS规则 · 检索增强</span></div><KnowledgePanel /></div>
        )}
        {tab === 'experiment' && (
          <div className="tab-page"><div className="tab-page-label"><span className="tpl-icon">🧪</span><span className="tpl-text">消融实验</span><span className="tpl-badge">统计学量化 · 对照分析 · CSV导出</span></div><ExperimentPanel /></div>
        )}
        {tab === 'generate' && (
          <div className="tab-page">
            <TemplateSelector value={template} onChange={setTemplate} />
            {state.error && <div className="error-banner">{state.error}</div>}
            <div style={{ marginBottom: 16 }}>
              <GenerateButton
                loading={state.loading}
                disabled={jdList.every(jd => !jd.trim())}
                loadingText={loadingText}
                onClick={handleGenerate}
              />
            </div>
            {state.result && (
              <>
                <Toolbar result={state.result} onReset={handleReset} templateId={template} />
                <div style={{ marginBottom: 16 }}><ResumePreview result={state.result} templateId={template} /></div>
                <ImprovementPanel score={state.result.岗位匹配评分} />
              </>
            )}
            {!state.result && state.loading && (
              <div style={{ marginBottom: 16 }}><Skeleton type="card" count={2} /></div>
            )}
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

      <nav className="tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-icon">{t.icon}</span><span className="tab-label">{t.label}</span>
            {t.id === 'generate' && state.result && <span className="tab-dot" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
