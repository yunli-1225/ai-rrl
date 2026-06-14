'use client';

import { useMemo } from 'react';
import type { ResumeResult, TemplateType } from '@/lib/schema';
import { getTemplateById } from '@/lib/templates';

interface Props {
  result: ResumeResult | null;
  template: TemplateType;
}

function renderStarBullets(bullets: ResumeResult['workExperiences'][0]['bullets']): string {
  return bullets.map(b => {
    let text = b.raw;
    b.highlightedNumbers.forEach(num => {
      text = text.replaceAll(num, `<strong>${num}</strong>`);
    });
    return `<li>${text}</li>`;
  }).join('');
}

function buildMainSections(result: ResumeResult): string {
  let html = '';

  if (result.workExperiences.length > 0) {
    html += `<section><h2>工作经历</h2>`;
    result.workExperiences.forEach(w => {
      html += `<div class="item">
        <div class="item-header"><span>${w.title} · ${w.subtitle}</span><span class="item-date">${w.date}</span></div>
        <ul>${renderStarBullets(w.bullets)}</ul>
      </div>`;
    });
    html += `</section>`;
  }

  if (result.projects.length > 0) {
    html += `<section><h2>项目经历</h2>`;
    result.projects.forEach(p => {
      html += `<div class="item">
        <div class="item-header"><span>${p.title} · ${p.subtitle}</span><span class="item-date">${p.date}</span></div>
        <ul>${renderStarBullets(p.bullets)}</ul>
      </div>`;
    });
    html += `</section>`;
  }

  if (result.education.length > 0) {
    html += `<section><h2>教育背景</h2>`;
    result.education.forEach(e => {
      const highlight = e.highlight ? ' <strong>★</strong>' : '';
      html += `<div class="item">
        <div class="item-header"><span>${e.school} · ${e.major}${highlight}</span><span class="item-date">${e.date}</span></div>
        ${e.gpa ? `<div style="font-size:12.5px">GPA: <strong>${e.gpa}</strong></div>` : ''}
      </div>`;
    });
    html += `</section>`;
  }

  if (result.skills.length > 0) {
    html += `<section><h2>技能</h2><div class="skills-list">`;
    result.skills.forEach(s => {
      html += `<span>${s.name}${s.matched ? ' <strong>✓</strong>' : ''}（${s.proficiency}）</span>`;
    });
    html += `</div></section>`;
  }

  if (result.certificates.length > 0) {
    html += `<section><h2>证书</h2><div class="cert-list">`;
    result.certificates.forEach(c => { html += `<div>${c}</div>`; });
    html += `</div></section>`;
  }

  return html;
}

function buildResumeHTML(result: ResumeResult, template: TemplateType): string {
  const cls = `resume-${template}`;

  if (template.startsWith('en-')) {
    const sidebarSkills = result.skills.map(s =>
      `<div class="skill-item">${s.name}${s.matched ? ' <strong>✓</strong>' : ''} <span class="proficiency">${s.proficiency}</span></div>`
    ).join('');

    const sidebarCerts = result.certificates.map(c =>
      `<div>${c}</div>`
    ).join('');

    return `<div class="${cls}">
      <div class="sidebar">
        <div class="header-side">
          <h1>${result.workExperiences[0]?.title || '简历'}</h1>
        </div>
        ${result.skills.length > 0 ? `<h2>技能</h2>${sidebarSkills}` : ''}
        ${result.certificates.length > 0 ? `<h2>证书</h2>${sidebarCerts}` : ''}
      </div>
      <div class="main">
        <div class="summary-text">${result.summary}</div>
        ${buildMainSections(result)}
      </div>
    </div>`;
  }

  return `<div class="${cls}">
    <div class="header">
      <h1>${result.workExperiences[0]?.title || '简历'}</h1>
    </div>
    <div class="summary-text">${result.summary}</div>
    ${buildMainSections(result)}
  </div>`;
}

export default function ResumePreview({ result, template }: Props) {
  const html = useMemo(() => {
    if (!result) return '';
    return buildResumeHTML(result, template);
  }, [result, template]);

  const style = useMemo(() => {
    const tpl = getTemplateById(template);
    return tpl.getStyle();
  }, [template]);

  if (!result) {
    return (
      <div className="resume-preview-wrapper">
        <div className="resume-preview-area" data-placeholder="简历将在这里生成..." />
      </div>
    );
  }

  return (
    <div className="resume-preview-wrapper">
      <style>{style}</style>
      <div
        className="resume-preview-area"
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function getResumePlainText(result: ResumeResult): string {
  const lines: string[] = [];
  lines.push(result.summary);
  lines.push('');
  result.workExperiences.forEach(w => {
    lines.push(`${w.title} - ${w.subtitle} (${w.date})`);
    w.bullets.forEach(b => lines.push(`  • ${b.raw}`));
    lines.push('');
  });
  result.projects.forEach(p => {
    lines.push(`${p.title} - ${p.subtitle} (${p.date})`);
    p.bullets.forEach(b => lines.push(`  • ${b.raw}`));
    lines.push('');
  });
  result.education.forEach(e => {
    lines.push(`${e.school} ${e.major} (${e.date})${e.gpa ? ` GPA: ${e.gpa}` : ''}`);
  });
  return lines.join('\n');
}

export function getResumeHTML(result: ResumeResult, template: TemplateType): string {
  const tpl = getTemplateById(template);
  return `<html><head><meta charset="utf-8"><style>${tpl.getStyle()}</style></head><body>${buildResumeHTML(result, template)}</body></html>`;
}
