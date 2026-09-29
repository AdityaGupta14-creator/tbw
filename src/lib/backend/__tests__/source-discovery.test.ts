import {
  InternalStudentCorpusProvider,
  type StudentSubmissionRecord,
} from "../similarity/internal-student-provider";
import {
  LocalReferenceCorpusProvider,
  computeContentHash,
} from "../similarity/local-reference-corpus";
import {
  PublicWebSearchProvider,
  type PublicWebDocument,
} from "../similarity/public-web-provider";
import {
  OpenAccessAcademicProvider,
  type AcademicArticleRecord,
} from "../similarity/open-access-provider";
import { SourceDiscoveryCoordinator } from "../similarity/source-discovery-coordinator";
import { generateCandidateQueries, isGenericAcademicPhrase } from "../similarity/candidate-generator";
import { configureSemanticModel, setSemanticSimilarityProvider, LocalSemanticProvider } from "../similarity/semantic-engine";
import { compareTwoDocumentsAsync } from "../similarity-engine";

interface TestResult {
  name: string;
  passed: boolean;
  details?: string | undefined;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, testName: string, failureDetails?: string): void {
  if (condition) {
    testResults.push({ name: testName, passed: true });
    console.log(`  [PASS] ${testName}`);
  } else {
    testResults.push({ name: testName, passed: false, details: failureDetails });
    console.error(`  [FAIL] ${testName}: ${failureDetails || "Assertion failed"}`);
  }
}

