'use client';

import type { OptimizedResume } from '@/lib/schema';
import type { TemplateType } from '@/lib/schema';
import { getResumePlainText, getResumeHTML, exportPDF } from './ResumePreview';

interface Props {
  result: OptimizedResume | null;
  onReset: () => void;
  templateId?: TemplateType;
}

export default function Toolbar({ result, onReset, templateId }: Props) {
  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(getResumePlainText(result));
      alert('已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const handleDownloadTXT = () => {
    if (!result) return;
    const blob = new Blob([getResumePlainText(result)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ai-rrl-resume.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    if (!result) return;
    const blob = new Blob([getResumeHTML(result, templateId)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'ai-rrl-resume.html'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!result) return;
    try { exportPDF(result, templateId); } catch { alert('PDF导出异常，请使用"下载 HTML"后手动打印'); }
  };

  if (!result) return null;

  return (
    <div className="resume-preview-toolbar">
      <button className="btn btn-sm btn-secondary" onClick={handleCopy}>📋 复制</button>
      <button className="btn btn-sm btn-secondary" onClick={handleDownloadTXT}>📥 下载 TXT</button>
      <button className="btn btn-sm btn-secondary" onClick={handleDownloadHTML}>📥 下载 HTML</button>
      <button className="btn btn-sm btn-primary" onClick={handleExportPDF}>📄 导出 PDF</button>
      <button className="btn btn-sm btn-secondary" onClick={onReset} style={{ marginLeft: 'auto' }}>🔄 重置</button>
    </div>
  );
}
