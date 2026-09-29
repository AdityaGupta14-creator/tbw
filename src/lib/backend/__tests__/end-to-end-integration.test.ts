/**
 * VERITY ACADEMIC INTEGRITY DETECTION PLATFORM
 * Step 7: End-to-End Submission -> Analysis -> Evidence Integration Test Suite
 *
 * Scenarios A through T:
 * A. Upload valid PDF
 * B. Upload valid DOCX
 * C. Upload TXT
 * D. Empty document
 * E. Corrupt document
 * F. Submission creation
 * G. Processing state
 * H. Successful analysis persistence
 * I. Failed analysis persistence
 * J. Result retrieval
 * K. Similarity matches persistence
 * L. Source metadata persistence
 * M. Current submission self-exclusion
 * N. Student privacy
 * O. Faculty access
 * P. Unauthorized access (Cross-course isolation)
 * Q. Retry failed analysis
 * R. Provider failure does not fail core analysis
 * S. Offline analysis
 * T. End-to-end exact-copy submission
 */

import { db } from "../db";
import { verityApi } from "../../../services/verity-api";
import {
  processSubmissionDocument,
  validateDocumentFile,
} from "../submission-analysis-service";
import { SourceDiscoveryCoordinator } from "../similarity/source-discovery-coordinator";
import { InternalStudentCorpusProvider } from "../similarity/internal-student-provider";
import { LocalReferenceCorpusProvider } from "../similarity/local-reference-corpus";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
  }
}

