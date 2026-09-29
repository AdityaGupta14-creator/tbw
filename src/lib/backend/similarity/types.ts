import type { SourceType, SimilarityMatch, AlignedPassage, EvidenceBreakdown } from "@/types/database";

export type EvidenceLevel = "strong" | "moderate" | "weak" | "ignored";

export interface SimilarityEngineConfig {
  /** Exclude references / bibliography section from inflating plagiarism */
  excludeReferences: boolean;
  /** Exclude properly quoted text in quotation marks */
  excludeQuotations: boolean;
  /** Suppress common technical terminology & academic boilerplate from being flagged */
  excludeCommonPhrases: boolean;
  /** Exclude assignment prompt from inflating similarity */
  excludeAssignmentPrompt?: boolean | undefined;
  /** Assignment prompt text to filter out */
  assignmentPromptText?: string | undefined;
  /** Suppress mathematical formulas and notation */
  excludeMathFormulas?: boolean | undefined;
  /** Minimum consecutive words required for an exact match to be flagged */
  minMatchLengthWords: number;
  /** Shingle sizes to evaluate across multi-scale analysis */
  shingleSizes: number[];
  /** Lexical fuzzy similarity threshold for candidate sentences (0-100) */
  fuzzyThreshold: number;
  /** Semantic similarity threshold for paraphrase detection (0-100) */
  semanticThreshold: number;
  /** Threshold for strong evidence classification (0-100) */
  strongThreshold: number;
  /** Threshold for moderate evidence classification (0-100) */
  moderateThreshold: number;
}

export const DEFAULT_SIMILARITY_CONFIG: SimilarityEngineConfig = {
  excludeReferences: true,
  excludeQuotations: true,
  excludeCommonPhrases: true,
  excludeAssignmentPrompt: true,
  excludeMathFormulas: true,
  minMatchLengthWords: 5,
  shingleSizes: [3, 4, 5, 7, 10],
  fuzzyThreshold: 58,
  semanticThreshold: 28,
  strongThreshold: 75,
  moderateThreshold: 48,
};

export interface SentenceSpan {
  idx: number;
  text: string;
  normalizedText: string;
  tokens: string[];
  startChar: number;
  endChar: number;
  isQuoted: boolean;
  isCommonPhrase: boolean;
  isHeading: boolean;
  isReference: boolean;
  isPrompt?: boolean;
  isMathFormula?: boolean;
  isBoilerplate?: boolean;
  isCited?: boolean;
}

export interface DetailedEvidenceScore {
  overallSimilarity: number;
  uniqueMatchedWords: number;
  totalWords: number;
  strongPercentage: number;
  moderatePercentage: number;
  semanticPercentage: number;
  weakPercentage: number;
  studentOverlapPercentage: number;
  webSimilarityPercentage: number;
  academicSimilarityPercentage: number;
  evidenceSummary: string[];
}

export interface SourceDocument {
  id: string;
  title: string;
  type: SourceType;
  url?: string | undefined;
  author?: string | undefined;
  text: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface SourceProvider {
  readonly id: string;
  readonly name: string;
  searchCandidates(queryText: string): Promise<SourceDocument[]> | SourceDocument[];
}

export interface InternalCorpusProviderInterface extends SourceProvider {
  readonly type: "internal_corpus";
}

export interface WebSearchProviderInterface extends SourceProvider {
  readonly type: "web_search";
}

export interface AcademicCorpusProviderInterface extends SourceProvider {
  readonly type: "academic_corpus";
}

export interface InstitutionalRepositoryProviderInterface extends SourceProvider {
  readonly type: "institutional_repository";
}

export interface SemanticSimilarityProvider {
  readonly name: string;
  embed(text: string): Promise<number[]> | number[];
  embedBatch?(texts: string[]): Promise<number[][]> | number[][];
  compare(vectorA: number[], vectorB: number[]): number;
}

export interface MultiLayerComparisonResult {
  overallOverlap: number;
  matchedWords: number;
  longestMatch: string;
  matchingPassagesCount: number;
  sectionsAffected: number;
  structuralSimilarity: number;
  evidenceSummary: string[];
  evidenceBreakdown: EvidenceBreakdown;
  passages: AlignedPassage[];
  matches: SimilarityMatch[];
}

