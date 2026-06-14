'use client';

import type { ResumeResult, TemplateType } from '@/lib/schema';
import { getResumePlainText, getResumeHTML } from './ResumePreview';

interface Props {
  result: ResumeResult | null;
  template: TemplateType;
  onReset: () => void;
}

export default function Toolbar({ result, template, onReset }: Props) {
  const handleCopy = async () => {
    if (!result) return;
    const text = getResumePlainText(result);
    try {
      await navigator.clipboard.writeText(text);
      alert('已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const handleDownloadTXT = () => {
    if (!result) return;
    const text = getResumePlainText(result);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-rrl-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    if (!result) return;
    const html = getResumeHTML(result, template);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-rrl-resume.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!result) return;
    const html = getResumeHTML(result, template);
    const win = window.open('', '_blank');
    if (!win) { alert('请允许弹出窗口'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  if (!result) return null;

  return (
    <div className="resume-preview-toolbar">
      <button className="btn btn-sm btn-secondary" onClick={handleCopy}>📋 复制</button>
      <button className="btn btn-sm btn-secondary" onClick={handleDownloadTXT}>📥 下载 TXT</button>
      <button className="btn btn-sm btn-secondary" onClick={handleDownloadHTML}>📥 下载 HTML</button>
      <button className="btn btn-sm btn-secondary" onClick={handlePrint}>🖨️ 打印 PDF</button>
      <button className="btn btn-sm btn-secondary" onClick={onReset} style={{ marginLeft: 'auto' }}>🔄 重置</button>
    </div>
  );
}
