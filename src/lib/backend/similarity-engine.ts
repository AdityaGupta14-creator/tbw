/**
 * Verity Multi-Layer Academic Integrity & Similarity Detection Engine (V2.4)
 *
 * Implements a layered, evidence-based academic integrity architecture:
 * Layer 1: Exact Contiguous Phrase Matching (tracking offsets, token counts, and ignoring short/common phrases)
 * Layer 2: Multi-Scale Shingling (3, 4, 5, 7, 10-grams; filtering out common engineering terminology)
 * Layer 3: Fuzzy Lexical Similarity (edit-distance, token-sort ratio, token-set ratio, LCS similarity)
 * Layer 4: Sentence-Level Matching & Candidate Retrieval (candidate retrieval -> reranking pipeline)
 * Layer 5: Pluggable Semantic Similarity (cosine similarity for paraphrasing & rewrites; pluggable provider)
 * Layer 6: Passage Alignment & Merging (consolidating adjacent matches into cohesive narrative blocks)
 * Layer 7: Structural Similarity (section hierarchy, table/figure references, terminology alignment)
 * Layer 8: False-Positive Protection & Attribution Qualification (discounting quoted, cited, and boilerplate text)
 * Layer 9: Explainable Multi-Source Scoring & Non-Double-Counting
 * Layer 10: Independent AI-Writing Pattern Analysis (probabilistic pattern indicators)
 */

import type {
  SimilarityMatch,
  SourceType,
  AlignedPassage,
  EvidenceBreakdown,
  AnalysisResult,
  StudentComparisonResult,
  TransparentEvidenceBreakdown,
  MatchedSourceSummary,
  StructuralEvidenceItem,
  EvidenceCategory,
} from "@/types/database";
import type {
  SentenceSpan,
  SimilarityEngineConfig,
  DetailedEvidenceScore,
  SourceDocument,
  MultiLayerComparisonResult,
  SemanticSimilarityProvider,
} from "./similarity/types";
import { DEFAULT_SIMILARITY_CONFIG } from "./similarity/types";
import {
  normalizeText,
  tokenizeWords,
  tokenizeMeaningfulWords,
  segmentIntoSentenceSpans,
  separateReferencesSection,
  isCommonTechnicalPhrase,
  isPredominantlyCommonOrBoilerplate,
  isStandardEngineeringDefinition,
  isAssignmentPrompt,
  isMathematicalFormula,
} from "./similarity/technical-vocabulary";
import {
  findContiguousMatchingSpans,
  calculateMultiScaleOverlap,
  MultiScaleShingleIndex,
} from "./similarity/multi-shingle";
import {
  compareSentencesFuzzy,
  compareSentencesDetailed,
  tokenLCSSimilarity,
  tokenSortRatio,
  tokenSetRatio,
  normalizedLevenshteinSimilarity,
  SentenceCandidateIndex,
} from "./similarity/fuzzy-engine";
import {
  calculateSemanticSimilarity,
  calculateSemanticSimilarityAsync,
  setSemanticSimilarityProvider,
  getSemanticSimilarityProvider,
  configureSemanticModel,
  getActiveSemanticModelType,
  LocalSemanticProvider,
  LocalTransformerEmbeddingProvider,
  HostedAPIEmbeddingProvider,
  HuggingFaceEmbeddingProvider,
  type SemanticModelType,
} from "./similarity/semantic-engine";
import {
  alignAndMergePassages,
  calculateUniqueWordOverlap,
  type CandidateSentenceAlignment,
} from "./similarity/passage-aligner";
import {
  compareDocumentStructure,
  extractHeadings,
  extractTableFigureReferences,
} from "./similarity/structural-engine";
import {
  DEFAULT_REFERENCE_CORPUS,
  InternalCorpusProvider,
  PeerSubmissionsProvider,
  WebSearchProvider,
  AcademicCorpusProvider,
  InstitutionalRepositoryProvider,
  CompositeSourceManager,
  retrieveTopCandidateSources,
} from "./similarity/source-providers";
import { analyzeIeeeCitations, type CitationAnalysisResult } from "./citation-engine";
import {
  analyzeAIWritingPatterns,
  StatisticalAIWritingProvider,
  PROBABILISTIC_DISCLAIMER,
  type AIWritingAnalysisResult,
} from "./ai-writing-analysis";

// Export sub-module utilities for direct consumption
export {
  normalizeText,
  tokenizeWords,
  tokenizeMeaningfulWords,
  isCommonTechnicalPhrase,
  isStandardEngineeringDefinition,
  isAssignmentPrompt,
  isMathematicalFormula,
  calculateSemanticSimilarity,
  calculateSemanticSimilarityAsync,
  setSemanticSimilarityProvider,
  getSemanticSimilarityProvider,
  configureSemanticModel,
  getActiveSemanticModelType,
  LocalSemanticProvider,
  LocalTransformerEmbeddingProvider,
  HostedAPIEmbeddingProvider,
  HuggingFaceEmbeddingProvider,
  type SemanticModelType,
  analyzeAIWritingPatterns,
  tokenLCSSimilarity,
  tokenSortRatio,
  tokenSetRatio,
  normalizedLevenshteinSimilarity,
  extractHeadings,
  extractTableFigureReferences,
};

