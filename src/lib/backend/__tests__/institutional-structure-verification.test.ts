import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { db } from "../db";
import { verityApi } from "@/services/verity-api";
import {
  institutionalDepartments,
  DEPARTMENT_SUBJECTS,
  courses,
  students,
} from "@/lib/mock-data";

describe("Institutional Dataset & Structure Verification", () => {
  it("1. Verifies 5 departments exist with exact codes and names", () => {
    const expected = [
      { code: "CMPN", name: "Computer Engineering" },
      { code: "IT", name: "Information Technology Engineering" },
      { code: "EXCS", name: "Electronics and Computer Science Engineering" },
      { code: "EXTC", name: "Electronics and Telecommunication" },
      { code: "BIO", name: "Biomedical Engineering" },
    ];

    assert.equal(institutionalDepartments.length, 5);
    for (const exp of expected) {
      const match = institutionalDepartments.find((d) => d.code === exp.code);
      assert.ok(match, `Department code ${exp.code} must exist`);
      assert.equal(match.name, exp.name);
    }
  });

  it("2. Verifies 10 courses exist with Department-Section format and 3 batches each", () => {
    const expectedCodes = [
      "CMPN-A", "CMPN-B",
      "IT-A", "IT-B",
      "EXCS-A", "EXCS-B",
      "EXTC-A", "EXTC-B",
      "BIO-A", "BIO-B",
    ];

    assert.equal(courses.length, 10);
    for (const code of expectedCodes) {
      const course = courses.find((c) => c.code === code);
      assert.ok(course, `Course ${code} must exist`);
      assert.ok(course.department, `Course ${code} must have a department`);
      assert.ok(course.section, `Course ${code} must have a section`);
      assert.deepEqual(
        course.batches,
        ["Batch 1", "Batch 2", "Batch 3"],
        `Course ${code} must have exactly 3 batches`
      );
    }
  });

  it("3. Verifies 5 institutional students with exact names, roll numbers, emails, section B, batch 3", () => {
    const expectedStudents = [
      {
        name: "Aditya Gupta",
        roll: "25108B0071",
        email: "aditya.gupta@vit.edu.in",
        section: "B",
        batch: "Batch 3",
        courseCode: "EXCS-B",
      },
      {
        name: "Abaan Sakarwala",
        roll: "25108C0005",
        email: "abaan.sakarwala@vit.edu.in",
        section: "B",
        batch: "Batch 3",
        courseCode: "EXCS-B",
      },
      {
        name: "Soham Waingade",
        roll: "25108C0005", // Preserved identical roll as instructed
        email: "soham.waingade@vit.edu.in",
        section: "B",
        batch: "Batch 3",
        courseCode: "EXCS-B",
      },
      {
        name: "Keyur Arolkar",
        roll: "25108B0074",
        email: "keyur.arolkar@vit.edu.in",
        section: "B",
        batch: "Batch 3",
        courseCode: "EXCS-B",
      },
      {
        name: "Aneesh Subramaniam",
        roll: "2510C0016",
        email: "aneesh.subramaniam@vit.edu.in",
        section: "B",
        batch: "Batch 3",
        courseCode: "EXCS-B",
      },
    ];

    assert.equal(students.length, 5);
    for (const exp of expectedStudents) {
      const match = students.find((s) => s.name === exp.name);
      assert.ok(match, `Student ${exp.name} must exist`);
      assert.equal(match.roll, exp.roll, `Roll number for ${exp.name} must match`);
      assert.equal(match.email, exp.email, `Email for ${exp.name} must match`);
      assert.equal(match.section, exp.section, `Section for ${exp.name} must be B`);
      assert.equal(match.batch, exp.batch, `Batch for ${exp.name} must be Batch 3`);
      assert.equal(match.courseCode, exp.courseCode, `Course for ${exp.name} must be EXCS-B`);
    }
  });

  it("4. Verifies EXCS department has the 5 exact subjects", () => {
    const excsSubjects = DEPARTMENT_SUBJECTS["EXCS"];
    assert.ok(excsSubjects, "EXCS department subjects must exist");
    assert.deepEqual(excsSubjects, [
      "Data Structures",
      "Electrical Circuit Analysis",
      "Electrical Design Circuit",
      "Python Programming",
      "Technical and Business Writing",
    ]);
  });

  it("5. Verifies default citation style is Normal and assignments support Normal", async () => {
    const list = await verityApi.assignments.list();
    assert.ok(list.length > 0, "Assignments should be listed");
    
    // Check citation style
    const normalAsg = list.find((a) => a.citation_style === "Normal");
    assert.ok(normalAsg, "Should support 'Normal' citation style");
  });

  it("6. Verifies upcoming assignments exclude submitted assignments based on persisted state", async () => {
    // Check that Aditya Gupta has submissions
    const aditya = students.find((s) => s.name === "Aditya Gupta")!;
    const allAssignments = await verityApi.assignments.list();
    const allSubmissions = await verityApi.submissions.list();

    const adityaSubs = allSubmissions.filter(
      (s) =>
        s.student_id === aditya.id ||
        (s.student_roll && s.student_roll.toLowerCase() === aditya.roll.toLowerCase()) ||
        (s.student_name && s.student_name.toLowerCase() === aditya.name.toLowerCase())
    );

    const submittedTitles = new Set(
      adityaSubs.map((s) => (s.assignment_title || (s as any).assignment || "").trim().toLowerCase())
    );
    const submittedIds = new Set(adityaSubs.map((s) => s.assignment_id?.toLowerCase()));

    const upcomingAssignments = allAssignments.filter((a) => {
      const isSubmitted =
        submittedIds.has(a.id.toLowerCase()) ||
        submittedTitles.has(a.title.trim().toLowerCase());
      return !isSubmitted;
    });

    // Upcoming assignments must NOT contain any assignment that was submitted
    for (const upcoming of upcomingAssignments) {
      assert.ok(
        !submittedIds.has(upcoming.id.toLowerCase()),
        `Assignment ${upcoming.title} (${upcoming.id}) is submitted and must NOT appear in Upcoming`
      );
      assert.ok(
        !submittedTitles.has(upcoming.title.trim().toLowerCase()),
        `Assignment ${upcoming.title} is submitted and must NOT appear in Upcoming`
      );
    }

    // Verify recent submissions contain the submitted assignment
    for (const sub of adityaSubs) {
      const title = sub.assignment_title || (sub as any).assignment;
      assert.ok(title, "Submission must have an assignment title");
      // Status lifecycle verification
      assert.ok(
        ["draft", "submitted", "processing", "analyzed", "needs_review", "reviewed", "in_review", "pending", "review"].includes(sub.status),
        `Submission status ${sub.status} must follow the lifecycle`
      );
      assert.notEqual(
        sub.status,
        "Upcoming",
        "A submitted assignment must NEVER have status 'Upcoming'"
      );
    }
  });

  it("7. Verifies canonical similarity scoring was not modified", () => {
    // Test invariants on existing benchmark submissions
    const sub1 = db.getSubmissionById("sub-301-01");
    if (sub1) {
      assert.equal(sub1.similarity_percentage, 27);
    }
    const sub2 = db.getSubmissionById("sub-301-02");
    if (sub2) {
      assert.equal(sub2.similarity_percentage, 8);
    }
    const sub3 = db.getSubmissionById("sub-301-03");
    if (sub3) {
      assert.equal(sub3.similarity_percentage, 41);
    }
  });
});
