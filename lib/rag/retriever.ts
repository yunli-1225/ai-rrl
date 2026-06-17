import { embedText } from './embeddings';
import { getAllRecords } from './vectorStore';
import { logger } from '@/lib/logger';
import type { SearchResult, RAGContext } from './types';

const MODULE = 'RAG';
const DEFAULT_TOP_K = 5;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

function extractKeywords(jdText: string): string[] {
  const keywords: Set<string> = new Set();
  const quotedMatches = jdText.match(/[""'`'"`]+(.+?)[""'`'"`]+/g);
  if (quotedMatches) {
    quotedMatches.forEach(m => {
      const kw = m.replace(/[""'`'"`]+/g, '').trim();
      if (kw.length > 1) keywords.add(kw);
    });
  }
  const techMatches = jdText.match(/[A-Z][a-zA-Z+#/]{1,30}/g);
  if (techMatches) techMatches.forEach(m => keywords.add(m));
  const skillMatches = jdText.match(/(?:精通|熟悉|掌握|了解|擅长)(.{2,15}?)(?=[，。、；：\n])/g);
  if (skillMatches) {
    skillMatches.forEach(m => {
      const kw = m.replace(/(精通|熟悉|掌握|了解|擅长)/, '').trim();
      if (kw.length > 1) keywords.add(kw);
    });
  }
  return Array.from(keywords).slice(0, 15);
}

function extractKeywordsFromResults(results: SearchResult[]): string[] {
  const seen = new Set<string>();
  const kw: string[] = [];
  for (const r of results) {
    const extracted = r.text.match(/[A-Z][a-zA-Z+#/]{1,30}/g) || [];
    for (const word of extracted) {
      if (!seen.has(word) && word.length > 1) { seen.add(word); kw.push(word); }
    }
    const cnMatches = r.text.match(/[《》（]?.{2,20}?[）》]?/g) || [];
    for (const word of cnMatches) {
      const trimmed = word.replace(/[《》（）]/g, '').trim();
      if (trimmed.length > 1 && !seen.has(trimmed) && !/^[0-9]+$/.test(trimmed)) {
        seen.add(trimmed); kw.push(trimmed);
      }
    }
  }
  return kw.slice(0, 10);
}

export async function retrieve(
  jdText: string,
  topK: number = DEFAULT_TOP_K,
): Promise<RAGContext> {
  const start = Date.now();
  const defaultCtx: RAGContext = { keywords: [], atsRules: [], relatedJdSnippets: [] };
  const jdKeywords = extractKeywords(jdText);
  defaultCtx.keywords = jdKeywords;
  const allRecords = getAllRecords();
  if (allRecords.length === 0) {
    logger.info(MODULE, '向量库为空，跳过检索', { latency: `${Date.now() - start}ms` });
    return defaultCtx;
  }
  let queryVector: number[];
  try {
    queryVector = await embedText(jdText);
  } catch {
    logger.warn(MODULE, '向量化失败，仅使用JD关键词提取', { latency: `${Date.now() - start}ms` });
    return defaultCtx;
  }
  const scored = allRecords.map((rec) => ({ ...rec, score: cosineSimilarity(queryVector, rec.vector) }));
  const topResults: SearchResult[] = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(r => ({ text: r.text, metadata: r.metadata, score: r.score }));
  const jdResults = topResults.filter(r => r.metadata.type === 'jd-library');
  const atsResults = topResults.filter(r => r.metadata.type === 'ats-rules');
  const retrievedKeywords = extractKeywordsFromResults(jdResults);
  const mergedKeywords = [...new Set([...jdKeywords, ...retrievedKeywords, ...topResults.flatMap(r => { const techs = r.text.match(/[A-Z][a-zA-Z+#/]{1,30}/g) || []; return techs; })])].slice(0, 15);

  const elapsed = Date.now() - start;
  logger.info(MODULE, `检索完成`, {
    latency: `${elapsed}ms`,
    totalRecords: allRecords.length,
    topScores: topResults.map(r => ({ score: r.score.toFixed(4), type: r.metadata.type, source: r.metadata.source })),
    keywordCount: mergedKeywords.length,
    atsHitCount: atsResults.length,
    jdHitCount: jdResults.length,
  });

  return {
    keywords: mergedKeywords,
    atsRules: atsResults.map(r => r.text).slice(0, 3),
    relatedJdSnippets: jdResults.map(r => r.text).slice(0, 3),
  };
}