// Re-export unified source discovery system
export * from "./similarity/source-provider-types";
export * from "./similarity/candidate-generator";
export * from "./similarity/internal-student-provider";
export * from "./similarity/local-reference-corpus";
export * from "./similarity/public-web-provider";
export * from "./similarity/open-access-provider";
export * from "./similarity/source-discovery-coordinator";

// Backward-compatible V1 helper signatures
export function segmentSentences(text: string): string[] {
  return segmentIntoSentenceSpans(text).map((s) => s.text);
}

export function createShingles(tokens: string[], n = 4): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < n) return shingles;
  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join(" "));
  }
  return shingles;
}

export function calculateTextOverlap(textA: string, textB: string): number {
  const { weightedOverlap } = calculateMultiScaleOverlap(textA, textB, [4]);
  return weightedOverlap;
}

export interface ComparisonResult {
  overallOverlap: number;
  matchedWords: number;
  longestMatch: string;
  matchingPassagesCount: number;
  sectionsAffected: number;
  matches: {
    sourceName: string;
    sourceType: SourceType;
    sourceUrl?: string | undefined;
    matchedText: string;
    similarityPercentage: number;
    matchedWords: number;
    evidenceLevel?: "strong" | "moderate" | "weak" | "ignored" | undefined;
    exactSimilarity?: number | undefined;
    fuzzySimilarity?: number | undefined;
    semanticSimilarity?: number | undefined;
    reasons?: string[] | undefined;
  }[];
  structuralSimilarity?: number | undefined;
  evidenceSummary?: string[] | undefined;
  evidenceBreakdown?: EvidenceBreakdown | undefined;
  transparentBreakdown?: TransparentEvidenceBreakdown | undefined;
  passages?: AlignedPassage[] | undefined;
  strongMatchesCount?: number | undefined;
  moderateMatchesCount?: number | undefined;
  weakMatchesCount?: number | undefined;
}

/**
 * Compares two documents (e.g. Student A vs Student B or Student vs Reference Source)
 * through the full V2.4 Multi-Layer Similarity pipeline.
 */
