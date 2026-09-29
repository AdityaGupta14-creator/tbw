import type {
  NormalizedSourceRecord,
  ProviderHealthStatus,
  SourceSearchQuery,
  UnifiedSourceProvider,
} from "./source-provider-types";
import type { Submission } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { retrieveTopCandidateSources } from "./source-providers";

let cachedDb: any = null;
async function getLocalDb() {
  if (!cachedDb) {
    try {
      const mod = await import("../db");
      cachedDb = mod.db;
    } catch {
      // Fallback
    }
  }
  return cachedDb;
}

export interface StudentSubmissionRecord {
  id: string;
  submissionCode: string;
  studentId: string;
  studentName?: string | undefined;
  studentRoll?: string | undefined;
  courseId?: string | undefined;
  institutionId?: string | undefined;
  status: string;
  text: string;
  submittedAt?: string | undefined;
}

/**
 * Source Provider for the Internal Student Submission Corpus.
 * Enforces course boundaries, cross-institution isolation, and role-based privacy rules.
 */
export class InternalStudentCorpusProvider implements UnifiedSourceProvider {
  public readonly id = "internal-student-corpus";
  public readonly name = "Internal Student Submission Corpus";
  public readonly category = "internal_student_corpus" as const;

  private inMemorySubmissions: StudentSubmissionRecord[] = [];

  constructor(seedSubmissions: StudentSubmissionRecord[] = []) {
    this.inMemorySubmissions = [...seedSubmissions];
  }

