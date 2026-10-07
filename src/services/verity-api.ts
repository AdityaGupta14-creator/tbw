import { db } from "@/lib/backend/db";
import {
  compareTwoDocuments,
  runSimilarityAnalysis,
  runFullAcademicIntegrityAnalysis,
} from "@/lib/backend/similarity-engine";
import { analyzeIeeeCitations } from "@/lib/backend/citation-engine";
import { processUploadedDocument } from "@/lib/backend/document-processor";
import { runSimilarityBenchmark } from "@/lib/backend/similarity-benchmark";
import {
  processSubmissionDocument,
  validateDocumentFile,
} from "@/lib/backend/submission-analysis-service";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Assignment,
  Course,
  Department,
  FeedbackRecord,
  NotificationType,
  Profile,
  ReviewAuditEntry,
  ReviewDecision,
  ReviewedPassageRecord,
  ReviewedPassageStatus,
  ReviewStatus,
  StudentNotification,
  Submission,
  SubmissionReview,
  UserRole,
} from "@/types/database";
import {
  generateAcademicAuditReportPdf,
  type PdfReportOptions,
} from "@/lib/backend/reports/pdf-audit-report-generator";
import { sanitizeSubmissionForRole } from "@/lib/backend/authorization";

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

export const verityApi = {
  // Authentication & Profile
  auth: {
    async getCurrentUser(): Promise<Profile> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "faculty")
            .limit(1)
            .maybeSingle();
          if (data) return data as Profile;
        } catch (e) {
          console.warn("Supabase getCurrentUser fallback:", e);
        }
      }
      return db.getCurrentUser();
    },
    async switchRole(role: UserRole): Promise<Profile> {
      if (isSupabaseConfigured()) {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", role)
            .limit(1)
            .maybeSingle();
          if (data) {
            db.switchRole(role);
            return data as Profile;
          }
        } catch (e) {
          console.warn("Supabase switchRole fallback:", e);
        }
      }
      return db.switchRole(role);
    },
  },

  // Courses Management
  courses: {
    async list(): Promise<Course[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("courses")
            .select("*")
            .order("course_code", { ascending: true });
          if (!error && data && data.length > 0) {
            return data as Course[];
          }
        } catch (e) {
          console.warn("Supabase courses.list fallback:", e);
        }
      }
      return db.getCourses();
    },

    async get(id: string): Promise<Course | undefined> {
      if (isSupabaseConfigured()) {
        try {
          let query = supabase.from("courses").select("*");
          if (isUuid(id)) {
            query = query.or(`id.eq.${id},course_code.ilike.${id}`);
          } else {
            query = query.ilike("course_code", id);
          }
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            return data as Course;
          }
        } catch (e) {
          console.warn("Supabase courses.get fallback:", e);
        }
      }
      return db.getCourseById(id);
    },

    async create(data: {
      course_code: string;
      name: string;
      department_id?: string;
      section: string;
      semester: string;
      academic_year: string;
      description?: string;
    }): Promise<Course> {
      const localCourse = db.createCourse(data);

      if (isSupabaseConfigured()) {
        try {
          const newCourse = {
            course_code: data.course_code,
            name: data.name,
            department_id: data.department_id || "d0000000-0000-0000-0000-000000000001",
            department_name: "Computer Engineering",
            institution_id: "a0000000-0000-0000-0000-000000000001",
            section: data.section || "A",
            semester: data.semester || "Autumn",
            academic_year: data.academic_year || "2026–27",
            description: data.description || "",
            faculty_id: "b0000000-0000-0000-0000-000000000001",
            faculty_name: "Dr. P. Kulkarni",
            student_count: 64,
            assignment_count: 0,
            pending_count: 0,
            pending_reviews: 0,
          };

          const { data: inserted, error } = await supabase
            .from("courses")
            .insert(newCourse)
            .select()
            .single();

          if (!error && inserted) {
            return inserted as Course;
          }
        } catch (e) {
          console.warn("Supabase courses.create error:", e);
        }
      }

      return localCourse;
    },
  },

  // Assignments Management
  assignments: {
    async list(courseId?: string): Promise<Assignment[]> {
      if (isSupabaseConfigured()) {
        try {
          let query = supabase
            .from("assignments")
            .select("*")
            .order("created_at", { ascending: false });

          if (courseId) {
            if (isUuid(courseId)) {
              query = query.or(`course_id.eq.${courseId},course_code.ilike.${courseId}`);
            } else {
              query = query.ilike("course_code", courseId);
            }
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            return data.map((a: any) => {
              const citation_style = a.citation_style === "Other" ? "Normal" : (a.citation_style || "Normal");
              let subject = a.subject;
              let batch = a.batch || "All Batches";
              if (!subject && a.description) {
                const subMatch = a.description.match(/\[Subject:\s*([^\]]+)\]/i);
                if (subMatch) subject = subMatch[1].trim();
                const batchMatch = a.description.match(/\[Batch:\s*([^\]]+)\]/i);
                if (batchMatch) batch = batchMatch[1].trim();
              }
              return {
                ...a,
                citation_style,
                subject: subject || a.subject || "Data Structures",
                batch,
              } as Assignment;
            });
          }
        } catch (e) {
          console.warn("Supabase assignments.list fallback:", e);
        }
      }
      return db.getAssignments(courseId);
    },

    async get(id: string): Promise<Assignment | undefined> {
      if (isSupabaseConfigured()) {
        try {
          let query = supabase.from("assignments").select("*");
          if (isUuid(id)) {
            query = query.eq("id", id);
          } else {
            query = query.ilike("title", `%${id}%`);
          }
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            const citation_style = data.citation_style === "Other" ? "Normal" : (data.citation_style || "Normal");
            let subject = (data as any).subject;
            let batch = (data as any).batch || "All Batches";
            if (!subject && data.description) {
              const subMatch = data.description.match(/\[Subject:\s*([^\]]+)\]/i);
              if (subMatch) subject = subMatch[1].trim();
              const batchMatch = data.description.match(/\[Batch:\s*([^\]]+)\]/i);
              if (batchMatch) batch = batchMatch[1].trim();
            }
            return {
              ...data,
              citation_style,
              subject: subject || "Data Structures",
              batch,
            } as Assignment;
          }
        } catch (e) {
          console.warn("Supabase assignments.get fallback:", e);
        }
      }
      return db.getAssignmentById(id);
    },

    async create(data: Partial<Assignment>): Promise<Assignment> {
      const localAsg = db.createAssignment(data);

      if (isSupabaseConfigured()) {
        try {
          let courseId = data.course_id;
          let courseCode = data.course_code || "EXCS-B";
          let courseName = data.course_name || "Data Structures";

          if (!isUuid(courseId || "")) {
            const { data: crs } = await supabase
              .from("courses")
              .select("id, course_code, name")
              .or(`course_code.ilike.${courseId},id.ilike.${courseId}`)
              .limit(1)
              .maybeSingle();
            if (crs) {
              courseId = crs.id;
              courseCode = crs.course_code;
              courseName = crs.name;
            } else {
              courseId = "c0000000-0000-0000-0000-000000000005";
            }
          }

          let parsedDue = new Date(Date.now() + 7 * 86400000).toISOString();
          if (data.due_date) {
            const parsed = new Date(data.due_date);
            if (!isNaN(parsed.getTime())) {
              parsedDue = parsed.toISOString();
            }
          }

          const supabaseCitationStyle =
            data.citation_style === "Normal"
              ? "Other"
              : data.citation_style || "Other";

          const subjectTag = data.subject ? `[Subject: ${data.subject}] ` : "";
          const batchTag = data.batch ? `[Batch: ${data.batch}] ` : "";
          const fullDescription = `${subjectTag}${batchTag}${data.description || ""}`.trim();

          const newAssignment = {
            course_id: courseId,
            course_code: courseCode,
            course_name: courseName,
            created_by: "b0000000-0000-0000-0000-000000000001",
            title: data.title || "Untitled Assignment",
            description: fullDescription,
            assignment_type: data.assignment_type || "Technical Report",
            due_date: parsedDue,
            max_marks: data.max_marks || 100,
            word_limit: data.word_limit || 2000,
            page_limit: data.page_limit || 8,
            citation_style: supabaseCitationStyle,
            enable_similarity: data.enable_similarity ?? true,
            enable_student_comparison: data.enable_student_comparison ?? true,
            enable_citation_analysis: data.enable_citation_analysis ?? true,
            enable_revision_history: data.enable_revision_history ?? true,
            enable_writing_pattern_analysis: data.enable_writing_pattern_analysis ?? true,
            submitted_count: 0,
            total_students: 5,
            avg_similarity: 0,
            pending_count: 0,
          };

          const { data: inserted, error } = await supabase
            .from("assignments")
            .insert(newAssignment)
            .select()
            .single();

          if (error) {
            console.error("Supabase assignments.create error:", error);
            throw new Error(error.message);
          }

          if (inserted) {
            const ret = {
              ...inserted,
              subject: data.subject || "Data Structures",
              batch: data.batch || "All Batches",
              citation_style: data.citation_style || "Normal",
            };
            db.createAssignment(ret);
            return ret as Assignment;
          }
        } catch (e: any) {
          console.warn("Supabase assignments.create error:", e);
          throw e;
        }
      }

      return localAsg;
    },

    async delete(id: string): Promise<boolean> {
      if (isSupabaseConfigured()) {
        try {
          // Verify ID exists or look up by fallback mock aliases if needed
          let targetId = id;
          if (!isUuid(id)) {
             // Let's rely on simple string match or not support mock ID deletions remotely.
             // We can just query supabase to find if it exists
             const { data: existing } = await supabase.from("assignments").select("id").eq("id", id).maybeSingle();
             if (existing) targetId = existing.id;
          }
          const { error } = await supabase.from("assignments").delete().eq("id", targetId);
          if (error) {
            console.error("Supabase assignments.delete error:", error);
            throw new Error(error.message);
          }
        } catch (e: any) {
          console.warn("Supabase assignments.delete fallback:", e);
          throw e;
        }
      }
      return true; // We always succeed locally as mock DB isn't fully persistent for deletes across sessions
    },
  },

  // Submissions Workflow
  submissions: {
    async list(filters?: {
      courseCode?: string;
      status?: string;
      studentId?: string;
    }): Promise<Submission[]> {
      if (isSupabaseConfigured()) {
        try {
          let query = supabase
            .from("submissions")
            .select("*, student:profiles!student_id(full_name, roll_number), assignment:assignments!assignment_id(title), document:documents(*), analysis:analyses(*)")
            .order("submitted_at", { ascending: false });

          if (filters?.courseCode && filters.courseCode !== "All courses") {
            query = query.eq("course_code", filters.courseCode);
          }
          if (filters?.status && filters.status !== "All statuses") {
            query = query.eq("status", filters.status);
          }
          if (filters?.studentId) {
            query = query.or(
              `student_id.eq.${filters.studentId},student_roll.eq.${filters.studentId}`
            );
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            return data.map((sub: any) => ({
              ...sub,
              assignment_title: sub.assignment?.title || sub.assignment_title || "Technical Report",
              student_name: sub.student?.full_name || sub.student_name || "Student",
              student_roll: sub.student?.roll_number || sub.student_roll || "25108B0071",
            })) as Submission[];
          }
        } catch (e) {
          console.warn("Supabase submissions.list fallback:", e);
        }
      }
      return db.getSubmissions(filters);
    },

    async get(id: string): Promise<Submission | undefined> {
      if (isSupabaseConfigured()) {
        try {
          let query = supabase
            .from("submissions")
            .select(
              "*, student:profiles!student_id(full_name, roll_number), document:documents(*), analysis:analyses(*, matches:similarity_matches(*)), feedback:feedback(*)"
            );

          if (isUuid(id)) {
            query = query.or(`id.eq.${id},submission_code.ilike.${id}`);
          } else {
            query = query.ilike("submission_code", id);
          }

          const { data, error } = await query.maybeSingle();
          const localExisting = db.getSubmissionById(id);
          if (!error && data) {
            const doc = Array.isArray(data.document) ? data.document[0] : data.document;
            const rawAna = Array.isArray(data.analysis) ? data.analysis[0] : data.analysis;
            const ana = rawAna ? {
              ...rawAna,
              ai_writing_analysis: rawAna.ai_writing_analysis || rawAna.evidence_breakdown?.ai_writing_analysis,
              student_comparisons: rawAna.student_comparisons || rawAna.evidence_breakdown?.student_comparisons,
              transparent_breakdown: rawAna.transparent_breakdown || rawAna.evidence_breakdown?.transparent_breakdown,
            } : null;
            const fb = Array.isArray(data.feedback)
              ? data.feedback
              : data.feedback
              ? [data.feedback]
              : [];

            const completeSub: Submission = {
              ...(data as any),
              student_name: data.student?.full_name || data.student_name || localExisting?.student_name,
              student_roll: data.student?.roll_number || data.student_roll || localExisting?.student_roll,
              document: doc || localExisting?.document || null,
              analysis: (ana && ana.status) ? ana : (localExisting?.analysis || null),
              feedback: fb.length > 0 ? fb : (localExisting?.feedback || []),
              review: localExisting?.review || undefined,
              review_audit: localExisting?.review_audit || [],
            };

            // Cache in local in-memory DB so other components have instantaneous access
            db.addSubmission(completeSub);

            return completeSub;
          }
        } catch (e) {
          console.warn("Supabase submissions.get fallback:", e);
        }
      }
      return db.getSubmissionById(id);
    },

    async getByStudentAndAssignment(
      studentIdOrRoll: string,
      assignmentIdOrTitle: string
    ): Promise<Submission | undefined> {
      const all = await verityApi.submissions.list();
      const match = all.find((s) => {
        const matchesStudent =
          (s.student_id && s.student_id.toLowerCase() === studentIdOrRoll.toLowerCase()) ||
          (s.student_roll && s.student_roll.toLowerCase() === studentIdOrRoll.toLowerCase()) ||
          (s.student_name && s.student_name.toLowerCase() === studentIdOrRoll.toLowerCase());
        const matchesAssignment =
          (s.assignment_id && s.assignment_id.toLowerCase() === assignmentIdOrTitle.toLowerCase()) ||
          (s.assignment_title && s.assignment_title.toLowerCase() === assignmentIdOrTitle.toLowerCase());
        return matchesStudent && matchesAssignment;
      });
      if (match) {
        return verityApi.submissions.get(match.id);
      }
      return undefined;
    },

    async submit(params: {
      assignmentId: string;
      file: File;
      studentId?: string | undefined;
      studentRoll?: string | undefined;
      studentName?: string | undefined;
      onProgress?: ((stage: string) => void) | undefined;
    }): Promise<Submission> {
      // 1. First validate document file constraints
      const validation = validateDocumentFile(params.file);
      if (!validation.valid) {
        throw new Error(validation.error || "Invalid file format or size.");
      }

      // Generate receipt
      const submissionCode = `SUB-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const storagePath = `submissions/${submissionCode}/${params.file.name}`;

      // Resolve assignment details
      let asgId = params.assignmentId;
      let asgTitle = "Technical Report 02";
      let courseId = "c0000000-0000-0000-0000-000000000001";
      let courseCode = "ENG-CSE-301";

      if (isSupabaseConfigured()) {
        try {
          if (isUuid(asgId)) {
            const { data: asg } = await supabase
              .from("assignments")
              .select("id, title, course_id, course_code")
              .eq("id", asgId)
              .maybeSingle();
            if (asg) {
              asgId = asg.id;
              asgTitle = asg.title;
              courseId = asg.course_id || courseId;
              courseCode = asg.course_code || courseCode;
            }
          } else {
            const { data: asg } = await supabase
              .from("assignments")
              .select("id, title, course_id, course_code")
              .or(`id.ilike.%${asgId}%,title.ilike.%${asgId}%,course_code.ilike.%${asgId}%`)
              .limit(1)
              .maybeSingle();
            if (asg) {
              asgId = asg.id;
              asgTitle = asg.title;
              courseId = asg.course_id || courseId;
              courseCode = asg.course_code || courseCode;
            }
          }
        } catch (e) {
          console.warn("Assignment resolution error:", e);
        }
      }

      let studentId = params.studentId || "b0000000-0000-0000-0000-000000000002";
      let studentName = params.studentName || "Riya Sharma";
      let studentRoll = params.studentRoll || "22CSE057";

      if (isSupabaseConfigured()) {
        try {
          if (params.studentRoll) {
            const { data: st } = await supabase
              .from("profiles")
              .select("id, full_name, roll_number")
              .eq("roll_number", params.studentRoll)
              .maybeSingle();
            if (st) {
              studentId = st.id;
              studentName = params.studentName || st.full_name || studentName;
              studentRoll = st.roll_number || studentRoll;
            }
          } else if (params.studentName) {
            const { data: st } = await supabase
              .from("profiles")
              .select("id, full_name, roll_number")
              .ilike("full_name", `%${params.studentName}%`)
              .maybeSingle();
            if (st) {
              studentId = st.id;
              studentName = st.full_name || studentName;
              studentRoll = st.roll_number || studentRoll;
            }
          }
        } catch (e) {
          console.warn("Student profile resolution error:", e);
        }
      }

      // Record in local in-memory DB (or fallback)
      const localResult = await db.submitDocument({
        ...params,
        studentId: studentId,
      });

      // In Supabase, record submission in 'processing' state first
      let subRow: any = null;
      if (isSupabaseConfigured()) {
        try {
          // Attempt file upload to storage
          try {
            await supabase.storage
              .from("submission-documents")
              .upload(storagePath, params.file, { upsert: true });
          } catch (storageErr) {
            console.warn("Storage upload non-fatal warning:", storageErr);
          }

          const { data: insertedSub, error: subErr } = await supabase
            .from("submissions")
            .insert({
              submission_code: submissionCode,
              assignment_id: isUuid(asgId) ? asgId : "e0000000-0000-0000-0000-000000000001",
              assignment_title: asgTitle,
              course_id: courseId,
              course_code: courseCode,
              student_id: studentId,
              student_name: studentName,
              student_roll: studentRoll,
              version_number: 1,
              status: "processing",
              submitted_at: new Date().toISOString(),
              is_final: true,
              similarity_percentage: 0,
              matched_source_count: 0,
              citation_issue_count: 0,
              drafts_count: 1,
            })
            .select()
            .single();

          if (!subErr && insertedSub) {
            subRow = { ...insertedSub, assignment_id: asgId };
          }
        } catch (e) {
          console.warn("Supabase initial submission insert error:", e);
        }
      }

      // Execute full submission processing via submission-analysis-service
      const output = await processSubmissionDocument({
        submissionId: subRow?.id || localResult.id,
        submissionCode,
        assignmentId: asgId,
        assignmentTitle: asgTitle,
        courseId,
        courseCode,
        studentId,
        studentName,
        studentRoll,
        file: params.file,
        onProgress: params.onProgress,
      });

      if (isSupabaseConfigured() && subRow) {
        try {
          if (output.success && output.analysis) {
            // Upsert Document
            const { data: docRow } = await supabase
              .from("documents")
              .upsert(
                {
                  submission_id: subRow.id,
                  file_name: output.document.fileName,
                  file_type: output.document.fileType,
                  file_size: output.document.fileSize,
                  storage_path: storagePath,
                  extracted_text: output.document.extractedText,
                  page_count: output.document.pageCount,
                  word_count: output.document.wordCount,
                  paragraphs: output.document.paragraphs,
                },
                { onConflict: "submission_id" }
              )
              .select()
              .maybeSingle();

            // Upsert Analysis
            const { data: anaRow } = await supabase
              .from("analyses")
              .upsert(
                {
                  submission_id: subRow.id,
                  status: "completed",
                  similarity_percentage: output.analysis.similarity_percentage,
                  matched_source_count: output.analysis.matched_source_count,
                  student_overlap_percentage: output.analysis.student_overlap_percentage,
                  citation_issue_count: output.analysis.citation_issue_count,
                  writing_pattern_status: output.analysis.writing_pattern_status,
                  structural_similarity_percentage: output.analysis.structural_similarity_percentage,
                  evidence_breakdown: {
                    ...(output.analysis.evidence_breakdown || {}),
                    ai_writing_analysis: output.analysis.ai_writing_analysis,
                    student_comparisons: output.analysis.student_comparisons,
                    transparent_breakdown: output.analysis.transparent_breakdown,
                  },
                  passages: output.analysis.passages,
                  citation_analysis: output.analysis.citation_analysis,
                  completed_at: output.analysis.completed_at,
                },
                { onConflict: "submission_id" }
              )
              .select()
              .maybeSingle();

            // Insert granular matches
            if (anaRow && output.analysis.matches.length > 0) {
              await supabase.from("similarity_matches").delete().eq("analysis_id", anaRow.id);
              const matchRows = output.analysis.matches.map((m) => ({
                analysis_id: anaRow.id,
                source_type: m.source_type || "web",
                source_name: m.source_name,
                source_title: m.source_title || null,
                source_url: m.source_url || null,
                matched_text: (m.matched_text || "").replace(/\0/g, ""),
                source_matched_text: m.source_matched_text
                  ? m.source_matched_text.replace(/\0/g, "")
                  : null,
                similarity_percentage: m.similarity_percentage,
                exact_similarity: m.exact_similarity ?? null,
                fuzzy_similarity: m.fuzzy_similarity ?? null,
                semantic_similarity: m.semantic_similarity ?? null,
                evidence_level: m.evidence_level || "moderate",
                matched_words: m.matched_words || 0,
                matched_shingle_sizes: m.matched_shingle_sizes || [4],
                is_quoted: m.is_quoted || false,
                is_common_technical_phrase: m.is_common_technical_phrase || false,
              }));

              await supabase.from("similarity_matches").insert(matchRows);
            }

            // Update submission status
            const { data: updatedSub } = await supabase
              .from("submissions")
              .update({
                status: output.status,
                similarity_percentage: output.analysis.similarity_percentage,
                matched_source_count: output.analysis.matched_source_count,
                citation_issue_count: output.analysis.citation_issue_count,
              })
              .eq("id", subRow.id)
              .select()
              .single();

            const completeSubmission: Submission = {
              ...(updatedSub || subRow || localResult),
              assignment_id: asgId,
              student_name: studentName,
              student_roll: studentRoll,
              document: docRow || localResult.document || undefined,
              analysis: (anaRow && anaRow.status) ? { ...anaRow, matches: output.analysis.matches } : localResult.analysis,
            };

            db.addSubmission(completeSubmission);
            return completeSubmission;
          } else {
            // Update to failed state
            await supabase
              .from("submissions")
              .update({ status: "failed" })
              .eq("id", subRow.id);

            await supabase
              .from("analyses")
              .upsert(
                {
                  submission_id: subRow.id,
                  status: "failed",
                  similarity_percentage: 0,
                  matched_source_count: 0,
                  student_overlap_percentage: 0,
                  citation_issue_count: 0,
                  completed_at: new Date().toISOString(),
                },
                { onConflict: "submission_id" }
              );
          }
        } catch (err) {
          console.error("Supabase post-analysis persistence error:", err);
        }
      }

      return localResult;
    },

    async retryAnalysis(submissionId: string): Promise<Submission | undefined> {
      return db.retrySubmission(submissionId);
    },

    /**
     * Executes the complete Step 3 Academic Integrity Engine directly on document text.
     * Returns the unified AnalysisResult schema.
     */
    async runIntegrityAnalysis(params: {
      submissionId: string;
      text: string;
      assignmentPrompt?: string;
    }) {
      const peers = db
        .getSubmissions()
        .filter((s) => s.document?.extracted_text)
        .map((s) => ({
          id: s.id,
          studentName: s.student_name || "Student",
          roll: s.student_roll || "22CSE",
          text: s.document!.extracted_text,
        }));

      return runFullAcademicIntegrityAnalysis({
        submissionId: params.submissionId,
        submissionText: params.text,
        peerSubmissions: peers,
        ...(params.assignmentPrompt ? { assignmentPromptText: params.assignmentPrompt } : {}),
      });
    },
  },

  // Faculty Feedback & Annotations
  feedback: {
    async list(submissionId: string): Promise<FeedbackRecord[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("feedback")
            .select("*")
            .or(`submission_id.eq.${submissionId},text_reference.ilike.%${submissionId}%`)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            return data as FeedbackRecord[];
          }
        } catch (e) {
          console.warn("Supabase feedback.list fallback:", e);
        }
      }
      return db.getFeedback(submissionId);
    },

    async add(
      submissionId: string,
      comment: string,
      paragraphId = "p-2",
      pageNumber = 1
    ): Promise<FeedbackRecord> {
      const localFb = db.addFeedback(submissionId, comment, paragraphId, pageNumber);

      if (isSupabaseConfigured()) {
        try {
          // Resolve submission UUID if submissionCode was passed
          let targetSubId = submissionId;
          if (!isUuid(submissionId)) {
            const { data: s } = await supabase
              .from("submissions")
              .select("id")
              .eq("submission_code", submissionId)
              .maybeSingle();
            if (s) targetSubId = s.id;
          }

          const { data: inserted, error } = await supabase
            .from("feedback")
            .insert({
              submission_id: isUuid(targetSubId)
                ? targetSubId
                : "f0000000-0000-0000-0000-000000000001",
              faculty_id: "b0000000-0000-0000-0000-000000000001",
              faculty_name: "Dr. P. Kulkarni",
              comment,
              page_number: pageNumber,
              paragraph_id: paragraphId,
              status: "active",
            })
            .select()
            .single();

          if (!error && inserted) {
            return inserted as FeedbackRecord;
          }
        } catch (e) {
          console.warn("Supabase feedback.add error:", e);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("verity:notifications-updated"));
      }

      return localFb;
    },
  },

  // Students Directory
  students: {
    async list(): Promise<Profile[]> {
      const parseProfile = (p: any): Profile => {
        let section = p.section || "B";
        let batch = p.batch || "Batch 3";
        let course_code = p.course_code || "EXCS-B";
        let department_code = p.department_code || "EXCS";
        if (p.avatar_url && typeof p.avatar_url === "string" && p.avatar_url.trim().startsWith("{")) {
          try {
            const meta = JSON.parse(p.avatar_url);
            if (meta.section) section = meta.section;
            if (meta.batch) batch = meta.batch;
            if (meta.course_code) course_code = meta.course_code;
            if (meta.department_code) department_code = meta.department_code;
          } catch {}
        }
        return {
          ...p,
          section,
          batch,
          course_code,
          department_code,
        };
      };

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("role", "student")
            .order("full_name", { ascending: true });
          if (!error && data && data.length > 0) {
            return data.map(parseProfile);
          }
        } catch (e) {
          console.warn("Supabase students.list fallback:", e);
        }
      }
      return db.getStudents().map(parseProfile);
    },

    async get(id: string): Promise<Profile | undefined> {
      const parseProfile = (p: any): Profile => {
        let section = p.section || "B";
        let batch = p.batch || "Batch 3";
        let course_code = p.course_code || "EXCS-B";
        let department_code = p.department_code || "EXCS";
        if (p.avatar_url && typeof p.avatar_url === "string" && p.avatar_url.trim().startsWith("{")) {
          try {
            const meta = JSON.parse(p.avatar_url);
            if (meta.section) section = meta.section;
            if (meta.batch) batch = meta.batch;
            if (meta.course_code) course_code = meta.course_code;
            if (meta.department_code) department_code = meta.department_code;
          } catch {}
        }
        return {
          ...p,
          section,
          batch,
          course_code,
          department_code,
        };
      };

      if (isSupabaseConfigured()) {
        try {
          let query = supabase.from("profiles").select("*");
          if (isUuid(id)) {
            query = query.or(`id.eq.${id},roll_number.ilike.${id}`);
          } else {
            query = query.or(`roll_number.ilike.${id},full_name.ilike.${id}`);
          }
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            return parseProfile(data);
          }
        } catch (e) {
          console.warn("Supabase students.get fallback:", e);
        }
      }
      const local = db.getStudentById(id);
      return local ? parseProfile(local) : undefined;
    },

    async create(data: {
      full_name: string;
      email: string;
      roll_number: string;
      department_name?: string;
      department_code?: string;
      course_code?: string;
      section?: string;
      batch?: string;
    }): Promise<Profile> {
      const metadataStr = JSON.stringify({
        section: data.section || "B",
        batch: data.batch || "Batch 3",
        course_code: data.course_code || "EXCS-B",
        department_code: data.department_code || "EXCS",
      });

      if (isSupabaseConfigured()) {
        const { data: inserted, error } = await supabase
          .from("profiles")
          .insert({
            full_name: data.full_name,
            email: data.email,
            role: "student",
            roll_number: data.roll_number,
            institution_id: "a0000000-0000-0000-0000-000000000001",
            department_name: data.department_name || "Electronics and Computer Science Engineering",
            avatar_url: metadataStr,
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase students.create error:", error);
          throw new Error(error.message);
        }
        if (inserted) {
          const profileWithMeta: Profile = {
            ...inserted,
            section: data.section || "B",
            batch: data.batch || "Batch 3",
            course_code: data.course_code || "EXCS-B",
            department_code: data.department_code || "EXCS",
          };
          db.createStudent(profileWithMeta);
          return profileWithMeta;
        }
      }

      const newProfile: Profile = db.createStudent({
        full_name: data.full_name,
        email: data.email,
        role: "student",
        roll_number: data.roll_number,
        department_name: data.department_name || "Electronics and Computer Science Engineering",
        section: data.section || "B",
        batch: data.batch || "Batch 3",
        course_code: data.course_code || "EXCS-B",
      });
      return newProfile;
    },
  },

  // Document Comparison
  compare: {
    async compareStudents(studentAId: string, studentBId: string) {
      const subs = await verityApi.submissions.list();
      const subA = subs.find(
        (s) => s.student_roll === studentAId || s.student_id === studentAId
      );
      const subB = subs.find(
        (s) => s.student_roll === studentBId || s.student_id === studentBId
      );

      const textA =
        subA?.document?.extracted_text ||
        "Ohm's law states that the current through a conductor between two points is directly proportional to the voltage across the two points. Introducing the constant of proportionality, the resistance, one arrives at the usual mathematical equation that describes this relationship: I = V/R. This experiment verifies Ohm's law using a standard resistor network and precision multimeters.";
      const textB =
        subB?.document?.extracted_text ||
        "Ohm's law indicates that current is proportional to voltage. By adding resistance as a constant, we get the equation I = V/R. Our lab experiment confirms this relationship via standard electrical components.";

      return compareTwoDocuments(
        textA,
        textB,
        subB?.student_name || "Comparison Student",
        "student_submission"
      );
    },
    async runBenchmark() {
      return runSimilarityBenchmark();
    },
  },

  // Administration
  admin: {
    async getStats() {
      if (isSupabaseConfigured()) {
        try {
          const { data: depts } = await supabase.from("departments").select("*");
          if (depts && depts.length > 0) {
            const totalFaculty = depts.reduce(
              (acc: number, d: any) => acc + (d.faculty_count || 0),
              0
            );
            const totalStudents = depts.reduce(
              (acc: number, d: any) => acc + (d.student_count || 0),
              0
            );
            const totalCourses = depts.reduce(
              (acc: number, d: any) => acc + (d.course_count || 0),
              0
            );
            const totalSubmissions = depts.reduce(
              (acc: number, d: any) => acc + (d.submission_count || 0),
              0
            );

            return {
              totalFaculty,
              totalStudents,
              totalCourses,
              totalSubmissions,
              meanSimilarity: "13.8%",
            };
          }
        } catch (e) {
          console.warn("Supabase admin.getStats fallback:", e);
        }
      }
      return db.getInstitutionStats();
    },

    async getDepartments(): Promise<Department[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("departments")
            .select("*")
            .order("name", { ascending: true });
          if (!error && data && data.length > 0) {
            return data as Department[];
          }
        } catch (e) {
          console.warn("Supabase admin.getDepartments fallback:", e);
        }
      }
      return db.getDepartments();
    },
  },

  // Faculty Dashboard Metrics
  dashboard: {
    async getStats() {
      if (isSupabaseConfigured()) {
        try {
          const { count: asgCount } = await supabase
            .from("assignments")
            .select("*", { count: "exact", head: true });

          const { count: subCount } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true });

          const { count: reviewCount } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true })
            .eq("status", "needs_review");

          const { count: highSimCount } = await supabase
            .from("submissions")
            .select("*", { count: "exact", head: true })
            .gte("similarity_percentage", 30);

          const { data: citationData } = await supabase
            .from("submissions")
            .select("citation_issue_count");
          const totalCitationIssues = (citationData || []).reduce(
            (acc, s) => acc + (s.citation_issue_count || 0),
            0
          );

          return [
            { label: "Assignments", value: String(asgCount ?? 0) },
            { label: "Submissions", value: String(subCount ?? 0) },
            {
              label: "Pending Review",
              value: String(reviewCount ?? 0),
              tone: "warning" as const,
            },
            {
              label: "High Similarity",
              value: String(highSimCount ?? 0),
              tone: "danger" as const,
            },
            {
              label: "Citation Issues",
              value: String(totalCitationIssues),
              tone: "warning" as const,
            },
          ];
        } catch (e) {
          console.warn("Supabase dashboard.getStats fallback:", e);
        }
      }
      return db.getFacultyDashboardStats();
    },
  },

  // Faculty Review Workflow & Official Audit
  reviews: {
    async get(submissionId: string): Promise<SubmissionReview | undefined> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("submission_reviews")
            .select("*")
            .eq("submission_id", submissionId)
            .maybeSingle();
          if (!error && data) return data as SubmissionReview;
        } catch (e) {
          console.warn("Supabase reviews.get fallback:", e);
        }
      }
      return db.getReview(submissionId);
    },

    async getAuditTrail(submissionId: string): Promise<ReviewAuditEntry[]> {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("review_audit_log")
            .select("*")
            .eq("submission_id", submissionId)
            .order("created_at", { ascending: true });
          if (!error && data && data.length > 0) return data as ReviewAuditEntry[];
        } catch (e) {
          console.warn("Supabase reviews.getAuditTrail fallback:", e);
        }
      }
      return db.getReviewAuditLog(submissionId);
    },

    async transitionStatus(
      submissionId: string,
      nextStatus: ReviewStatus,
      notes?: string
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.recordReviewTransition(submissionId, nextStatus, notes, currentUser);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            reviewer_id: currentUser.id,
            reviewer_name: currentUser.full_name,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          });

          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "STATUS_TRANSITION",
            previous_status: localResult.status,
            new_status: nextStatus,
            notes: notes || `Review status transitioned to ${nextStatus}`,
          });
        } catch (e) {
          console.warn("Supabase reviews.transitionStatus sync fallback:", e);
        }
      }

      return localResult;
    },

    async recordPassageReview(
      submissionId: string,
      passageId: string,
      status: ReviewedPassageStatus,
      notes?: string
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.recordReviewedPassage(
        submissionId,
        passageId,
        status,
        notes,
        currentUser
      );

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            reviewer_id: currentUser.id,
            reviewer_name: currentUser.full_name,
            reviewed_passages: localResult.reviewed_passages,
            updated_at: new Date().toISOString(),
          });

          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "PASSAGE_REVIEWED",
            notes: `Passage ${passageId} marked as ${status}${notes ? `: ${notes}` : ""}`,
            metadata: { passage_id: passageId, status, notes },
          });
        } catch (e) {
          console.warn("Supabase reviews.recordPassageReview sync fallback:", e);
        }
      }

      return localResult;
    },

    async requestStudentExplanation(
      submissionId: string,
      prompt: string
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.requestStudentExplanation(submissionId, prompt, currentUser);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            reviewer_id: currentUser.id,
            reviewer_name: currentUser.full_name,
            status: "explanation_requested",
            student_explanation_request: prompt,
            student_explanation_requested_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "EXPLANATION_REQUESTED",
            new_status: "explanation_requested",
            notes: `Student explanation requested: ${prompt}`,
            metadata: { prompt },
          });
        } catch (e) {
          console.warn("Supabase reviews.requestStudentExplanation sync fallback:", e);
        }
      }

      return localResult;
    },

    async submitStudentExplanation(
      submissionId: string,
      response: string
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.submitStudentExplanation(submissionId, response, currentUser);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            status: "explanation_received",
            student_explanation_response: response,
            student_explanation_received_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "EXPLANATION_RECEIVED",
            new_status: "explanation_received",
            notes: `Student explanation response received: ${response}`,
            metadata: { response },
          });
        } catch (e) {
          console.warn("Supabase reviews.submitStudentExplanation sync fallback:", e);
        }
      }

      return localResult;
    },

    async sendFeedback(
      submissionId: string,
      feedbackText: string,
      rubricScores?: Array<{ criterion: string; score: number; max: number }>
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.sendCandidateFeedback(
        submissionId,
        feedbackText,
        rubricScores,
        currentUser
      );

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            reviewer_id: currentUser.id,
            reviewer_name: currentUser.full_name,
            updated_at: new Date().toISOString(),
          });
          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "FEEDBACK_SENT",
            notes: `Candidate feedback sent: ${feedbackText.slice(0, 100)}`,
            metadata: { feedbackText, rubricScores },
          });
        } catch (e) {
          console.warn("Supabase reviews.sendFeedback sync fallback:", e);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("verity:notifications-updated"));
      }

      return localResult;
    },

    async recordDecision(
      submissionId: string,
      decision: ReviewDecision,
      rationale: string,
      facultyNotes?: string,
      newStatus: ReviewStatus = "reviewed",
      generalFeedback?: string,
      rubricScores?: Array<{ criterion: string; score: number; max: number }>
    ): Promise<SubmissionReview> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const localResult = db.recordReviewDecision(
        submissionId,
        decision,
        rationale,
        facultyNotes,
        newStatus,
        currentUser,
        generalFeedback,
        rubricScores
      );

      if (isSupabaseConfigured()) {
        try {
          await supabase.from("submission_reviews").upsert({
            submission_id: submissionId,
            reviewer_id: currentUser.id,
            reviewer_name: currentUser.full_name,
            status: newStatus,
            decision,
            decision_rationale: rationale,
            faculty_notes: facultyNotes,
            updated_at: new Date().toISOString(),
          });

          await supabase.from("review_audit_log").insert({
            submission_id: submissionId,
            review_id: localResult.id,
            actor_id: currentUser.id,
            actor_name: currentUser.full_name,
            actor_role: currentUser.role,
            action: "DECISION_RECORDED",
            new_status: newStatus,
            notes: `Decision recorded: ${decision}. Rationale: ${rationale}`,
            metadata: { decision, rationale, faculty_notes: facultyNotes, generalFeedback, rubricScores },
          });
        } catch (e) {
          console.warn("Supabase reviews.recordDecision sync fallback:", e);
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("verity:notifications-updated"));
      }

      return localResult;
    },

    async generateAuditReportPdf(
      submissionId: string,
      options?: PdfReportOptions
    ): Promise<{ pdfBytes: Uint8Array; fileName: string }> {
      const sub = await verityApi.submissions.get(submissionId);
      if (!sub) {
        throw new Error(`Submission ${submissionId} not found.`);
      }

      const currentUser = await verityApi.auth.getCurrentUser();
      const effectiveRole = options?.viewerRole || currentUser.role;

      // Sanitize submission according to viewer role and privacy
      const sanitized = sanitizeSubmissionForRole(sub, effectiveRole);

      const pdfBytes = generateAcademicAuditReportPdf(sanitized, {
        ...options,
        viewerRole: effectiveRole,
        generatedBy: currentUser.full_name,
      });

      const fileName = `${sanitized.submission_code || sanitized.id}_Academic_Audit_Report.pdf`;
      return { pdfBytes, fileName };
    },
  },

  // Student Notifications
  notifications: {
    async list(studentId?: string): Promise<StudentNotification[]> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const targetStudentId = studentId || (currentUser.role === "student" ? currentUser.id : undefined);

      if (isSupabaseConfigured() && targetStudentId) {
        try {
          const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .eq("student_id", targetStudentId)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            return data as StudentNotification[];
          }
        } catch (e) {
          console.warn("Supabase notifications.list fallback:", e);
        }
      }
      return db.getNotifications(targetStudentId);
    },

    async unreadCount(studentId?: string): Promise<number> {
      const list = await this.list(studentId);
      return list.filter((n) => !n.is_read).length;
    },

    async markAsRead(notificationId: string): Promise<boolean> {
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", notificationId);
        } catch (e) {
          console.warn("Supabase notifications.markAsRead fallback:", e);
        }
      }
      return db.markNotificationAsRead(notificationId);
    },

    async markAllAsRead(studentId?: string): Promise<void> {
      const currentUser = await verityApi.auth.getCurrentUser();
      const targetStudentId = studentId || (currentUser.role === "student" ? currentUser.id : undefined);

      if (isSupabaseConfigured() && targetStudentId) {
        try {
          await supabase
            .from("notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("student_id", targetStudentId);
        } catch (e) {
          console.warn("Supabase notifications.markAllAsRead fallback:", e);
        }
      }
      db.markAllNotificationsAsRead(targetStudentId);
    },

    async create(data: {
      student_id: string;
      submission_id: string;
      assignment_id?: string;
      assignment_title?: string;
      course_code?: string;
      type: NotificationType;
      title: string;
      message: string;
      action_url?: string;
    }): Promise<StudentNotification> {
      const local = db.createNotification(data);
      if (isSupabaseConfigured()) {
        try {
          await supabase.from("notifications").upsert(
            {
              id: local.id,
              student_id: local.student_id,
              submission_id: local.submission_id,
              assignment_id: local.assignment_id,
              assignment_title: local.assignment_title,
              course_code: local.course_code,
              type: local.type,
              title: local.title,
              message: local.message,
              action_url: local.action_url,
              is_read: local.is_read,
              created_at: local.created_at,
            },
            { onConflict: "student_id,submission_id,type" }
          );
        } catch (e) {
          console.warn("Supabase notifications.create fallback:", e);
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("verity:notifications-updated"));
      }
      return local;
    },
  },

  // Document & Peer Comparison Service
  compare: {
    async compareSubmissions(submissionAId: string, submissionBId: string) {
      const subA = await verityApi.submissions.get(submissionAId);
      const subB = await verityApi.submissions.get(submissionBId);
      const textA = subA?.document?.extracted_text || "";
      const textB = subB?.document?.extracted_text || "";
      return {
        comparison: compareTwoDocuments(
          textA,
          textB,
          subB?.student_name || "Comparison Student",
          "student_submission"
        ),
        submissionA: subA,
        submissionB: subB,
      };
    },

    async compareStudents(
      studentAIdOrRoll: string,
      studentBIdOrRoll: string,
      assignmentIdOrTitle?: string
    ) {
      const all = await verityApi.submissions.list();
      const normalize = (val?: string) => (val || "").trim().toLowerCase();

      const filterForStudent = (s: Submission, idOrRoll: string) => {
        const target = normalize(idOrRoll);
        return (
          normalize(s.student_id) === target ||
          normalize(s.student_roll) === target ||
          normalize(s.student_name) === target
        );
      };

      let matchA: Submission | undefined;
      let matchB: Submission | undefined;

      if (assignmentIdOrTitle) {
        const asgTarget = normalize(assignmentIdOrTitle);
        matchA = all.find(
          (s) =>
            filterForStudent(s, studentAIdOrRoll) &&
            (normalize(s.assignment_id) === asgTarget ||
              normalize(s.assignment_title) === asgTarget)
        );
        matchB = all.find(
          (s) =>
            filterForStudent(s, studentBIdOrRoll) &&
            (normalize(s.assignment_id) === asgTarget ||
              normalize(s.assignment_title) === asgTarget)
        );
      } else {
        matchA = all.find((s) => filterForStudent(s, studentAIdOrRoll));
        matchB = all.find((s) => filterForStudent(s, studentBIdOrRoll));
      }

      const fullA = matchA ? await verityApi.submissions.get(matchA.id) : undefined;
      const fullB = matchB ? await verityApi.submissions.get(matchB.id) : undefined;

      const textA = fullA?.document?.extracted_text || "";
      const textB = fullB?.document?.extracted_text || "";

      return {
        comparison: compareTwoDocuments(
          textA,
          textB,
          fullB?.student_name || "Comparison Student",
          "student_submission"
        ),
        submissionA: fullA,
        submissionB: fullB,
      };
    },
  },
};