export function compareTwoDocuments(
  textA: string,
  textB: string,
  sourceLabel = "Comparison Reference",
  sourceType: SourceType = "student_submission",
  config: Partial<SimilarityEngineConfig> = {}
): ComparisonResult {
  const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };

  // Handle empty or very short document edge cases
  const cleanA = (textA || "").trim();
  const cleanB = (textB || "").trim();
  if (cleanA.length === 0 || cleanB.length === 0) {
    const emptyBreakdown: EvidenceBreakdown = {
      strong_percentage: 0,
      moderate_percentage: 0,
      semantic_percentage: 0,
      weak_percentage: 0,
      unique_matched_words: 0,
      total_document_words: tokenizeWords(cleanA).length,
    };
    const emptyTransparent: TransparentEvidenceBreakdown = {
      exactSimilarity: 0,
      shingleSimilarity: 0,
      fuzzySimilarity: 0,
      semanticSimilarity: 0,
      structuralSimilarity: 0,
      weightedSimilarity: 0,
      evidenceLevel: "ignored",
      confidence: 0,
    };
    return {
      overallOverlap: 0,
      matchedWords: 0,
      longestMatch: "",
      matchingPassagesCount: 0,
      sectionsAffected: 0,
      matches: [],
      structuralSimilarity: 0,
      evidenceSummary: ["Insufficient document content for comparison."],
      evidenceBreakdown: emptyBreakdown,
      transparentBreakdown: emptyTransparent,
      passages: [],
      strongMatchesCount: 0,
      moderateMatchesCount: 0,
      weakMatchesCount: 0,
    };
  }

  // 1. Separate references if configured
  const effectiveTextA = mergedConfig.excludeReferences
    ? separateReferencesSection(cleanA).bodyText
    : cleanA;
  const effectiveTextB = mergedConfig.excludeReferences
    ? separateReferencesSection(cleanB).bodyText
    : cleanB;

  // 2. Sentence segmentation with position tracking and false-positive annotations
  const sentencesA = segmentIntoSentenceSpans(effectiveTextA, mergedConfig.assignmentPromptText);
  const sentencesB = segmentIntoSentenceSpans(effectiveTextB, mergedConfig.assignmentPromptText);

  const tokensA = tokenizeWords(effectiveTextA);
  const tokensB = tokenizeWords(effectiveTextB);

  // 3. Multi-scale shingle overlap
  const { containmentScores, weightedOverlap: shingleOverlap } = calculateMultiScaleOverlap(
    effectiveTextA,
    effectiveTextB,
    mergedConfig.shingleSizes,
    mergedConfig.excludeCommonPhrases
  );

  // 4. Structural comparison (headings, sequence, figure/table references)
  const structuralResult = compareDocumentStructure(effectiveTextA, effectiveTextB);

  // 5. Candidate sentence indexing (retrieval -> reranking)
  const candidateIndexB = new SentenceCandidateIndex(sentencesB.map((s) => s.text));
  const sentenceAlignments: CandidateSentenceAlignment[] = [];
  let longestMatchString = "";
  let totalExactTokens = 0;
  let totalFuzzyScoreSum = 0;
  let totalSemanticScoreSum = 0;
  let qualifiedSentenceMatches = 0;

  for (const sA of sentencesA) {
    if (sA.tokens.length < 3) continue;

    // False-positive suppression based on configuration
    if (sA.isQuoted && mergedConfig.excludeQuotations) continue;
    if (sA.isPrompt && mergedConfig.excludeAssignmentPrompt) continue;
    if (sA.isMathFormula && mergedConfig.excludeMathFormulas) continue;
    if (sA.isCommonPhrase && mergedConfig.excludeCommonPhrases && sA.tokens.length < 8) continue;

    // Retrieve candidate sentences in document B sharing keywords
    const candidates = candidateIndexB.getCandidates(sA.text, 4);

    for (const cand of candidates) {
      const sB = sentencesB[cand.idx];
      if (!sB) continue;

      // Layer 3: Fuzzy comparison
      const fuzzy = compareSentencesFuzzy(sA.text, sB.text);

      // Layer 5: Semantic similarity (computed when candidate has partial overlap or document is compact)
      let semanticScore = 0;
      if (fuzzy.compositeScore >= 20 || fuzzy.tokenSet >= 25 || sentencesA.length <= 15) {
        semanticScore = calculateSemanticSimilarity(sA.text, sB.text);
      }

      // Layer 1 & 2: Exact contiguous matching tokens with position tracking
      const exactSpans = findContiguousMatchingSpans(
        sA.tokens,
        sB.tokens,
        mergedConfig.minMatchLengthWords,
        mergedConfig.excludeCommonPhrases
      );
      const hasExactSpan = exactSpans.length > 0;
      const exactTokens = exactSpans.reduce((sum, sp) => sum + sp.tokenCount, 0);
      const exactPercentage = Math.round((exactTokens / Math.max(1, sA.tokens.length)) * 100);

      // Composite match qualification
      const isQualified =
        hasExactSpan ||
        fuzzy.compositeScore >= mergedConfig.fuzzyThreshold ||
        (semanticScore >= mergedConfig.semanticThreshold && (fuzzy.tokenSet >= 25 || fuzzy.compositeScore >= 25));

      if (isQualified) {
        const matchedWords = hasExactSpan
          ? Math.max(exactTokens, Math.min(sA.tokens.length, sB.tokens.length))
          : Math.round((Math.max(fuzzy.compositeScore, semanticScore) / 100) * sA.tokens.length);

        if (sA.text.length > longestMatchString.length) {
          longestMatchString = sA.text;
        }

        totalExactTokens += exactTokens;
        totalFuzzyScoreSum += fuzzy.compositeScore;
        totalSemanticScoreSum += semanticScore;
        qualifiedSentenceMatches++;

        sentenceAlignments.push({
          studentSentence: sA,
          sourceSentenceText: sB.text,
          sourceIdx: sB.idx,
          sourceName: sourceLabel,
          sourceType,
          sourceId: `cand-${cand.idx}`,
          exactSimilarity: exactPercentage,
          fuzzySimilarity: fuzzy.compositeScore,
          semanticSimilarity: semanticScore,
          compositeScore: Math.max(exactPercentage, fuzzy.compositeScore),
          matchedWords,
          isQuoted: Boolean(sA.isQuoted || sA.isCited),
          isCommonPhrase: Boolean(sA.isCommonPhrase || sA.isBoilerplate),
        });

        break; // Match best candidate for sentence A
      }
    }
  }

  // 6. Passage alignment: merge adjacent matching sentences into cohesive narrative passages
  const passages = alignAndMergePassages(sentencesA, sentenceAlignments);

  // 7. Calculate unique non-double-counted overlap
  const { uniqueMatchedWords, totalWords, overallOverlapPercentage, breakdown } =
    calculateUniqueWordOverlap(tokensA, sentencesA, passages);

  // Format matches array for existing UI consumers
  const formattedMatches = passages.map((p) => ({
    sourceName: p.source_name,
    sourceType: p.source_type,
    sourceUrl: p.source_id,
    matchedText: p.student_text,
    similarityPercentage: p.similarity_percentage,
    matchedWords: p.matched_words,
    evidenceLevel: p.evidence_level,
    exactSimilarity: p.exact_similarity,
    fuzzySimilarity: p.fuzzy_similarity,
    semanticSimilarity: p.semantic_similarity,
    reasons: p.reasons,
  }));

  // Evidence summaries
  const evidenceSummary: string[] = [];
  if (breakdown.strong_percentage >= 15) {
    evidenceSummary.push(`${breakdown.strong_percentage}% strong verbatim or contiguous sentence overlap`);
  }
  if (breakdown.moderate_percentage >= 10) {
    evidenceSummary.push(`${breakdown.moderate_percentage}% moderate fuzzy lexical match with modified wording`);
  }
  if (breakdown.semantic_percentage >= 5) {
    evidenceSummary.push(`${breakdown.semantic_percentage}% semantic overlap indicative of paraphrasing`);
  }
  if (structuralResult.identicalSequence) {
    evidenceSummary.push("Parallel section heading structure and sequence alignment");
  }

  const strongCount = passages.filter((p) => p.evidence_level === "strong").length;
  const moderateCount = passages.filter((p) => p.evidence_level === "moderate").length;
  const weakCount = passages.filter((p) => p.evidence_level === "weak").length;

  const avgExactSim = qualifiedSentenceMatches > 0
    ? Math.round((totalExactTokens / Math.max(1, tokensA.length)) * 100)
    : 0;
  const avgFuzzySim = qualifiedSentenceMatches > 0
    ? Math.round(totalFuzzyScoreSum / qualifiedSentenceMatches)
    : 0;
  const avgSemanticSim = qualifiedSentenceMatches > 0
    ? Math.round(totalSemanticScoreSum / qualifiedSentenceMatches)
    : 0;

  const docSemanticSim = Math.round(calculateSemanticSimilarity(effectiveTextA, effectiveTextB));
  const overallSemanticSim = Math.max(avgSemanticSim, docSemanticSim);

  let overallEvidenceLevel: EvidenceCategory = "ignored";
  if (overallOverlapPercentage >= 75 || breakdown.strong_percentage >= 60) {
    overallEvidenceLevel = "strong";
  } else if (overallOverlapPercentage >= 40 || breakdown.moderate_percentage >= 35 || overallSemanticSim >= 55) {
    overallEvidenceLevel = "moderate";
  } else if (overallOverlapPercentage >= 15 || overallSemanticSim >= 35) {
    overallEvidenceLevel = "weak";
  }

  if (overallSemanticSim >= 45 && breakdown.semantic_percentage < 5) {
    evidenceSummary.push(`${overallSemanticSim}% high semantic correlation indicative of conceptual paraphrasing`);
  }

  const confidenceScore = overallOverlapPercentage >= 70
    ? 0.95
    : overallOverlapPercentage >= 40 || overallSemanticSim >= 50
    ? 0.85
    : overallOverlapPercentage >= 15 || overallSemanticSim >= 30
    ? 0.72
    : 0.5;

  const transparentBreakdown: TransparentEvidenceBreakdown = {
    exactSimilarity: avgExactSim,
    shingleSimilarity: shingleOverlap,
    fuzzySimilarity: avgFuzzySim,
    semanticSimilarity: overallSemanticSim,
    structuralSimilarity: structuralResult.similarityPercentage,
    weightedSimilarity: overallOverlapPercentage,
    evidenceLevel: overallEvidenceLevel,
    confidence: confidenceScore,
  };

  return {
    overallOverlap: overallOverlapPercentage,
    matchedWords: uniqueMatchedWords,
    longestMatch: longestMatchString,
    matchingPassagesCount: passages.length,
    sectionsAffected: Math.min(6, Math.max(1, Math.ceil(passages.length / 2))),
    matches: formattedMatches,
    structuralSimilarity: structuralResult.similarityPercentage,
    evidenceSummary,
    evidenceBreakdown: breakdown,
    transparentBreakdown,
    passages,
    strongMatchesCount: strongCount,
    moderateMatchesCount: moderateCount,
    weakMatchesCount: weakCount,
  };
}

