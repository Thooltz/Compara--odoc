import { Paragraph, ParagraphRun, CompareOptions } from '../types';

export function normalizeText(text: string, options: CompareOptions): string {
  let normalized = text;
  
  if (options.ignoreExtraSpaces) {
    normalized = normalized.replace(/\s+/g, ' ');
  }
  
  if (options.ignoreLineBreaks) {
    normalized = normalized.replace(/\n/g, ' ').replace(/\r/g, '');
  }
  
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  
  // Normalizar caracteres especiais
  normalized = normalized
    .replace(/\u00A0/g, ' ') // NBSP
    .replace(/[\u2013\u2014]/g, '-') // En/em dash
    .replace(/[\u2018\u2019]/g, "'") // Smart quotes
    .replace(/[\u201C\u201D]/g, '"') // Smart quotes
    .trim();
  
  return normalized;
}

export function getParagraphText(para: Paragraph, options?: CompareOptions): string {
  const text = para.runs.map(run => run.text).join('');
  return options ? normalizeText(text, options) : text;
}

export function compareRuns(run1: ParagraphRun, run2: ParagraphRun, options: CompareOptions): boolean {
  const text1 = options.ignoreCase ? run1.text.toLowerCase() : run1.text;
  const text2 = options.ignoreCase ? run2.text.toLowerCase() : run2.text;
  
  if (normalizeText(text1, options) !== normalizeText(text2, options)) return false;
  
  if (!options.ignoreFontDifferences) {
    if (run1.bold !== run2.bold) return false;
    if (run1.italic !== run2.italic) return false;
    if (run1.underline !== run2.underline) return false;
    if (run1.fontSize !== run2.fontSize) return false;
    if (run1.color !== run2.color) return false;
    if (run1.fontFamily !== run2.fontFamily) return false;
  }
  
  return true;
}

export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

export function similarityRatio(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

export function findBestMatch(
  target: Paragraph,
  candidates: Paragraph[],
  options: CompareOptions,
  threshold: number = 0.7
): { index: number; similarity: number } | null {
  const targetText = getParagraphText(target, options);
  let bestMatch: { index: number; similarity: number } | null = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidateText = getParagraphText(candidates[i], options);
    const similarity = similarityRatio(targetText, candidateText);
    
    if (similarity >= threshold && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { index: i, similarity };
    }
  }

  return bestMatch;
}
