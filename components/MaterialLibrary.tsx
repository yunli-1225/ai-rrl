'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserData } from '@/lib/schema';

const STORAGE_KEY = 'ai-rrl-material-library';

const DEFAULT_USER_DATA: UserData = {
  personal: { name: '', phone: '', email: '', base: '', politics: '', status: '' },
  education: [],
  work: [],
  projects: [],
  skills: [],
  certificates: [],
  portfolio: [],
  rawResume: '',
};

interface Props {
  key?: number;
}

export function loadUserData(): UserData {
  if (typeof window === 'undefined') return DEFAULT_USER_DATA;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_USER_DATA;
}

// ===== Personal Info =====
function PersonalInfoSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const set = (field: string, val: string) =>
    onChange({ ...data, personal: { ...data.personal, [field]: val } });

  return (
    <div className="card">
      <div className="card-label">👤 个人信息</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input placeholder="姓名" value={data.personal.name} onChange={e => set('name', e.target.value)} />
        <input placeholder="电话" value={data.personal.phone} onChange={e => set('phone', e.target.value)} />
        <input placeholder="邮箱" value={data.personal.email} onChange={e => set('email', e.target.value)} />
        <input placeholder="Base地" value={data.personal.base} onChange={e => set('base', e.target.value)} />
        <select value={data.personal.politics} onChange={e => set('politics', e.target.value)}>
          <option value="">政治面貌</option>
          <option value="中共党员">中共党员</option>
          <option value="共青团员">共青团员</option>
          <option value="群众">群众</option>
          <option value="其他">其他</option>
        </select>
        <select value={data.personal.status} onChange={e => set('status', e.target.value)}>
          <option value="">当前身份</option>
          <option value="应届生">应届生</option>
          <option value="在校生">在校生</option>
          <option value="已工作">已工作</option>
          <option value="待业">待业</option>
        </select>
      </div>
    </div>
  );
}

// ===== Education =====
function EducationSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, education: [...data.education, { school: '', major: '', degree: '', gpa: '', startDate: '', endDate: '' }] });
  const remove = (i: number) => onChange({ ...data, education: data.education.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const arr = [...data.education];
    arr[i] = { ...arr[i], [field]: val };
    onChange({ ...data, education: arr });
  };

  return (
    <div className="card">
      <div className="card-label">🎓 教育背景 <span className="badge">{data.education.length}条</span></div>
      {data.education.map((edu, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 8, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input placeholder="学校名称" value={edu.school} onChange={e => set(i, 'school', e.target.value)} />
            <input placeholder="专业" value={edu.major} onChange={e => set(i, 'major', e.target.value)} />
            <select value={edu.degree} onChange={e => set(i, 'degree', e.target.value)}>
              <option value="">学历</option>
              <option value="博士">博士</option>
              <option value="硕士">硕士</option>
              <option value="本科">本科</option>
              <option value="大专">大专</option>
            </select>
            <input placeholder="GPA (如 3.8/4.0)" value={edu.gpa} onChange={e => set(i, 'gpa', e.target.value)} />
            <input placeholder="开始时间" value={edu.startDate} onChange={e => set(i, 'startDate', e.target.value)} />
            <input placeholder="结束时间" value={edu.endDate} onChange={e => set(i, 'endDate', e.target.value)} />
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)}>删除</button>
        </div>
      ))}
      <button className="btn btn-sm btn-secondary mt-2" onClick={add}>+ 添加教育经历</button>
    </div>
  );
}

// ===== Work/Internship =====
function WorkSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, work: [...data.work, { company: '', position: '', startDate: '', endDate: '', description: '' }] });
  const remove = (i: number) => onChange({ ...data, work: data.work.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const arr = [...data.work];
    arr[i] = { ...arr[i], [field]: val };
    onChange({ ...data, work: arr });
  };

  return (
    <div className="card">
      <div className="card-label">💼 工作/实习经历 <span className="badge">{data.work.length}条</span></div>
      {data.work.map((w, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 8, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input placeholder="公司名称" value={w.company} onChange={e => set(i, 'company', e.target.value)} />
            <input placeholder="岗位" value={w.position} onChange={e => set(i, 'position', e.target.value)} />
            <input placeholder="开始时间" value={w.startDate} onChange={e => set(i, 'startDate', e.target.value)} />
            <input placeholder="结束时间" value={w.endDate} onChange={e => set(i, 'endDate', e.target.value)} />
          </div>
          <textarea
            placeholder={'描述（每段用 --- 隔开）\n例：负责XX系统开发，使用React实现前端...'}
            value={w.description}
            onChange={e => set(i, 'description', e.target.value)}
            rows={4}
          />
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 4 }}>删除</button>
        </div>
      ))}
      <button className="btn btn-sm btn-secondary mt-2" onClick={add}>+ 添加工作/实习经历</button>
    </div>
  );
}

