import { diff_match_patch } from 'diff-match-patch';
import { normalizeText, getParagraphText } from './normalize';
import { Paragraph, CompareOptions } from '../types';

const dmp = new diff_match_patch();

export interface DiffChunk {
  text: string;
  type: 'equal' | 'delete' | 'insert';
}

export function computeDiff(
  templateText: string,
  documentText: string,
  options: CompareOptions
): DiffChunk[] {
  const normalizedTemplate = normalizeText(templateText, options);
  const normalizedDocument = normalizeText(documentText, options);
  
  const diffs = dmp.diff_main(normalizedTemplate, normalizedDocument);
  dmp.diff_cleanupSemantic(diffs);
  
  return diffs.map(([op, text]: [number, string]) => ({
    text,
    type: op === 0 ? 'equal' : op === -1 ? 'delete' : 'insert'
  }));
}

export function hasSignificantDiff(
  templatePara: Paragraph,
  documentPara: Paragraph,
  options: CompareOptions
): boolean {
  const templateText = getParagraphText(templatePara, options);
  const documentText = getParagraphText(documentPara, options);
  
  if (templateText === documentText) return false;
  
  const diffs = computeDiff(templateText, documentText, options);
  return diffs.some(chunk => 
    chunk.type !== 'equal' && chunk.text.trim().length > 0
  );
}
