import type { SourceType, UserRole } from "@/types/database";
import type { AlignedPassage } from "@/types/database";

export type ProviderCategory =
  | "internal_student_corpus"
  | "institutional_repository"
  | "local_reference_corpus"
  | "public_web"
  | "academic_open_access";

export type MetadataQuality = "high" | "medium" | "low";

/**
 * Normalized representation of any candidate or matched source across all providers.
 */
export interface NormalizedSourceRecord {
  /** Unique stable identifier or checksum */
  identifier: string;
  /** Internal provider ID that discovered or hosts this source */
  providerId: string;
  /** High-level provider category */
  providerCategory: ProviderCategory;
  /** Normalized source type matching database enum */
  sourceType: SourceType;
  /** Title of the paper, document, or web page */
  title: string;
  /** Author name(s) if identified */
  author?: string | undefined;
  /** Publication date or year string */
  publicationDate?: string | undefined;
  /** Canonical or reference URL */
  url?: string | undefined;
  /** Domain name (e.g. mit.edu, arxiv.org) */
  domain?: string | undefined;
  /** Abstract or text snippet for rapid preview */
  snippet?: string | undefined;
  /** When this source record was indexed or retrieved */
  retrievedAt: string;
  /** Whether full text content is available for passage alignment */
  contentAvailable: boolean;
  /** Full text of the source document if available */
  text?: string | undefined;
  /** SHA-256 content checksum for deduplication */
  checksum?: string | undefined;
  /** Subject/course/institution scope annotations */
  scope?: {
    institutionId?: string | undefined;
    courseId?: string | undefined;
    departmentId?: string | undefined;
    isRestricted?: boolean | undefined;
  } | undefined;
  /** Estimated metadata quality */
  metadataQuality: MetadataQuality;
  /** Extra arbitrary metadata */
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Authorization and query context for candidate discovery.
 */
export interface SourceSearchQuery {
  /** Complete or partial text of the submission being checked */
  text: string;
  /** Pre-extracted distinctive n-grams and technical search phrases */
  distinctivePhrases?: string[] | undefined;
  /** Active submission ID to exclude from its own source corpus */
  excludeSubmissionId?: string | undefined;
  /** Submitting student profile ID */
  submittingStudentId?: string | undefined;
  /** Enrolled course ID for cohort isolation */
  courseId?: string | undefined;
  /** Institution ID for cross-institution isolation */
  institutionId?: string | undefined;
  /** Requesting user's role (enforces privacy boundaries) */
  userRole?: UserRole | undefined;
  /** Requesting user profile ID */
  requestingUserId?: string | undefined;
  /** Maximum candidate sources to retrieve from this provider */
  maxCandidates?: number | undefined;
}

/**
 * Health and operational status of a source provider.
 */
export interface ProviderHealthStatus {
  providerId: string;
  name: string;
  category: ProviderCategory;
  available: boolean;
  isOfflineCapable: boolean;
  sourceCount?: number | undefined;
  message?: string | undefined;
  latencyMs?: number | undefined;
}

/**
 * Common unified interface implemented by all source discovery providers.
 */
export interface UnifiedSourceProvider {
  readonly id: string;
  readonly name: string;
  readonly category: ProviderCategory;

  /**
   * Search for candidate sources matching query text or distinctive phrases.
   * Isolated: MUST NOT throw unhandled exceptions across network or DB failures.
   */
  searchCandidates(query: SourceSearchQuery): Promise<NormalizedSourceRecord[]>;

  /**
   * Retrieve full source document by identifier.
   */
  getSource(identifier: string): Promise<NormalizedSourceRecord | null>;

  /**
   * Health and availability check.
   */
  health(): Promise<ProviderHealthStatus>;
}

/**
 * Detailed match record produced when candidate source is evaluated by similarity engine.
 */
export interface SourceCandidateMatchRecord {
  submissionId: string;
  sourceId: string;
  sourceType: SourceType;
  provider: string;
  providerCategory: ProviderCategory;
  sourceTitle: string;
  author?: string | undefined;
  url?: string | undefined;
  domain?: string | undefined;
  sourceIdentifier: string;
  checksum?: string | undefined;
  similarityPercentage: number;
  evidenceLevel: "strong" | "moderate" | "weak";
  confidence: number;
  matchedPassages: AlignedPassage[];
  matchedWordCount: number;
  matchedShingleCount: number;
  exactMatchPercentage: number;
  fuzzyMatchPercentage: number;
  semanticMatchPercentage: number;
  firstMatchedPosition?: number | undefined;
  lastMatchedPosition?: number | undefined;
  retrievedAt: string;
}
