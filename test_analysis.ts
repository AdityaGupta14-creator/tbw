import { processSubmissionDocument } from "./src/lib/backend/submission-analysis-service.ts";

async function run() {
  const file = new File(["This is a test document with some words."], "test.txt", { type: "text/plain" });
  const result = await processSubmissionDocument({
    submissionId: "sub-test",
    submissionCode: "sub-test",
    assignmentId: "asg-test",
    assignmentTitle: "Test",
    courseId: "course-1",
    courseCode: "CSE",
    studentId: "student-1",
    studentName: "Student",
    studentRoll: "Roll",
    file,
  });
  console.log("Analysis Similarity:", result.analysis?.similarity_percentage);
}

run();
