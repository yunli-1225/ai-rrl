'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { UserData } from '@/lib/schema';
import { KEYWORD_LIB } from '@/lib/keywords';


const STORAGE_KEY = 'ai-rrl-material-library';

const DEFAULT_USER_DATA: UserData = {
  personal: { name: '', phone: '', email: '', base: '', politics: '', status: '', 求职意向: '', 性别: '', 实习月数: '' },
  education: [],
  work: [],
  projects: [],
  skills: [],
  certificates: [],
  schoolActivities: [],
  portfolio: [],
  rawResume: '',
  自我评价: '',
};

interface Props { key?: number }

export function loadUserData(): UserData {
  if (typeof window === 'undefined') return DEFAULT_USER_DATA;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_USER_DATA;
}

// ===== Common email domains =====
const EMAIL_DOMAINS = [
  { label: 'Gmail', domain: 'gmail.com' },
  { label: 'Outlook', domain: 'outlook.com' },
  { label: 'Hotmail', domain: 'hotmail.com' },
  { label: 'QQ邮箱', domain: 'qq.com' },
  { label: '163邮箱', domain: '163.com' },
  { label: '126邮箱', domain: '126.com' },
  { label: '新浪邮箱', domain: 'sina.com' },
  { label: '企业/其他', domain: '__other__' },
];

// ===== Common certificates =====
const COMMON_CERTIFICATES = [
  'CET-4', 'CET-6', 'TEM-4', 'TEM-8',
  '计算机二级', '计算机三级', '软考（中级）', '软考（高级）',
  '普通话水平测试', '教师资格证',
  '注册会计师 (CPA)', '法律职业资格证',
  '雅思 (IELTS)', '托福 (TOEFL)', 'GRE', 'GMAT',
  'PMP', '会计初级', '会计中级',
  '银行从业资格证', '证券从业资格证', '基金从业资格证',
  '驾驶证', 'ACCA', 'CFA',
];

// ===== Collapsible wrapper (orange border, artistic title) =====
function CollapsibleOptionCard({ title, icon, count, children, defaultOpen = true, badge, omit }: {
  title: string; icon: string; count?: number; children: React.ReactNode; defaultOpen?: boolean;
  badge?: string; omit?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff',
      borderRadius: 'var(--radius-sm)',
      marginBottom: 14,
      border: '2px solid #f59e0b',
      boxShadow: 'var(--shadow)',
      overflow: 'hidden',
      transition: 'border-color var(--transition)',
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 14px', cursor: 'pointer', userSelect: 'none',
          borderBottom: open ? '1.5px solid #fef3c7' : 'none',
          transition: 'background 0.2s',
        }}
      >
        <span style={{ fontSize: '1rem' }}>{icon}</span>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: '0.92rem', color: 'var(--navy)',
          flex: 1, letterSpacing: '1px',
        }}>
          {title}
        </span>
        {omit && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 500,
            background: '#f1f5f9', color: 'var(--text-muted)',
            padding: '1px 8px', borderRadius: 10, border: '1px solid var(--border)',
          }}>
            可省略
          </span>
        )}
        {badge && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: '0.6rem', fontWeight: 500,
            background: '#eef2ff', color: 'var(--navy)',
            padding: '1px 8px', borderRadius: 10,
          }}>
            {badge}
          </span>
        )}
        {count !== undefined && (
          <span style={{
            fontFamily: 'var(--font-accent)', fontSize: '0.65rem', fontWeight: 600,
            background: '#fef3c7', color: '#d97706',
            padding: '2px 10px', borderRadius: 20,
            border: '1px solid rgba(217,119,6,0.15)',
          }}>
            {count}项
          </span>
        )}
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          ▼
        </span>
      </div>
      {open && <div style={{ padding: '12px 14px' }}>{children}</div>}
    </div>
  );
}