/**
 * Asynchronous document comparison that leverages batch neural embedding
 * if a Transformer / ONNX provider is configured.
 */
export async function compareTwoDocumentsAsync(
  textA: string,
  textB: string,
  sourceLabel = "Comparison Reference",
  sourceType: SourceType = "student_submission",
  config: Partial<SimilarityEngineConfig> = {}
): Promise<ComparisonResult> {
  const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };
  const effectiveTextA = mergedConfig.excludeReferences
    ? separateReferencesSection(textA).bodyText
    : textA;
  const effectiveTextB = mergedConfig.excludeReferences
    ? separateReferencesSection(textB).bodyText
    : textB;

  const provider = getSemanticSimilarityProvider();
  if (provider.embedBatch) {
    const sA = segmentIntoSentenceSpans(effectiveTextA).map((s) => s.text);
    const sB = segmentIntoSentenceSpans(effectiveTextB).map((s) => s.text);
    const allTexts = [...sA, ...sB, effectiveTextA.trim(), effectiveTextB.trim()].filter(Boolean);
    try {
      await provider.embedBatch(allTexts);
    } catch {
      // Continue with fallback
    }
  }
  return compareTwoDocuments(textA, textB, sourceLabel, sourceType, config);
}

/**
 * Student-to-Student Comparison Engine (Part D).
 * Compares a submission against one or more peer submissions.
 * Returns overlap, matched passages, confidence, and anonymized evidence.
 */
