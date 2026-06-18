const fs = require('fs');

// ===== Fix 1: schema.ts - add 照片 to PersonalSchema =====
let s = fs.readFileSync('lib/schema.ts', 'utf8');
s = s.replace(
  '实习月数: z.string().default(\'\'),',
  '实习月数: z.string().default(\'\'),\n  照片: z.string().default(\'\'),'
);
fs.writeFileSync('lib/schema.ts', s);
console.log('1. schema.ts - added 照片 field (prevents Zod from stripping photo data)');

// ===== Fix 2: ResumePreview.tsx - always show evaluation in single column =====
let r = fs.readFileSync('components/ResumePreview.tsx', 'utf8');

// Replace the evaluation check: single column always shows evaluation
r = r.replace(
  /if \(key === 'evaluation' && !showEval && tpl\?\.layout !== 'single'\) return '';/,
  "if (key === 'evaluation' && tpl?.layout !== 'single' && !showEval) return '';"
);

fs.writeFileSync('components/ResumePreview.tsx', r);
console.log('2. ResumePreview.tsx - evaluation always visible in single column');

console.log('All fixes applied. Build and push to deploy.');
