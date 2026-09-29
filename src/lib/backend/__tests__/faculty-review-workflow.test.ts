/**
 * VERITY ACADEMIC INTEGRITY ENGINE — STEP 8 TEST SUITE
 * Faculty Review Workspace, Formal Review Workflow, Authorization, and PDF Audit Reports
 */

import {
  canAccessCourse,
  canAccessSubmission,
  assertFacultyCourseAccess,
  validateReviewTransition,
  filterSubmissionsForUser,
  sanitizeSubmissionForRole,
  UnauthorizedAccessError,
  ForbiddenActionError,
  InvalidStatusTransitionError,
} from "../authorization";
import { generateAcademicAuditReportPdf } from "../reports/pdf-audit-report-generator";
import { db } from "../db";
import type {
  Course,
  Profile,
  Submission,
  SubmissionReview,
  ReviewStatus,
} from "@/types/database";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runStep8FacultyReviewTests() {
  console.log("================================================================================");
  console.log("  VERITY STEP 8: FACULTY REVIEW WORKSPACE & AUDIT REPORTS TEST SUITE");
  console.log("================================================================================\n");

  const facultyA: Profile = {
    id: "fac-eng-01",
    full_name: "Dr. P. Kulkarni",
    email: "pkulkarni@institution.edu",
    role: "faculty",
    department_name: "Computer Engineering",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const facultyB: Profile = {
    id: "fac-eng-02",
    full_name: "Dr. S. Roy",
    email: "sroy@institution.edu",
    role: "faculty",
    department_name: "Electrical Engineering",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const studentA: Profile = {
    id: "stu-001",
    full_name: "Riya Sharma",
    email: "riya@institution.edu",
    role: "student",
    roll_number: "22CSE057",
    department_name: "Computer Engineering",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const studentB: Profile = {
    id: "stu-002",
    full_name: "Aman Verma",
    email: "aman@institution.edu",
    role: "student",
    roll_number: "22CSE088",
    department_name: "Computer Engineering",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const adminUser: Profile = {
    id: "adm-001",
    full_name: "Academic Dean",
    email: "dean@institution.edu",
    role: "admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const courseCSE: Course = {
    id: "crs-cse-301",
    institution_id: "inst-001",
    course_code: "ENG-CSE-301",
    name: "Data Structures & Algorithms",
    faculty_id: facultyA.id,
    faculty_name: facultyA.full_name,
    section: "A",
    semester: "Autumn",
    academic_year: "2026-27",
    student_count: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const courseEEE: Course = {
    id: "crs-eee-201",
    institution_id: "inst-001",
    course_code: "ENG-EEE-201",
    name: "Signals & Systems",
    faculty_id: facultyB.id,
    faculty_name: facultyB.full_name,
    section: "B",
    semester: "Autumn",
    academic_year: "2026-27",
    student_count: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const subCSE: Submission = {
    id: "sub-cse-901",
    submission_code: "SUB-2026-09124",
    assignment_id: "asg-01",
    assignment_title: "Technical Report 02",
    course_id: courseCSE.id,
    course_code: courseCSE.course_code,
    student_id: studentA.id,
    student_name: studentA.full_name,
    student_roll: studentA.roll_number,
    version_number: 1,
    status: "needs_review",
    submitted_at: new Date().toISOString(),
    is_final: true,
    similarity_percentage: 27,
    matched_source_count: 3,
    citation_issue_count: 1,
    drafts_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    document: {
      id: "doc-01",
      submission_id: "sub-cse-901",
      file_name: "Report_22CSE057.pdf",
      file_type: "application/pdf",
      file_size: 204800,
      storage_path: "submissions/SUB-2026-09124/Report_22CSE057.pdf",
      extracted_text: "Balanced binary search trees maintain logarithmic depth by performing tree rotations...",
      page_count: 2,
      word_count: 1250,
      created_at: new Date().toISOString(),
    },
    analysis: {
      id: "ana-01",
      submission_id: "sub-cse-901",
      status: "completed",
      similarity_percentage: 27,
      matched_source_count: 3,
      student_overlap_percentage: 12,
      citation_issue_count: 1,
      writing_pattern_status: "Requires Review",
      created_at: new Date().toISOString(),
      matches: [
        {
          id: "m-1",
          analysis_id: "ana-01",
          source_type: "student_submission",
          source_name: "Aman Verma (22CSE088)",
          source_title: "Peer Technical Analysis 01",
          source_url: "internal://submissions/SUB-2026-09088",
          matched_text: "Balanced binary search trees maintain logarithmic depth by performing tree rotations.",
          source_matched_text: "Balanced binary search trees maintain logarithmic depth by performing tree rotations.",
          similarity_percentage: 100,
          exact_similarity: 100,
          fuzzy_similarity: 0,
          semantic_similarity: 0,
          evidence_level: "strong",
          matched_words: 11,
          created_at: new Date().toISOString(),
        },
      ],
      passages: [
        {
          id: "p-1",
          source_name: "Aman Verma (22CSE088)",
          source_type: "student_submission",
          student_text: "Balanced binary search trees maintain logarithmic depth by performing tree rotations.",
          source_text: "Balanced binary search trees maintain logarithmic depth by performing tree rotations.",
          start_sentence_idx: 0,
          end_sentence_idx: 0,
          matched_words: 11,
          similarity_percentage: 100,
          exact_similarity: 100,
          fuzzy_similarity: 0,
          semantic_similarity: 0,
          evidence_level: "strong",
          reasons: ["Verbatim match with peer"],
        },
      ],
    },
    review: {
      id: "rev-01",
      submission_id: "sub-cse-901",
      reviewer_id: facultyA.id,
      reviewer_name: facultyA.full_name,
      status: "in_review",
      faculty_notes: "Private Faculty Note: Student definitions overlap with peer submission from last semester.",
      reviewed_passages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  const subEEE: Submission = {
    id: "sub-eee-902",
    submission_code: "SUB-2026-09200",
    assignment_id: "asg-eee-01",
    assignment_title: "Filter Design Lab",
    course_id: courseEEE.id,
    course_code: courseEEE.course_code,
    student_id: studentB.id,
    student_name: studentB.full_name,
    student_roll: studentB.roll_number,
    version_number: 1,
    status: "needs_review",
    submitted_at: new Date().toISOString(),
    is_final: true,
    similarity_percentage: 15,
    matched_source_count: 1,
    citation_issue_count: 0,
    drafts_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // ==========================================================================
  // SCENARIO 1: Faculty Access to Authorized Submissions
  // ==========================================================================
  console.log("--- Scenario 1: Faculty Access to Authorized Submissions ---");
  assert(canAccessCourse(facultyA, courseCSE), "Scenario 1: Faculty A can access their own course CSE-301");
  assert(canAccessSubmission(facultyA, subCSE, courseCSE), "Scenario 1: Faculty A can access submission in their course");
  assert(canAccessCourse(adminUser, courseCSE), "Scenario 1: Admin can access course CSE-301");
  assert(canAccessSubmission(adminUser, subCSE, courseCSE), "Scenario 1: Admin can access any submission");

  const filteredForFacA = filterSubmissionsForUser(facultyA, [subCSE, subEEE], [courseCSE, courseEEE]);
  assert(filteredForFacA.length === 1 && filteredForFacA[0]!.id === subCSE.id, "Scenario 1: Submissions filtered strictly to authorized course for Faculty A");

  // ==========================================================================
  // SCENARIO 2: Denial of Unauthorized and Cross-Course Access
  // ==========================================================================
  console.log("\n--- Scenario 2: Denial of Unauthorized and Cross-Course Access ---");
  assert(!canAccessCourse(facultyA, courseEEE), "Scenario 2: Faculty A denied access to Course EEE-201 (taught by Faculty B)");
  assert(!canAccessSubmission(facultyA, subEEE, courseEEE), "Scenario 2: Faculty A denied access to submission in Course EEE-201");

  let crossCourseThrown = false;
  try {
    assertFacultyCourseAccess(facultyA, courseEEE, "review submission");
  } catch (e: any) {
    crossCourseThrown = e instanceof UnauthorizedAccessError;
  }
  assert(crossCourseThrown, "Scenario 2: assertFacultyCourseAccess throws UnauthorizedAccessError on cross-course attempt");

  let nonFacultyThrown = false;
  try {
    assertFacultyCourseAccess(studentA, courseCSE, "review submission");
  } catch (e: any) {
    nonFacultyThrown = e instanceof ForbiddenActionError;
  }
  assert(nonFacultyThrown, "Scenario 2: assertFacultyCourseAccess throws ForbiddenActionError when student attempts faculty action");

  // ==========================================================================
  // SCENARIO 3: Review Decision Persistence and Audit History
  // ==========================================================================
  console.log("\n--- Scenario 3: Review Decision Persistence and Audit History ---");
  // Test via db manager
  db.addSubmission(subCSE);

  // 1. Transition to in_review
  const reviewStep1 = db.recordReviewTransition(subCSE.id, "in_review", "Faculty opened submission", facultyA);
  assert(reviewStep1.status === "in_review", "Scenario 3: Status transitioned to in_review");

  // 2. Record reviewed passage
  const reviewStep2 = db.recordReviewedPassage(subCSE.id, "p-1", "cited_or_common", "Definition is standard algorithmic phrasing", facultyA);
  assert(reviewStep2.reviewed_passages?.length === 1, "Scenario 3: Passage p-1 recorded in reviewed_passages list");
  assert(reviewStep2.reviewed_passages?.[0]?.status === "cited_or_common", "Scenario 3: Passage status set to cited_or_common");

  // 3. Request student explanation
  const reviewStep3 = db.requestStudentExplanation(subCSE.id, "Please clarify the source of Section 2 equations.", facultyA);
  assert(reviewStep3.status === "explanation_requested", "Scenario 3: Status transitioned to explanation_requested");
  assert(Boolean(reviewStep3.student_explanation_request), "Scenario 3: Student explanation prompt recorded");

  // 4. Student submits explanation
  const reviewStep4 = db.submitStudentExplanation(subCSE.id, "The equations were derived from Lecture 4 slides on AVL balance factors.", studentA);
  assert(reviewStep4.status === "explanation_received", "Scenario 3: Status transitioned to explanation_received upon response");
  assert(Boolean(reviewStep4.student_explanation_response), "Scenario 3: Student explanation response recorded");

  // 5. Faculty records final decision
  const reviewStep5 = db.recordReviewDecision(
    subCSE.id,
    "acceptable_citations",
    "Explanation verifies student derived equations from course lecture slides.",
    "Student attended consultation and confirmed understanding.",
    "reviewed",
    facultyA
  );
  assert(reviewStep5.status === "reviewed", "Scenario 3: Final review status set to reviewed");
  assert(reviewStep5.decision === "acceptable_citations", "Scenario 3: Decision recorded as acceptable_citations");
  assert(Boolean(reviewStep5.decision_rationale?.includes("Explanation verifies")), "Scenario 3: Decision rationale persisted");

  // 6. Inspect Audit Log
  const auditLog = db.getReviewAuditLog(subCSE.id);
  assert(auditLog.length >= 5, "Scenario 3: Audit trail preserved all lifecycle events");
  const actionsInAudit = auditLog.map((a) => a.action);
  assert(actionsInAudit.includes("STATUS_TRANSITION"), "Scenario 3: Audit log includes STATUS_TRANSITION");
  assert(actionsInAudit.includes("PASSAGE_REVIEWED"), "Scenario 3: Audit log includes PASSAGE_REVIEWED");
  assert(actionsInAudit.includes("EXPLANATION_REQUESTED"), "Scenario 3: Audit log includes EXPLANATION_REQUESTED");
  assert(actionsInAudit.includes("EXPLANATION_RECEIVED"), "Scenario 3: Audit log includes EXPLANATION_RECEIVED");
  assert(actionsInAudit.includes("DECISION_RECORDED"), "Scenario 3: Audit log includes DECISION_RECORDED");

  // ==========================================================================
  // SCENARIO 4: Invalid Status Transitions
  // ==========================================================================
  console.log("\n--- Scenario 4: Invalid Status Transitions ---");
  const studentAttempt = validateReviewTransition("in_review", "reviewed", "student");
  assert(!studentAttempt.valid, "Scenario 4: Student prohibited from marking submission reviewed");

  const illegalJump = validateReviewTransition("reviewed", "explanation_received", "faculty");
  assert(!illegalJump.valid, "Scenario 4: Cannot jump from reviewed directly to explanation_received without request");

  let invalidTransitionThrown = false;
  try {
    db.recordReviewTransition(subCSE.id, "explanation_received", "Illegal faculty action", facultyA);
  } catch (e: any) {
    invalidTransitionThrown = e instanceof InvalidStatusTransitionError;
  }
  assert(invalidTransitionThrown, "Scenario 4: Attempting illegal transition throws InvalidStatusTransitionError");

  // ==========================================================================
  // SCENARIO 5: PDF Generation with Complete Evidence
  // ==========================================================================
  console.log("\n--- Scenario 5: PDF Generation with Complete Evidence ---");
  const completePdfBytes = generateAcademicAuditReportPdf(subCSE, {
    viewerRole: "faculty",
    institutionName: "ABC Institute of Technology",
    generatedBy: "Dr. P. Kulkarni",
  });

  assert(completePdfBytes.length > 5000, "Scenario 5: Complete PDF generated with substantial byte length");
  const pdfLatin1 = Buffer.from(completePdfBytes).toString("latin1");
  assert(pdfLatin1.startsWith("%PDF-1.4"), "Scenario 5: Standards-compliant PDF 1.4 header");
  assert(pdfLatin1.includes("%%EOF"), "Scenario 5: PDF contains standard %%EOF terminator");
  assert(pdfLatin1.includes("/Type /Catalog"), "Scenario 5: PDF document catalog structure present");
  assert(pdfLatin1.includes("VERITY ACADEMIC INTEGRITY PLATFORM"), "Scenario 5: Verity official branding present");
  assert(pdfLatin1.includes("CONFIDENTIAL INSTITUTIONAL INTEGRITY & SIMILARITY AUDIT REPORT"), "Scenario 5: Official title present");
  assert(pdfLatin1.includes("1. SUBMISSION & CANDIDATE INFORMATION"), "Scenario 5: Section 1 present");
  assert(pdfLatin1.includes("2. MULTI-ENGINE SIMILARITY & EVIDENCE INDEX"), "Scenario 5: Section 2 present");
  assert(pdfLatin1.includes("3. MATCHED SOURCE INDEX & CITATIONS"), "Scenario 5: Section 3 present");
  assert(pdfLatin1.includes("4. SELECTED CORROBORATED PASSAGE ALIGNMENTS"), "Scenario 5: Section 4 present");
  assert(pdfLatin1.includes("5. FORMAL FACULTY REVIEW DECISION & RATIONALE"), "Scenario 5: Section 5 present");
  assert(pdfLatin1.includes("Similarity DOES NOT independently establish academic misconduct"), "Scenario 5: Mandatory legal disclaimer present");

  // ==========================================================================
  // SCENARIO 6: PDF Generation with Incomplete Evidence & Missing Sources
  // ==========================================================================
  console.log("\n--- Scenario 6: PDF Generation with Incomplete Evidence ---");
  const incompleteSub: Submission = {
    id: "sub-inc-001",
    submission_code: "SUB-EMPTY-999",
    assignment_id: "asg-unknown",
    student_id: "stu-unknown",
    version_number: 1,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    is_final: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Missing document, analysis, review
  };

  let incompletePdfSuccess = false;
  let incompleteBytesLength = 0;
  try {
    const incBytes = generateAcademicAuditReportPdf(incompleteSub);
    incompleteBytesLength = incBytes.length;
    incompletePdfSuccess = incBytes.length > 2000;
  } catch (e) {
    console.error("Incomplete PDF generation error:", e);
  }
  assert(incompletePdfSuccess, "Scenario 6: Incomplete submission generates valid PDF without throwing");
  assert(incompleteBytesLength > 2000, "Scenario 6: Incomplete PDF renders graceful fallback placeholders");

  // ==========================================================================
  // SCENARIO 7: Long Passages and Special Characters in Reports
  // ==========================================================================
  console.log("\n--- Scenario 7: Long Passages and Special Characters ---");
  const longTextSpecial =
    "In accordance with IEEE 802.11 standards: 'The sender\\receiver protocol utilizes (n-1) tokens' & \"smart algorithms\" — " +
    "where balancing factor α ≤ 1.414 × log₂(N). ".repeat(30);

  const specialSub: Submission = {
    ...subCSE,
    id: "sub-special-01",
    document: {
      ...subCSE.document!,
      extracted_text: longTextSpecial,
    },
    analysis: {
      ...subCSE.analysis!,
      passages: [
        {
          id: "p-special",
          source_name: "IEEE Transactions on 'Algorithms' & Networks (2026)",
          source_type: "academic",
          student_text: longTextSpecial,
          source_text: longTextSpecial,
          start_sentence_idx: 0,
          end_sentence_idx: 0,
          matched_words: 400,
          similarity_percentage: 85,
          evidence_level: "strong",
          reasons: ["Verbatim formula overlap"],
        },
      ],
    },
  };

  const specialBytes = generateAcademicAuditReportPdf(specialSub);
  assert(specialBytes.length > 5000, "Scenario 7: Special characters and long passages formatted without crashing");
  const specialLatin1 = Buffer.from(specialBytes).toString("latin1");
  assert(!specialLatin1.includes("undefined"), "Scenario 7: No 'undefined' strings leaked in output stream");
  assert(specialLatin1.includes("%%EOF"), "Scenario 7: Multi-page wrapping terminates with valid %%EOF");

  // ==========================================================================
  // SCENARIO 8: Privacy of Faculty Notes and Student Data
  // ==========================================================================
  console.log("\n--- Scenario 8: Privacy of Faculty Notes and Student Data ---");
  const sanitizedForStudent = sanitizeSubmissionForRole(subCSE, "student");
  assert(sanitizedForStudent.review?.faculty_notes === undefined, "Scenario 8: Faculty private notes completely stripped for student view");
  assert(sanitizedForStudent.document?.storage_path === "[PROTECTED_STORAGE_URI]", "Scenario 8: Raw server storage path masked for student view");
  assert(sanitizedForStudent.analysis?.matches?.[0]?.source_name === "Peer Student Submission (Protected)", "Scenario 8: Peer student identity anonymized for student view");

  const sanitizedForFaculty = sanitizeSubmissionForRole(subCSE, "faculty");
  assert(sanitizedForFaculty.review?.faculty_notes !== undefined, "Scenario 8: Faculty view preserves confidential deliberation notes");
  assert(sanitizedForFaculty.document?.storage_path === subCSE.document?.storage_path, "Scenario 8: Faculty view retains authorized storage path");
  assert(Boolean(sanitizedForFaculty.analysis?.matches?.[0]?.source_name.includes("Aman Verma")), "Scenario 8: Faculty view retains peer student attribution");

  // Student PDF export does not contain private faculty notes
  const studentPdfBytes = generateAcademicAuditReportPdf(subCSE, { viewerRole: "student" });
  const studentPdfStr = Buffer.from(studentPdfBytes).toString("latin1");
  assert(!studentPdfStr.includes("Private Faculty Note"), "Scenario 8: Student PDF audit report strictly excludes private faculty notes");
  assert(!studentPdfStr.includes("FACULTY CONFIDENTIAL DELIBERATION NOTES"), "Scenario 8: Student PDF omits faculty deliberation box");

  // ==========================================================================
  // SCENARIO 9: Re-Analysis Without Corruption of Prior Review Records
  // ==========================================================================
  console.log("\n--- Scenario 9: Re-Analysis Without Corruption of Review Records ---");
  // subCSE already has decision "acceptable_citations" and review history
  const priorDecision = subCSE.review?.decision;
  const priorPassageReviews = subCSE.review?.reviewed_passages?.length;

  // Run retrySubmission in db
  const reanalyzedSub = await db.retrySubmission(subCSE.id);
  assert(Boolean(reanalyzedSub), "Scenario 9: Re-analysis completed successfully");
  assert(reanalyzedSub?.review?.decision === priorDecision, "Scenario 9: Prior review decision preserved across re-analysis");
  assert(reanalyzedSub?.review?.reviewed_passages?.length === priorPassageReviews, "Scenario 9: Prior reviewed passages count preserved");

  const updatedAuditLog = db.getReviewAuditLog(subCSE.id);
  const reanalyzedAction = updatedAuditLog.find((a) => a.action === "RE_ANALYZED");
  assert(Boolean(reanalyzedAction), "Scenario 9: RE_ANALYZED action cleanly recorded in review audit log");

  console.log("\n================================================================================");
  console.log(`  STEP 8 VERIFICATION SUMMARY: TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("================================================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStep8FacultyReviewTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
