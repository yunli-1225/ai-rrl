'use client';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function JDInput({ value, onChange }: Props) {
  return (
    <div className="card">
      <div className="card-label">📝 职位描述 (JD)</div>
      <textarea
        className="large"
        placeholder={'粘贴职位描述（JD）...\n\n支持批量处理：用 === 分隔多个 JD'}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
        支持多 JD 批量处理，使用 <code>===</code> 分隔
      </div>
    </div>
  );
}

export function parseMultiJD(text: string): string[] {
  const parts = text.split(/===+/).map(s => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}