// ===== Profile Completeness =====
function ProfileCompleteness({ data }: { data: UserData }) {
  const score = useMemo(() => {
    let total = 0;
    if (data.personal.name) total += 8;
    if (data.personal.email) total += 4;
    if (data.personal.phone) total += 4;
    if (data.personal.base) total += 2;
    if (data.personal.politics) total += 2;
    if (data.education.length > 0) total += 12;
    if (data.work.length > 0) total += 18;
    if (data.projects.length > 0) total += 12;
    if ((data.skills?.length ?? 0) > 0) total += 8;
    if ((data.certificates?.length ?? 0) > 0) total += 8;
    if ((data.schoolActivities?.length ?? 0) > 0) total += 10;
    if ((data.rawResume?.length ?? 0) > 0) total += 5;
    return Math.min(total, 100);
  }, [data]);
  const message = score >= 80 ? '🔥 非常完整，直接生成吧！'
    : score >= 50 ? '💪 已具备基础，再补充点更佳'
    : '📝 建议多填一些素材，让AI更好发挥';
  return (
    <div className="profile-completeness" style={{ marginBottom: 14 }}>
      <div className="pc-bar"><div className="pc-fill" style={{ width: `${score}%` }} /></div>
      <span className="pc-label">{score}% {message}</span>
    </div>
  );
}

// ===== Personal Info =====
function PersonalInfoSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const set = (field: string, val: string) => onChange({ ...data, personal: { ...data.personal, [field]: val } });
  const [emailPrefix, setEmailPrefix] = useState(() => { const i = data.personal.email.indexOf('@'); return i > -1 ? data.personal.email.slice(0, i) : data.personal.email; });
  const [emailDomain, setEmailDomain] = useState(() => { const i = data.personal.email.indexOf('@'); return i > -1 ? data.personal.email.slice(i + 1) : ''; });
  const [customDomain, setCustomDomain] = useState('');
  const [showCustomDomain, setShowCustomDomain] = useState(false);
  const updateEmail = useCallback((pre: string, dom: string) => { if (pre && dom) set('email', `${pre}@${dom}`); else set('email', pre); }, [set]);
  const handlePrefixChange = (val: string) => { setEmailPrefix(val); if (emailDomain && val) updateEmail(val, emailDomain); else set('email', val); };
  const handleDomainSelect = (domain: string) => {
    if (domain === '__other__') { setShowCustomDomain(true); return; }
    setShowCustomDomain(false); setEmailDomain(domain); setCustomDomain('');
    if (emailPrefix) updateEmail(emailPrefix, domain);
  };
  const handleCustomDomain = (val: string) => { setCustomDomain(val); if (val && emailPrefix) updateEmail(emailPrefix, val); };
  const isActive = (d: string) => d === '__other__' ? showCustomDomain : emailDomain === d && !showCustomDomain;

  return (
    <CollapsibleOptionCard icon="👤" title="个人信息">
      <div className="field-grid">
        <input placeholder="姓名" value={data.personal.name} onChange={e => set('name', e.target.value)} />
        <input placeholder="电话" value={data.personal.phone} onChange={e => set('phone', e.target.value)} />
        <select value={(data.personal as any).性别 || ''} onChange={e => set('性别', e.target.value)}>
          <option value="">性别</option>
          <option value="男">男</option>
          <option value="女">女</option>
          <option value="其他">其他</option>
        </select>
        <input placeholder="可实习X个月（如3、6）" value={(data.personal as any).实习月数 || ''} onChange={e => set('实习月数', e.target.value)} />
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.5px' }}>邮箱</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
            <input placeholder="邮箱前缀" value={emailPrefix} onChange={e => handlePrefixChange(e.target.value)} style={{ flex: '0 0 130px' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>@</span>
            {showCustomDomain ? (
              <input placeholder="输入域名" value={customDomain} onChange={e => handleCustomDomain(e.target.value)} style={{ flex: 1 }} />
            ) : (
              <span style={{ color: 'var(--navy)', fontWeight: 600, fontSize: '0.82rem', flex: 1 }}>{emailDomain || '选择平台'}</span>
            )}
          </div>
          <div className="email-selector">
            {EMAIL_DOMAINS.map(d => (
              <div key={d.domain} className={`email-chip ${isActive(d.domain) ? 'active' : ''}`} onClick={() => handleDomainSelect(d.domain)}>{d.label}</div>
            ))}
          </div>
        </div>
        <input placeholder="求职意向（如：Java开发、前端实习生）" value={(data.personal as any).求职意向 || ''} onChange={e => set('求职意向', e.target.value)} />
        <input placeholder="Base地" value={data.personal.base} onChange={e => set('base', e.target.value)} />
        <select value={data.personal.politics} onChange={e => set('politics', e.target.value)}>
          <option value="">政治面貌</option>
          <option value="中共党员">中共党员</option><option value="共青团员">共青团员</option><option value="群众">群众</option><option value="其他">其他</option>
        </select>
        <select value={data.personal.status} onChange={e => set('status', e.target.value)}>
          <option value="">当前身份</option>
          <option value="应届生">应届生</option><option value="在校生">在校生</option><option value="已工作">已工作</option><option value="待业">待业</option>
        </select>
        <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: 10, marginTop: 4 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: '0.5px' }}>个人证件照（选填）</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {(data.personal as any).照片 ? (
              <div style={{ position: 'relative', width: 80, height: 104 }}>
                <img src={(data.personal as any).照片} alt="证件照" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e8f0' }} />
                <button onClick={() => set('照片', '')} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', border: 'none', background: '#ef4444', color: '#fff', fontSize: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
            ) : (
              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 80, height: 104, border: '2px dashed #cbd5e1', borderRadius: 4, cursor: 'pointer', background: '#f8fafc', fontSize: '0.62rem', color: '#94a3b8', gap: 4 }}>
                <span style={{ fontSize: '1.2rem' }}>📷</span>
                <span>上传照片</span>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const r = new FileReader(); r.onload = (ev) => set('照片', ev.target?.result as string); r.readAsDataURL(file); e.target.value = '';
                }} />
              </label>
            )}
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', lineHeight: 1.4 }}>支持 JPG/PNG，建议 100×130px 比例</span>
          </div>
        </div>
      </div>
    </CollapsibleOptionCard>
  );
}

