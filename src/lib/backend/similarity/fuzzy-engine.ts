import { tokenizeWords, tokenizeMeaningfulWords, normalizeText } from "./technical-vocabulary";

/**
 * Calculates Levenshtein distance between two strings with space-optimized dynamic programming.
 */
export function levenshteinDistance(s1: string, s2: string): number {
  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  let prevRow = new Int32Array(s2.length + 1);
  let currRow = new Int32Array(s2.length + 1);

  for (let j = 0; j <= s2.length; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    currRow[0] = i;
    const char1 = s1.charCodeAt(i - 1);

    for (let j = 1; j <= s2.length; j++) {
      const char2 = s2.charCodeAt(j - 1);
      const cost = char1 === char2 ? 0 : 1;
      currRow[j] = Math.min(
        (currRow[j - 1] ?? 0) + 1,      // insertion
        (prevRow[j] ?? 0) + 1,          // deletion
        (prevRow[j - 1] ?? 0) + cost    // substitution
      );
    }

    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[s2.length] ?? 0;
}

/**
 * Normalized Levenshtein similarity between 0 and 100.
 */
export function normalizedLevenshteinSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 100;

  const dist = levenshteinDistance(norm1, norm2);
  const sim = (1 - dist / maxLen) * 100;
  return Math.max(0, Math.min(100, Math.round(sim * 10) / 10));
}

/**
 * Token Sort Ratio:
 * Sorts tokens alphabetically to catch sentence restructuring, passive voice, or reordered clauses.
 * E.g.: "AVL trees maintain lower height than Red-Black trees" vs
 *       "Than Red-Black trees, AVL trees maintain lower height"
 */
export function tokenSortRatio(s1: string, s2: string): number {
  const t1 = tokenizeMeaningfulWords(s1).sort().join(" ");
  const t2 = tokenizeMeaningfulWords(s2).sort().join(" ");
  if (!t1 && !t2) return 100;
  if (!t1 || !t2) return 0;

  return normalizedLevenshteinSimilarity(t1, t2);
}

/**
 * Token Set Ratio:
 * Extracts common tokens and compares intersection against remainders.
 * Highly robust against inserted filler words or deleted clauses.
 */
