import {
  tokenizeMeaningfulWords,
  tokenizeWords,
  segmentIntoSentenceSpans,
  isCommonTechnicalPhrase,
  isAssignmentPrompt,
} from "./technical-vocabulary";

/**
 * Universal academic stop phrases that should never be used as candidate search queries.
 */
export const GENERIC_ACADEMIC_STOP_PHRASES = new Set<string>([
  "this paper presents",
  "in this paper we present",
  "in this study we",
  "the proposed method",
  "results show that",
  "as shown in figure",
  "as shown in table",
  "in this section we",
  "it can be seen that",
  "it is well known that",
  "future work will",
  "in conclusion we have",
  "the experimental results demonstrate",
  "on the other hand",
  "in addition to this",
  "due to the fact that",
  "for the purpose of",
  "in order to achieve",
  "the remainder of this paper",
  "is organized as follows",
  "we evaluate the performance of",
  "with respect to the",
  "based on the above",
]);

export interface CandidateQuery {
  phrase: string;
  sourceSentenceIdx: number;
  weight: number;
  type: "distinctive_phrase" | "technical_term" | "fingerprint" | "salient_sentence";
}

/**
 * Normalizes a phrase for stop phrase checking.
 */
function normalizePhrase(p: string): string {
  return p
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a phrase is a generic academic cliché.
 */
export function isGenericAcademicPhrase(phrase: string): boolean {
  const norm = normalizePhrase(phrase);
  if (norm.length < 6) return true;
  for (const stop of GENERIC_ACADEMIC_STOP_PHRASES) {
    if (norm === stop || norm.includes(stop)) {
      return true;
    }
  }
  return false;
}

/**
 * Simple deterministic 32-bit hash for sentence fingerprinting.
 */
export function computeSentenceFingerprint(sentenceText: string): string {
  const meaningful = tokenizeMeaningfulWords(sentenceText);
  if (meaningful.length === 0) return "0";
  // Sample every other word or top 5 tokens
  const keyTokens = meaningful.filter((_, idx) => idx % 2 === 0).slice(0, 6);
  let hash = 0x811c9dc5; // FNV-1a offset basis
  const str = keyTokens.join("_");
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Extracts high-information candidate search queries from a document:
 * 1. Segments text into sentence spans.
 * 2. Filters out quotations, assignment prompts, and references.
 * 3. Identifies sentences with high information density (uncommon vocabulary, multi-syllable terms).
 * 4. Extracts distinctive n-grams (4-7 words) while suppressing generic academic phrases.
 * 5. Returns deterministic, prioritized queries for provider lookup.
 */
export function generateCandidateQueries(
  text: string,
  options: {
    maxQueries?: number;
    promptText?: string;
  } = {}
): CandidateQuery[] {
  const maxQueries = options.maxQueries ?? 8;
  const spans = segmentIntoSentenceSpans(text, options.promptText);
  const candidates: CandidateQuery[] = [];

  for (let idx = 0; idx < spans.length; idx++) {
    const span = spans[idx];
    if (!span) continue;

    // Suppress citations, quotes, prompts, formulas, and references
    if (span.isQuoted || span.isCited || span.isPrompt || span.isMathFormula || span.isReference) {
      continue;
    }

    const tokens = tokenizeWords(span.text);
    if (tokens.length < 5 || tokens.length > 80) continue;

    const meaningfulTokens = tokenizeMeaningfulWords(span.text);
    if (meaningfulTokens.length < 3) continue;

    // Check for generic cliché
    if (isGenericAcademicPhrase(span.text)) continue;

    // Score information density based on token lengths and distinctiveness
    const avgTokenLength =
      meaningfulTokens.reduce((sum, t) => sum + t.length, 0) / meaningfulTokens.length;

    // Check if sentence contains technical terms
    const hasTechTerms = meaningfulTokens.some(
      (t) => t.length >= 7 || isCommonTechnicalPhrase(t)
    );

    const sentenceWeight = avgTokenLength * 1.5 + meaningfulTokens.length + (hasTechTerms ? 4 : 0);

    // 1. Full salient sentence (or first 12 meaningful words)
    const salientPhrase = meaningfulTokens.slice(0, 10).join(" ");
    if (!isGenericAcademicPhrase(salientPhrase)) {
      candidates.push({
        phrase: salientPhrase,
        sourceSentenceIdx: idx,
        weight: sentenceWeight,
        type: "salient_sentence",
      });
    }

    // 2. Distinctive 5-word shingle if distinctive
    if (tokens.length >= 6) {
      const mid = Math.floor(tokens.length / 2);
      const shingle = tokens.slice(Math.max(0, mid - 2), mid + 3).join(" ");
      if (!isGenericAcademicPhrase(shingle)) {
        candidates.push({
          phrase: shingle,
          sourceSentenceIdx: idx,
          weight: sentenceWeight * 0.85,
          type: "distinctive_phrase",
        });
      }
    }

    // 3. Sentence Fingerprint
    const fp = computeSentenceFingerprint(span.text);
    candidates.push({
      phrase: fp,
      sourceSentenceIdx: idx,
      weight: 1.0,
      type: "fingerprint",
    });
  }

  // Deduplicate by phrase
  const seen = new Set<string>();
  const uniqueCandidates: CandidateQuery[] = [];
  for (const c of candidates) {
    const norm = normalizePhrase(c.phrase);
    if (!seen.has(norm)) {
      seen.add(norm);
      uniqueCandidates.push(c);
    }
  }

  // Sort by weight descending
  uniqueCandidates.sort((a, b) => b.weight - a.weight);

  return uniqueCandidates.slice(0, maxQueries);
}