// ===== Education =====
function EducationSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, education: [...data.education, { school: '', major: '', degree: '', gpa: '', startDate: '', endDate: '' }] });
  const remove = (i: number) => onChange({ ...data, education: data.education.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => { const a = [...data.education]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, education: a }); };
  return (
    <CollapsibleOptionCard icon="🎓" title="教育背景" count={data.education.length}>
      {data.education.map((edu, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 6 }}>
            <input placeholder="学校名称" value={edu.school} onChange={e => set(i, 'school', e.target.value)} />
            <input placeholder="专业" value={edu.major} onChange={e => set(i, 'major', e.target.value)} />
            <select value={edu.degree} onChange={e => set(i, 'degree', e.target.value)}>
              <option value="">学历</option><option value="博士">博士</option><option value="硕士">硕士</option><option value="本科">本科</option><option value="大专">大专</option>
            </select>
            <input placeholder="GPA (如 3.8/4.0)" value={edu.gpa} onChange={e => set(i, 'gpa', e.target.value)} />
            <div className="input-group"><label>入学时间</label><input type="month" value={edu.startDate} onChange={e => set(i, 'startDate', e.target.value)} /></div>
            <div className="input-group"><label>毕业/结束时间</label><input type="month" value={edu.endDate} onChange={e => set(i, 'endDate', e.target.value)} /></div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加教育经历</button></div>
    </CollapsibleOptionCard>
  );
}