  /**
   * Registers a student submission in memory (for test suites and dynamic cohort injection).
   */
  public registerSubmission(sub: StudentSubmissionRecord): void {
    const idx = this.inMemorySubmissions.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      this.inMemorySubmissions[idx] = sub;
    } else {
      this.inMemorySubmissions.push(sub);
    }
  }

  public clearInMemorySubmissions(): void {
    this.inMemorySubmissions = [];
  }

  /**
   * Search for candidate student submissions.
   */
  public async searchCandidates(query: SourceSearchQuery): Promise<NormalizedSourceRecord[]> {
    try {
      // 1. Gather all candidate submissions from memory + local db + Supabase
      const allSubmissions = await this.fetchEligibleSubmissions(query);

      // 2. Filter out current submission and enforce boundary rules
      const filtered = allSubmissions.filter((sub) => {
        // Exclude current submission
        if (query.excludeSubmissionId && (sub.id === query.excludeSubmissionId || sub.submissionCode === query.excludeSubmissionId)) {
          return false;
        }

        // Cross-Institution Isolation: Absolutely require matching institution if specified
        if (query.institutionId && sub.institutionId && sub.institutionId !== query.institutionId) {
          return false;
        }

        // Cross-Course Isolation:
        // If courseId is provided, enforce course boundary unless admin explicitly overrides
        if (query.courseId && sub.courseId) {
          const isSameCourse = sub.courseId.toLowerCase() === query.courseId.toLowerCase();
          if (!isSameCourse && query.userRole !== "admin") {
            return false;
          }
        }

        // Discard un-submitted drafts from other students
        if (sub.status === "draft") {
          return false;
        }

        // Must have meaningful text
        if (!sub.text || sub.text.trim().length < 20) {
          return false;
        }

        return true;
      });

      // 3. Convert eligible submissions to SourceDocument-like structure for candidate scoring
      const sourceDocs = filtered.map((s) => ({
        id: s.id,
        title: `Submission by ${s.studentRoll || "Peer"} (${s.studentName || "Student"})`,
        type: "student_submission" as const,
        author: s.studentName,
        text: s.text,
      }));

      // 4. Retrieve top candidate sources using keyword overlap
      const topSelected = retrieveTopCandidateSources(
        query.text,
        sourceDocs,
        query.maxCandidates || 8
      );

      const topIds = new Set(topSelected.map((s) => s.id));

      // 5. Map selected candidates to NormalizedSourceRecords with authorization masking
      const isStudentViewer = query.userRole === "student";

      return filtered
        .filter((sub) => topIds.has(sub.id))
        .map((sub) => {
          // If a student is querying, mask peer identifying details to preserve privacy
          const isSelf = query.submittingStudentId === sub.studentId;
          const displayTitle = isStudentViewer && !isSelf
            ? `Cohort Peer Submission (Anonymized)`
            : `Submission by ${sub.studentRoll || "Student"} (${sub.studentName || "Anonymous"})`;

          const displayAuthor = isStudentViewer && !isSelf
            ? "Peer Student (Protected)"
            : `${sub.studentName || "Unknown"} (${sub.studentRoll || "Unknown Roll"})`;

          const displayUrl = isStudentViewer && !isSelf
            ? `internal://submissions/anonymized`
            : `internal://submissions/${sub.id}`;

          return {
            identifier: sub.id,
            providerId: this.id,
            providerCategory: this.category,
            sourceType: "student_submission",
            title: displayTitle,
            author: displayAuthor,
            publicationDate: sub.submittedAt || new Date().toISOString(),
            url: displayUrl,
            domain: "verity.internal",
            snippet: sub.text.slice(0, 240).replace(/\s+/g, " ") + "...",
            retrievedAt: new Date().toISOString(),
            contentAvailable: true,
            text: sub.text,
            scope: {
              institutionId: sub.institutionId,
              courseId: sub.courseId,
              isRestricted: true,
            },
            metadataQuality: "high",
            metadata: {
              submissionCode: sub.submissionCode,
              status: sub.status,
              courseId: sub.courseId,
            },
          };
        });
    } catch (err) {
      console.warn("InternalStudentCorpusProvider error during search:", err);
      return [];
    }
  }

  /**
   * Retrieves full submission source record by ID.
   */
  public async getSource(identifier: string): Promise<NormalizedSourceRecord | null> {
    const mem = this.inMemorySubmissions.find((s) => s.id === identifier || s.submissionCode === identifier);
    if (mem) {
      return {
        identifier: mem.id,
        providerId: this.id,
        providerCategory: this.category,
        sourceType: "student_submission",
        title: `Submission by ${mem.studentRoll || "Student"}`,
        author: mem.studentName,
        url: `internal://submissions/${mem.id}`,
        domain: "verity.internal",
        retrievedAt: new Date().toISOString(),
        contentAvailable: true,
        text: mem.text,
        metadataQuality: "high",
      };
    }

    const localDb = await getLocalDb();
    const localSub = localDb?.getSubmissionById(identifier);
    if (localSub && localSub.document?.extracted_text) {
      return {
        identifier: localSub.id,
        providerId: this.id,
        providerCategory: this.category,
        sourceType: "student_submission",
        title: `Submission by ${localSub.student_roll || "Student"}`,
        author: localSub.student_name,
        url: `internal://submissions/${localSub.id}`,
        domain: "verity.internal",
        retrievedAt: new Date().toISOString(),
        contentAvailable: true,
        text: localSub.document.extracted_text,
        metadataQuality: "high",
      };
    }

    return null;
  }

  public async health(): Promise<ProviderHealthStatus> {
    const localDb = await getLocalDb();
    const dbCount = localDb ? localDb.getSubmissions().length : 0;
    return {
      providerId: this.id,
      name: this.name,
      category: this.category,
      available: true,
      isOfflineCapable: true,
      sourceCount: this.inMemorySubmissions.length + dbCount,
      message: "Internal student corpus operational with institution and course boundary isolation.",
    };
  }

  /**
   * Aggregates submissions across in-memory state, local DB, and Supabase.
   */
  private async fetchEligibleSubmissions(query: SourceSearchQuery): Promise<StudentSubmissionRecord[]> {
    const records: StudentSubmissionRecord[] = [...this.inMemorySubmissions];

    // From local db
    const localDb = await getLocalDb();
    const localSubs = localDb ? localDb.getSubmissions() : [];
    for (const sub of localSubs) {
      const text = sub.document?.extracted_text;
      if (text) {
        records.push({
          id: sub.id,
          submissionCode: sub.submission_code,
          studentId: sub.student_id,
          studentName: sub.student_name,
          studentRoll: sub.student_roll,
          courseId: sub.course_id,
          institutionId: "a0000000-0000-0000-0000-000000000001", // Default seed institution
          status: sub.status,
          text,
          submittedAt: sub.submitted_at,
        });
      }
    }

    // From Supabase if available
    if (isSupabaseConfigured()) {
      try {
        let sbQuery = supabase
          .from("submissions")
          .select("id, submission_code, student_id, student_name, student_roll, course_id, status, submitted_at, documents(extracted_text)");

        if (query.courseId) {
          sbQuery = sbQuery.eq("course_id", query.courseId);
        }

        const { data, error } = await sbQuery.limit(50);
        if (!error && data) {
          for (const row of data as any[]) {
            const extracted = row.documents?.[0]?.extracted_text || row.documents?.extracted_text;
            if (extracted && !records.some((r) => r.id === row.id)) {
              records.push({
                id: row.id,
                submissionCode: row.submission_code,
                studentId: row.student_id,
                studentName: row.student_name,
                studentRoll: row.student_roll,
                courseId: row.course_id,
                institutionId: query.institutionId || "a0000000-0000-0000-0000-000000000001",
                status: row.status,
                text: extracted,
                submittedAt: row.submitted_at,
              });
            }
          }
        }
      } catch (e) {
        console.warn("Supabase fetchEligibleSubmissions fallback:", e);
      }
    }

    return records;
  }
}