export function compareStudentSubmissions(
  studentA: { id: string; name?: string; roll?: string; text: string },
  studentB: { id: string; name?: string; roll?: string; text: string },
  config: Partial<SimilarityEngineConfig> = {}
): StudentComparisonResult {
  const result = compareTwoDocuments(
    studentA.text,
    studentB.text,
    `Submission by ${studentB.roll || "Peer"}`,
    "student_submission",
    config
  );

  const semanticSim = result.transparentBreakdown?.semanticSimilarity ?? 0;
  let evidenceLevel: EvidenceCategory = "ignored";
  if (result.overallOverlap >= 70) evidenceLevel = "strong";
  else if (result.overallOverlap >= 40 || semanticSim >= 55) evidenceLevel = "moderate";
  else if (result.overallOverlap >= 15 || semanticSim >= 35) evidenceLevel = "weak";

  return {
    sourceSubmissionId: studentB.id,
    sourceStudentName: studentB.name || "Peer Student",
    sourceStudentRoll: studentB.roll || "Peer",
    overallOverlap: result.overallOverlap,
    matchedWords: result.matchedWords,
    matchedPassages: result.passages || [],
    evidenceLevel,
    confidence: result.overallOverlap >= 60 ? 0.94 : (result.overallOverlap >= 30 || semanticSim >= 50) ? 0.82 : 0.65,
  };
}

/**
 * Asynchronous Student-to-Student Comparison utilizing neural embeddings if configured.
 */
export async function compareStudentSubmissionsAsync(
  studentA: { id: string; name?: string; roll?: string; text: string },
  studentB: { id: string; name?: string; roll?: string; text: string },
  config: Partial<SimilarityEngineConfig> = {}
): Promise<StudentComparisonResult> {
  const result = await compareTwoDocumentsAsync(
    studentA.text,
    studentB.text,
    `Submission by ${studentB.roll || "Peer"}`,
    "student_submission",
    config
  );

  const semanticSim = result.transparentBreakdown?.semanticSimilarity ?? 0;
  let evidenceLevel: EvidenceCategory = "ignored";
  if (result.overallOverlap >= 70) evidenceLevel = "strong";
  else if (result.overallOverlap >= 40 || semanticSim >= 55) evidenceLevel = "moderate";
  else if (result.overallOverlap >= 15 || semanticSim >= 35) evidenceLevel = "weak";

  return {
    sourceSubmissionId: studentB.id,
    sourceStudentName: studentB.name || "Peer Student",
    sourceStudentRoll: studentB.roll || "Peer",
    overallOverlap: result.overallOverlap,
    matchedWords: result.matchedWords,
    matchedPassages: result.passages || [],
    evidenceLevel,
    confidence: result.overallOverlap >= 60 ? 0.94 : (result.overallOverlap >= 30 || semanticSim >= 50) ? 0.82 : 0.65,
  };
}

/**
 * Compares a submission against an entire cohort of peer submissions.
 */
export function compareAgainstCohort(
  submissionText: string,
  cohortPeers: { id: string; studentName: string; roll: string; text: string }[],
  config: Partial<SimilarityEngineConfig> = {}
): StudentComparisonResult[] {
  const results: StudentComparisonResult[] = [];

  for (const peer of cohortPeers) {
    if (!peer.text || peer.text.trim().length === 0) continue;
    const comparison = compareStudentSubmissions(
      { id: "active-submission", text: submissionText },
      { id: peer.id, name: peer.studentName, roll: peer.roll, text: peer.text },
      config
    );
    if (comparison.overallOverlap >= 5) {
      results.push(comparison);
    }
  }

  return results.sort((a, b) => b.overallOverlap - a.overallOverlap);
}

/**
 * Runs full similarity analysis on a submission text:
 * 1. Checks against cohort peer submissions (student-to-student)
 * 2. Checks against institutional reference corpus (web, academic journals, internal manuals)
 * 3. Integrates IEEE citations and AI writing pattern analysis
 * 4. Aligns passages, avoids double counting, and aggregates multi-layer evidence.
 */
