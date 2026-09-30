// PostgreSQL & Supabase Database Type Definitions for Verity Academic Integrity Platform

export type UserRole = "faculty" | "student" | "admin";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "analyzed"
  | "needs_review"
  | "reviewed"
  | "returned"
  | "failed";

export type SourceType = "web" | "academic" | "student_submission" | "internal_document";

export type AnalysisStatus = "pending" | "processing" | "completed" | "failed";

export type CitationStyle = "IEEE" | "APA" | "ACM" | "ASME" | "Chicago" | "Other";

export interface Profile {
  id: string;
  auth_user_id?: string | undefined;
  full_name: string;
  email: string;
  role: UserRole;
  roll_number?: string | undefined;
  institution_id?: string | undefined;
  department_id?: string | undefined;
  department_name?: string | undefined;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  created_at: string;
}

export interface Department {
  id: string;
  institution_id: string;
  name: string;
  code: string;
  faculty_count?: number | undefined;
  student_count?: number | undefined;
  course_count?: number | undefined;
  submission_count?: number | undefined;
  created_at: string;
}

export interface Course {
  id: string;
  institution_id?: string | undefined;
  department_id?: string | undefined;
  department_name?: string | undefined;
  faculty_id: string;
  faculty_name?: string | undefined;
  course_code: string;
  name: string;
  section: string;
  semester: string;
  academic_year: string;
  description?: string | undefined;
  student_count?: number | undefined;
  assignment_count?: number | undefined;
  pending_count?: number | undefined;
  pending_reviews?: number | undefined;
  created_at: string;
  updated_at: string;
}

export interface CourseMember {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  status: "active" | "dropped" | "completed";
  student?: Profile | undefined;
}

export interface Assignment {
  id: string;
  course_id: string;
  course_code?: string | undefined;
  course_name?: string | undefined;
  title: string;
  description?: string | undefined;
  assignment_type: string;
  due_date: string;
  max_marks: number;
  word_limit?: number | undefined;
  page_limit?: number | undefined;
  citation_style: CitationStyle;
  enable_similarity: boolean;
  enable_student_comparison: boolean;
  enable_citation_analysis: boolean;
  enable_revision_history: boolean;
  enable_writing_pattern_analysis: boolean;
  submitted_count?: number | undefined;
  total_students?: number | undefined;
  avg_similarity?: number | undefined;
  pending_count?: number | undefined;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  submission_code: string;
  assignment_id: string;
  assignment_title?: string | undefined;
  course_id?: string | undefined;
  course_code?: string | undefined;
  student_id: string;
  student_name?: string | undefined;
  student_roll?: string | undefined;
  version_number: number;
  status: SubmissionStatus;
  submitted_at: string;
  is_final: boolean;
  similarity_percentage?: number | undefined;
  matched_source_count?: number | undefined;
  citation_issue_count?: number | undefined;
  drafts_count?: number | undefined;
  created_at: string;
  updated_at: string;
  document?: DocumentRecord | undefined;
  analysis?: Analysis | undefined;
  feedback?: FeedbackRecord[] | undefined;
  review?: SubmissionReview | undefined;
  review_audit?: ReviewAuditEntry[] | undefined;
}

export interface DocumentRecord {
  id: string;
  submission_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  extracted_text: string;
  page_count: number;
  word_count?: number | undefined;
  prose_word_count?: number | undefined;
  created_at: string;
}

export interface EvidenceBreakdown {
  strong_percentage: number;
  moderate_percentage: number;
  semantic_percentage: number;
  weak_percentage: number;
  unique_matched_words: number;
  total_document_words: number;
}

export interface AlignedPassage {
  id: string;
  source_id?: string | undefined;
  source_name: string;
  source_type: SourceType;
  student_text: string;
  source_text: string;
  start_sentence_idx: number;
  end_sentence_idx: number;
  start_char?: number | undefined;
  end_char?: number | undefined;
  matched_words: number;
  similarity_percentage: number;
  exact_similarity?: number | undefined;
  fuzzy_similarity?: number | undefined;
  semantic_similarity?: number | undefined;
  evidence_level: "strong" | "moderate" | "weak";
  reasons: string[];
  is_quoted?: boolean | undefined;
  confidence?: number | undefined;
  is_common_phrase?: boolean | undefined;
}

