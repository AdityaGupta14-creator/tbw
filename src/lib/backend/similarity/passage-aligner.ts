import type { AlignedPassage, EvidenceBreakdown, SourceType } from "@/types/database";
import type { SentenceSpan } from "./types";
import { tokenizeWords } from "./technical-vocabulary";

export interface CandidateSentenceAlignment {
  studentSentence: SentenceSpan;
  sourceSentenceText: string;
  sourceIdx: number;
  sourceName: string;
  sourceType: SourceType;
  sourceId?: string;
  exactSimilarity: number;
  fuzzySimilarity: number;
  semanticSimilarity: number;
  compositeScore: number;
  matchedWords: number;
  isQuoted: boolean;
  isCommonPhrase: boolean;
}

/**
 * Merges adjacent or closely spaced matching sentences into unified cohesive passages.
 * A gap of at most 1 unmatched sentence is permitted to connect unified narrative paragraphs.
 */
export function alignAndMergePassages(
  studentSentences: SentenceSpan[],
  sentenceMatches: CandidateSentenceAlignment[],
  maxSentenceGap = 1
): AlignedPassage[] {
  if (sentenceMatches.length === 0) return [];

  // Group matches by source
  const bySource = new Map<string, CandidateSentenceAlignment[]>();
  for (const m of sentenceMatches) {
    const key = `${m.sourceType}:${m.sourceName}`;
    const list = bySource.get(key) || [];
    list.push(m);
    bySource.set(key, list);
  }

  const mergedPassages: AlignedPassage[] = [];
  let passageCounter = 1;

  for (const [_, matches] of bySource.entries()) {
    // Sort matches by student sentence index
    matches.sort((a, b) => a.studentSentence.idx - b.studentSentence.idx);

    let currentGroup: CandidateSentenceAlignment[] = [];

    for (const match of matches) {
      if (currentGroup.length === 0) {
        currentGroup.push(match);
        continue;
      }

      const prev = currentGroup[currentGroup.length - 1]!;
      const gap = match.studentSentence.idx - prev.studentSentence.idx - 1;

      if (gap <= maxSentenceGap) {
        currentGroup.push(match);
      } else {
        // Emit accumulated group as merged passage
        const passage = createPassageFromGroup(currentGroup, studentSentences, `passage-${passageCounter++}`);
        if (passage) mergedPassages.push(passage);
        currentGroup = [match];
      }
    }

    if (currentGroup.length > 0) {
      const passage = createPassageFromGroup(currentGroup, studentSentences, `passage-${passageCounter++}`);
      if (passage) mergedPassages.push(passage);
    }
  }

  // Sort passages by student start position
  return mergedPassages.sort((a, b) => a.start_sentence_idx - b.start_sentence_idx);
}

function createPassageFromGroup(
  group: CandidateSentenceAlignment[],
  allSentences: SentenceSpan[],
  passageId: string
): AlignedPassage | null {
  if (group.length === 0) return null;

  const first = group[0]!;
  const last = group[group.length - 1]!;

  const startIdx = first.studentSentence.idx;
  const endIdx = last.studentSentence.idx;

  // Collect text across student spans
  const studentSpans = allSentences.slice(startIdx, endIdx + 1);
  const studentText = studentSpans.map((s) => s.text).join(" ");
  const sourceText = group.map((g) => g.sourceSentenceText).join(" ");

  const totalWords = tokenizeWords(studentText).length;
  const matchedWords = group.reduce((sum, g) => sum + g.matchedWords, 0);

  // Compute weighted metrics
  const avgExact = Math.round(group.reduce((sum, g) => sum + g.exactSimilarity, 0) / group.length);
  const avgFuzzy = Math.round(group.reduce((sum, g) => sum + g.fuzzySimilarity, 0) / group.length);
  const avgSemantic = Math.round(group.reduce((sum, g) => sum + g.semanticSimilarity, 0) / group.length);

  const isQuoted = group.some((g) => g.isQuoted || g.studentSentence.isQuoted);
  const isCited = group.some((g) => g.studentSentence.isCited);
  const isPrompt = group.every((g) => g.studentSentence.isPrompt);
  const isMathFormula = group.every((g) => g.studentSentence.isMathFormula);
  const allCommon = group.every((g) => g.isCommonPhrase || g.studentSentence.isCommonPhrase || g.studentSentence.isBoilerplate);

  // Determine overall similarity score of this passage using canonical engine weights (0.40 / 0.35 / 0.25)
  let similarityPercentage = Math.min(
    100,
    Math.max(avgExact, Math.round(0.40 * avgExact + 0.35 * avgFuzzy + 0.25 * avgSemantic))
  );

  // Evidence Level Classification
  let evidenceLevel: "strong" | "moderate" | "weak";
  const reasons: string[] = [];

  if (isQuoted) {
    evidenceLevel = "weak";
    reasons.push("Attributed quotation with proper quotation marks");
  } else if (isCited) {
    evidenceLevel = "weak";
    reasons.push("Text accompanied by formal academic citation");
  } else if (isPrompt) {
    evidenceLevel = "weak";
    reasons.push("Assignment prompt or standardized problem specification");
  } else if (isMathFormula) {
    evidenceLevel = "weak";
    reasons.push("Standard mathematical equation or computational formula");
  } else if (allCommon) {
    evidenceLevel = "weak";
    reasons.push("Common technical terminology, textbook definition, or standard transitional phrasing");
  } else if (group.length >= 2 && similarityPercentage >= 70) {
    evidenceLevel = "strong";
    reasons.push(`Sequence of ${group.length} consecutive highly similar technical sentences`);
    if (avgExact >= 70) reasons.push("High contiguous verbatim phrase match");
  } else if (similarityPercentage >= 75 || avgExact >= 75) {
    evidenceLevel = "strong";
    reasons.push("Extensive verbatim or near-verbatim textual overlap");
  } else if (
    similarityPercentage >= 45 ||
    avgFuzzy >= 55 ||
    (avgSemantic >= 52 && (avgFuzzy >= 45 || avgExact >= 25)) ||
    (group.length >= 2 && avgSemantic >= 55)
  ) {
    evidenceLevel = "moderate";
    if (avgSemantic >= 52 && avgExact < 50) {
      reasons.push("Paraphrasing detected: sentence restructuring with semantic preservation");
    } else {
      reasons.push("Moderate lexical overlap with sentence substitutions or insertions");
    }
  } else if (avgSemantic >= 50) {
    evidenceLevel = "weak";
    reasons.push("Conceptual domain similarity: shared topical subject matter without substantial textual borrowing");
  } else {
    evidenceLevel = "weak";
    reasons.push("Weak or partial phrase overlap");
  }

  const confidence =
    similarityPercentage >= 85
      ? 0.96
      : similarityPercentage >= 70
      ? 0.88
      : similarityPercentage >= 50
      ? 0.78
      : 0.6;

  return {
    id: passageId,
    source_id: first.sourceId,
    source_name: first.sourceName,
    source_type: first.sourceType,
    student_text: studentText,
    source_text: sourceText,
    start_sentence_idx: startIdx,
    end_sentence_idx: endIdx,
    start_char: studentSpans[0]?.startChar,
    end_char: studentSpans[studentSpans.length - 1]?.endChar,
    matched_words: Math.min(totalWords, matchedWords),
    similarity_percentage: similarityPercentage,
    exact_similarity: avgExact,
    fuzzy_similarity: avgFuzzy,
    semantic_similarity: avgSemantic,
    evidence_level: evidenceLevel,
    reasons,
    is_quoted: isQuoted || isCited,
  };
}

