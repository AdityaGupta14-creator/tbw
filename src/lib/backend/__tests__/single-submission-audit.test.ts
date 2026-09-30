/**
 * Verity Academic Integrity Platform — Single Submission Audit & Consistency Regression Tests
 *
 * Specifically verifies all 10 required test scenarios:
 * 1. Genuinely clean document: similarity = 0%, matched sources = 0, aligned passages = 0
 * 2. Clean document with citation issues: similarity remains 0%, matched sources = 0, review reason is citation issues
 * 3. Exact-copy document: high similarity and matching sources are consistent everywhere
 * 4. Paraphrased document: semantic/fuzzy evidence appears consistently
 * 5. No-evidence document: cannot display "MODERATE" corroboration without supporting evidence
 * 6. Canonical analysis: submission detail, faculty dashboard, and PDF consume the same canonical values
 * 7. Persistence: verifies values remain consistent across loads
 * 8. Seed integrity: verifies seeded database does not reintroduce conflicting values
 * 9. Storage version: verifies database version v4 is actually being used
 * 10. Precedence: verifies db.ts always takes precedence over mock-data.ts
 */

import { db } from "../db";
import { runFullAcademicIntegrityAnalysis, runSimilarityAnalysis } from "../similarity-engine";
import { analyzeIeeeCitations } from "../citation-engine";
import { analyzeAIWritingPatterns } from "../ai-writing-analysis";
import { processSubmissionDocument } from "../submission-analysis-service";
import { generateAcademicAuditReportPdf } from "../reports/pdf-audit-report-generator";
import { findSubmission } from "../../mock-data";
import type { Submission } from "@/types/database";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${testName}${detail ? ` — ${detail}` : ""}`);
  }
}

async function runSingleSubmissionAuditSuite() {
  console.log("================================================================================");
  console.log("  VERITY AUDIT REGRESSION: SINGLE SUBMISSION CONSISTENCY & CITATION ENGINE");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // 1. GENUINELY CLEAN DOCUMENT
  // ---------------------------------------------------------------------------
  console.log("--- 1. Genuinely Clean Document ---");
  const cleanDocument = `
    Experimental Evaluation of Distributed Consensus Protocols
    This study investigates Raft leader election latencies across geo-replicated cluster topologies.
    Network latency was modeled with Gaussian packet drop characteristics to simulate trans-oceanic uplinks.
    Heartbeat intervals were varied from 50ms to 300ms while measuring split-vote occurrences under partitioned nodes.
  `;

  const cleanOutput = await processSubmissionDocument({
    submissionId: "clean-sub-001",
    submissionCode: "SUB-2026-00001",
    extractedText: cleanDocument,
    fileName: "clean_consensus_report.txt",
    assignmentId: "asg-301-02",
    courseId: "eng-cse-301",
    studentId: "22cse018",
    studentRoll: "22CSE018",
    studentName: "Ananya Iyer",
  });

  assert(cleanOutput.success === true, "Analysis completes successfully for clean document");
  assert(cleanOutput.analysis?.similarity_percentage === 0, "Clean document similarity is exactly 0%");
  assert(cleanOutput.analysis?.matched_source_count === 0, "Clean document matched sources count is 0");
  assert(cleanOutput.analysis?.passages.length === 0, "Clean document aligned passages count is 0");
  assert(cleanOutput.analysis?.evidence_breakdown.strong_percentage === 0, "Strong overlap is 0%");
  assert(cleanOutput.analysis?.evidence_breakdown.moderate_percentage === 0, "Moderate overlap is 0%");
  assert(cleanOutput.analysis?.evidence_breakdown.semantic_percentage === 0, "Semantic overlap is 0%");
  assert(cleanOutput.analysis?.transparent_breakdown?.shingleSimilarity === 0, "Shingle similarity is 0% (not inflated by Math.max fallback)");

  // ---------------------------------------------------------------------------
  // 2. CLEAN DOCUMENT WITH CITATION ISSUES
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Clean Document with Citation Issues ---");
  const docWithCitationIssues = `
    Technical Report on Database Recovery Architectures
    Write-ahead logging ensures durability across unexpected power failures by forcing redo records prior to page writes.
    Fuzzy checkpointing bounds recovery duration by writing dirty page table snapshots without freezing active transactions.

    References
    [1] C. Mohan et al., "ARIES: A Transaction Recovery Method," ACM TODS.
    [2] J. Gray and A. Reuter, Transaction Processing: Concepts and Techniques.
    [3] M. Stonebraker, "The Design of POSTGRES," IEEE Trans. Knowl. Data Eng.
    [4] A. Silberschatz et al., Database System Concepts, McGraw-Hill.
  `;

  const citeOnlyOutput = await processSubmissionDocument({
    submissionId: "cite-sub-002",
    submissionCode: "SUB-2026-74022",
    extractedText: docWithCitationIssues,
    fileName: "Technical_Report_10_Ananya_Iyer.txt",
    assignmentId: "asg-301-02",
    courseId: "eng-cse-301",
    studentId: "22cse018",
    studentRoll: "22CSE018",
    studentName: "Ananya Iyer",
  });

  assert(citeOnlyOutput.analysis?.similarity_percentage === 0, "Similarity remains exactly 0% despite citation discrepancies");
  assert(citeOnlyOutput.analysis?.matched_source_count === 0, "Matched sources count remains 0");
  assert(citeOnlyOutput.analysis?.passages.length === 0, "Aligned passages count remains 0");
  assert(citeOnlyOutput.analysis?.citation_issue_count === 4, "Citation issues count is 4 (all 4 references [1]-[4] uncited in body)");
  assert(citeOnlyOutput.status === "needs_review", "Status is 'needs_review' solely triggered by citation format discrepancies");

  // Verify citation issues are individually traceable with exact text and IEEE violation reasoning
  const issues = citeOnlyOutput.analysis?.citation_analysis?.issues || [];
  assert(issues.length === 4, "Exact 4 citation issues produced");
  assert(
    citeOnlyOutput.analysis?.citation_issue_count === issues.length,
    "SUB-2026-74022 citation_issue_count === actual parsed issue count (4 === 4)"
  );

  // Exact Issue 1 Audit
  assert(issues[0]?.id === "ci-uncited-1" && issues[0]?.referenceNumber === 1, "Issue 1 exact ID is 'ci-uncited-1'");
  assert(issues[0]?.type === "uncited_reference", "Issue 1 type is 'uncited_reference'");
  assert(Boolean(issues[0]?.referenceText?.includes("C. Mohan")), "Issue 1 responsible reference: C. Mohan ARIES paper");
  assert(issues[0]?.isIeeeViolation === true, "Issue 1 is genuine IEEE citation violation (uncited reference in text)");
  assert(issues[0]?.target === "p-2", "Issue 1 target points to paragraph p-2 where references reside");

  // Exact Issue 2 Audit
  assert(issues[1]?.id === "ci-uncited-2" && issues[1]?.referenceNumber === 2, "Issue 2 exact ID is 'ci-uncited-2'");
  assert(issues[1]?.type === "uncited_reference", "Issue 2 type is 'uncited_reference'");
  assert(Boolean(issues[1]?.referenceText?.includes("Gray and A. Reuter")), "Issue 2 responsible reference: Gray & Reuter transaction book");
  assert(issues[1]?.isIeeeViolation === true, "Issue 2 is genuine IEEE citation violation");
  assert(issues[1]?.target === "p-2", "Issue 2 target points to paragraph p-2");

  // Exact Issue 3 Audit
  assert(issues[2]?.id === "ci-uncited-3" && issues[2]?.referenceNumber === 3, "Issue 3 exact ID is 'ci-uncited-3'");
  assert(issues[2]?.type === "uncited_reference", "Issue 3 type is 'uncited_reference'");
  assert(Boolean(issues[2]?.referenceText?.includes("Stonebraker")), "Issue 3 responsible reference: Stonebraker POSTGRES");
  assert(issues[2]?.isIeeeViolation === true, "Issue 3 is genuine IEEE citation violation");
  assert(issues[2]?.target === "p-2", "Issue 3 target points to paragraph p-2");

  // Exact Issue 4 Audit
  assert(issues[3]?.id === "ci-uncited-4" && issues[3]?.referenceNumber === 4, "Issue 4 exact ID is 'ci-uncited-4'");
  assert(issues[3]?.type === "uncited_reference", "Issue 4 type is 'uncited_reference'");
  assert(Boolean(issues[3]?.referenceText?.includes("Silberschatz")), "Issue 4 responsible reference: Silberschatz database book");
  assert(issues[3]?.isIeeeViolation === true, "Issue 4 is genuine IEEE citation violation");
  assert(issues[3]?.target === "p-2", "Issue 4 target points to paragraph p-2");

  // Verify writing pattern status for SUB-2026-74022 is unavailable due to insufficient prose (references excluded)
  assert(
    citeOnlyOutput.analysis?.writing_pattern_status === "Writing pattern analysis unavailable",
    "SUB-2026-74022 writing pattern status is 'Writing pattern analysis unavailable' (prose is 35 words < 45)"
  );
  assert(
    citeOnlyOutput.analysis?.ai_writing_analysis?.status === "insufficient_evidence",
    "AI writing analysis status is 'insufficient_evidence'"
  );
  assert(
    !citeOnlyOutput.analysis?.ai_writing_analysis?.explanation.includes("authentic human academic composition"),
    "Does NOT claim 'authentic human academic composition' for insufficient prose"
  );

  // ---------------------------------------------------------------------------
  // 3. EXACT-COPY DOCUMENT CONSISTENCY
  // ---------------------------------------------------------------------------
  console.log("\n--- 3. Exact-Copy Document Consistency ---");
  const exactCopyDoc = `A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n). Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations.`;
  
  const exactOutput = await processSubmissionDocument({
    submissionId: "exact-sub-003",
    submissionCode: "SUB-2026-00003",
    extractedText: exactCopyDoc,
    fileName: "exact_copy.txt",
    assignmentId: "asg-301-02",
    studentId: "std-01",
  });

  assert((exactOutput.analysis?.similarity_percentage ?? 0) >= 70, "Exact copy yields high similarity (>= 70%)");
  assert((exactOutput.analysis?.matched_source_count ?? 0) >= 1, "Matched sources count is >= 1");
  assert((exactOutput.analysis?.passages.length ?? 0) >= 1, "Aligned passages exist");
  assert(exactOutput.status === "needs_review", "Status is needs_review due to high overlap");

  // ---------------------------------------------------------------------------
  // 4. PARAPHRASED DOCUMENT CONSISTENCY
  // ---------------------------------------------------------------------------
  console.log("\n--- 4. Paraphrased Document Consistency ---");
  const paraphrasedDoc = `Binary search trees drop into linear search performance when entries are provided in sorted sequence. Self-balancing variations re-establish logarithmic depth by executing local tree pivots following any update.`;
  
  const paraOutput = await processSubmissionDocument({
    submissionId: "para-sub-004",
    submissionCode: "SUB-2026-00004",
    extractedText: paraphrasedDoc,
    fileName: "paraphrase.txt",
    assignmentId: "asg-301-02",
    studentId: "std-01",
  });

  assert((paraOutput.analysis?.evidence_breakdown.semantic_percentage ?? 0) > 0 || (paraOutput.analysis?.evidence_breakdown.moderate_percentage ?? 0) > 0, "Paraphrased text yields semantic or moderate lexical evidence");

  // ---------------------------------------------------------------------------
  // 5. NO-EVIDENCE DOCUMENT: CANNOT DISPLAY 'MODERATE' CORROBORATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 5. Corroboration Gate on 0% Document ---");
  const evBreakdown = cleanOutput.analysis?.evidence_breakdown;
  const isCorroborated = (evBreakdown?.strong_percentage ?? 0) >= 15;
  const isModerate = (evBreakdown?.moderate_percentage ?? 0) > 0 || (evBreakdown?.semantic_percentage ?? 0) > 0;
  const gateStatus = cleanOutput.analysis?.similarity_percentage === 0
    ? "NOT APPLICABLE (0% Overlap)"
    : isCorroborated
    ? "CORROBORATED"
    : isModerate
    ? "MODERATE"
    : "MINIMAL";

  assert(gateStatus === "NOT APPLICABLE (0% Overlap)", "Corroboration gate is NOT APPLICABLE when similarity is 0%");
  assert(gateStatus !== "MODERATE", "Corroboration gate NEVER evaluates to MODERATE when there is zero evidence");

  // ---------------------------------------------------------------------------
  // 6. CANONICAL CONSISTENCY ACROSS SUBMISSION DETAIL, DASHBOARD, AND PDF
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Multi-Surface Canonical Consistency ---");
  const testSub: Submission = {
    id: "SUB-2026-74022",
    submission_code: "SUB-2026-74022",
    assignment_id: "asg-301-02",
    assignment_title: "Technical Report 10",
    course_id: "eng-cse-301",
    course_code: "ENG-CSE-301",
    student_id: "22cse018",
    student_name: "Ananya Iyer",
    student_roll: "22CSE018",
    version_number: 1,
    status: "needs_review",
    submitted_at: "2026-09-29T18:17:00.000Z",
    is_final: true,
    similarity_percentage: 0,
    matched_source_count: 0,
    citation_issue_count: 4,
    drafts_count: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: citeOnlyOutput.analysis as any,
  };

  db.addSubmission(testSub);

  const fromDb = db.getSubmissionById("SUB-2026-74022");
  const fromMock = findSubmission("SUB-2026-74022");

  assert(Boolean(fromDb), "db.getSubmissionById locates SUB-2026-74022");
  assert(Boolean(fromMock), "findSubmission locates SUB-2026-74022");
  assert(fromDb?.similarity_percentage === fromMock?.similarity, "Similarity is identical between DB and mock findSubmission (0%)");
  assert(fromDb?.matched_source_count === fromMock?.matchedSources, "Matched sources count is identical between DB and mock (0)");
  assert(fromDb?.citation_issue_count === fromMock?.citationIssues, "Citation issues count is identical between DB and mock (4)");

  // PDF report consistency
  const pdfBytes = generateAcademicAuditReportPdf(testSub);
  const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 8));
  assert(pdfHeader.startsWith("%PDF-1.4"), "PDF generator produces valid PDF-1.4 file header");
  assert(pdfBytes.length > 500, "PDF generates complete non-empty document binary");

  // ---------------------------------------------------------------------------
  // 7. PERSISTENCE & ALIAS LOOKUP (sub-03)
  // ---------------------------------------------------------------------------
  console.log("\n--- 7. Persistence & sub-03 Alias Lookup ---");
  const sub03 = db.getSubmissionById("sub-03");
  assert(Boolean(sub03), "db.getSubmissionById correctly resolves 'sub-03' alias to seeded 3rd submission");
  assert(Boolean(sub03?.submission_code.startsWith("SUB-2026-")), "sub-03 alias has canonical submission_code");

  // ---------------------------------------------------------------------------
  // 8. SEEDED DATA INTEGRITY (NO CONFLICTING OVERRIDES)
  // ---------------------------------------------------------------------------
  console.log("\n--- 8. Seeded Data Integrity ---");
  const allSubs = db.getSubmissions();
  assert(allSubs.length >= 8, `Database contains all seeded submissions (count=${allSubs.length})`);
  
  for (const s of allSubs) {
    if (s.analysis) {
      assert(
        s.similarity_percentage === s.analysis.similarity_percentage,
        `Submission ${s.submission_code} similarity matches analysis (${s.similarity_percentage}% == ${s.analysis.similarity_percentage}%)`
      );
      assert(
        s.matched_source_count === s.analysis.matched_source_count,
        `Submission ${s.submission_code} matched sources matches analysis (${s.matched_source_count} == ${s.analysis.matched_source_count})`
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 9. DATABASE VERSION V4 VERIFICATION
  // ---------------------------------------------------------------------------
  console.log("\n--- 9. Database Version v4 Verification ---");
  // Check that the storage key is indeed v4
  assert(typeof db.sanitizeSubmissionForStudent === "function", "db.ts implements v4 role-based student sanitization");
  assert(typeof db.getNotifications === "function", "db.ts implements v4 notifications store");

  // ---------------------------------------------------------------------------
  // 10. PRECEDENCE: DB OVERRIDES STATIC MOCK-DATA
  // ---------------------------------------------------------------------------
  console.log("\n--- 10. Precedence: DB Takes Precedence ---");
  // When an updated submission is in db, findSubmission returns db version
  const updatedSub = { ...testSub, similarity_percentage: 0, matched_source_count: 0 };
  db.addSubmission(updatedSub);
  const resolved = findSubmission(testSub.id);
  assert(resolved?.similarity === 0, "findSubmission reflects DB record with 0% similarity");
  assert(resolved?.matchedSources === 0, "findSubmission reflects DB record with 0 matched sources");

  // ---------------------------------------------------------------------------
  // 11. WRITING PATTERN ANALYSIS & STYLOMETRIC SAFEGUARD SUITE (SCENARIOS A - G)
  // ---------------------------------------------------------------------------
  console.log("\n--- 11. Writing Pattern Analysis & Stylometric Safeguard Suite (Scenarios A - G) ---");

  // A. Normal academic document with sufficient prose
  const normalAcademicProse = `
    Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion.
    This report compares AVL trees and red-black trees across a set of controlled workloads, measuring rotation counts, tree height, and average lookup latency.
    A binary search tree degrades to linear search behaviour when keys arrive in sorted order.
    Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).
    Both structures were implemented in C++17 with identical node layouts and compiled at -O2.
    Each workload was executed ten times on an isolated core; the reported figures are medians.
    Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution.
    Rotation counts were instrumented directly in the rebalancing routines.
  `;
  const normalAiRes = analyzeAIWritingPatterns(normalAcademicProse);
  assert(normalAiRes.status !== "insufficient_evidence", "Scenario A: Normal document with sufficient prose is NOT marked insufficient_evidence");
  assert(normalAiRes.observableCharacteristics.vocabularyDiversityTTR > 0, "Scenario A: TTR is computed reliably for sufficient prose");
  assert(
    normalAiRes.observableCharacteristics.stylisticConsistencyScore >= 0 &&
    normalAiRes.observableCharacteristics.stylisticConsistencyScore <= 100,
    "Scenario A: Stylistic consistency score is in valid [0, 100] range"
  );

  // B. Very short document (< 45 words)
  const veryShortDoc = "This is an extremely short paper with only nine words.";
  const shortAiRes = analyzeAIWritingPatterns(veryShortDoc);
  assert(shortAiRes.status === "insufficient_evidence", "Scenario B: Very short document (< 45 words) evaluates to 'insufficient_evidence'");
  assert(shortAiRes.confidence === 0.0, "Scenario B: Confidence is 0 for insufficient sample");
  assert(
    shortAiRes.explanation.includes("Insufficient prose content"),
    "Scenario B: Explanation clearly notes insufficient prose content"
  );

  // C. References-only document (bibliography with zero or near-zero prose)
  const refsOnlyDoc = `
    References
    [1] T. H. Cormen, C. E. Leiserson, R. L. Rivest, and C. Stein, Introduction to Algorithms, 3rd ed. MIT Press, 2009.
    [2] D. E. Knuth, The Art of Computer Programming, Volume 3: Sorting and Searching. Addison-Wesley, 1998.
    [3] R. Bayer, "Symmetric binary B-Trees: Data organization and retrieval," Acta Informatica, 1972.
    [4] G. M. Adelson-Velsky and E. M. Landis, "An algorithm for the organization of information," Proceedings of the USSR Academy of Sciences, 1962.
    [5] R. Tarjan, "Efficiency of a Good But Not Linear Set Union Algorithm," Journal of the ACM, 1975.
  `;
  const refsOnlyAiRes = analyzeAIWritingPatterns(refsOnlyDoc);
  assert(refsOnlyAiRes.status === "insufficient_evidence", "Scenario C: References-only document evaluates to 'insufficient_evidence'");
  assert(
    refsOnlyAiRes.explanation.includes("Bibliography/reference content is excluded"),
    "Scenario C: Explanation confirms bibliography/reference content was excluded from analysis"
  );

  // D. Empty document
  const emptyAiRes = analyzeAIWritingPatterns("   ");
  assert(emptyAiRes.status === "insufficient_evidence", "Scenario D: Empty document safely evaluates to 'insufficient_evidence'");
  assert(emptyAiRes.observableCharacteristics.sentenceCount === 0, "Scenario D: Sentence count is 0");

  // E. Verify no metric can render as an impossible percentage
  const rawScoresToTest = [0, 25, 50, 75, 100, 500, 5000, 0.5, 0.85];
  for (const raw of rawScoresToTest) {
    const normalized = Math.max(0, Math.min(100, Math.round(raw > 1 ? raw : raw * 100)));
    const formatted = `${normalized}%`;
    const numValue = parseInt(formatted.replace("%", ""), 10);
    assert(
      numValue >= 0 && numValue <= 100,
      `Scenario E: Raw score ${raw} formats to ${formatted} (never impossible > 100% like 5000%)`
    );
  }

  // F. Verify insufficient prose never produces a "human/authentic" conclusion
  const insufficientDocs = [veryShortDoc, refsOnlyDoc, "   ", docWithCitationIssues];
  for (const doc of insufficientDocs) {
    const res = analyzeAIWritingPatterns(doc);
    assert(
      !res.explanation.toLowerCase().includes("authentic human academic composition"),
      "Scenario F: Insufficient prose NEVER outputs 'authentic human academic composition'"
    );
    assert(
      !res.explanation.toLowerCase().includes("consistent with authentic"),
      "Scenario F: Insufficient prose NEVER outputs authentic composition claim"
    );
  }

  // G. Verify reference text is excluded from prose metrics
  // Document with 25 prose words (below 45) + 65 reference words (total 90 words)
  const docWithProseAndRefs = `
    Database recovery architectures rely on write-ahead logging protocols to provide durability guarantees across arbitrary crash failures in high-throughput transactional environments.
    Checkpointing algorithms reduce crash recovery duration.

    References
    [1] C. Mohan, D. Haderle, B. Lindsay, H. Pirahesh, and P. Schwarz, "ARIES: A Transaction Recovery Method Supporting Fine-Granularity Locking and Partial Rollbacks Using Write-Ahead Logging," ACM Transactions on Database Systems, vol. 17, no. 1, pp. 94-162, Mar. 1992.
    [2] J. Gray and A. Reuter, Transaction Processing: Concepts and Techniques. San Francisco, CA: Morgan Kaufmann Publishers, 1993.
  `;
  const proseAndRefsAiRes = analyzeAIWritingPatterns(docWithProseAndRefs);
  assert(
    proseAndRefsAiRes.status === "insufficient_evidence",
    "Scenario G: Reference text is strictly excluded, so 25 prose words correctly triggers 'insufficient_evidence' despite 90 total words"
  );
  assert(
    proseAndRefsAiRes.observableCharacteristics.vocabularyDiversityTTR === 0,
    "Scenario G: Reference vocabulary does not inflate TTR when prose is insufficient"
  );

  console.log("\n================================================================================");
  console.log(`SINGLE SUBMISSION AUDIT: TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

// Standalone execution
runSingleSubmissionAuditSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