export interface CitationIssue {
  id: string;
  type: "uncited_reference" | "missing_citation" | "formatting" | "numbering_gap";
  severity: "potential_issue" | "detected" | "unable_to_verify";
  text: string;
  target?: string | undefined;
  referenceNumber?: number | undefined;
  referenceText?: string | undefined;
  reason?: string | undefined;
  isIeeeViolation?: boolean | undefined;
}

export interface CitationAnalysisResult {
  style: "IEEE" | "APA" | "ACM";
  totalReferencesCount: number;
  inTextCitationsCount: number;
  uniqueInTextCited: number[];
  bibliographyNumbers: number[];
  issues: CitationIssue[];
}

export interface Analysis {
  id: string;
  submission_id: string;
  status: AnalysisStatus;
  similarity_percentage: number;
  matched_source_count: number;
  student_overlap_percentage: number;
  citation_issue_count: number;
  writing_pattern_status: string;
  started_at?: string | undefined;
  completed_at?: string | undefined;
  created_at: string;
  matches?: SimilarityMatch[] | undefined;
  evidence_breakdown?: EvidenceBreakdown | undefined;
  transparent_breakdown?: TransparentEvidenceBreakdown | undefined;
  passages?: AlignedPassage[] | undefined;
  structural_similarity_percentage?: number | undefined;
  citation_analysis?: CitationAnalysisResult | undefined;
  ai_writing_analysis?: AIWritingAnalysisResult | undefined;
  student_comparisons?: StudentComparisonResult[] | undefined;
}

export interface SimilarityMatch {
  id: string;
  analysis_id: string;
  source_type: SourceType;
  source_name: string;
  source_title?: string | undefined;
  source_url?: string | undefined;
  matched_text: string;
  source_matched_text?: string | undefined;
  similarity_percentage: number;
  exact_similarity?: number | undefined;
  fuzzy_similarity?: number | undefined;
  semantic_similarity?: number | undefined;
  evidence_level?: "strong" | "moderate" | "weak" | undefined;
  confidence?: number | undefined;
  passage_id?: string | undefined;
  start_position?: number | undefined;
  end_position?: number | undefined;
  source_start_position?: number | undefined;
  source_end_position?: number | undefined;
  matched_words: number;
  matched_shingle_sizes?: number[] | undefined;
  is_quoted?: boolean | undefined;
  is_common_technical_phrase?: boolean | undefined;
  created_at: string;
}

export interface FeedbackRecord {
  id: string;
  submission_id: string;
  faculty_id: string;
  faculty_name?: string | undefined;
  comment: string;
  page_number?: number | undefined;
  text_reference?: string | undefined;
  paragraph_id?: string | undefined;
  status: "active" | "resolved";
  created_at: string;
  updated_at: string;
}

export interface RubricItem {
  criterion: string;
  score: number;
  max: number;
}

export type EvidenceCategory = "strong" | "moderate" | "weak" | "ignored";

export interface TransparentEvidenceBreakdown {
  exactSimilarity: number;
  shingleSimilarity: number;
  fuzzySimilarity: number;
  semanticSimilarity: number;
  structuralSimilarity: number;
  weightedSimilarity: number;
  evidenceLevel: EvidenceCategory;
  confidence: number;
}

export interface StudentComparisonResult {
  sourceSubmissionId: string;
  sourceStudentName: string;
  sourceStudentRoll: string;
  overallOverlap: number;
  matchedWords: number;
  matchedPassages: AlignedPassage[];
  evidenceLevel: EvidenceCategory;
  confidence: number;
}

export interface AIWritingIndicator {
  name: string;
  score: number; // 0.0 - 1.0 or normalized scale
  threshold: number;
  flagged: boolean;
  description: string;
}

export interface ObservableWritingCharacteristics {
  sentenceCount: number;
  averageSentenceLength: number;
  sentenceLengthStdDev: number;
  vocabularyDiversityTTR: number; // Type-Token Ratio
  paragraphCount: number;
  averageParagraphLength: number;
  transitionWordDensity: number;
  stylisticConsistencyScore: number;
  repeatedPhraseCount: number;
}

export interface ModelDerivedIndicators {
  providerName: string;
  burstinessScore?: number;
  perplexityScore?: number;
  rawModelConfidence?: number;
}