/**
 * Calculates unique non-double-counted matched words and breakdown.
 * Ensures word overlap matching multiple sources is counted only ONCE.
 */
export function calculateUniqueWordOverlap(
  documentTokens: string[],
  studentSentences: SentenceSpan[],
  passages: AlignedPassage[]
): {
  uniqueMatchedWords: number;
  totalWords: number;
  overallOverlapPercentage: number;
  breakdown: EvidenceBreakdown;
} {
  const totalWords = Math.max(1, documentTokens.length);
  const matchedMask = new Uint8Array(totalWords); // 0: none, 1: weak, 2: moderate, 3: strong

  for (const passage of passages) {
    if (passage.is_quoted) continue; // Exclude quoted text from plagiarism score

    const startSentence = studentSentences[passage.start_sentence_idx];
    const endSentence = studentSentences[passage.end_sentence_idx];
    if (!startSentence || !endSentence) continue;

    // Approximate token span
    const startToken = studentSentences.slice(0, passage.start_sentence_idx).reduce((acc, s) => acc + s.tokens.length, 0);
    const passageTokensCount = studentSentences.slice(passage.start_sentence_idx, passage.end_sentence_idx + 1).reduce((acc, s) => acc + s.tokens.length, 0);

    const levelWeight = passage.evidence_level === "strong" ? 3 : passage.evidence_level === "moderate" ? 2 : 1;

    for (let i = startToken; i < Math.min(totalWords, startToken + passageTokensCount); i++) {
      if (levelWeight > matchedMask[i]!) {
        matchedMask[i] = levelWeight;
      }
    }
  }

  let strongCount = 0;
  let moderateCount = 0;
  let weakCount = 0;
  let totalMeaningfulMatched = 0;

  for (let i = 0; i < totalWords; i++) {
    const val = matchedMask[i]!;
    if (val === 3) {
      strongCount++;
      totalMeaningfulMatched++;
    } else if (val === 2) {
      moderateCount++;
      totalMeaningfulMatched++;
    } else if (val === 1) {
      weakCount++;
    }
  }

  const overallOverlapPercentage = Math.min(100, Math.round((totalMeaningfulMatched / totalWords) * 100 * 10) / 10);
  const strongPercentage = Math.round((strongCount / totalWords) * 100 * 10) / 10;
  const moderatePercentage = Math.round((moderateCount / totalWords) * 100 * 10) / 10;
  const weakPercentage = Math.round((weakCount / totalWords) * 100 * 10) / 10;

  // Semantic portion: estimate based on moderate passages exhibiting paraphrasing
  const semanticCount = passages
    .filter((p) => p.evidence_level === "moderate" && (p.semantic_similarity || 0) >= 70)
    .reduce((sum, p) => sum + p.matched_words, 0);
  const semanticPercentage = Math.min(moderatePercentage, Math.round((semanticCount / totalWords) * 100 * 10) / 10);

  return {
    uniqueMatchedWords: totalMeaningfulMatched,
    totalWords,
    overallOverlapPercentage,
    breakdown: {
      strong_percentage: strongPercentage,
      moderate_percentage: moderatePercentage,
      semantic_percentage: semanticPercentage,
      weak_percentage: weakPercentage,
      unique_matched_words: totalMeaningfulMatched,
      total_document_words: totalWords,
    },
  };
}