// ===== Projects =====
function ProjectSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const add = () => onChange({ ...data, projects: [...data.projects, { name: '', role: '', startDate: '', endDate: '', description: '', award: '' }] });
  const remove = (i: number) => onChange({ ...data, projects: data.projects.filter((_, idx) => idx !== i) });
  const set = (i: number, field: string, val: string) => {
    const arr = [...data.projects];
    arr[i] = { ...arr[i], [field]: val };
    onChange({ ...data, projects: arr });
  };

  return (
    <div className="card">
      <div className="card-label">🏆 项目/比赛经历 <span className="badge">{data.projects.length}条</span></div>
      {data.projects.map((p, i) => (
        <div key={i} style={{ marginBottom: 10, padding: 8, background: '#f8fafc', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
            <input placeholder="项目名称" value={p.name} onChange={e => set(i, 'name', e.target.value)} />
            <input placeholder="角色" value={p.role} onChange={e => set(i, 'role', e.target.value)} />
            <input placeholder="开始时间" value={p.startDate} onChange={e => set(i, 'startDate', e.target.value)} />
            <input placeholder="结束时间" value={p.endDate} onChange={e => set(i, 'endDate', e.target.value)} />
            <input placeholder="获奖情况（可选）" value={p.award} onChange={e => set(i, 'award', e.target.value)} />
          </div>
          <textarea
            placeholder={'描述（每段用 --- 隔开）'}
            value={p.description}
            onChange={e => set(i, 'description', e.target.value)}
            rows={3}
          />
          <button className="btn btn-sm btn-secondary" onClick={() => remove(i)} style={{ marginTop: 4 }}>删除</button>
        </div>
      ))}
      <button className="btn btn-sm btn-secondary mt-2" onClick={add}>+ 添加项目经历</button>
    </div>
  );
}

// ===== Skills =====
function SkillsSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const raw = data.skills.map(s => `${s.name}（${s.proficiency}）`).join('\n');
  const handleChange = (val: string) => {
    const lines = val.split('\n').filter(Boolean);
    const parsed = lines.map(line => {
      const match = line.match(/^(.+?)（(.+?)）$/);
      if (match) return { name: match[1].trim(), proficiency: match[2].trim() };
      return { name: line.trim(), proficiency: '' };
    });
    onChange({ ...data, skills: parsed });
  };

  return (
    <div className="card">
      <div className="card-label">🔧 技能列表 <span className="badge">{data.skills.length}项</span></div>
      <textarea
        placeholder={'每行一个，格式：技能名（熟练度）\n如：Python（精通）\nSQL（熟练）'}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        rows={5}
      />
    </div>
  );
}

// ===== Certificates =====
function CertSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const raw = data.certificates.join('\n');
  const handleChange = (val: string) => {
    onChange({ ...data, certificates: val.split('\n').filter(Boolean) });
  };

  return (
    <div className="card">
      <div className="card-label">📜 证书与资质 <span className="badge">{data.certificates.length}项</span></div>
      <textarea
        placeholder={'每行一个证书\n如：CET-6\n计算机二级'}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        rows={4}
      />
    </div>
  );
}

// ===== Portfolio =====
function PortfolioSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const raw = data.portfolio.map(p => `${p.title} | ${p.link}`).join('\n');
  const handleChange = (val: string) => {
    const parsed = val.split('\n').filter(Boolean).map(line => {
      const sep = line.indexOf('|');
      if (sep > -1) return { title: line.slice(0, sep).trim(), link: line.slice(sep + 1).trim() };
      return { title: line.trim(), link: '' };
    });
    onChange({ ...data, portfolio: parsed });
  };

  return (
    <div className="card">
      <div className="card-label">🖼️ 作品集</div>
      <textarea
        placeholder={'每行一个：作品名 | 链接/说明\n如：个人博客 | https://xxx.com'}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        rows={4}
      />
    </div>
  );
}

// ===== Raw Resume =====
function RawResumeSection({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  return (
    <div className="card">
      <div className="card-label">📄 原始简历全文（备选）</div>
      <textarea
        placeholder="如果已有完整简历，可粘贴在这里作为补充素材源"
        value={data.rawResume}
        onChange={e => onChange({ ...data, rawResume: e.target.value })}
        rows={6}
      />
    </div>
  );
}

// ===== Import/Export =====
function ImportExportBar({ data, onChange }: { data: UserData; onChange: (d: UserData) => void }) {
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-rrl-material.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        onChange(parsed);
      } catch {
        alert('导入失败：文件格式不正确');
      }
    };
    input.click();
  };

  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      <button className="btn btn-sm btn-secondary" onClick={handleExport}>📤 导出素材</button>
      <button className="btn btn-sm btn-secondary" onClick={handleImport}>📥 导入素材</button>
    </div>
  );
}

// ===== Main MaterialLibrary =====
export default function MaterialLibrary(_props: Props) {
  const [data, setData] = useState<UserData>(DEFAULT_USER_DATA);

  useEffect(() => {
    setData(loadUserData());
  }, []);

  const handleChange = useCallback((newData: UserData) => {
    setData(newData);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(newData)); } catch {}
  }, []);

  return (
    <div>
      <ImportExportBar data={data} onChange={handleChange} />
      <PersonalInfoSection data={data} onChange={handleChange} />
      <EducationSection data={data} onChange={handleChange} />
      <WorkSection data={data} onChange={handleChange} />
      <ProjectSection data={data} onChange={handleChange} />
      <SkillsSection data={data} onChange={handleChange} />
      <CertSection data={data} onChange={handleChange} />
      <PortfolioSection data={data} onChange={handleChange} />
      <RawResumeSection data={data} onChange={handleChange} />
    </div>
  );
}