// ===== Work/Internship =====
function WorkSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, work: [...data.work, { company: '', position: '', startDate: '', endDate: '', description: '' }] });
  const remove = (i: number) => onChange({ ...data, work: data.work.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => { const a = [...data.work]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, work: a }); };
  return (
    <CollapsibleOptionCard icon="💼" title="工作/实习经历" count={data.work.length}>
      {data.work.map((w, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 6 }}>
            <input placeholder="公司名称" value={w.company} onChange={e => set(i, 'company', e.target.value)} />
            <input placeholder="岗位" value={w.position} onChange={e => set(i, 'position', e.target.value)} />
            <div className="input-group"><label>开始时间</label><input type="month" value={w.startDate} onChange={e => set(i, 'startDate', e.target.value)} /></div>
            <div className="input-group"><label>结束时间</label><input type="month" value={w.endDate} onChange={e => set(i, 'endDate', e.target.value)} /></div>
          </div>
          <textarea placeholder="描述您的工作内容和职责，AI将自动识别关键信息并生成专业化表述" value={w.description} onChange={e => set(i, 'description', e.target.value)} rows={4} />
          <div className="hint-text">💡 可直接粘贴原始描述，AI会自动提取关键信息并按 STAR 原则优化</div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 6 }}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加工作/实习经历</button></div>
    </CollapsibleOptionCard>
  );
}

// ===== Projects =====
function ProjectSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, projects: [...data.projects, { name: '', role: '', startDate: '', endDate: '', description: '', award: '' }] });
  const remove = (i: number) => onChange({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => { const a = [...data.projects]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, projects: a }); };
  return (
    <CollapsibleOptionCard icon="🏆" title="项目/比赛经历" count={data.projects.length}>
      {data.projects.map((p, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 6 }}>
            <input placeholder="项目名称" value={p.name} onChange={e => set(i, 'name', e.target.value)} />
            <input placeholder="角色" value={p.role} onChange={e => set(i, 'role', e.target.value)} />
            <div className="input-group"><label>开始时间</label><input type="month" value={p.startDate} onChange={e => set(i, 'startDate', e.target.value)} /></div>
            <div className="input-group"><label>结束时间</label><input type="month" value={p.endDate} onChange={e => set(i, 'endDate', e.target.value)} /></div>
            <input placeholder="获奖情况（可选）" value={p.award} onChange={e => set(i, 'award', e.target.value)} style={{ gridColumn: '1 / -1' }} />
          </div>
          <textarea placeholder="描述项目内容与技术实现，AI将自动识别关键信息并生成专业化表述" value={p.description} onChange={e => set(i, 'description', e.target.value)} rows={3} />
          <div className="hint-text">💡 可直接粘贴原始描述，AI会自动提取关键信息并优化</div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 6 }}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加项目经历</button></div>
    </CollapsibleOptionCard>
  );
}