export function runSimilarityAnalysis(
  submissionText: string,
  peerSubmissions: { id: string; studentName: string; roll: string; text: string }[] = [],
  config: Partial<SimilarityEngineConfig> = {}
): {
  overallSimilarity: number;
  studentOverlap: number;
  webSimilarity: number;
  academicSimilarity: number;
  matches: SimilarityMatch[];
  passages: AlignedPassage[];
  evidenceBreakdown: EvidenceBreakdown;
  structuralSimilarity: number;
  transparentBreakdown?: TransparentEvidenceBreakdown;
  studentComparisons?: StudentComparisonResult[];
  evidenceSummary?: string[];
  aiWritingAnalysis?: AIWritingAnalysisResult;
  citationAnalysis?: CitationAnalysisResult;
} {
  const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };

  // Guard against empty submission
  const cleanText = (submissionText || "").trim();
  if (cleanText.length === 0) {
    const emptyBreakdown: EvidenceBreakdown = {
      strong_percentage: 0,
      moderate_percentage: 0,
      semantic_percentage: 0,
      weak_percentage: 0,
      unique_matched_words: 0,
      total_document_words: 0,
    };
    return {
      overallSimilarity: 0,
      studentOverlap: 0,
      webSimilarity: 0,
      academicSimilarity: 0,
      matches: [],
      passages: [],
      evidenceBreakdown: emptyBreakdown,
      structuralSimilarity: 0,
      studentComparisons: [],
      evidenceSummary: ["Empty document submitted."],
      aiWritingAnalysis: analyzeAIWritingPatterns(""),
      citationAnalysis: analyzeIeeeCitations(""),
    };
  }

  // 1. Separate references
  const effectiveText = mergedConfig.excludeReferences
    ? separateReferencesSection(cleanText).bodyText
    : cleanText;

  // 2. Citation analysis
  const citationAnalysis = analyzeIeeeCitations(cleanText);

  // 3. Sentence and token processing with prompt & citation awareness
  const sentences = segmentIntoSentenceSpans(effectiveText, mergedConfig.assignmentPromptText);
  const tokens = tokenizeWords(effectiveText);

  // 4. Build Source Documents from peers and reference corpus
  const peerProvider = new PeerSubmissionsProvider(peerSubmissions);
  const internalProvider = new InternalCorpusProvider(DEFAULT_REFERENCE_CORPUS);

  const allSources: SourceDocument[] = [
    ...peerProvider.searchCandidates(effectiveText),
    ...internalProvider.searchCandidates(effectiveText),
  ];

  // Two-phase candidate retrieval: filter top candidate sources before quadratic sentence checks
  const candidateSources = retrieveTopCandidateSources(effectiveText, allSources, 12);

  const allSentenceAlignments: CandidateSentenceAlignment[] = [];
  let maxStructuralSim = 0;
  let totalExactTokens = 0;
  let totalFuzzyScoreSum = 0;
  let totalSemanticScoreSum = 0;
  let qualifiedSentenceMatches = 0;

  // 5. Compare against candidate source documents
  for (const source of candidateSources) {
    if (!source.text || source.text.trim().length === 0) continue;

    const sourceSentences = segmentIntoSentenceSpans(source.text);
    const candidateIndex = new SentenceCandidateIndex(sourceSentences.map((s) => s.text));

    // Check structural similarity
    const struct = compareDocumentStructure(effectiveText, source.text);
    if (struct.similarityPercentage > maxStructuralSim) {
      maxStructuralSim = struct.similarityPercentage;
    }

    for (const sA of sentences) {
      if (sA.tokens.length < 3) continue;
      if (sA.isQuoted && mergedConfig.excludeQuotations) continue;
      if (sA.isPrompt && mergedConfig.excludeAssignmentPrompt) continue;
      if (sA.isMathFormula && mergedConfig.excludeMathFormulas) continue;
      if (sA.isCommonPhrase && mergedConfig.excludeCommonPhrases && sA.tokens.length < 8) continue;

      const candidates = candidateIndex.getCandidates(sA.text, 3);

      for (const cand of candidates) {
        const sB = sourceSentences[cand.idx];
        if (!sB) continue;

        // Layer 3: Fuzzy comparison
        const fuzzy = compareSentencesFuzzy(sA.text, sB.text);

        // Layer 5: Semantic comparison
        let semanticScore = 0;
        if (fuzzy.compositeScore >= 20 || fuzzy.tokenSet >= 25 || sentences.length <= 15) {
          semanticScore = calculateSemanticSimilarity(sA.text, sB.text);
        }

        // Layer 1 & 2: Multi-size contiguous shingle match
        const exactSpans = findContiguousMatchingSpans(
          sA.tokens,
          sB.tokens,
          mergedConfig.minMatchLengthWords,
          mergedConfig.excludeCommonPhrases
        );
        const hasExactSpan = exactSpans.length > 0;
        const exactTokens = exactSpans.reduce((sum, sp) => sum + sp.tokenCount, 0);
        const exactPercentage = Math.round((exactTokens / Math.max(1, sA.tokens.length)) * 100);

        const isQualified =
          hasExactSpan ||
          fuzzy.compositeScore >= mergedConfig.fuzzyThreshold ||
          (semanticScore >= mergedConfig.semanticThreshold && (fuzzy.tokenSet >= 25 || fuzzy.compositeScore >= 25));

        if (isQualified) {
          totalExactTokens += exactTokens;
          totalFuzzyScoreSum += fuzzy.compositeScore;
          totalSemanticScoreSum += semanticScore;
          qualifiedSentenceMatches++;

          const matchedWords = hasExactSpan
            ? Math.max(exactTokens, Math.min(sA.tokens.length, sB.tokens.length))
            : Math.round((Math.max(fuzzy.compositeScore, semanticScore) / 100) * sA.tokens.length);

          allSentenceAlignments.push({
            studentSentence: sA,
            sourceSentenceText: sB.text,
            sourceIdx: sB.idx,
            sourceName: source.title,
            sourceType: source.type,
            sourceId: source.id,
            exactSimilarity: exactPercentage,
            fuzzySimilarity: fuzzy.compositeScore,
            semanticSimilarity: semanticScore,
            compositeScore: Math.max(exactPercentage, fuzzy.compositeScore),
            matchedWords,
            isQuoted: Boolean(sA.isQuoted || sA.isCited),
            isCommonPhrase: Boolean(sA.isCommonPhrase || sA.isBoilerplate),
          });
          break;
        }
      }
    }
  }

  // 6. Passage alignment & consolidation
  const passages = alignAndMergePassages(sentences, allSentenceAlignments);

  // 7. Unique word overlap calculation without double counting
  const { overallOverlapPercentage, breakdown } = calculateUniqueWordOverlap(tokens, sentences, passages);

  // 8. Source-Type specific overlaps (without double counting within that type)
  const peerPassages = passages.filter((p) => p.source_type === "student_submission");
  const webPassages = passages.filter((p) => p.source_type === "web");
  const acadPassages = passages.filter((p) => p.source_type === "academic" || p.source_type === "internal_document");

  const studentOverlap = calculateUniqueWordOverlap(tokens, sentences, peerPassages).overallOverlapPercentage;
  const webSimilarity = calculateUniqueWordOverlap(tokens, sentences, webPassages).overallOverlapPercentage;
  const academicSimilarity = calculateUniqueWordOverlap(tokens, sentences, acadPassages).overallOverlapPercentage;

  // 9. Format into database SimilarityMatch array
  const matches: SimilarityMatch[] = passages.map((p, idx) => ({
    id: `match-v2-${idx + 1}-${Date.now().toString(36)}`,
    analysis_id: "",
    source_type: p.source_type,
    source_name: p.source_name,
    source_title: p.source_name,
    source_url: p.source_id,
    matched_text: p.student_text,
    source_matched_text: p.source_text,
    similarity_percentage: p.similarity_percentage,
    exact_similarity: p.exact_similarity,
    fuzzy_similarity: p.fuzzy_similarity,
    semantic_similarity: p.semantic_similarity,
    evidence_level: p.evidence_level,
    confidence: p.similarity_percentage >= 75 ? 0.95 : p.similarity_percentage >= 50 ? 0.8 : 0.6,
    passage_id: p.id,
    start_position: p.start_char,
    end_position: p.end_char,
    matched_words: p.matched_words,
    is_quoted: p.is_quoted,
    is_common_technical_phrase: p.evidence_level === "weak",
    created_at: new Date().toISOString(),
  }));

  // 10. Student-to-student detailed comparisons
  const studentComparisons = compareAgainstCohort(cleanText, peerSubmissions, config);

  // 11. AI Writing Pattern Analysis (Part F)
  const aiWritingAnalysis = analyzeAIWritingPatterns(effectiveText);

  // 12. Transparent breakdown & Evidence summaries
  const evidenceSummary: string[] = [];
  if (breakdown.strong_percentage >= 15) {
    evidenceSummary.push(`${breakdown.strong_percentage}% verbatim or contiguous sentence overlap`);
  }
  if (breakdown.moderate_percentage >= 10) {
    evidenceSummary.push(`${breakdown.moderate_percentage}% moderate fuzzy lexical overlap`);
  }
  if (breakdown.semantic_percentage >= 5) {
    evidenceSummary.push(`${breakdown.semantic_percentage}% semantic overlap indicative of paraphrasing`);
  }
  if (studentOverlap >= 15) {
    evidenceSummary.push(`${studentOverlap}% student-to-student cohort textual overlap`);
  }

  const avgExactSim = qualifiedSentenceMatches > 0
    ? Math.round((totalExactTokens / Math.max(1, tokens.length)) * 100)
    : 0;
  const avgFuzzySim = qualifiedSentenceMatches > 0
    ? Math.round(totalFuzzyScoreSum / qualifiedSentenceMatches)
    : 0;
  const avgSemanticSim = qualifiedSentenceMatches > 0
    ? Math.round(totalSemanticScoreSum / qualifiedSentenceMatches)
    : 0;

  let overallLevel: EvidenceCategory = "ignored";
  if (overallOverlapPercentage >= 70) overallLevel = "strong";
  else if (overallOverlapPercentage >= 35) overallLevel = "moderate";
  else if (overallOverlapPercentage >= 10) overallLevel = "weak";

  const transparentBreakdown: TransparentEvidenceBreakdown = {
    exactSimilarity: avgExactSim,
    shingleSimilarity: Math.max(breakdown.strong_percentage, avgExactSim),
    fuzzySimilarity: avgFuzzySim,
    semanticSimilarity: avgSemanticSim,
    structuralSimilarity: maxStructuralSim,
    weightedSimilarity: overallOverlapPercentage,
    evidenceLevel: overallLevel,
    confidence: overallOverlapPercentage >= 70 ? 0.95 : overallOverlapPercentage >= 40 ? 0.85 : 0.7,
  };

  return {
    overallSimilarity: overallOverlapPercentage,
    studentOverlap,
    webSimilarity,
    academicSimilarity,
    matches,
    passages,
    evidenceBreakdown: breakdown,
    structuralSimilarity: maxStructuralSim,
    transparentBreakdown,
    studentComparisons,
    evidenceSummary,
    aiWritingAnalysis,
    citationAnalysis,
  };
}