async function runEndToEndIntegrationTests() {
  console.log("================================================================================");
  console.log("  VERITY STEP 7: END-TO-END SUBMISSION -> ANALYSIS -> EVIDENCE TEST SUITE");
  console.log("================================================================================");

  const baseAcademicReport =
    "Title: Comparative Evaluation of Concurrent Indexing Structures\n\n" +
    "1. Introduction\n" +
    "Modern storage engines demand high write throughput combined with bounded read amplification. " +
    "Self-balancing binary search trees such as AVL and Red-Black trees enforce logarithmic worst-case latency. " +
    "In contrast, Log-Structured Merge (LSM) trees trade point query efficiency for sequential write performance.\n\n" +
    "2. Empirical Methodology\n" +
    "We measured memory footprint and tail latency across one million random key insertions on a multi-core server. " +
    "Write amplification in LSM trees remained consistently lower than in B+ trees under write-heavy workloads.\n\n" +
    "References\n" +
    "[1] D. Comer, \"The Ubiquitous B-Tree,\" ACM Computing Surveys, 1979.\n" +
    "[2] P. O'Neil et al., \"The Log-Structured Merge-Tree,\" Acta Informatica, 1996.";

  // --- Scenario A: Upload valid PDF ---
  console.log("\n[Scenario A: Upload Valid PDF]");
  {
    const pdfContent =
      `%PDF-1.4\n1 0 obj\n<< /Length 200 >>\nstream\n` +
      `BT /F1 12 Tf (${baseAcademicReport.replace(/[\n\r]+/g, " ")}) Tj ET\nendstream\nendobj\n` +
      `xref\n0 2\n0000000000 65535 f\n0000000010 00000 n\ntrailer\n<< /Size 2 /Root 1 0 R >>\nstartxref\n300\n%%EOF`;

    const pdfFile = new File([pdfContent], "Research_Report_22CSE057.pdf", { type: "application/pdf" });
    const validation = validateDocumentFile(pdfFile);
    assert(validation.valid === true, "Scenario A: Valid PDF passed format validation");

    const output = await processSubmissionDocument({
      submissionId: "sub-pdf-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-22cse057",
      file: pdfFile,
    });
    assert(output.success === true, "Scenario A: PDF processed and text extracted successfully");
    assert(output.document.wordCount > 30, "Scenario A: Extracted substantial word count from PDF");
  }

  // --- Scenario B: Upload valid DOCX ---
  console.log("\n[Scenario B: Upload Valid DOCX]");
  {
    const docxXml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body><w:p><w:r><w:t>${baseAcademicReport.replace(/\n/g, " ")}</w:t></w:r></w:p></w:body></w:document>`;

    const docxFile = new File(
      [docxXml],
      "Engineering_Coursework.docx",
      { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }
    );
    const validation = validateDocumentFile(docxFile);
    assert(validation.valid === true, "Scenario B: Valid DOCX passed format validation");

    const output = await processSubmissionDocument({
      submissionId: "sub-docx-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-22cse057",
      file: docxFile,
    });
    assert(output.success === true, "Scenario B: DOCX processed successfully");
    assert(output.document.extractedText.includes("Log-Structured Merge"), "Scenario B: Preserved technical keywords in DOCX");
  }

  // --- Scenario C: Upload TXT ---
  console.log("\n[Scenario C: Upload TXT]");
  {
    const txtFile = new File([baseAcademicReport], "Report_Final.txt", { type: "text/plain" });
    const validation = validateDocumentFile(txtFile);
    assert(validation.valid === true, "Scenario C: Valid TXT passed format validation");

    const output = await processSubmissionDocument({
      submissionId: "sub-txt-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-22cse057",
      file: txtFile,
    });
    assert(output.success === true, "Scenario C: TXT processed cleanly");
    assert(output.document.paragraphs.length >= 2, "Scenario C: Structured paragraphs created from TXT");
  }

  // --- Scenario D: Empty Document ---
  console.log("\n[Scenario D: Empty Document]");
  {
    const emptyFile = new File([], "empty.txt", { type: "text/plain" });
    const validation = validateDocumentFile(emptyFile);
    assert(validation.valid === false, "Scenario D: Empty 0-byte file rejected by validator");
    assert(validation.error?.includes("0 bytes") === true, "Scenario D: Friendly error message returned for empty file");

    const output = await processSubmissionDocument({
      submissionId: "sub-empty-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-empty",
      file: emptyFile,
    });
    assert(output.success === false, "Scenario D: processSubmissionDocument failed gracefully");
    assert(output.status === "failed", "Scenario D: Submission marked with 'failed' lifecycle status");
  }

  // --- Scenario E: Corrupt / Unsupported Document ---
  console.log("\n[Scenario E: Corrupt Document]");
  {
    const invalidFile = new File([new Uint8Array([0x7f, 0x45, 0x4c, 0x46])], "executable.exe", {
      type: "application/x-msdownload",
    });
    const validation = validateDocumentFile(invalidFile);
    assert(validation.valid === false, "Scenario E: Unsupported file extension rejected");
    assert(validation.error?.includes("Unsupported file format") === true, "Scenario E: Clear institutional guidance provided");
  }

  // --- Scenario F: Submission Creation ---
  console.log("\n[Scenario F: Submission Creation]");
  let createdSubmissionId = "";
  {
    const file = new File([baseAcademicReport], "Lifecycle_Test.txt", { type: "text/plain" });
    const submission = await verityApi.submissions.submit({
      assignmentId: "asg-301-02",
      file,
      studentName: "Aditya Gupta",
      studentRoll: "22CSE057",
    });
    createdSubmissionId = submission.id;
    assert(Boolean(submission.id), "Scenario F: Submission created with unique ID");
    assert(submission.submission_code.startsWith("SUB-2026-"), "Scenario F: Official institutional receipt generated");
    assert(submission.student_name === "Aditya Gupta", "Scenario F: Student metadata associated");
  }

  // --- Scenario G: Processing State ---
  console.log("\n[Scenario G: Processing State]");
  {
    const stagesCaptured: string[] = [];
    const file = new File([baseAcademicReport], "Progress_Test.txt", { type: "text/plain" });
    const output = await processSubmissionDocument({
      submissionId: "sub-prog-test",
      assignmentId: "asg-301-02",
      studentId: "stu-001",
      file,
      onProgress: (stage) => stagesCaptured.push(stage),
    });

    assert(output.success === true, "Scenario G: Execution completed");
    assert(stagesCaptured.length >= 3, "Scenario G: Truthful intermediate processing stages reported");
    assert(stagesCaptured.some((s) => s.includes("Extracting")), "Scenario G: Extracted stage reported");
    assert(stagesCaptured.some((s) => s.includes("Comparing")), "Scenario G: Comparing stage reported");
  }

  // --- Scenario H: Successful Analysis Persistence ---
  console.log("\n[Scenario H: Successful Analysis Persistence]");
  {
    const sub = await verityApi.submissions.get(createdSubmissionId);
    assert(sub !== undefined, "Scenario H: Submission retrieved from persistence");
    assert(sub?.analysis !== undefined, "Scenario H: Analysis record attached");
    assert(sub?.analysis?.status === "completed", "Scenario H: Analysis marked as completed");
    assert(typeof sub?.similarity_percentage === "number", "Scenario H: Similarity percentage persisted");
  }

  // --- Scenario I: Failed Analysis Persistence ---
  console.log("\n[Scenario I: Failed Analysis Persistence]");
  {
    const output = await processSubmissionDocument({
      submissionId: "sub-fail-lifecycle",
      assignmentId: "asg-cse-301",
      studentId: "stu-fail",
      extractedText: "Too short", // Below 15 chars limit
    });
    assert(output.success === false, "Scenario I: Engine detected insufficient text");
    assert(output.status === "failed", "Scenario I: Output lifecycle status is 'failed'");
    assert(Boolean(output.errorMessage), "Scenario I: Diagnostic error message stored safely");
  }

  // --- Scenario J: Result Retrieval ---
  console.log("\n[Scenario J: Result Retrieval]");
  {
    const retrieved = await verityApi.submissions.get(createdSubmissionId);
    assert(retrieved?.id === createdSubmissionId, "Scenario J: Retrieved exact matching submission");
    assert(retrieved?.document?.file_name === "Lifecycle_Test.txt", "Scenario J: Associated document record loaded");
    assert(retrieved?.assignment_title !== undefined, "Scenario J: Assignment context loaded");
  }

  // --- Scenario K: Similarity Matches Persistence ---
  console.log("\n[Scenario K: Similarity Matches Persistence]");
  {
    // Register a peer submission in reference corpus
    const peerText =
      "Modern storage engines demand high write throughput combined with bounded read amplification. " +
      "Self-balancing binary search trees such as AVL and Red-Black trees enforce logarithmic worst-case latency.";

    const localRef = new LocalReferenceCorpusProvider([]);
    localRef.addTextDocument({
      corpusId: "ref-match-persistence",
      title: "Data Structures Reference Manual",
      text: peerText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const output = await processSubmissionDocument({
      submissionId: "sub-match-persist",
      assignmentId: "asg-cse-301",
      studentId: "stu-k",
      extractedText: baseAcademicReport,
      coordinator,
    });

    assert(output.analysis !== undefined, "Scenario K: Analysis generated");
    assert(output.analysis!.matches.length >= 1, "Scenario K: Granular similarity_matches rows constructed");
    const m = output.analysis!.matches[0]!;
    assert(typeof m.similarity_percentage === "number", "Scenario K: Match similarity percentage recorded");
    assert(m.evidence_level === "strong" || m.evidence_level === "moderate", "Scenario K: Evidence level recorded");
    assert(Array.isArray(m.matched_shingle_sizes), "Scenario K: Matched shingle sizes array present");
  }

  // --- Scenario L: Source Metadata Persistence ---
  console.log("\n[Scenario L: Source Metadata Persistence]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    localRef.addTextDocument({
      corpusId: "ref-metadata-check",
      title: "ACM Computing Surveys Vol 11",
      url: "https://dl.acm.org/doi/10.1145/356770.356776",
      text: baseAcademicReport,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const output = await processSubmissionDocument({
      submissionId: "sub-meta-persist",
      assignmentId: "asg-cse-301",
      studentId: "stu-l",
      extractedText: baseAcademicReport,
      coordinator,
    });

    const match = output.analysis?.matches[0];
    assert(match !== undefined, "Scenario L: Match found");
    assert(match?.source_title === "ACM Computing Surveys Vol 11", "Scenario L: Source title persisted");
    assert(match?.source_url === "https://dl.acm.org/doi/10.1145/356770.356776", "Scenario L: Source URL persisted");
    assert(match?.source_type === "internal_document", "Scenario L: Source type persisted");
  }

  // --- Scenario M: Current Submission Self-Exclusion ---
  console.log("\n[Scenario M: Current Submission Self-Exclusion]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    const subId = "sub-self-exclude-101";

    studentProvider.registerSubmission({
      id: subId,
      submissionCode: "SUB-EXCLUDE-101",
      studentId: "stu-m",
      status: "submitted",
      text: baseAcademicReport,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      subId,
      baseAcademicReport,
      { excludeSubmissionId: subId } // EXCLUDE SELF
    );

    const matchedSelf = result.matches.some((m) => m.sourceId === subId);
    assert(matchedSelf === false, "Scenario M: Submission cleanly excluded from matching its own past record");
  }

  // --- Scenario N: Student Privacy ---
  console.log("\n[Scenario N: Student Privacy]");
  {
    const peerStudent = {
      id: "sub-peer-privacy",
      studentName: "Secret Peer Name",
      studentRoll: "22CSE999",
      text: baseAcademicReport,
    };

    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: peerStudent.id,
      submissionCode: "SUB-PEER-999",
      studentId: "stu-secret",
      studentName: peerStudent.studentName,
      studentRoll: peerStudent.studentRoll,
      status: "submitted",
      text: peerStudent.text,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-viewer-test",
      baseAcademicReport,
      { userRole: "student", submittingStudentId: "stu-viewing" }
    );

    const match = result.matches.find((m) => m.sourceId === peerStudent.id);
    assert(match !== undefined, "Scenario N: Found peer match");
    assert(match?.author !== peerStudent.studentName, "Scenario N: Peer student full name hidden from student viewer");
    assert(!match?.author?.includes(peerStudent.studentRoll), "Scenario N: Peer roll number hidden from student viewer");
    assert(match?.author?.includes("Protected") === true, "Scenario N: Anonymized label applied");
  }

  // --- Scenario O: Faculty Access ---
  console.log("\n[Scenario O: Faculty Access]");
  {
    const peerStudent = {
      id: "sub-faculty-view",
      studentName: "Disclosed Student",
      studentRoll: "22CSE042",
      text: baseAcademicReport,
    };

    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: peerStudent.id,
      submissionCode: "SUB-FACULTY-042",
      studentId: "stu-disclosed",
      studentName: peerStudent.studentName,
      studentRoll: peerStudent.studentRoll,
      status: "submitted",
      text: peerStudent.text,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-faculty-test",
      baseAcademicReport,
      { userRole: "faculty" }
    );

    const match = result.matches.find((m) => m.sourceId === peerStudent.id);
    assert(match !== undefined, "Scenario O: Peer match found for faculty review");
    assert(match?.author?.includes("Disclosed Student") === true, "Scenario O: Faculty authorized to see student name");
    assert(match?.author?.includes("22CSE042") === true, "Scenario O: Faculty authorized to see student roll");
  }

  // --- Scenario P: Unauthorized Access (Cross-Course Isolation) ---
  console.log("\n[Scenario P: Unauthorized Access (Cross-Course Isolation)]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-other-course",
      submissionCode: "SUB-MECH-101",
      courseId: "course-mech-201",
      studentId: "stu-mech",
      status: "submitted",
      text: baseAcademicReport,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-cse-query",
      baseAcademicReport,
      { courseId: "course-cse-301" } // Course isolation filter
    );

    const crossCourseMatch = result.matches.some((m) => m.sourceId === "sub-other-course");
    assert(crossCourseMatch === false, "Scenario P: Submissions from other courses isolated when courseId filter is active");
  }

  // --- Scenario Q: Retry Failed Analysis ---
  console.log("\n[Scenario Q: Retry Failed Analysis]");
  {
    // Simulate a submission in local DB
    const failedSub = db.createAssignment({
      title: "Retryable Assignment",
    });

    const initial = await db.submitDocument({
      assignmentId: failedSub.id,
      file: new File([baseAcademicReport], "Retry_Test.txt", { type: "text/plain" }),
    });

    const retried = await verityApi.submissions.retryAnalysis(initial.id);
    assert(retried !== undefined, "Scenario Q: Retry executed without crashing");
    assert(retried?.id === initial.id, "Scenario Q: Same submission record preserved without creating duplicates");
    assert(retried?.status === "needs_review" || retried?.status === "reviewed", "Scenario Q: Status resolved to completed state");
  }

  // --- Scenario R: Provider Failure Resilience ---
  console.log("\n[Scenario R: Provider Failure Resilience]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    localRef.addTextDocument({
      corpusId: "healthy-ref-doc",
      title: "Healthy Reference Text",
      text: baseAcademicReport,
    });

    const faultyProvider = {
      id: "faulty-web-search",
      name: "Faulty Web Search Provider",
      category: "public_web" as const,
      searchCandidates: async () => {
        throw new Error("HTTP 503 Service Unavailable");
      },
      getSource: async () => null,
      health: async () => ({
        providerId: "faulty-web-search",
        name: "Faulty Web Search",
        category: "public_web" as const,
        available: false,
        isOfflineCapable: false,
        message: "Unavailable",
      }),
    };

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    coordinator.registerProvider(faultyProvider);

    const output = await processSubmissionDocument({
      submissionId: "sub-resilience-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-resilience",
      extractedText: baseAcademicReport,
      coordinator,
    });

    assert(output.success === true, "Scenario R: Overall submission analysis succeeded");
    assert(output.analysis?.matched_source_count! >= 1, "Scenario R: Healthy local corpus still matched");
  }

  // --- Scenario S: Offline Analysis ---
  console.log("\n[Scenario S: Offline Analysis]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    localRef.addTextDocument({
      corpusId: "offline-ref-corpus",
      title: "Offline Scientific Dataset",
      text: baseAcademicReport,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const health = await coordinator.checkAllHealth();
    const offlineCapable = health.filter((h) => h.isOfflineCapable);
    assert(offlineCapable.length > 0, "Scenario S: Offline providers report offline capability");

    const output = await processSubmissionDocument({
      submissionId: "sub-offline-test",
      assignmentId: "asg-cse-301",
      studentId: "stu-offline",
      extractedText: baseAcademicReport,
      coordinator,
    });

    assert(output.success === true, "Scenario S: Analysis executed with zero cloud API dependencies");
    assert(output.analysis?.similarity_percentage! >= 50, "Scenario S: Local similarity accurately calculated offline");
  }

  // --- Scenario T: End-to-End Exact Copy Submission ---
  console.log("\n[Scenario T: End-to-End Exact Copy Submission]");
  {
    const originalText =
      "Self-balancing variants such as AVL trees and Red-Black trees maintain logarithmic worst-case bounds. " +
      "AVL trees enforce strict balance factor limits between minus one and plus one for all subtrees. " +
      "When an insertion causes an imbalance, one of four rotation operations restores tree balance in O(1) time.";

    const localRef = new LocalReferenceCorpusProvider([]);
    localRef.addTextDocument({
      corpusId: "original-textbook-chapter",
      title: "Algorithms Handbook Section 4.2",
      text: originalText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const output = await processSubmissionDocument({
      submissionId: "sub-exact-copy-t",
      assignmentId: "asg-cse-301",
      studentId: "stu-exact-copy",
      extractedText: originalText,
      coordinator,
    });

    assert(output.success === true, "Scenario T: Submission processed");
    assert(output.analysis?.similarity_percentage! >= 80, "Scenario T: Exact copy flagged with high similarity (>= 80%)");
    assert(output.status === "needs_review", "Scenario T: High similarity flagged for mandatory faculty review");
    assert(output.analysis?.evidence_breakdown.strong_percentage! > 0, "Scenario T: Strong evidence classified");
  }

  console.log("\n================================================================================");
  console.log(`  STEP 7 INTEGRATION TESTS: TOTAL: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEndToEndIntegrationTests().catch((err) => {
  console.error("FATAL: End-to-end integration test run crashed:", err);
  process.exit(1);
});
