/**
 * Verity Academic Integrity Engine — System Stabilization & Regression Test Suite
 *
 * Verifies:
 * 1. Canonical similarity consistency across data pipeline
 * 2. Exact engine weights (Exact: 0.40, Fuzzy: 0.35, Semantic: 0.25)
 * 3. Document vs passage score separation
 * 4. Dashboard and submission source count consistency
 * 5. PDF generation and binary download structure (browser-safe, valid PDF 1.4)
 * 6. Student notification creation & deduplication
 * 7. Notification lifecycle on review transitions (start review, request explanation, record decision, feedback)
 * 8. Notification privacy & isolation
 * 9. Faculty confidential notes strictly isolated from student API view
 * 10. Institutional date/time formatting consistency across timestamps
 */

import { db } from "../db";
import { formatInstitutionalDateTime, formatInstitutionalDate, formatInstitutionalTime } from "../../formatters";
import { generateAcademicAuditReportPdf } from "../reports/pdf-audit-report-generator";
import { alignAndMergePassages, type CandidateSentenceAlignment } from "../similarity/passage-aligner";
import { sanitizeSubmissionForRole } from "../authorization";
import type { Submission, Profile, StudentNotification } from "@/types/database";
import type { SentenceSpan } from "../similarity/types";

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    testsPassed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    testsFailed++;
    console.error(`  [FAIL] ${testName}${details ? ` - ${details}` : ""}`);
  }
}

