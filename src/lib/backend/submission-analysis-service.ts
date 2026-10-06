import type {
  Submission,
  Analysis,
  SimilarityMatch,
  AlignedPassage,
  EvidenceBreakdown,
  TransparentEvidenceBreakdown,
  StudentComparisonResult,
  SourceType,
  UserRole,
} from "@/types/database";
import { processUploadedDocument, type ProcessedDocument } from "./document-processor";
import { SourceDiscoveryCoordinator } from "./similarity/source-discovery-coordinator";
import { runSimilarityAnalysisAsync } from "./similarity-engine";
import {
  type SimilarityEngineConfig,
  DEFAULT_SIMILARITY_CONFIG,
} from "./similarity/types";
import { analyzeIeeeCitations, type CitationAnalysisResult } from "./citation-engine";
import { analyzeAIWritingPatterns, type AIWritingAnalysisResult } from "./ai-writing-analysis";
import { calculateUniqueWordOverlap } from "./similarity/passage-aligner";
import { tokenizeWords, segmentIntoSentenceSpans } from "./similarity/technical-vocabulary";
import { separateReferencesSection } from "./similarity/technical-vocabulary";
import { InternalStudentCorpusProvider } from "./similarity/internal-student-provider";
import { LocalReferenceCorpusProvider } from "./similarity/local-reference-corpus";
import { PublicWebSearchProvider } from "./similarity/public-web-provider";
import { OpenAccessAcademicProvider } from "./similarity/open-access-provider";

export interface DocumentValidationResult {
  valid: boolean;
  error?: string | undefined;
}

export interface SubmissionProcessingParams {
  submissionId: string;
  submissionCode?: string | undefined;
  assignmentId: string;
  assignmentTitle?: string | undefined;
  courseId?: string | undefined;
  courseCode?: string | undefined;
  studentId: string;
  studentName?: string | undefined;
  studentRoll?: string | undefined;
  institutionId?: string | undefined;
  userRole?: UserRole | undefined;
  file?: File | undefined;
  extractedText?: string | undefined;
  fileName?: string | undefined;
  fileType?: string | undefined;
  fileSize?: number | undefined;
  coordinator?: SourceDiscoveryCoordinator | undefined;
  config?: Partial<SimilarityEngineConfig> | undefined;
  onProgress?: ((stage: string) => void) | undefined;
}

export interface SubmissionProcessingOutput {
  success: boolean;
  status: "analyzed" | "needs_review" | "reviewed" | "failed";
  analysisStatus: "completed" | "failed";
  submissionId: string;
  submissionCode: string;
  document: {
    fileName: string;
    fileType: string;
    fileSize: number;
    extractedText: string;
    pageCount: number;
    wordCount: number;
    proseWordCount?: number | undefined;
    paragraphs: { id: string; heading?: string | undefined; text: string }[];
  };
  analysis?: {
    id: string;
    submission_id: string;
    status: "completed" | "failed";
    similarity_percentage: number;
    matched_source_count: number;
    student_overlap_percentage: number;
    citation_issue_count: number;
    writing_pattern_status: string;
    structural_similarity_percentage: number;
    evidence_breakdown: EvidenceBreakdown;
    transparent_breakdown?: TransparentEvidenceBreakdown | undefined;
    passages: AlignedPassage[];
    matches: SimilarityMatch[];
    citation_analysis: CitationAnalysisResult;
    ai_writing_analysis: AIWritingAnalysisResult;
    student_comparisons: StudentComparisonResult[];
    completed_at: string;
  } | undefined;
  errorMessage?: string | undefined;
  processingTimeMs: number;
}

/**
 * Validates uploaded file format and size constraints.
 */
export function validateDocumentFile(file: File): DocumentValidationResult {
  if (!file) {
    return { valid: false, error: "No file was provided for submission." };
  }

  // Maximum file size: 25MB
  const maxBytes = 25 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 25 MB institutional limit.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: "The uploaded file is empty (0 bytes)." };
  }

  const name = (file.name || "").toLowerCase();
  const validExtensions = [
    ".pdf",
    ".docx",
    ".txt",
    ".md",
    ".py",
    ".cpp",
    ".c",
    ".h",
    ".java",
    ".js",
    ".ts",
  ];

  const hasValidExt = validExtensions.some((ext) => name.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: `Unsupported file format '${name}'. Please submit a PDF, DOCX, TXT, or source code file.`,
    };
  }

  return { valid: true };
}