export interface AIWritingAnalysisResult {
  status: "review_recommended" | "no_strong_indicators" | "insufficient_evidence";
  confidence: number;
  indicators: AIWritingIndicator[];
  observableCharacteristics: ObservableWritingCharacteristics;
  modelDerivedIndicators?: ModelDerivedIndicators;
  explanation: string;
  disclaimer: string;
}

export interface ProcessingMetadata {
  processingTimeMs: number;
  engineVersion: string;
  semanticProviderName: string;
  aiWritingProviderName: string;
  timestamp: string;
}

export interface StructuralEvidenceItem {
  similarityPercentage: number;
  matchingHeadingsCount: number;
  totalHeadingsA: number;
  totalHeadingsB: number;
  identicalSequence: boolean;
  notes: string[];
}

export interface MatchedSourceSummary {
  id: string;
  name: string;
  type: SourceType;
  url?: string;
  author?: string;
  matchedPercentage: number;
  matchedWords: number;
  evidenceLevel: EvidenceCategory;
}

export interface AnalysisResult {
  submissionId: string;
  similarity: {
    overallPercentage: number;
    breakdown: EvidenceBreakdown;
    exactSimilarity: number;
    shingleSimilarity: number;
    fuzzySimilarity: number;
    semanticSimilarity: number;
    structuralSimilarity: number;
    weightedSimilarity: number;
    evidenceLevel: EvidenceCategory;
    confidence: number;
  };
  sources: MatchedSourceSummary[];
  passages: AlignedPassage[];
  studentComparisons: StudentComparisonResult[];
  citations?: CitationAnalysisResult | undefined;
  structuralEvidence: StructuralEvidenceItem;
  aiWritingAnalysis: AIWritingAnalysisResult;
  evidenceSummary: string[];
  processingMetadata: ProcessingMetadata;
}

export type ReviewStatus =
  | "pending"
  | "in_review"
  | "explanation_requested"
  | "explanation_received"
  | "reviewed"
  | "dismissed"
  | "escalated";

export type ReviewDecision =
  | "cleared_no_action"
  | "acceptable_citations"
  | "minor_amendments_required"
  | "explanation_satisfactory"
  | "explanation_unsatisfactory"
  | "academic_misconduct_verified"
  | "not_substantiated"
  | "requires_further_review";

export type ReviewedPassageStatus =
  | "cleared"
  | "verified_plagiarism"
  | "cited_or_common"
  | "pending_explanation";

export interface ReviewedPassageRecord {
  passage_id: string;
  status: ReviewedPassageStatus;
  reviewer_notes?: string | undefined;
  reviewed_at: string;
}

export interface SubmissionReview {
  id: string;
  submission_id: string;
  reviewer_id?: string | undefined;
  reviewer_name: string;
  status: ReviewStatus;
  decision?: ReviewDecision | undefined;
  decision_rationale?: string | undefined;
  faculty_notes?: string | undefined;
  reviewed_passages?: ReviewedPassageRecord[] | undefined;
  student_explanation_request?: string | undefined;
  student_explanation_requested_at?: string | undefined;
  student_explanation_response?: string | undefined;
  student_explanation_received_at?: string | undefined;
  created_at: string;
  updated_at: string;
}

export type ReviewAuditAction =
  | "REVIEW_PENDING"
  | "PASSAGE_REVIEWED"
  | "EXPLANATION_REQUESTED"
  | "EXPLANATION_RECEIVED"
  | "DECISION_RECORDED"
  | "NOTES_UPDATED"
  | "STATUS_TRANSITION"
  | "RE_ANALYZED";

export interface ReviewAuditEntry {
  id: string;
  submission_id: string;
  review_id?: string | undefined;
  actor_id?: string | undefined;
  actor_name: string;
  actor_role: "faculty" | "student" | "admin" | "system";
  action: ReviewAuditAction;
  previous_status?: string | undefined;
  new_status?: string | undefined;
  notes?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  created_at: string;
}

export type NotificationType =
  | "review_started"
  | "explanation_requested"
  | "explanation_received"
  | "review_completed"
  | "faculty_feedback"
  | "system_update";

export interface StudentNotification {
  id: string;
  student_id: string;
  submission_id: string;
  assignment_id?: string | undefined;
  assignment_title?: string | undefined;
  course_code?: string | undefined;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string | undefined;
  created_at: string;
  read_at?: string | undefined;
}