// ===== School Activities =====
function SchoolActivitiesSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, schoolActivities: [...(data.schoolActivities ?? []), { role: '', organization: '', startDate: '', endDate: '', description: '' }] });
  const remove = (i: number) => onChange({ ...data, schoolActivities: (data.schoolActivities ?? []).filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => { const a = [...(data.schoolActivities ?? [])]; a[i] = { ...a[i], [field]: val }; onChange({ ...data, schoolActivities: a }); };
  return (
    <CollapsibleOptionCard icon="👥" title="学校经历" count={data.schoolActivities?.length ?? 0}>
      <div className="hint-text" style={{ marginBottom: 8 }}>班干部、学生会、社团、校园活动等经历</div>
      {data.schoolActivities?.map((sa, i) => (
        <div key={i} className="entry-block">
          <div className="field-grid" style={{ marginBottom: 6 }}>
            <input placeholder="职位 / 角色（如：班长、学生会主席）" value={sa.role} onChange={e => set(i, 'role', e.target.value)} />
            <input placeholder="组织名称（如：XX学院学生会）" value={sa.organization} onChange={e => set(i, 'organization', e.target.value)} />
            <div className="input-group"><label>开始时间</label><input type="month" value={sa.startDate} onChange={e => set(i, 'startDate', e.target.value)} /></div>
            <div className="input-group"><label>结束时间</label><input type="month" value={sa.endDate} onChange={e => set(i, 'endDate', e.target.value)} /></div>
          </div>
          <textarea placeholder="描述主要工作与成果，AI将自动识别关键信息并生成专业化表述" value={sa.description} onChange={e => set(i, 'description', e.target.value)} rows={3} />
          <div className="hint-text">💡 可直接粘贴原始描述，AI会自动提取关键信息并优化</div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 6 }}>🗑️ 删除</button>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm btn-outline" onClick={add}>+ 添加学校经历</button></div>
    </CollapsibleOptionCard>
  );
}

// ===== Skills =====
function SkillsSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('熟练');
  const PROFICIENCIES = ['了解', '熟练', '精通', '掌握'];
  const skillSuggestions = useMemo(() => {
    const labelMap: Record<string, string> = {
      tech: '💻 技术栈', finance: '💰 金融财务', marketing: '📈 市场营销',
      design: '🎨 设计创意', government: '🏛️ 体制内技能', management: '📊 管理能力', general: '⭐ 通用素质',
    };
    return Object.entries(KEYWORD_LIB).map(([k, v]) => ({ label: labelMap[k] || k, skills: v }));
  }, []);
  const addSkill = () => { const n = newName.trim(); if (!n || (data.skills ?? []).some(s => s.name === n)) return; onChange({ ...data, skills: [...(data.skills ?? []), { name: n, proficiency: newProf }] }); setNewName(''); };
  const removeSkill = (i: number) => onChange({ ...data, skills: (data.skills ?? []).filter((_, idx) => idx !== i) });
  const addSuggested = (name: string) => { if ((data.skills ?? []).some(s => s.name === name)) return; onChange({ ...data, skills: [...(data.skills ?? []), { name, proficiency: '熟练' }] }); };

  return (
    <CollapsibleOptionCard icon="🔧" title="技能列表" count={data.skills?.length ?? 0}>
      {(data.skills?.length ?? 0) === 0 && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 0', display: 'block' }}>还没有添加技能，在下方输入或从推荐中选择</span>}
      <div className="skill-chips">
        {data.skills?.map((skill, i) => (
          <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px 4px 14px', borderRadius: 20, border: '2px solid #f59e0b', background: '#fffbeb', fontSize: '0.78rem', fontWeight: 500, color: '#92400e', transition: 'all 0.2s', animation: 'chipPop 0.25s ease' }}>
            <span>{skill.name}</span>
            <span style={{ fontSize: '0.65rem', background: '#fde68a', padding: '1px 7px', borderRadius: 10, color: '#92400e', fontWeight: 600 }}>{skill.proficiency}</span>
            <button onClick={() => removeSkill(i)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(146,64,14,0.12)', color: '#92400e', fontSize: '0.6rem', cursor: 'pointer', padding: 0, lineHeight: 1, transition: 'all 0.15s' }}
              onMouseOver={e => { (e.target as HTMLElement).style.background = '#ef4444'; (e.target as HTMLElement).style.color = '#fff'; }}
              onMouseOut={e => { (e.target as HTMLElement).style.background = 'rgba(146,64,14,0.12)'; (e.target as HTMLElement).style.color = '#92400e'; }}>✕</button>
          </div>
        ))}
      </div>
      <div className="skill-add-form">
        <input placeholder="输入技能名称" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); }}} />
        <select value={newProf} onChange={e => setNewProf(e.target.value)}>{PROFICIENCIES.map(p => <option key={p} value={p}>{p}</option>)}</select>
        <button className="btn btn-sm btn-outline" onClick={addSkill}>添加</button>
      </div>
      {(data.skills?.length ?? 0) < 6 && (
        <div className="skill-suggestions">
          <div className="sug-title">💡 选择技能快速补充</div>
          {skillSuggestions.map(group => {
            const avail = group.skills.filter(s => !(data.skills ?? []).some(es => es.name === s));
            if (avail.length === 0) return null;
            return (
              <div key={group.label} className="sug-category">
                <div className="sug-cat-label">{group.label}</div>
                <div className="sug-grid">
                  {avail.slice(0, 12).map(skill => (
                    <div key={skill} className={`sug-chip${(data.skills ?? []).some(s => s.name === skill) ? ' selected' : ''}`} onClick={() => addSuggested(skill)}>
                      <span className="sug-checkbox">{(data.skills ?? []).some(s => s.name === skill) ? '✓' : ''}</span>
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </CollapsibleOptionCard>
  );
}

// ===== Certificates =====
function CertSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const [cc, setCc] = useState('');
  const toggle = (c: string) => { const e = (data.certificates ?? []).includes(c); onChange({ ...data, certificates: e ? (data.certificates ?? []).filter(x => x !== c) : [...(data.certificates ?? []), c] }); };
  const addC = () => { const t = cc.trim(); if (t && !(data.certificates ?? []).includes(t)) { onChange({ ...data, certificates: [...(data.certificates ?? []), t] }); setCc(''); } };
  return (
    <CollapsibleOptionCard icon="📜" title="证书与资质" count={data.certificates?.length ?? 0}>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>点击选择已有证书（可多选）：</div>
      <div className="cert-grid">
        {COMMON_CERTIFICATES.map(cert => (
          <label key={cert} className={`cert-checkbox ${(data.certificates ?? []).includes(cert) ? 'checked' : ''}`}>
            <input type="checkbox" checked={(data.certificates ?? []).includes(cert)} onChange={() => toggle(cert)} />{cert}
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
        <input placeholder="输入其他证书名称" value={cc} onChange={e => setCc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addC(); }}} style={{ flex: 1 }} />
        <button className="btn btn-sm btn-outline" onClick={addC}>添加</button>
      </div>
      {(data.certificates?.length ?? 0) > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {data.certificates?.map(c => (
            <span key={c} style={{ padding: '2px 10px', borderRadius: 12, fontSize: '0.73rem', background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => toggle(c)} title="点击移除">{c} ✕</span>
          ))}
        </div>
      )}
      <div className="hint-text">💡 点击已选证书可移除，AI会根据JD自动突出显示相关证书</div>
    </CollapsibleOptionCard>
  );
}

// ===== 自我评价 =====
function SelfEvaluationSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  return (
    <CollapsibleOptionCard icon="⭐" title="自我评价（选填）" omit>
      <textarea placeholder="输入你的自我评价、个人优势、职业目标等，AI将据此生成个人评价模块" value={(data as any).自我评价 || ''} onChange={e => onChange({ ...data, 自我评价: e.target.value })} rows={5} />
      <div className="hint-text">💡 可直接粘贴已有的自我评价文本，AI会提取关键信息并优化</div>
    </CollapsibleOptionCard>
  );
}

// ===== Raw Resume =====
function RawResumeSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  return (
    <CollapsibleOptionCard icon="📄" title="原始简历全文（备选）" omit>
      <textarea placeholder="粘贴你的简历全文（支持任意长度）" value={data.rawResume} onChange={e => onChange({ ...data, rawResume: e.target.value })} rows={20} />
      <div className="hint-text">💡 粘贴已有简历全文，AI会提取关键信息并按照所选模板重新优化</div>
    </CollapsibleOptionCard>
  );
}

// ===== Main =====
export default function MaterialLibrary(_props: Props) {
  const [data, setData] = useState<UserData>(DEFAULT_USER_DATA);
  useEffect(() => { setData(loadUserData()); }, []);
  const handleChange = useCallback((d: UserData) => { setData(d); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} }, []);
  return (
    <div>
      <ProfileCompleteness data={data} />
      <PersonalInfoSection data={data} onChange={handleChange} />
      <EducationSection data={data} onChange={handleChange} />
      <SchoolActivitiesSection data={data} onChange={handleChange} />
      <WorkSection data={data} onChange={handleChange} />
      <ProjectSection data={data} onChange={handleChange} />
      <SkillsSection data={data} onChange={handleChange} />
      <CertSection data={data} onChange={handleChange} />
      <SelfEvaluationSection data={data} onChange={handleChange} />
      <RawResumeSection data={data} onChange={handleChange} />
    </div>
  );
}
