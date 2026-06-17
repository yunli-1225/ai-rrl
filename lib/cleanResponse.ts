export function cleanLLMResponse(rawText: string): string {
  let text = rawText.trim();
  text = text.replace(/```json|```/g, '');
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('未识别到有效JSON结构');
  }
  return text.slice(startIdx, endIdx + 1);
}
