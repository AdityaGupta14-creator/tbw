import { db } from "../db";
import assert from "node:assert";

async function runFeedbackNotificationTest() {
  console.log("=== Testing Faculty Feedback & Student Notification Workflow ===");

  const subs = db.getSubmissions();
  assert(subs.length > 0, "Submissions must exist in the database");

  const sub = subs[0];
  const student = db.getStudents().find(
    (s) => s.id === sub.student_id || s.roll_number === sub.student_roll || s.full_name === sub.student_name
  ) || db.getStudents()[0];

  assert(Boolean(student), "A matching student profile must exist");
  console.log(`Target submission: ${sub.id} (${sub.assignment_title}), Student: ${student.full_name} (${student.roll_number})`);

  // 1. Faculty sends candidate feedback
  const feedbackMsg = "Outstanding empirical analysis on tree algorithms. Please review citation reference 8.";
  const rubricScores = [
    { criterion: "Originality & Authorship", score: 38, max: 40 },
    { criterion: "Literature Review & Citations", score: 26, max: 30 },
    { criterion: "Methodology & Implementation", score: 19, max: 20 },
    { criterion: "Academic Phrasing & Structure", score: 10, max: 10 },
  ];

  const updatedReview = db.sendCandidateFeedback(sub.id, feedbackMsg, rubricScores);
  assert(updatedReview.general_feedback === feedbackMsg, "Review record must store general_feedback");
  assert(updatedReview.rubric_scores?.length === 4, "Review record must store rubric_scores");
  assert(updatedReview.rubric_total === 93, "Review record must correctly compute rubric_total");
  console.log("✓ Candidate feedback successfully saved to review record");

  // 2. Student notifications retrieval
  const notifsById = db.getNotifications(student.id);
  assert(notifsById.length > 0, "Student must have notifications by student.id");
  const fbNotif = notifsById.find((n) => n.type === "faculty_feedback" && n.submission_id === sub.id);
  assert(Boolean(fbNotif), "Faculty feedback notification must be created for student");
  assert(fbNotif?.message.includes("Outstanding empirical analysis"), "Notification message must include feedback snippet");
  assert(fbNotif?.action_url === "/student/feedback", "Action URL must point to student feedback page");
  console.log("✓ Student notification retrieved by student.id with correct action URL");

  // 3. Student notifications retrieval by roll number
  const notifsByRoll = db.getNotifications(student.roll_number);
  assert(notifsByRoll.length > 0, "Student must also be able to retrieve notifications by roll_number");
  const fbNotifRoll = notifsByRoll.find((n) => n.type === "faculty_feedback" && n.submission_id === sub.id);
  assert(Boolean(fbNotifRoll), "Faculty feedback notification must be retrievable by roll_number");
  console.log("✓ Student notification retrieved by student.roll_number");

  // 4. Faculty records official decision with feedback
  const decisionReview = db.recordReviewDecision(
    sub.id,
    "cleared_no_action",
    "Evidence fully reviewed and citations verified",
    "Confidential internal faculty note",
    "reviewed",
    undefined,
    "Final approved candidate feedback: Great work!",
    rubricScores
  );

  assert(decisionReview.decision === "cleared_no_action", "Decision must be recorded");
  assert(decisionReview.status === "reviewed", "Status must be reviewed");
  assert(decisionReview.general_feedback === "Final approved candidate feedback: Great work!", "Decision must update general_feedback");

  const finalNotifs = db.getNotifications(student.id);
  const decisionNotif = finalNotifs.find((n) => n.type === "review_completed" && n.submission_id === sub.id);
  assert(Boolean(decisionNotif), "Review completed notification must be dispatched to student");
  console.log("✓ Review decision recorded and review_completed notification dispatched to student");

  console.log("=== ALL FEEDBACK NOTIFICATION WORKFLOW TESTS PASSED! ===\n");
}

runFeedbackNotificationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