/**
 * Asynchronous similarity analysis pre-warming neural embeddings for active transformer models.
 */
export async function runSimilarityAnalysisAsync(
  submissionText: string,
  peerSubmissions: { id: string; studentName: string; roll: string; text: string }[] = [],
  config: Partial<SimilarityEngineConfig> = {}
) {
  const mergedConfig = { ...DEFAULT_SIMILARITY_CONFIG, ...config };
  const effectiveText = mergedConfig.excludeReferences
    ? separateReferencesSection(submissionText).bodyText
    : submissionText;

  const provider = getSemanticSimilarityProvider();
  if (provider.embedBatch) {
    const sTexts = segmentIntoSentenceSpans(effectiveText, mergedConfig.assignmentPromptText).map((s) => s.text);
    const peerTexts = peerSubmissions.flatMap((p) => segmentIntoSentenceSpans(p.text).map((s) => s.text));

    const peerProvider = new PeerSubmissionsProvider(peerSubmissions);
    const internalProvider = new InternalCorpusProvider(DEFAULT_REFERENCE_CORPUS);
    const allSources = [
      ...peerProvider.searchCandidates(effectiveText),
      ...internalProvider.searchCandidates(effectiveText),
    ];
    const topCandidates = retrieveTopCandidateSources(effectiveText, allSources, 12);
    const candidateTexts = topCandidates.flatMap((c) => segmentIntoSentenceSpans(c.text).map((s) => s.text));

    const all = [...sTexts, ...peerTexts, ...candidateTexts, effectiveText.trim()].filter(Boolean);
    try {
      await provider.embedBatch(all);
    } catch {
      // Continue with fallback
    }
  }
  return runSimilarityAnalysis(submissionText, peerSubmissions, config);
}