export function tokenSetRatio(s1: string, s2: string): number {
  const tokens1 = tokenizeMeaningfulWords(s1);
  const tokens2 = tokenizeMeaningfulWords(s2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection: string[] = [];
  const diff1: string[] = [];
  const diff2: string[] = [];

  for (const t of set1) {
    if (set2.has(t)) {
      intersection.push(t);
    } else {
      diff1.push(t);
    }
  }

  // If no meaningful content words intersect, the token set ratio is 0
  if (intersection.length === 0) return 0;

  for (const t of set2) {
    if (!set1.has(t)) {
      diff2.push(t);
    }
  }

  intersection.sort();
  diff1.sort();
  diff2.sort();

  const interStr = intersection.join(" ");
  const s1Rest = (interStr + " " + diff1.join(" ")).trim();
  const s2Rest = (interStr + " " + diff2.join(" ")).trim();

  const r1 = normalizedLevenshteinSimilarity(interStr, s1Rest);
  const r2 = normalizedLevenshteinSimilarity(interStr, s2Rest);
  const r3 = intersection.length >= 2 ? normalizedLevenshteinSimilarity(s1Rest, s2Rest) : 0;

  return Math.max(r1, r2, r3);
}

/**
 * Longest Common Subsequence of word tokens.
 */
export function tokenLCSLength(tokensA: string[], tokensB: string[]): number {
  const m = tokensA.length;
  const n = tokensB.length;
  if (m === 0 || n === 0) return 0;

  let prev = new Int32Array(n + 1);
  let curr = new Int32Array(n + 1);

  for (let i = 1; i <= m; i++) {
    const tA = tokensA[i - 1];
    for (let j = 1; j <= n; j++) {
      if (tA === tokensB[j - 1]) {
        curr[j] = (prev[j - 1] ?? 0) + 1;
      } else {
        curr[j] = Math.max(prev[j] ?? 0, curr[j - 1] ?? 0);
      }
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[n] ?? 0;
}

export interface FuzzySentenceMatch {
  sentenceAIdx: number;
  sentenceBIdx: number;
  sentenceAText: string;
  sentenceBText: string;
  fuzzyScore: number;
  tokenSortScore: number;
  tokenSetScore: number;
  levenshteinScore: number;
  lcsRatio: number;
  matchType: "exact" | "fuzzy_reordered" | "fuzzy_substituted" | "none";
}

/**
 * Composite fuzzy lexical comparison for two sentences.
 */
export function compareSentencesFuzzy(
  sentenceA: string,
  sentenceB: string
): {
  compositeScore: number;
  tokenSort: number;
  tokenSet: number;
  levenshtein: number;
  lcsRatio: number;
} {
  const normA = normalizeText(sentenceA);
  const normB = normalizeText(sentenceB);
  if (normA === normB) {
    return { compositeScore: 100, tokenSort: 100, tokenSet: 100, levenshtein: 100, lcsRatio: 100 };
  }

  const lev = normalizedLevenshteinSimilarity(normA, normB);
  const tSort = tokenSortRatio(sentenceA, sentenceB);
  const tSet = tokenSetRatio(sentenceA, sentenceB);

  const tA = tokenizeWords(sentenceA);
  const tB = tokenizeWords(sentenceB);
  const lcs = tokenLCSLength(tA, tB);
  const lcsRatio = Math.round((lcs / Math.max(tA.length, tB.length || 1)) * 100 * 10) / 10;

  // Composite weighting: favors tokenSet (insertions/deletions) and tokenSort (restructuring)
  const composite = Math.round((0.35 * tSet + 0.30 * tSort + 0.20 * lev + 0.15 * lcsRatio) * 10) / 10;

  return {
    compositeScore: composite,
    tokenSort: tSort,
    tokenSet: tSet,
    levenshtein: lev,
    lcsRatio,
  };
}

/**
 * Longest Common Subsequence (LCS) similarity percentage between two string passages.
 */
export function tokenLCSSimilarity(s1: string, s2: string): number {
  const t1 = tokenizeWords(s1);
  const t2 = tokenizeWords(s2);
  if (t1.length === 0 || t2.length === 0) return 0;
  const lcs = tokenLCSLength(t1, t2);
  return Math.round((lcs / Math.max(t1.length, t2.length)) * 100 * 10) / 10;
}

export interface SentenceComparisonDetail {
  similarity: number;
  matchedSentence: string;
  sourceSentence: string;
  exactSimilarity: number;
  fuzzySimilarity: number;
  editDistanceSimilarity: number;
  tokenSetSimilarity: number;
  tokenSortSimilarity: number;
  lcsSimilarity: number;
  evidenceLevel: "strong" | "moderate" | "weak" | "ignored";
  confidence: number;
}

/**
 * Detailed sentence-level similarity comparison returning granular evidence breakdown,
 * evidence category, and confidence score.
 */
export function compareSentencesDetailed(
  submittedSentence: string,
  candidateSentence: string
): SentenceComparisonDetail {
  const fuzzy = compareSentencesFuzzy(submittedSentence, candidateSentence);
  const normA = normalizeText(submittedSentence);
  const normB = normalizeText(candidateSentence);

  const isVerbatim = normA === normB;
  const exactSim = isVerbatim ? 100 : Math.min(fuzzy.compositeScore, fuzzy.levenshtein);
  const compositeSim = isVerbatim ? 100 : fuzzy.compositeScore;

  let evidenceLevel: "strong" | "moderate" | "weak" | "ignored";
  let confidence: number;

  if (compositeSim >= 75 || isVerbatim) {
    evidenceLevel = "strong";
    confidence = Math.min(0.99, 0.85 + compositeSim * 0.0014);
  } else if (compositeSim >= 48) {
    evidenceLevel = "moderate";
    confidence = Math.min(0.85, 0.65 + compositeSim * 0.002);
  } else if (compositeSim >= 25) {
    evidenceLevel = "weak";
    confidence = 0.5;
  } else {
    evidenceLevel = "ignored";
    confidence = 0.2;
  }

  return {
    similarity: compositeSim,
    matchedSentence: submittedSentence,
    sourceSentence: candidateSentence,
    exactSimilarity: exactSim,
    fuzzySimilarity: fuzzy.compositeScore,
    editDistanceSimilarity: fuzzy.levenshtein,
    tokenSetSimilarity: fuzzy.tokenSet,
    tokenSortSimilarity: fuzzy.tokenSort,
    lcsSimilarity: fuzzy.lcsRatio,
    evidenceLevel,
    confidence: Math.round(confidence * 100) / 100,
  };
}


/**
 * Candidate Sentence Inverted Index
 * Retrieves top candidate sentences from document B for a sentence from document A
 * to avoid expensive quadratic full-document comparisons.
 */
export class SentenceCandidateIndex {
  private invertedIndex = new Map<string, number[]>();
  private sentences: { idx: number; text: string; tokens: string[] }[] = [];

  constructor(sentencesB: string[]) {
    sentencesB.forEach((text, idx) => {
      const tokens = tokenizeMeaningfulWords(text);
      this.sentences.push({ idx, text, tokens });

      for (const token of tokens) {
        const list = this.invertedIndex.get(token) || [];
        list.push(idx);
        this.invertedIndex.set(token, list);
      }
    });
  }

  /**
   * Retrieves top candidate sentences that share meaningful terms.
   */
  public getCandidates(querySentence: string, topK = 5): { idx: number; text: string; sharedTokens: number }[] {
    const qTokens = tokenizeMeaningfulWords(querySentence);
    if (qTokens.length === 0) return [];

    const hitCounts = new Map<number, number>();
    for (const token of qTokens) {
      const hits = this.invertedIndex.get(token);
      if (hits) {
        for (const idx of hits) {
          hitCounts.set(idx, (hitCounts.get(idx) || 0) + 1);
        }
      }
    }

    const hits = Array.from(hitCounts.entries())
      .filter(([_, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK)
      .map(([idx, count]) => ({
        idx,
        text: this.sentences[idx]!.text,
        sharedTokens: count,
      }));

    return hits;
  }
}