/**
 * Executes the complete end-to-end submission analysis workflow:
 * 1. Validates document format and constraints
 * 2. Extracts and structures textual content
 * 3. Discovers candidate sources via SourceDiscoveryCoordinator (excluding current submission)
 * 4. Evaluates evidence through the multi-layer similarity engine (corroboration gate active)
 * 5. Verifies citations and observable writing patterns
 * 6. Structures normalized matches and passage records
 * 7. Encapsulates error handling for safe failure reporting
 */
export async function processSubmissionDocument(
  params: SubmissionProcessingParams
): Promise<SubmissionProcessingOutput> {
  const startTime = Date.now();
  const subCode = params.submissionCode || params.submissionId;

  // 1. Text Extraction
  let extractedText = params.extractedText || "";
  let fileName = params.fileName || "submission.txt";
  let fileType = params.fileType || "text/plain";
  let fileSize = params.fileSize || 0;
  let pageCount = 1;
  let wordCount = 0;
  let paragraphs: { id: string; heading?: string | undefined; text: string }[] = [];

  if (params.file) {
    params.onProgress?.("Validating document format and constraints...");
    const val = validateDocumentFile(params.file);
    if (!val.valid) {
      return {
        success: false,
        status: "failed",
        analysisStatus: "failed",
        submissionId: params.submissionId,
        submissionCode: subCode,
        document: {
          fileName: params.file.name,
          fileType: params.file.type,
          fileSize: params.file.size,
          extractedText: "",
          pageCount: 1,
          wordCount: 0,
          paragraphs: [],
        },
        errorMessage: val.error,
        processingTimeMs: Date.now() - startTime,
      };
    }

    try {
      params.onProgress?.("Extracting and structuring document text...");
      const processed: ProcessedDocument = await processUploadedDocument(params.file);
      fileName = processed.fileName;
      fileType = processed.fileType;
      fileSize = processed.fileSize;
      extractedText = (processed.extractedText || "").replace(/\0/g, "").trim();
      pageCount = processed.pageCount;
      wordCount = processed.wordCount;
      paragraphs = (processed.paragraphs || []).map((p) => ({
        id: p.id,
        heading: p.heading ? p.heading.replace(/\0/g, "") : undefined,
        text: (p.text || "").replace(/\0/g, ""),
      }));
    } catch (parseErr: any) {
      return {
        success: false,
        status: "failed",
        analysisStatus: "failed",
        submissionId: params.submissionId,
        submissionCode: subCode,
        document: {
          fileName,
          fileType,
          fileSize,
          extractedText: "",
          pageCount: 1,
          wordCount: 0,
          paragraphs: [],
        },
        errorMessage: `Failed to extract text from document: ${parseErr?.message || "File may be corrupt or encrypted."}`,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  if (!extractedText || extractedText.trim().length < 15) {
    return {
      success: false,
      status: "failed",
      analysisStatus: "failed",
      submissionId: params.submissionId,
      submissionCode: subCode,
      document: {
        fileName,
        fileType,
        fileSize,
        extractedText,
        pageCount,
        wordCount,
        paragraphs,
      },
      errorMessage: "Document contains insufficient readable text (minimum 15 characters required for similarity evaluation).",
      processingTimeMs: Date.now() - startTime,
    };
  }

  // 2. Multi-Provider Source Discovery & Evaluation
  try {
    params.onProgress?.("Discovering candidate sources across institutional, reference, and academic corpora...");
    const coordinator = params.coordinator || new SourceDiscoveryCoordinator();

    // Query across sources: Internal student corpus (excluding current submission!), local reference corpus, public web, academic
    const discoveryResult = await coordinator.discoverAndEvaluateSources(
      params.submissionId,
      extractedText,
      {
        excludeSubmissionId: params.submissionId,
        excludeSubmissionIds: [params.submissionId, params.submissionCode].filter(Boolean) as string[],
        courseId: params.courseId,
        assignmentId: params.assignmentId,
        institutionId: params.institutionId || "a0000000-0000-0000-0000-000000000001",
        userRole: params.userRole || "faculty",
        submittingStudentId: params.studentId,
      },
      {
        config: params.config,
        minSimilarityToReport: 5,
        maxCandidatesTotal: 12,
      }
    );

    params.onProgress?.("Comparing evidence and calculating passage alignments...");

    // 3. Peer Submissions extraction for student comparisons
    const studentPeerMatches = discoveryResult.matches.filter(
      (m) => m.sourceType === "student_submission"
    );

    const studentComparisons: StudentComparisonResult[] = studentPeerMatches.map((m) => ({
      sourceSubmissionId: m.sourceId,
      sourceStudentName: m.author || "Peer Student",
      sourceStudentRoll: m.author?.match(/\(([^)]+)\)/)?.[1] || "Peer",
      overallOverlap: m.similarityPercentage,
      matchedWords: m.matchedWordCount,
      matchedPassages: m.matchedPassages,
      evidenceLevel: m.evidenceLevel,
      confidence: m.confidence,
    }));

    // 4. Citation and AI Writing Pattern Analyses
    params.onProgress?.("Verifying citations and writing patterns...");
    const citeResult = analyzeIeeeCitations(extractedText);
    const aiWritingResult = analyzeAIWritingPatterns(extractedText);

    params.onProgress?.("Finalizing analysis and archiving evidence...");

    // 5. Aggregate passages and compute overall non-double-counted overlap
    const allPassages: AlignedPassage[] = discoveryResult.matches.flatMap((m) => m.matchedPassages);

    // Sort passages by similarity (highest first) to prioritize stronger matches during deduplication
    allPassages.sort((a, b) => (b.similarity_percentage ?? 0) - (a.similarity_percentage ?? 0));

    const tokens = tokenizeWords(extractedText);
    const sentences = segmentIntoSentenceSpans(extractedText);
    
    // Deduplicate passages to fix Issue 3 (Duplicated source text)
    // We only keep the strongest passage for each student sentence.
    const matchedSentenceMask = new Uint8Array(sentences.length);
    const deduplicatedPassages: AlignedPassage[] = [];
    for (const p of allPassages) {
      let overlapCount = 0;
      const totalSentences = p.end_sentence_idx - p.start_sentence_idx + 1;
      for (let i = p.start_sentence_idx; i <= p.end_sentence_idx; i++) {
        if (matchedSentenceMask[i]) overlapCount++;
      }
      
      // Keep passage if it doesn't mostly overlap with a stronger one (allow small overlaps)
      if (overlapCount < totalSentences * 0.5) {
        deduplicatedPassages.push(p);
        for (let i = p.start_sentence_idx; i <= p.end_sentence_idx; i++) {
          matchedSentenceMask[i] = 1;
        }
      }
    }
    
    // Sort passages back by student start character position for chronological display
    deduplicatedPassages.sort((a, b) => (a.start_char ?? 0) - (b.start_char ?? 0));

    // Calculate overall overlap from deduplicated passages without double counting
    const deduplicatedOverlapResult = calculateUniqueWordOverlap(tokens, sentences, deduplicatedPassages);
    const overallSimilarity = deduplicatedOverlapResult.overallOverlapPercentage;
    const maxSourceOverlap = discoveryResult.matches.length > 0
      ? discoveryResult.matches[0]!.similarityPercentage
      : 0;

    const studentOverlap = calculateUniqueWordOverlap(tokens, sentences, deduplicatedPassages.filter(p => p.source_type === "student_submission")).overallOverlapPercentage;

    // Granular similarity matches for table persistence
    const matches: SimilarityMatch[] = discoveryResult.matches.flatMap((srcMatch, sIdx) =>
      srcMatch.matchedPassages.map((p, pIdx) => ({
        id: `match-${sIdx + 1}-${pIdx + 1}-${Date.now().toString(36)}`,
        analysis_id: `ana-${params.submissionId}`,
        source_type: srcMatch.sourceType,
        source_name: srcMatch.sourceTitle,
        source_title: srcMatch.sourceTitle,
        source_url: srcMatch.url || null as any,
        matched_text: p.student_text,
        source_matched_text: p.source_text || null as any,
        similarity_percentage: p.similarity_percentage,
        exact_similarity: p.exact_similarity ?? null as any,
        fuzzy_similarity: p.fuzzy_similarity ?? null as any,
        semantic_similarity: p.semantic_similarity ?? null as any,
        evidence_level: p.evidence_level,
        confidence: p.similarity_percentage >= 70 ? 0.94 : 0.8,
        passage_id: p.id,
        start_position: p.start_char ?? null as any,
        end_position: p.end_char ?? null as any,
        source_start_position: null as any,
        source_end_position: null as any,
        matched_words: p.matched_words,
        matched_shingle_sizes: [3, 4, 5],
        is_quoted: p.is_quoted ?? false,
        is_common_technical_phrase: p.evidence_level === "weak",
        created_at: new Date().toISOString(),
      }))
    );

    const strongMatchesCount = discoveryResult.matches.filter((m) => m.evidenceLevel === "strong").length;
    const moderateMatchesCount = discoveryResult.matches.filter((m) => m.evidenceLevel === "moderate").length;

    const evidenceBreakdown: EvidenceBreakdown = deduplicatedOverlapResult.breakdown;

    const transparentBreakdown: TransparentEvidenceBreakdown = {
      exactSimilarity: discoveryResult.matches[0]?.exactMatchPercentage ?? 0,
      shingleSimilarity: discoveryResult.matches[0]?.exactMatchPercentage ?? 0,
      fuzzySimilarity: discoveryResult.matches[0]?.fuzzyMatchPercentage ?? 0,
      semanticSimilarity: discoveryResult.matches[0]?.semanticMatchPercentage ?? 0,
      structuralSimilarity: 0,
      weightedSimilarity: maxSourceOverlap,
      evidenceLevel: discoveryResult.matches[0]?.evidenceLevel ?? "ignored",
      confidence: discoveryResult.matches[0]?.confidence ?? (maxSourceOverlap === 0 ? 1.0 : 0.8),
    };

    const overallStatus: "needs_review" | "reviewed" =
      overallSimilarity >= 25 || aiWritingResult.status === "review_recommended" || citeResult.issues.length > 0
        ? "needs_review"
        : "reviewed";

    return {
      success: true,
      status: overallStatus,
      analysisStatus: "completed",
      submissionId: params.submissionId,
      submissionCode: subCode,
      document: {
        fileName,
        fileType,
        fileSize,
        extractedText,
        pageCount,
        wordCount,
        proseWordCount: separateReferencesSection(extractedText).bodyText.split(/\s+/).filter(Boolean).length,
        paragraphs,
      },
      analysis: {
        id: `ana-${params.submissionId}`,
        submission_id: params.submissionId,
        status: "completed",
        similarity_percentage: overallSimilarity,
        matched_source_count: discoveryResult.matches.length,
        student_overlap_percentage: studentOverlap,
        citation_issue_count: citeResult.issues.length,
        writing_pattern_status:
          aiWritingResult.status === "insufficient_evidence"
            ? "Writing pattern analysis unavailable"
            : aiWritingResult.status === "review_recommended"
            ? "Review Recommended"
            : overallSimilarity > 25
            ? "Requires Review"
            : "Normal",
        structural_similarity_percentage: 0,
        evidence_breakdown: evidenceBreakdown,
        transparent_breakdown: transparentBreakdown,
        passages: deduplicatedPassages,
        matches,
        citation_analysis: citeResult,
        ai_writing_analysis: aiWritingResult,
        student_comparisons: studentComparisons,
        completed_at: new Date().toISOString(),
      },
      processingTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      success: false,
      status: "failed",
      analysisStatus: "failed",
      submissionId: params.submissionId,
      submissionCode: subCode,
      document: {
        fileName,
        fileType,
        fileSize,
        extractedText,
        pageCount,
        wordCount,
        paragraphs,
      },
      errorMessage: `Analysis error: ${err?.message || "An unexpected error occurred during similarity evaluation."}`,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