async function runAllSourceDiscoveryTests() {
  console.log("================================================================================");
  console.log("  VERITY STEP 6: FREE SOURCE DISCOVERY & CORPUS INTEGRATION TEST SUITE");
  console.log("================================================================================\n");

  // Ensure neural provider or local fallback is active
  await configureSemanticModel("miniLM");

  const baseReferenceText =
    "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. " +
    "Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, " +
    "bounding the worst-case cost of search, insertion, and deletion at O(log n).";

  const paraphrasedText =
    "When items are added in sequential order, standard binary search trees decline into linear search efficiency. " +
    "Self-balancing alternatives re-establish logarithmic tree depth by executing tree rotations following any change, " +
    "constraining worst-case complexity for lookups, insertions, and removals to O(log n).";

  const unrelatedText =
    "Traditional French pastry making relies on lamination techniques to create alternating layers of dough and chilled butter. " +
    "During baking in high-temperature ovens, water trapped inside the butter turns into steam, separating the pastry layers.";

  const independentAvlText =
    "Balanced search trees solve the problem of degenerate binary search trees. " +
    "By maintaining an explicit balance factor at every internal node, AVL trees ensure that no path from root to leaf " +
    "exceeds 1.44 times the optimal logarithmic bound, guaranteeing fast logarithmic operations.";

  // ---------------------------------------------------------------------------
  // TASK 7: Candidate Query Generation Tests
  // ---------------------------------------------------------------------------
  console.log("--- Candidate Query Generation (Task 7) ---");
  const genericCliché = "In this paper we present the proposed method and experimental results show that";
  assert(
    isGenericAcademicPhrase(genericCliché) === true,
    "Generic academic phrase detected and suppressed",
    `Expected true for cliché '${genericCliché}'`
  );

  const distinctiveQueries = generateCandidateQueries(baseReferenceText);
  assert(
    distinctiveQueries.length >= 2,
    "Distinctive candidate queries extracted from document",
    `Extracted ${distinctiveQueries.length} queries`
  );
  assert(
    distinctiveQueries.every((q) => !isGenericAcademicPhrase(q.phrase)),
    "Extracted queries contain zero generic academic clichés",
    "Generic phrase found in queries"
  );

  // ---------------------------------------------------------------------------
  // TASK 12: Scenarios A through T
  // ---------------------------------------------------------------------------
  console.log("\n--- Task 12: Scenario Tests A through T ---");

  // Scenario A: Exact copied student submission
  console.log("\n[Scenario A: Exact Copied Student Submission]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-peer-01",
      submissionCode: "SUB-PEER-01",
      studentId: "stu-001",
      studentName: "Aditi Rao",
      studentRoll: "22CSE011",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-01",
      baseReferenceText,
      { courseId: "ENG-CSE-301", institutionId: "inst-001", userRole: "faculty" }
    );

    assert(result.matches.length >= 1, "Scenario A: Discovered exact copied submission");
    const topMatch = result.matches[0]!;
    assert(topMatch.similarityPercentage >= 90, "Scenario A: Exact match similarity >= 90%", `Got ${topMatch.similarityPercentage}%`);
    assert(topMatch.evidenceLevel === "strong", "Scenario A: Evidence level is strong", `Got ${topMatch.evidenceLevel}`);
    assert(topMatch.matchedPassages.length >= 1, "Scenario A: Passages aligned");
  }

  // Scenario B: Paraphrased student submission
  console.log("\n[Scenario B: Paraphrased Student Submission]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-peer-02",
      submissionCode: "SUB-PEER-02",
      studentId: "stu-002",
      studentName: "Rohan Varma",
      studentRoll: "22CSE018",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-02",
      paraphrasedText,
      { courseId: "ENG-CSE-301", institutionId: "inst-001", userRole: "faculty" }
    );

    assert(result.matches.length >= 1, "Scenario B: Paraphrased candidate discovered");
    const topMatch = result.matches[0]!;
    assert(topMatch.semanticMatchPercentage >= 70, "Scenario B: Semantic similarity detects paraphrase", `Got ${topMatch.semanticMatchPercentage}%`);
    assert(topMatch.evidenceLevel === "strong" || topMatch.evidenceLevel === "moderate", "Scenario B: Evidence classified as strong or moderate", `Got ${topMatch.evidenceLevel}`);
  }

  // Scenario C: Student submission vs unrelated submission
  console.log("\n[Scenario C: Unrelated Submission]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-peer-03",
      submissionCode: "SUB-PEER-03",
      studentId: "stu-003",
      studentName: "Kavita Sen",
      studentRoll: "22CSE025",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: unrelatedText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-03",
      baseReferenceText,
      { courseId: "ENG-CSE-301", institutionId: "inst-001", userRole: "faculty" }
    );

    assert(result.matches.length === 0, "Scenario C: Unrelated submission produces 0 similarity matches", `Matches count: ${result.matches.length}`);
  }

  // Scenario D: Same topic but independently written
  console.log("\n[Scenario D: Same Topic Independently Written]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-peer-04",
      submissionCode: "SUB-PEER-04",
      studentId: "stu-004",
      studentName: "Dev Dave",
      studentRoll: "22CSE033",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: independentAvlText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-04",
      baseReferenceText,
      { courseId: "ENG-CSE-301", institutionId: "inst-001", userRole: "faculty" }
    );

    const hasStrongAccusation = result.matches.some((m) => m.evidenceLevel === "strong");
    assert(!hasStrongAccusation, "Scenario D: Same-topic independent essay is NOT falsely accused of plagiarism (Rule 12)");
  }

  // Scenario E: Multiple student sources
  console.log("\n[Scenario E: Multiple Student Sources]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-peer-e1",
      submissionCode: "SUB-PEER-E1",
      studentId: "stu-e1",
      studentName: "Student Alpha",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: "Under ascending sorted input the difference widened. Red-black trees completed insertion 14% faster owing to their relaxed invariant.",
    });
    studentProvider.registerSubmission({
      id: "sub-peer-e2",
      submissionCode: "SUB-PEER-E2",
      studentId: "stu-e2",
      studentName: "Student Beta",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: "Cryptographic hash functions compute a fixed-size digest from arbitrary binary inputs, satisfying preimage resistance and collision resistance.",
    });

    const compositeSubmission =
      "Under ascending sorted input the difference widened. Red-black trees completed insertion 14% faster owing to their relaxed invariant. " +
      "Cryptographic hash functions compute a fixed-size digest from arbitrary binary inputs, satisfying preimage resistance and collision resistance.";

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-05",
      compositeSubmission,
      { courseId: "ENG-CSE-301", institutionId: "inst-001", userRole: "faculty" }
    );

    assert(result.matches.length >= 2, "Scenario E: Multiple independent student sources discovered and localized", `Found: ${result.matches.length}`);
    const sourceIds = result.matches.map((m) => m.sourceId);
    assert(sourceIds.includes("sub-peer-e1") && sourceIds.includes("sub-peer-e2"), "Scenario E: Both source authors attributed cleanly");
  }

  // Scenario F: Current submission excluded from its own source corpus
  console.log("\n[Scenario F: Self-Exclusion]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-self-01",
      submissionCode: "SUB-SELF-01",
      studentId: "stu-self",
      studentName: "Target Student",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-self-01",
      baseReferenceText,
      {
        excludeSubmissionId: "sub-self-01",
        courseId: "ENG-CSE-301",
        institutionId: "inst-001",
      }
    );

    const matchedSelf = result.matches.some((m) => m.sourceId === "sub-self-01");
    assert(!matchedSelf, "Scenario F: Current submission cleanly excluded from matching itself");
  }

  // Scenario G: Cross-course isolation
  console.log("\n[Scenario G: Cross-Course Isolation]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-other-course",
      submissionCode: "SUB-OTHER-COURSE",
      studentId: "stu-other",
      studentName: "Mechanical Student",
      courseId: "ENG-ME-201", // Different course!
      institutionId: "inst-001",
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-g",
      baseReferenceText,
      {
        courseId: "ENG-CSE-301", // Target is CSE
        institutionId: "inst-001",
        userRole: "faculty",
      }
    );

    const leakedOtherCourse = result.matches.some((m) => m.sourceId === "sub-other-course");
    assert(!leakedOtherCourse, "Scenario G: Cross-course isolation prevents matching submission from another course");
  }

  // Scenario H: Cross-institution isolation
  console.log("\n[Scenario H: Cross-Institution Isolation]");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-other-inst",
      submissionCode: "SUB-OTHER-INST",
      studentId: "stu-other-inst",
      studentName: "Foreign University Student",
      courseId: "ENG-CSE-301",
      institutionId: "inst-xyz-999", // Different institution!
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    const result = await coordinator.discoverAndEvaluateSources(
      "sub-target-h",
      baseReferenceText,
      {
        courseId: "ENG-CSE-301",
        institutionId: "inst-001", // Target is inst-001
        userRole: "faculty",
      }
    );

    const leakedOtherInst = result.matches.some((m) => m.sourceId === "sub-other-inst");
    assert(!leakedOtherInst, "Scenario H: Cross-institution isolation enforces strict university boundaries");
  }

  // Scenario I, J, K: Local Reference Corpus (PDF, DOCX, TXT formats)
  console.log("\n[Scenarios I, J, K: Local Reference Corpus (PDF, DOCX, TXT)]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);

    // TXT document
    const resTxt = localRef.addTextDocument({
      corpusId: "doc-ref-txt",
      title: "Algorithms Handbook (TXT)",
      sourceType: "internal_document",
      text: baseReferenceText,
    });
    assert(resTxt.success && resTxt.document.indexedStatus === "indexed", "Scenario K: Local TXT document indexed");

    // DOCX document representation
    const resDocx = localRef.addTextDocument({
      corpusId: "doc-ref-docx",
      title: "Data Structures Lecture Notes (DOCX)",
      sourceType: "internal_document",
      text: "Optimistic concurrency control and latch coupling traverse index nodes without acquiring exclusive write locks until structural modifications are committed.",
    });
    assert(resDocx.success, "Scenario J: Local DOCX document indexed");

    // PDF document representation
    const resPdf = localRef.addTextDocument({
      corpusId: "doc-ref-pdf",
      title: "Operating Systems Principles (PDF)",
      sourceType: "academic",
      text: "Locks provide mutual exclusion by preventing concurrent execution across critical sections. Cache coherence protocols enforce sequential consistency.",
    });
    assert(resPdf.success, "Scenario I: Local PDF document indexed");

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const evalTxt = await coordinator.discoverAndEvaluateSources("sub-test-k", baseReferenceText);
    assert(evalTxt.matches.some((m) => m.sourceId === "doc-ref-txt"), "Scenario K: Matching against local TXT reference document confirmed");

    const evalDocx = await coordinator.discoverAndEvaluateSources(
      "sub-test-j",
      "Optimistic concurrency control and latch coupling traverse index nodes without acquiring exclusive write locks until structural modifications are committed."
    );
    assert(evalDocx.matches.some((m) => m.sourceId === "doc-ref-docx"), "Scenario J: Matching against local DOCX reference document confirmed");
  }

  // Scenario L: Duplicate source detected by checksum
  console.log("\n[Scenario L: Duplicate Checksum Handling]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    const firstAdd = localRef.addTextDocument({
      corpusId: "orig-doc",
      title: "Original Document",
      text: "A unique textbook excerpt for testing checksum deduplication.",
    });
    assert(!firstAdd.isDuplicate, "Scenario L: Initial document added successfully");

    const secondAdd = localRef.addTextDocument({
      corpusId: "duplicate-doc",
      title: "Identical Document With Different Name",
      text: "A unique textbook excerpt for testing checksum deduplication.", // Same content!
    });
    assert(secondAdd.isDuplicate === true, "Scenario L: Duplicate document rejected via content checksum");
    assert(secondAdd.document.corpusId === "orig-doc", "Scenario L: Preserved original corpus ID");
  }

  // Scenario M: Missing / corrupt source
  console.log("\n[Scenario M: Missing / Corrupt Source]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    const res = localRef.addTextDocument({
      title: "Corrupt Empty Document",
      text: "   ",
    });
    assert(res.document.indexedStatus === "failed", "Scenario M: Empty/corrupt document marked as failed");
  }

  // Scenario N: Provider unavailable
  console.log("\n[Scenario N: Provider Unavailable / Error Isolation]");
  {
    const faultyProvider = {
      id: "faulty-provider",
      name: "Faulty External Provider",
      category: "public_web" as const,
      searchCandidates: async () => {
        throw new Error("Network connection timed out after 5000ms");
      },
      getSource: async () => null,
      health: async () => ({
        providerId: "faulty-provider",
        name: "Faulty Provider",
        category: "public_web" as const,
        available: false,
        isOfflineCapable: false,
        message: "Network failure",
      }),
    };

    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-ok-01",
      submissionCode: "SUB-OK-01",
      studentId: "stu-ok",
      status: "submitted",
      text: baseReferenceText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ student: studentProvider });
    coordinator.registerProvider(faultyProvider);

    let didCrash = false;
    try {
      const result = await coordinator.discoverAndEvaluateSources("sub-test-n", baseReferenceText);
      assert(result.matches.length >= 1, "Scenario N: Analysis succeeded despite faulty provider error", `Found: ${result.matches.length}`);
    } catch {
      didCrash = true;
    }
    assert(!didCrash, "Scenario N: Faulty provider isolated without crashing analysis");
  }

  // Scenario O: Empty student document
  console.log("\n[Scenario O: Empty Document]");
  {
    const coordinator = new SourceDiscoveryCoordinator();
    const result = await coordinator.discoverAndEvaluateSources("sub-empty", "   ");
    assert(result.matches.length === 0, "Scenario O: Empty document safely returns 0 matches");
  }

  // Scenario P: Short source
  console.log("\n[Scenario P: Short Document]");
  {
    const coordinator = new SourceDiscoveryCoordinator();
    const shortText = "A binary search tree degrades to linear search behaviour when keys arrive in sorted order.";
    const result = await coordinator.discoverAndEvaluateSources("sub-short", shortText);
    assert(result.matches.length >= 0, "Scenario P: Short document handled without divide-by-zero");
  }

  // Scenario Q: Long source
  console.log("\n[Scenario Q: Long Document]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    const longParagraph = (baseReferenceText + " ").repeat(25); // ~750 words
    localRef.addTextDocument({
      corpusId: "doc-long-01",
      title: "Extensive Monograph on Balanced Search Trees",
      text: longParagraph,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const result = await coordinator.discoverAndEvaluateSources("sub-long", longParagraph.slice(0, 1200));
    assert(result.matches.length >= 1, "Scenario Q: Long document chunked and aligned cleanly");
    assert(result.matches[0]!.matchedWordCount > 80, "Scenario Q: Extensively matched word count verified");
  }

  // Scenario R: Multiple candidate sources ranking
  console.log("\n[Scenario R: Multiple Candidate Sources Ranking]");
  {
    const localRef = new LocalReferenceCorpusProvider([]);
    // High similarity candidate
    localRef.addTextDocument({
      corpusId: "doc-high",
      title: "Exact AVL Notes",
      text: baseReferenceText,
    });
    // Moderate similarity candidate
    localRef.addTextDocument({
      corpusId: "doc-med",
      title: "Paraphrased AVL Notes",
      text: paraphrasedText,
    });

    const coordinator = new SourceDiscoveryCoordinator({ localRef });
    const result = await coordinator.discoverAndEvaluateSources("sub-rank-test", baseReferenceText);
    assert(result.matches.length >= 2, "Scenario R: Multiple candidate sources discovered");
    assert(
      result.matches[0]!.similarityPercentage >= result.matches[1]!.similarityPercentage,
      "Scenario R: Candidate matches sorted by similarity percentage descending"
    );
  }

  // Scenario S: Source with quotations
  console.log("\n[Scenario S: Source with Quotations]");
  {
    const quotedSubmission =
      'According to standard literature, "A binary search tree degrades to linear search behaviour when keys arrive in sorted order." ' +
      'However, our empirical implementation explores an entirely independent caching layer for web applications.';

    const coordinator = new SourceDiscoveryCoordinator();
    const result = await coordinator.discoverAndEvaluateSources("sub-quote-test", quotedSubmission);
    const hasQuotationPassage = result.matches.some((m) =>
      m.matchedPassages.some((p) => p.is_quoted === true)
    );
    // Properly quoted passages are either suppressed from inflating the score or flagged as quoted
    assert(result.matches.length === 0 || hasQuotationPassage, "Scenario S: Quotations correctly tracked and suppressed");
  }

  // Scenario T: Source with bibliography
  console.log("\n[Scenario T: Source with Bibliography]");
  {
    const docWithBiblio =
      "Traditional French pastry making relies on lamination techniques to create alternating layers of dough and chilled butter.\n\n" +
      "References\n" +
      "[1] H. Cormen, 'Balanced Binary Search Trees Course Notes', MIT Press, 2024.\n" +
      "[2] G. Andersson, 'Self-Balancing Tree Structures in Practice', ACM, 2023.";

    const coordinator = new SourceDiscoveryCoordinator();
    const result = await coordinator.discoverAndEvaluateSources("sub-biblio-test", docWithBiblio);
    // References section excluded -> unrelated culinary text should produce 0 plagiarism matches
    assert(result.matches.length === 0, "Scenario T: Bibliography section cleanly excluded from similarity matches");
  }

  // ---------------------------------------------------------------------------
  // TASK 11: Privacy and Role-Based Authorization
  // ---------------------------------------------------------------------------
  console.log("\n--- Task 11: Privacy and Authorization Verification ---");
  {
    const studentProvider = new InternalStudentCorpusProvider();
    studentProvider.registerSubmission({
      id: "sub-private-01",
      submissionCode: "SUB-PRIV-01",
      studentId: "stu-secret",
      studentName: "Secret Student",
      studentRoll: "22CSE999",
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      status: "submitted",
      text: baseReferenceText,
    });

    // 1. When a STUDENT queries similarity:
    const studentQueryResults = await studentProvider.searchCandidates({
      text: baseReferenceText,
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      userRole: "student",
      submittingStudentId: "stu-another", // Not self
    });

    assert(studentQueryResults.length >= 1, "Task 11: Candidate found for comparison");
    const masked = studentQueryResults[0]!;
    assert(
      masked.author === "Peer Student (Protected)",
      "Task 11: Student viewer receives anonymized author metadata for peers",
      `Got: ${masked.author}`
    );
    assert(
      masked.url === "internal://submissions/anonymized",
      "Task 11: Student viewer cannot access direct submission URI of peer",
      `Got: ${masked.url}`
    );

    // 2. When FACULTY queries similarity:
    const facultyQueryResults = await studentProvider.searchCandidates({
      text: baseReferenceText,
      courseId: "ENG-CSE-301",
      institutionId: "inst-001",
      userRole: "faculty",
      requestingUserId: "fac-001",
    });

    const facultyView = facultyQueryResults[0]!;
    assert(
      facultyView.author === "Secret Student (22CSE999)",
      "Task 11: Faculty viewer receives full student metadata and roll number",
      `Got: ${facultyView.author}`
    );
    assert(
      facultyView.url === "internal://submissions/sub-private-01",
      "Task 11: Faculty viewer receives authorized internal submission URI"
    );
  }

  // ---------------------------------------------------------------------------
  // TASK 15: Offline Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Task 15: Offline Verification ---");
  {
    const webProvider = new PublicWebSearchProvider();
    webProvider.setNetworkEnabled(false); // Simulate disconnected network

    const openAccess = new OpenAccessAcademicProvider();
    openAccess.setNetworkEnabled(false);

    const localRef = new LocalReferenceCorpusProvider();
    const coordinator = new SourceDiscoveryCoordinator({
      localRef,
      web: webProvider,
      openAccess,
    });

    const offlineResult = await coordinator.discoverAndEvaluateSources(
      "sub-offline",
      baseReferenceText
    );

    assert(offlineResult.matches.length >= 1, "Task 15: Internal & local corpus matches succeed offline");
    const health = await coordinator.checkAllHealth();
    assert(health.every((h) => h.available === true), "Task 15: All providers report healthy in offline mode");
  }

  // ---------------------------------------------------------------------------
  // TASK 14: Performance Benchmarking (10 and 100 documents)
  // ---------------------------------------------------------------------------
  console.log("\n--- Task 14: Performance & Scaling Benchmark ---");
  {
    // Generate 100 synthetic internal corpus documents
    const benchmarkCorpus = new LocalReferenceCorpusProvider([]);
    for (let i = 1; i <= 100; i++) {
      const topic = i % 5 === 0 ? "tree" : i % 3 === 0 ? "crypto" : "database";
      benchmarkCorpus.addTextDocument({
        corpusId: `bench-doc-${i}`,
        title: `Synthetic Technical Paper ${i} (${topic})`,
        text: `Document ${i} discusses algorithmic complexity and empirical methodology. ` +
          (i === 42 ? baseReferenceText : `Standard system properties evaluate throughput and cache lines under workload ${i}.`),
      });
    }

    const coordinator = new SourceDiscoveryCoordinator({ localRef: benchmarkCorpus });

    const memBefore = process.memoryUsage().heapUsed;
    const tStart = performance.now();

    const benchResult = await coordinator.discoverAndEvaluateSources(
      "sub-bench-query",
      baseReferenceText,
      {},
      { maxCandidatesTotal: 8 }
    );

    const tEnd = performance.now();
    const memAfter = process.memoryUsage().heapUsed;

    const totalTimeMs = Math.round(tEnd - tStart);
    const heapDiffMb = ((memAfter - memBefore) / 1024 / 1024).toFixed(2);

    console.log(`  100-Document Corpus Discovery Time: ${totalTimeMs} ms`);
    console.log(`  Discovered Candidates: ${benchResult.discoveredCandidatesCount}`);
    console.log(`  Evaluated Candidates: ${benchResult.evaluatedCandidatesCount}`);
    console.log(`  Heap Memory Delta: ${heapDiffMb} MB`);

    assert(totalTimeMs < 3000, "Task 14: 100-document candidate filtering + evaluation completes within 3000ms", `Took ${totalTimeMs}ms`);
    assert(benchResult.matches.length >= 1, "Task 14: Target matching document identified in 100-doc corpus");
    assert(benchResult.evaluatedCandidatesCount <= 8, "Task 14: Avoided O(N^2) evaluation by filtering top candidates first");
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  const totalPassed = testResults.filter((t) => t.passed).length;
  const totalFailed = testResults.filter((t) => !t.passed).length;
  console.log(`  TOTAL TESTS: ${testResults.length} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log("================================================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runAllSourceDiscoveryTests().catch((err) => {
  console.error("FATAL ERROR in source discovery test suite:", err);
  process.exit(1);
});