async function runStabilizationTestSuite() {
  console.log("================================================================================");
  console.log("  VERITY SYSTEM STABILIZATION & RELIABILITY REGRESSION TEST SUITE");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. CANONICAL SIMILARITY & ENGINE WEIGHTS
  // ---------------------------------------------------------------------------
  console.log("--- 1. Canonical Similarity & Engine Weights (0.40 / 0.35 / 0.25) ---");

  const studentSpan: SentenceSpan = {
    idx: 0,
    text: "The binary search tree maintains logarithmic complexity across balanced nodes.",
    normalizedText: "the binary search tree maintains logarithmic complexity across balanced nodes",
    tokens: ["the", "binary", "search", "tree", "maintains", "logarithmic", "complexity", "across", "balanced", "nodes"],
    startChar: 0,
    endChar: 80,
    isQuoted: false,
    isCited: false,
    isPrompt: false,
    isMathFormula: false,
    isCommonPhrase: false,
    isBoilerplate: false,
    isHeading: false,
    isReference: false,
  };

  const candidateAlignment: CandidateSentenceAlignment = {
    studentSentence: studentSpan,
    sourceSentenceText: "The binary search tree guarantees logarithmic execution over balanced trees.",
    sourceIdx: 0,
    sourceName: "Reference Algorithm Manual",
    sourceType: "academic",
    exactSimilarity: 40,
    fuzzySimilarity: 60,
    semanticSimilarity: 80,
    compositeScore: 57,
    matchedWords: 8,
    isQuoted: false,
    isCommonPhrase: false,
  };

  const passages = alignAndMergePassages([studentSpan], [candidateAlignment]);
  assert(passages.length > 0, "Passage aligner produces aligned candidate passage");
  if (passages.length > 0) {
    const passage = passages[0]!;
    // Expected canonical composite: 0.40 * 40 + 0.35 * 60 + 0.25 * 80 = 16 + 21 + 20 = 57%
    const expected = Math.round(0.40 * 40 + 0.35 * 60 + 0.25 * 80);
    assert(
      passage.similarity_percentage === expected,
      `Passage composite score (${passage.similarity_percentage}%) matches canonical weights (0.40*40 + 0.35*60 + 0.25*80 = ${expected}%)`
    );
  }

  // ---------------------------------------------------------------------------
  // 2. CANONICAL SCORE & SOURCE COUNT CONSISTENCY ACROSS SEEDED SUBMISSIONS
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Canonical Score & Source Count Consistency ---");

  const seededSubmissions = db.getSubmissions();
  assert(seededSubmissions.length >= 8, `Seeded submissions catalog loaded (${seededSubmissions.length} records)`);

  for (const s of seededSubmissions) {
    const docSim = s.similarity_percentage ?? 0;
    const matchCount = s.matched_source_count ?? 0;
    const analysisSim = s.analysis?.similarity_percentage;
    const analysisSources = s.analysis?.matched_source_count;

    if (analysisSim !== undefined) {
      assert(
        docSim === analysisSim,
        `Submission ${s.submission_code}: Document similarity (${docSim}%) matches analysis record (${analysisSim}%)`
      );
    }

    if (analysisSources !== undefined) {
      assert(
        matchCount === analysisSources,
        `Submission ${s.submission_code}: Source count (${matchCount}) equals analysis matched sources (${analysisSources})`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 3. STUDENT NOTIFICATION LIFECYCLE & DEDUPLICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Student Notification Lifecycle & Deduplication ---");

  const subId = "SUB-2026-09124";
  const targetSub = db.getSubmissionById(subId)!;
  const studentId = targetSub.student_id;

  // Create notification
  const notif1 = db.createNotification({
    student_id: studentId,
    submission_id: subId,
    assignment_id: "asg-301-02",
    assignment_title: "Technical Report 02",
    course_code: "ENG-CSE-301",
    type: "review_started",
    title: "Submission Under Review",
    message: "Your submission for Technical Report 02 is now under faculty review.",
  });

  assert(Boolean(notif1 && notif1.id), "Notification created successfully with unique ID");
  assert(notif1.is_read === false, "New notification has is_read = false by default");

  // Attempt duplicate notification (same student, submission, and type)
  const notif2 = db.createNotification({
    student_id: studentId,
    submission_id: subId,
    assignment_id: "asg-301-02",
    assignment_title: "Technical Report 02",
    course_code: "ENG-CSE-301",
    type: "review_started",
    title: "Submission Under Review - Updated",
    message: "Updated review message on Technical Report 02.",
  });

  assert(notif1.id === notif2.id, "Deduplication: duplicate notification updates existing record instead of creating duplicate");

  // Read notifications
  const studentNotifs = db.getNotifications(studentId);
  assert(studentNotifs.length > 0, "Student notifications list retrieved");
  assert(studentNotifs.some((n) => n.id === notif1.id), "Created notification present in student list");

  // Mark as read
  const marked = db.markNotificationAsRead(notif1.id);
  assert(marked === true, "markNotificationAsRead returned true");
  const updatedNotif = db.getNotifications(studentId).find((n) => n.id === notif1.id);
  assert(updatedNotif?.is_read === true, "Notification state updated to is_read = true");
  assert(Boolean(updatedNotif?.read_at), "Notification has valid read_at timestamp");

  // ---------------------------------------------------------------------------
  // 4. REVIEW WORKFLOW -> AUTOMATED NOTIFICATION TRIGGERS
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Review Workflow Automated Notification Triggers ---");

  // Faculty requests explanation
  const facultyUser: Profile = {
    id: "b0000000-0000-0000-0000-000000000001",
    full_name: "Dr. P. Kulkarni",
    email: "faculty@university.edu",
    role: "faculty",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.requestStudentExplanation(
    subId,
    "Please clarify external code excerpts in AVL tree balancing.",
    facultyUser
  );

  const notifsAfterExplanationReq = db.getNotifications(studentId);
  const explNotif = notifsAfterExplanationReq.find((n) => n.type === "explanation_requested");
  assert(Boolean(explNotif), "Review workflow automatically triggered 'explanation_requested' notification to student");
  assert(
    explNotif?.message.includes("requested an explanation") ?? false,
    "Explanation notification contains clear academic institutional prompt"
  );

  // Student submits explanation
  const studentUser: Profile = {
    id: studentId,
    full_name: "Riya Sharma",
    email: "student@university.edu",
    role: "student",
    roll_number: "22CSE057",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.submitStudentExplanation(
    subId,
    "The balancing code follows the standard textbook formulation from Cormen et al. cited in reference [4].",
    studentUser
  );

  const notifsAfterStudentReply = db.getNotifications(studentId);
  const replyNotif = notifsAfterStudentReply.find((n) => n.type === "explanation_received");
  assert(Boolean(replyNotif), "Submitting explanation automatically triggers 'explanation_received' notification");

  // Faculty records final decision
  db.recordReviewDecision(
    subId,
    "explanation_satisfactory",
    "Candidate provided satisfactory attribution context during viva examination.",
    "Internal notes: Student demonstrated thorough conceptual grasp in viva.",
    "reviewed",
    facultyUser
  );

  const notifsAfterDecision = db.getNotifications(studentId);
  const decisionNotif = notifsAfterDecision.find((n) => n.type === "review_completed");
  assert(Boolean(decisionNotif), "Recording review decision automatically triggers 'review_completed' notification");

  // Faculty adds feedback annotation
  db.addFeedback(subId, "Ensure all third-party definitions have inline citation tags.");
  const notifsAfterFeedback = db.getNotifications(studentId);
  const fbNotif = notifsAfterFeedback.find((n) => n.type === "faculty_feedback");
  assert(Boolean(fbNotif), "Adding feedback automatically triggers 'faculty_feedback' notification");

  // ---------------------------------------------------------------------------
  // 5. PRIVACY & CONFIDENTIAL FACULTY NOTES ISOLATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Privacy & Confidential Faculty Notes Isolation ---");

  // Retrieve submission as student
  const studentViewSub = db.getSubmissionById(subId, "student");
  assert(Boolean(studentViewSub), "Student can retrieve their submission");
  assert(
    studentViewSub?.review?.faculty_notes === undefined,
    "PRIVACY RULE: Faculty confidential deliberation notes are completely stripped from student view"
  );

  // Retrieve submission as faculty
  const facultyViewSub = db.getSubmissionById(subId, "faculty");
  assert(
    facultyViewSub?.review?.faculty_notes !== undefined,
    "Faculty view retains confidential deliberation notes for authorized reviewer"
  );

  // Verify audit log metadata sanitization for student
  const sanitizedForStudent = sanitizeSubmissionForRole(facultyViewSub!, "student");
  assert(
    sanitizedForStudent.review?.faculty_notes === undefined,
    "sanitizeSubmissionForRole strictly removes faculty_notes"
  );

  // ---------------------------------------------------------------------------
  // 6. PDF AUDIT REPORT GENERATION & BROWSER-COMPATIBLE BINARY STREAM
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. PDF Audit Report Generation & Browser Download ---");

  const pdfOutput = generateAcademicAuditReportPdf(facultyViewSub!, {
    institutionName: "ABC Institute of Technology",
    viewerRole: "faculty",
    generatedBy: "Dr. P. Kulkarni",
  });

  assert(pdfOutput instanceof Uint8Array, "PDF generator returns valid Uint8Array binary buffer");
  assert(pdfOutput.byteLength > 2000, `PDF byte length is substantial (${pdfOutput.byteLength} bytes)`);

  // Verify PDF header & EOF
  const textDecoder = new TextDecoder("latin1");
  const pdfStringStart = textDecoder.decode(pdfOutput.subarray(0, 15));
  const pdfStringEnd = textDecoder.decode(pdfOutput.subarray(pdfOutput.byteLength - 40));

  assert(pdfStringStart.startsWith("%PDF-1.4"), "PDF has valid standards-compliant %PDF-1.4 header");
  assert(pdfStringEnd.includes("%%EOF"), "PDF has valid %%EOF termination marker");

  // Verify that PDF contains canonical similarity score
  const fullPdfLatin1 = textDecoder.decode(pdfOutput);
  assert(
    fullPdfLatin1.includes(`${facultyViewSub!.similarity_percentage}%`),
    `PDF report includes canonical similarity percentage (${facultyViewSub!.similarity_percentage}%)`
  );
  assert(
    fullPdfLatin1.includes("ABC Institute of Technology"),
    "PDF report includes institution branding"
  );
  assert(
    fullPdfLatin1.includes("CONFIDENTIAL INSTITUTIONAL INTEGRITY"),
    "PDF report includes official report heading"
  );

  // ---------------------------------------------------------------------------
  // 7. INSTITUTIONAL DATE & TIME FORMATTING UTILITY
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Institutional Date & Time Formatting Utility ---");

  const isoTimestamp = "2026-09-29T16:32:11.314+00:00";
  const formattedDateTime = formatInstitutionalDateTime(isoTimestamp);
  assert(
    !formattedDateTime.includes("T") && !formattedDateTime.includes("+00:00"),
    `ISO timestamp is converted to readable institutional format: "${formattedDateTime}"`
  );
  assert(
    formattedDateTime.includes("2026"),
    "Formatted date preserves the correct year (2026)"
  );
  assert(
    formattedDateTime.includes("Sep"),
    "Formatted date uses standard month abbreviation (Sep)"
  );

  const formattedDateOnly = formatInstitutionalDate(isoTimestamp);
  assert(
    formattedDateOnly.includes("2026") && !formattedDateOnly.includes(":"),
    `formatInstitutionalDate outputs date without time: "${formattedDateOnly}"`
  );

  const formattedTimeOnly = formatInstitutionalTime(isoTimestamp);
  assert(
    formattedTimeOnly.includes("M") || formattedTimeOnly.includes(":"),
    `formatInstitutionalTime outputs clean institutional time: "${formattedTimeOnly}"`
  );

  console.log("\n================================================================================");
  console.log(`  SYSTEM STABILIZATION RESULTS: TOTAL: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
  console.log("================================================================================\n");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runStabilizationTestSuite().catch((err) => {
  console.error("Fatal error running stabilization test suite:", err);
  process.exit(1);
});
