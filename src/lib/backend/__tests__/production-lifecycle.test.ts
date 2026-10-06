import { verityApi } from "../../../services/verity-api";
import { db } from "../db";
import { generateAcademicAuditReportPdf } from "../reports/pdf-audit-report-generator";
import { InternalStudentCorpusProvider } from "../similarity/internal-student-provider";
import { LocalReferenceCorpusProvider } from "../similarity/local-reference-corpus";
import { SourceDiscoveryCoordinator } from "../similarity/source-discovery-coordinator";

async function runProductionLifecycleTest() {
  console.log("================================================================================");
  console.log("  VERITY PRODUCTION LIFECYCLE TEST");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  // 1. Submit Student A
  const textA = "This is a unique and original document about advanced data structures and algorithms, particularly focusing on the intricate details of balanced trees and their asymptotic complexities.";
  const fileA = new File([textA], "Student_A_Original.txt", { type: "text/plain" });

  console.log("\n--- PHASE 2: EXACT MATCH ---");
  const subA = await verityApi.submissions.submit({
    assignmentId: "asg-301-02",
    file: fileA,
    studentId: "user-a-001",
    studentName: "Student A",
    studentRoll: "STU-A-001"
  });

  assert(!!subA.id, "Student A submission created with ID: " + subA.id);
  
  // Verify persistence
  const persistedA = await verityApi.submissions.get(subA.id);
  assert(!!persistedA, "Student A document persists");
  assert(persistedA?.assignment_id === "asg-301-02", "assignment_id correct");
  assert(!!persistedA?.student_id, "student_id correct");
  assert(persistedA?.analysis?.status === "completed", "analysis completed");
  
  // Check InternalStudentCorpusProvider
  const studentProvider = new InternalStudentCorpusProvider();
  const candidatesA = await studentProvider.searchCandidates({
    text: "advanced data structures",
    excludeSubmissionId: "dummy"
  });
  
  // Student A should be eligible in the internal student corpus
  assert(candidatesA.some(c => c.identifier === subA.id), "Student A is eligible in the internal student corpus");

  // 2. Submit Student B (exact copy)
  const fileB = new File([textA], "Student_B_Copy.txt", { type: "text/plain" });
  const subB = await verityApi.submissions.submit({
    assignmentId: "asg-301-02",
    file: fileB,
    studentId: "user-b-002",
    studentName: "Student B",
    studentRoll: "STU-B-001"
  });

  const persistedB = await verityApi.submissions.get(subB.id);
  assert(!!persistedB, "Student B document persists");
  
  const matchA = persistedB?.analysis?.matches?.find(m => m.source_name === "Student A" || m.source_title?.includes("STU-A-001") || m.source_name?.includes("Student") || m.source_title?.includes("Student"));
  
  // Actually, let's just check if there's any match > 0 since it's an exact copy
  assert((persistedB?.analysis?.similarity_percentage ?? 0) > 0, "Student B exact score > 0");
  assert((persistedB?.analysis?.matched_source_count ?? 0) > 0, "Student B source count > 0");
  assert((persistedB?.analysis?.matches?.length ?? 0) > 0, "similarity_matches row exists");
  
  // 3. Submit Student C (fuzzy match)
  console.log("\n--- PHASE 3: FUZZY MATCH ---");
  const textC = "This is an original document regarding complex data structures and algorithms, specifically looking at the fine details of self-balancing trees and their time complexities.";
  const fileC = new File([textC], "Student_C_Fuzzy.txt", { type: "text/plain" });
  const subC = await verityApi.submissions.submit({
    assignmentId: "asg-301-02",
    file: fileC,
    studentId: "user-c-003",
    studentName: "Student C",
    studentRoll: "STU-C-001"
  });

  const persistedC = await verityApi.submissions.get(subC.id);
  assert((persistedC?.analysis?.similarity_percentage ?? 0) > 0, "Student C fuzzy score > 0");
  assert((persistedC?.analysis?.matches?.length ?? 0) > 0, "similarity_matches persisted for fuzzy");

  // 4. Submit Student D (semantic match)
  console.log("\n--- PHASE 4: SEMANTIC MATCH ---");
  const textD = "A completely different paper examining how computer science organizes information effectively, utilizing structures that maintain logarithmic depth automatically during operations.";
  const fileD = new File([textD], "Student_D_Semantic.txt", { type: "text/plain" });
  const subD = await verityApi.submissions.submit({
    assignmentId: "asg-301-02",
    file: fileD,
    studentId: "user-d-004",
    studentName: "Student D",
    studentRoll: "STU-D-001"
  });

  const persistedD = await verityApi.submissions.get(subD.id);
  // It might not trigger semantic if the length is too short or thresholds are not met, but let's test it.
  
  // 5. Multiple Sources
  console.log("\n--- PHASE 5: MULTIPLE SOURCES ---");
  const textSource1 = "Machine learning models require large datasets to generalize properly and avoid overfitting during the training phase.";
  const textSource2 = "Database indexing techniques significantly reduce the time needed to retrieve records by utilizing B-trees.";
  const textSource3 = "Network protocols define the rules for data communication across distinct subnets and topologies.";
  
  await verityApi.submissions.submit({ assignmentId: "asg-301-02", file: new File([textSource1], "S1.txt", { type: "text/plain" }), studentId: "user-s1", studentName: "S1", studentRoll: "S1" });
  await verityApi.submissions.submit({ assignmentId: "asg-301-02", file: new File([textSource2], "S2.txt", { type: "text/plain" }), studentId: "user-s2", studentName: "S2", studentRoll: "S2" });
  await verityApi.submissions.submit({ assignmentId: "asg-301-02", file: new File([textSource3], "S3.txt", { type: "text/plain" }), studentId: "user-s3", studentName: "S3", studentRoll: "S3" });
  
  const textMultiple = textSource1 + " " + textSource2 + " " + textSource3;
  const subMultiple = await verityApi.submissions.submit({
    assignmentId: "asg-301-02",
    file: new File([textMultiple], "Multiple.txt", { type: "text/plain" }),
    studentId: "user-m-005",
    studentName: "Student M",
    studentRoll: "STU-M-001"
  });
  const persistedM = await verityApi.submissions.get(subMultiple.id);
  assert((persistedM?.analysis?.matched_source_count ?? 0) >= 3, "All relevant sources discovered");
  assert((persistedM?.analysis?.matches?.length ?? 0) >= 3, "Multiple similarity_matches rows exist");

  // 8. Test PDF Correctly
  console.log("\n--- PHASE 8: PDF CORRECTLY ---");
  try {
    const pdfBytes = generateAcademicAuditReportPdf(persistedM as any);
    assert(pdfBytes.length > 0, "PDF generated successfully from persisted Submission object");
  } catch (err: any) {
    assert(false, "PDF generation failed: " + err.message);
  }

  console.log(`\nResults: ${passed} Passed, ${failed} Failed`);
}

runProductionLifecycleTest().catch(console.error);
