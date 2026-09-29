import { tokenizeWords, normalizeText, isCommonTechnicalPhrase, isPredominantlyCommonOrBoilerplate } from "./technical-vocabulary";

export interface ShingleMatch {
  shingleSize: number;
  shingleText: string;
  matchedTokensCount: number;
}

export interface ContiguousSpan {
  startTokenIdx: number;
  endTokenIdx: number;
  matchedText: string;
  sourceStartTokenIdx: number;
  sourceEndTokenIdx: number;
  sourceMatchedText: string;
  tokenCount: number;
  shingleSizesPresent: number[];
  isCommonPhrase?: boolean;
}

/**
 * Creates n-gram shingles from a token array.
 */
export function createNGramShingles(tokens: string[], n: number): Map<string, number[]> {
  const shingles = new Map<string, number[]>();
  if (tokens.length < n) return shingles;

  for (let i = 0; i <= tokens.length - n; i++) {
    const key = tokens.slice(i, i + n).join(" ");
    const positions = shingles.get(key) || [];
    positions.push(i);
    shingles.set(key, positions);
  }
  return shingles;
}

/**
 * Multi-scale shingle index for rapid candidate search and exact overlap detection.
 */
export class MultiScaleShingleIndex {
  private sizes: number[];
  private invertedIndex = new Map<string, { docId: string; pos: number; size: number }[]>();
  private docTokens = new Map<string, string[]>();

  constructor(sizes: number[] = [3, 4, 5, 7, 10]) {
    this.sizes = sizes;
  }

  public indexDocument(docId: string, text: string): void {
    const tokens = tokenizeWords(text);
    this.docTokens.set(docId, tokens);

    for (const size of this.sizes) {
      if (tokens.length < size) continue;
      for (let i = 0; i <= tokens.length - size; i++) {
        const shingle = tokens.slice(i, i + size).join(" ");
        // Avoid indexing common technical terminology as plagiarism shingle
        if (isCommonTechnicalPhrase(shingle)) continue;

        const list = this.invertedIndex.get(shingle) || [];
        list.push({ docId, pos: i, size });
        this.invertedIndex.set(shingle, list);
      }
    }
  }

  /**
   * Retrieves candidate documents sharing shingles with query text,
   * sorted by shared shingle mass.
   */
  public findCandidates(queryText: string): { docId: string; sharedShinglesCount: number; maxShingleSize: number }[] {
    const queryTokens = tokenizeWords(queryText);
    const scoreMap = new Map<string, { count: number; maxSize: number }>();

    for (const size of this.sizes) {
      if (queryTokens.length < size) continue;
      for (let i = 0; i <= queryTokens.length - size; i++) {
        const shingle = queryTokens.slice(i, i + size).join(" ");
        if (isCommonTechnicalPhrase(shingle)) continue;

        const hits = this.invertedIndex.get(shingle);
        if (hits) {
          for (const hit of hits) {
            const current = scoreMap.get(hit.docId) || { count: 0, maxSize: 0 };
            current.count += size; // weight larger shingles higher
            current.maxSize = Math.max(current.maxSize, size);
            scoreMap.set(hit.docId, current);
          }
        }
      }
    }

    return Array.from(scoreMap.entries())
      .map(([docId, data]) => ({
        docId,
        sharedShinglesCount: data.count,
        maxShingleSize: data.maxSize,
      }))
      .sort((a, b) => b.sharedShinglesCount - a.sharedShinglesCount);
  }
}

/**
 * Calculates containment and Jaccard overlap using multi-scale shingles.
 * Evaluates across 3, 4, 5, 7, and 10-grams and filters out common engineering terminology.
 */