/**
 * Unified Academic Integrity Analysis Runner (Part G).
 * Produces the complete AnalysisResult schema.
 */
export function runFullAcademicIntegrityAnalysis(params: {
  submissionId: string;
  submissionText: string;
  peerSubmissions?: { id: string; studentName: string; roll: string; text: string }[] | undefined;
  assignmentPromptText?: string | undefined;
  config?: Partial<SimilarityEngineConfig> | undefined;
}): AnalysisResult {
  const startTime = Date.now();
  const simConfig: Partial<SimilarityEngineConfig> = {
    ...params.config,
  };
  if (params.assignmentPromptText) {
    simConfig.assignmentPromptText = params.assignmentPromptText;
  }
  const sim = runSimilarityAnalysis(
    params.submissionText,
    params.peerSubmissions || [],
    simConfig
  );

  // Group passages into source summaries
  const sourceMap = new Map<string, MatchedSourceSummary>();
  for (const p of sim.passages) {
    const key = p.source_name;
    const existing = sourceMap.get(key);
    if (existing) {
      existing.matchedWords += p.matched_words;
      existing.matchedPercentage = Math.max(existing.matchedPercentage, p.similarity_percentage);
    } else {
      sourceMap.set(key, {
        id: p.source_id || `src-${sourceMap.size + 1}`,
        name: p.source_name,
        type: p.source_type,
        matchedPercentage: p.similarity_percentage,
        matchedWords: p.matched_words,
        evidenceLevel: p.evidence_level,
      });
    }
  }

  const sources = Array.from(sourceMap.values()).sort(
    (a, b) => b.matchedPercentage - a.matchedPercentage
  );

  const processingTimeMs = Date.now() - startTime;

  return {
    submissionId: params.submissionId,
    similarity: {
      overallPercentage: sim.overallSimilarity,
      breakdown: sim.evidenceBreakdown,
      exactSimilarity: sim.transparentBreakdown?.exactSimilarity ?? 0,
      shingleSimilarity: sim.transparentBreakdown?.shingleSimilarity ?? 0,
      fuzzySimilarity: sim.transparentBreakdown?.fuzzySimilarity ?? 0,
      semanticSimilarity: sim.transparentBreakdown?.semanticSimilarity ?? 0,
      structuralSimilarity: sim.structuralSimilarity,
      weightedSimilarity: sim.overallSimilarity,
      evidenceLevel: sim.transparentBreakdown?.evidenceLevel ?? "ignored",
      confidence: sim.transparentBreakdown?.confidence ?? 0.8,
    },
    sources,
    passages: sim.passages,
    studentComparisons: sim.studentComparisons || [],
    citations: sim.citationAnalysis,
    structuralEvidence: {
      similarityPercentage: sim.structuralSimilarity,
      matchingHeadingsCount: 0,
      totalHeadingsA: 0,
      totalHeadingsB: 0,
      identicalSequence: false,
      notes: [],
    },
    aiWritingAnalysis: sim.aiWritingAnalysis || analyzeAIWritingPatterns(params.submissionText),
    evidenceSummary: sim.evidenceSummary || [],
    processingMetadata: {
      processingTimeMs,
      engineVersion: "Verity-Integrity-Engine-v2.4",
      semanticProviderName: getSemanticSimilarityProvider().name,
      aiWritingProviderName: new StatisticalAIWritingProvider().name,
      timestamp: new Date().toISOString(),
    },
  };
}