export function calculateMultiScaleOverlap(
  textA: string,
  textB: string,
  sizes: number[] = [3, 4, 5, 7, 10],
  excludeCommonTerminology = true
): {
  containmentScores: Record<number, number>;
  weightedOverlap: number;
} {
  const tokensA = tokenizeWords(textA);
  const tokensB = tokenizeWords(textB);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { containmentScores: {}, weightedOverlap: 0 };
  }

  const scores: Record<number, number> = {};
  let weightedSum = 0;
  let totalWeights = 0;

  for (const size of sizes) {
    if (tokensA.length < size || tokensB.length < size) {
      scores[size] = 0;
      continue;
    }

    const setA = new Set<string>();
    for (let i = 0; i <= tokensA.length - size; i++) {
      const sh = tokensA.slice(i, i + size).join(" ");
      if (excludeCommonTerminology && isCommonTechnicalPhrase(sh)) continue;
      setA.add(sh);
    }

    const setB = new Set<string>();
    for (let i = 0; i <= tokensB.length - size; i++) {
      const sh = tokensB.slice(i, i + size).join(" ");
      if (excludeCommonTerminology && isCommonTechnicalPhrase(sh)) continue;
      setB.add(sh);
    }

    let shared = 0;
    for (const shingle of setA) {
      if (setB.has(shingle)) shared++;
    }

    const containment = setA.size > 0 ? (shared / setA.size) * 100 : 0;
    scores[size] = Math.round(containment * 10) / 10;

    // Weight longer shingles higher for verbatim evidence
    const weight = size >= 10 ? 4 : size >= 7 ? 3 : size >= 5 ? 2 : 1;
    weightedSum += containment * weight;
    totalWeights += weight;
  }

  const weightedOverlap = totalWeights > 0 ? Math.round((weightedSum / totalWeights) * 10) / 10 : 0;
  return { containmentScores: scores, weightedOverlap };
}

/**
 * Identifies continuous verbatim spans between two token sequences.
 * Expands overlapping shingles into contiguous phrases.
 * Ignores purely common technical phrases unless they exceed 10 consecutive words.
 */
export function findContiguousMatchingSpans(
  tokensA: string[],
  tokensB: string[],
  minTokens = 5,
  excludeCommon = true
): ContiguousSpan[] {
  if (tokensA.length < minTokens || tokensB.length < minTokens) return [];

  // Build index of tokensB positions
  const tokenIndexB = new Map<string, number[]>();
  for (let j = 0; j < tokensB.length; j++) {
    const t = tokensB[j]!;
    const list = tokenIndexB.get(t) || [];
    list.push(j);
    tokenIndexB.set(t, list);
  }

  const matchedSpans: ContiguousSpan[] = [];
  const coveredA = new Array(tokensA.length).fill(false);

  for (let i = 0; i < tokensA.length; i++) {
    if (coveredA[i]) continue;
    const t = tokensA[i]!;
    const candidatePositions = tokenIndexB.get(t);
    if (!candidatePositions) continue;

    let bestSpanLength = 0;
    let bestSourceStart = -1;

    for (const j of candidatePositions) {
      let len = 0;
      while (
        i + len < tokensA.length &&
        j + len < tokensB.length &&
        tokensA[i + len] === tokensB[j + len]
      ) {
        len++;
      }

      if (len > bestSpanLength) {
        bestSpanLength = len;
        bestSourceStart = j;
      }
    }

    if (bestSpanLength >= minTokens) {
      const startA = i;
      const endA = i + bestSpanLength;
      const startB = bestSourceStart;
      const endB = bestSourceStart + bestSpanLength;

      const matchedTextA = tokensA.slice(startA, endA).join(" ");
      const matchedTextB = tokensB.slice(startB, endB).join(" ");

      const isCommon =
        isPredominantlyCommonOrBoilerplate(matchedTextA) ||
        isCommonTechnicalPhrase(matchedTextA);

      if (excludeCommon && isCommon && bestSpanLength < 10) {
        // Skip common engineering phrases when under 10 words
        i += bestSpanLength - 1;
        continue;
      }

      for (let k = startA; k < endA; k++) {
        coveredA[k] = true;
      }

      const shingleSizesPresent: number[] = [3, 4, 5];
      if (bestSpanLength >= 7) shingleSizesPresent.push(7);
      if (bestSpanLength >= 10) shingleSizesPresent.push(10);

      matchedSpans.push({
        startTokenIdx: startA,
        endTokenIdx: endA,
        matchedText: matchedTextA,
        sourceStartTokenIdx: startB,
        sourceEndTokenIdx: endB,
        sourceMatchedText: matchedTextB,
        tokenCount: bestSpanLength,
        shingleSizesPresent,
        isCommonPhrase: isCommon,
      });

      // Jump forward
      i += bestSpanLength - 1;
    }
  }

  return matchedSpans;
}

