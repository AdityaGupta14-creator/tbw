// Mock academic data for the Verity prototype. All data is fictional.
// Structured so it can later be replaced by API calls.

export type ReviewStatus = "reviewed" | "review" | "pending" | "flagged";

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  departmentCode?: string;
  section: string;
  batches?: string[];
  students: number;
  assignments: number;
  pending: number;
}

export interface Assignment {
  id: string;
  courseCode: string;
  department?: string;
  subject?: string;
  batch?: string;
  title: string;
  type: string;
  due: string;
  dueTime?: string;
  submitted: number;
  total: number;
  avgSimilarity: number;
  pending: number;
  citationStyle: string;
  status?: string;
}

export interface Submission {
  id: string;
  student: string;
  roll: string;
  courseCode: string;
  assignmentId: string;
  assignment: string;
  submitted: string;
  similarity: number;
  citationIssues: number;
  status: ReviewStatus;
  drafts: number;
  matchedSources: number;
}

export interface Student {
  id: string;
  name: string;
  roll: string;
  email: string;
  department?: string;
  departmentCode?: string;
  courseCode: string;
  section: string;
  batch?: string;
  submissions: number;
  avgSimilarity: number;
  flagged: number;
}

export const semesters = ["2026–27", "2025–26", "2024–25"];

export const institutionalDepartments = [
  { code: "CMPN", name: "Computer Engineering" },
  { code: "IT", name: "Information Technology Engineering" },
  { code: "EXCS", name: "Electronics and Computer Science Engineering" },
  { code: "EXTC", name: "Electronics and Telecommunication" },
  { code: "BIO", name: "Biomedical Engineering" },
];
export const INSTITUTIONAL_DEPARTMENTS = institutionalDepartments;

export const DEPARTMENT_SUBJECTS: Record<string, string[]> = {
  EXCS: [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ],
  CMPN: [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ],
  IT: [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ],
  EXTC: [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ],
  BIO: [
    "Electrical circuit analysis",
    "Electronics device circuit",
    "Technical Business writing",
    "Python Programming",
    "Maths - 3",
  ],
};

const defaultBatches = ["Batch 1", "Batch 2", "Batch 3"];

export const courses: Course[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    code: "CMPN-A",
    title: "Computer Engineering - Section A",
    department: "Computer Engineering",
    departmentCode: "CMPN",
    section: "A",
    batches: defaultBatches,
    students: 64,
    assignments: 5,
    pending: 3,
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    code: "CMPN-B",
    title: "Computer Engineering - Section B",
    department: "Computer Engineering",
    departmentCode: "CMPN",
    section: "B",
    batches: defaultBatches,
    students: 64,
    assignments: 4,
    pending: 5,
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    code: "IT-A",
    title: "Information Technology Engineering - Section A",
    department: "Information Technology Engineering",
    departmentCode: "IT",
    section: "A",
    batches: defaultBatches,
    students: 60,
    assignments: 3,
    pending: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    code: "IT-B",
    title: "Information Technology Engineering - Section B",
    department: "Information Technology Engineering",
    departmentCode: "IT",
    section: "B",
    batches: defaultBatches,
    students: 60,
    assignments: 3,
    pending: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000005",
    code: "EXCS-A",
    title: "Electronics and Computer Science Engineering - Section A",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "A",
    batches: defaultBatches,
    students: 64,
    assignments: 4,
    pending: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000006",
    code: "EXCS-B",
    title: "Electronics and Computer Science Engineering - Section B",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batches: defaultBatches,
    students: 64,
    assignments: 5,
    pending: 3,
  },
  {
    id: "c0000000-0000-0000-0000-000000000007",
    code: "EXTC-A",
    title: "Electronics and Telecommunication - Section A",
    department: "Electronics and Telecommunication",
    departmentCode: "EXTC",
    section: "A",
    batches: defaultBatches,
    students: 58,
    assignments: 3,
    pending: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000008",
    code: "EXTC-B",
    title: "Electronics and Telecommunication - Section B",
    department: "Electronics and Telecommunication",
    departmentCode: "EXTC",
    section: "B",
    batches: defaultBatches,
    students: 58,
    assignments: 3,
    pending: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000009",
    code: "BIO-A",
    title: "Biomedical Engineering - Section A",
    department: "Biomedical Engineering",
    departmentCode: "BIO",
    section: "A",
    batches: defaultBatches,
    students: 50,
    assignments: 2,
    pending: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000010",
    code: "BIO-B",
    title: "Biomedical Engineering - Section B",
    department: "Biomedical Engineering",
    departmentCode: "BIO",
    section: "B",
    batches: defaultBatches,
    students: 50,
    assignments: 2,
    pending: 1,
  },
];

export const assignments: Assignment[] = [
  {
    id: "asg-1",
    courseCode: "EXCS",
    title: "Electrical circuit analysis - Assignment 1",
    subject: "Electrical circuit analysis",
    type: "Technical Report",
    due: "15 Nov 2026",
    submitted: 2,
    total: 6,
    avgSimilarity: 12,
    pending: 1,
    citationStyle: "IEEE",
  },
  {
    id: "asg-2",
    courseCode: "EXCS",
    title: "Electrical circuit analysis - Assignment 2",
    subject: "Electrical circuit analysis",
    type: "Lab Report",
    due: "20 Nov 2026",
    submitted: 1,
    total: 6,
    avgSimilarity: 5,
    pending: 0,
    citationStyle: "IEEE",
  },
  {
    id: "asg-3",
    courseCode: "EXCS",
    title: "Electrical circuit analysis - Assignment 3",
    subject: "Electrical circuit analysis",
    type: "Project Document",
    due: "25 Nov 2026",
    submitted: 0,
    total: 6,
    avgSimilarity: 0,
    pending: 0,
    citationStyle: "IEEE",
  }
];

export const submissions: Submission[] = [];

export const students: Student[] = [
  {
    id: "p0000000-0000-0000-0000-000000000003",
    name: "Abaan Sakarwala",
    roll: "25108C0005",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 2,
    avgSimilarity: 8,
    flagged: 0,
    email: "abaan.sakarwala@vit.edu.in",
  },
  {
    id: "p0000000-0000-0000-0000-000000000004",
    name: "Soham Waingade",
    roll: "25108C0006",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 2,
    avgSimilarity: 16,
    flagged: 1,
    email: "soham.waingade@vit.edu.in",
  },
  {
    id: "p0000000-0000-0000-0000-000000000005",
    name: "Keyur Arolkar",
    roll: "25108B0074",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 1,
    avgSimilarity: 14,
    flagged: 0,
    email: "keyur.arolkar@vit.edu.in",
  },
  {
    id: "p0000000-0000-0000-0000-000000000006",
    name: "Aneesh Subramaniam",
    roll: "2510C0016",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 1,
    avgSimilarity: 6,
    flagged: 0,
    email: "aneesh.subramaniam@vit.edu.in",
  },
  {
    id: "p0000000-0000-0000-0000-000000000007",
    name: "Vedant Patel",
    roll: "25108B0088",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 1,
    avgSimilarity: 10,
    flagged: 0,
    email: "vedant.patel@vit.edu.in",
  },
  {
    id: "p0000000-0000-0000-0000-000000000008",
    name: "Rahul Sharma",
    roll: "25108B0099",
    courseCode: "EXCS",
    department: "Electronics and Computer Science Engineering",
    departmentCode: "EXCS",
    section: "B",
    batch: "Batch 3",
    submissions: 0,
    avgSimilarity: 0,
    flagged: 0,
    email: "rahul.sharma@vit.edu.in",
  }
];

export const dashboardStats = [
  { label: "Assignments", value: "18" },
  { label: "Submissions", value: "426" },
  { label: "Pending Review", value: "14", tone: "warning" as const },
  { label: "High Similarity", value: "7", tone: "danger" as const },
  { label: "Citation Issues", value: "21", tone: "warning" as const },
];

export const attentionItems = [
  {
    text: "7 submissions have substantial textual overlap",
    action: "Review",
    to: "/submissions",
  },
  {
    text: "5 submissions have citation issues",
    action: "Review",
    to: "/submissions",
  },
  {
    text: "2 student pairs have significant text overlap",
    action: "Compare",
    to: "/compare",
  },
  {
    text: "3 revised submissions are ready for review",
    action: "Review",
    to: "/submissions",
  },
];

export interface MatchedSource {
  id: string;
  title: string;
  domain: string;
  type: "Web" | "Academic" | "Student submission";
  contribution: number;
  words: number;
}

export const matchedSources: MatchedSource[] = [
  {
    id: "src-01",
    title: "Ohm's Law and Circuit Analysis — Course Notes",
    domain: "physics.edu",
    type: "Web",
    contribution: 8.4,
    words: 142,
  },
  {
    id: "src-02",
    title: "Nodal Analysis in Practice",
    domain: "engineering-paper.example",
    type: "Academic",
    contribution: 4.8,
    words: 128,
  },
  {
    id: "src-03",
    title: "Submission by 25108C0006 · Electrical Assignment 01",
    domain: "Institutional repository",
    type: "Student submission",
    contribution: 3.2,
    words: 86,
  },
  {
    id: "src-04",
    title: "Basic Circuit Theorems Reference",
    domain: "docs.circuits.org",
    type: "Web",
    contribution: 5.1,
    words: 97,
  },
  {
    id: "src-05",
    title: "Mesh Analysis: An Empirical Comparison",
    domain: "journals.example",
    type: "Academic",
    contribution: 3.4,
    words: 74,
  },
  {
    id: "src-06",
    title: "Electrical Circuits Lab Manual (2026)",
    domain: "example.edu",
    type: "Web",
    contribution: 2.1,
    words: 48,
  },
];

export interface DocParagraph {
  id: string;
  heading?: string;
  text: string;
  match?: { sourceId: string; percent: number; words: number };
}

export const documentPages: DocParagraph[][] = [
  [
    {
      id: "p-title",
      heading: "DATA STRUCTURES · TECHNICAL REPORT 02",
      text: "Comparative Analysis of Balanced Binary Search Trees\nRiya Sharma · 22CSE057 · Section A · Submitted 21 September 2026",
    },
    {
      id: "p-1",
      heading: "1. Introduction",
      text: "Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion. This report compares AVL trees and red-black trees across a set of controlled workloads, measuring rotation counts, tree height, and average lookup latency for input sizes between 10^3 and 10^6 keys.",
    },
    {
      id: "p-2",
      text: "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).",
      match: { sourceId: "src-01", percent: 8.4, words: 42 },
    },
    {
      id: "p-3",
      heading: "2. Methodology",
      text: "Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians. Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution with s = 1.1 to approximate skewed access in indexing workloads.",
    },
    {
      id: "p-4",
      text: "Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys.",
      match: { sourceId: "src-04", percent: 5.1, words: 31 },
    },
  ],
  [
    {
      id: "p-5",
      heading: "3. Results",
      text: "For uniform random input, AVL trees maintained a mean height of 1.19 log2(n) against 1.34 log2(n) for red-black trees. The stricter AVL balance criterion produced roughly 38% more rotations during insertion but reduced average lookup latency by 9.4% at n = 10^6.",
    },
    {
      id: "p-6",
      text: "Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.",
      match: { sourceId: "src-05", percent: 3.4, words: 28 },
    },
    {
      id: "p-7",
      heading: "4. Discussion",
      text: "The results support the conventional guidance that AVL trees are preferable for read-dominated workloads while red-black trees suit write-heavy workloads. The cross-over point in these experiments occurred at approximately a 3:1 read-to-write ratio, which is lower than the 5:1 ratio reported in earlier literature.",
      match: { sourceId: "src-03", percent: 3.2, words: 24 },
    },
    {
      id: "p-8",
      heading: "5. Conclusion",
      text: "Balance strictness is a tunable trade-off rather than a strict ordering of quality. Future work should extend the comparison to weight-balanced trees and to concurrent variants under multi-threaded access.",
    },
    {
      id: "p-9",
      heading: "References",
      text: "[1] T. H. Cormen et al., Introduction to Algorithms, 4th ed. [2] G. M. Adelson-Velsky and E. M. Landis, \"An algorithm for the organization of information.\" [3] R. Bayer, \"Symmetric binary B-trees.\" [8] S. Iyer, \"Empirical studies of tree indices,\" (not cited in text).",
    },
  ],
];

export const citationAnalysis = {
  style: "IEEE",
  references: 14,
  inText: 12,
  issues: [
    {
      id: "ci-1",
      text: "Reference [8] appears in the bibliography but is not cited in the text.",
      target: "p-9",
    },
    {
      id: "ci-2",
      text: "Paragraph 4 may require a supporting citation for the instrumentation method.",
      target: "p-4",
    },
  ],
};

export const revisionHistory = [
  { id: "v1", label: "Version 1", date: "18 Sep 2026", words: 1284 },
  { id: "v2", label: "Version 2", date: "20 Sep 2026", words: 1512 },
  { id: "final", label: "Final", date: "21 Sep 2026", words: 1638 },
];

export const rubric = [
  { criterion: "Technical Analysis", score: 18, max: 20 },
  { criterion: "Methodology", score: 17, max: 20 },
  { criterion: "Results", score: 18, max: 20 },
  { criterion: "References", score: 15, max: 20 },
  { criterion: "Writing", score: 18, max: 20 },
];

export const writingPattern = {
  status: "Requires Review",
  indicators: [
    { label: "Sentence structure", value: "Moderate" },
    { label: "Vocabulary distribution", value: "Normal" },
    { label: "Repeated phrasing", value: "Low" },
    { label: "Style change", value: "Moderate" },
    { label: "Unusual passages", value: "3" },
  ],
  note: "Writing-pattern analysis is probabilistic and may produce false positives. Faculty should consider the complete submission and supporting evidence.",
};

export const similarityBreakdown = [
  { label: "Web", value: 15 },
  { label: "Academic", value: 4 },
  { label: "Student submissions", value: 8 },
];

export const submissionActivity = [
  { week: "W1", submissions: 42, flagged: 3 },
  { week: "W2", submissions: 58, flagged: 5 },
  { week: "W3", submissions: 61, flagged: 4 },
  { week: "W4", submissions: 74, flagged: 8 },
  { week: "W5", submissions: 66, flagged: 6 },
  { week: "W6", submissions: 81, flagged: 7 },
];

export const similarityDistribution = [
  { band: "0–10%", count: 186 },
  { band: "11–20%", count: 142 },
  { band: "21–30%", count: 61 },
  { band: "31–40%", count: 24 },
  { band: "41%+", count: 13 },
];

import { db } from "@/lib/backend/db";

export const departments = [
  { name: "Computer Engineering", code: "CMPN", faculty: 24, students: 128, courses: 2, submissions: 420 },
  { name: "Information Technology Engineering", code: "IT", faculty: 18, students: 120, courses: 2, submissions: 390 },
  { name: "Electronics and Computer Science Engineering", code: "EXCS", faculty: 21, students: 116, courses: 2, submissions: 450 },
  { name: "Electronics and Telecommunication", code: "EXTC", faculty: 15, students: 116, courses: 2, submissions: 310 },
  { name: "Biomedical Engineering", code: "BIO", faculty: 12, students: 100, courses: 2, submissions: 240 },
];

export function findCourse(id: string): Course | undefined {
  const local = courses.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase());
  if (local) return local;
  try {
    const dbCourse = db.getCourseById(id);
    if (dbCourse) {
      return {
        id: dbCourse.id,
        code: dbCourse.course_code,
        title: dbCourse.name,
        department: dbCourse.department_name || "Computer Engineering",
        departmentCode: dbCourse.department_code || "CMPN",
        batches: dbCourse.batches || ["Batch 1", "Batch 2", "Batch 3"],
        section: dbCourse.section || "A",
        students: dbCourse.student_count || 64,
        assignments: dbCourse.assignment_count || 0,
        pending: dbCourse.pending_count || 0,
      };
    }
  } catch {}
  return undefined;
}

export function findAssignment(id: string): Assignment | undefined {
  const local = assignments.find((a) => a.id === id);
  if (local) return local;
  try {
    const dbAsg = db.getAssignmentById(id);
    if (dbAsg) {
      return {
        id: dbAsg.id,
        courseCode: dbAsg.course_code || "EXCS-B",
        title: dbAsg.title,
        department: dbAsg.department_name || "Electronics and Computer Science Engineering",
        subject: dbAsg.subject || "Technical and Business Writing",
        type: dbAsg.assignment_type || "Technical Report",
        due: dbAsg.due_date ? new Date(dbAsg.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "24 Oct 2026",
        submitted: dbAsg.submitted_count || 0,
        total: dbAsg.total_students || 64,
        avgSimilarity: 14,
        pending: 1,
        citationStyle: dbAsg.citation_style || "Normal",
      };
    }
  } catch {}
  return undefined;
}

export function findSubmission(id: string): Submission | undefined {
  try {
    const dbSub = db.getSubmissionById(id);
    if (dbSub) {
      return {
        id: dbSub.submission_code || dbSub.id,
        student: dbSub.student_name || "Student",
        roll: dbSub.student_roll || "25108B0071",
        courseCode: dbSub.course_code || "EXCS-B",
        assignmentId: dbSub.assignment_id || "asg-301-02",
        assignment: dbSub.assignment_title || "Technical Report",
        submitted: dbSub.submitted_at || "Today",
        similarity: dbSub.similarity_percentage ?? 0,
        citationIssues: dbSub.citation_issue_count ?? 0,
        status: (dbSub.status === "needs_review" ? "review" : dbSub.status === "reviewed" ? "reviewed" : "pending") as ReviewStatus,
        drafts: dbSub.drafts_count ?? 1,
        matchedSources: dbSub.matched_source_count ?? 0,
        document: dbSub.document,
      } as any;
    }
  } catch {}
  const local = submissions.find((s) => s.id.toLowerCase() === id.toLowerCase());
  if (local) return local;
  return undefined;
}

export function findStudent(id: string): Student | undefined {
  const local = students.find((s) => s.id === id || s.roll.toLowerCase() === id.toLowerCase());
  if (local) return local;
  try {
    const dbStudent = db.getStudentById(id);
    if (dbStudent) {
      return {
        id: dbStudent.id,
        name: dbStudent.full_name,
        roll: dbStudent.roll_number || "25108B0071",
        courseCode: dbStudent.course_code || "EXCS-B",
        department: dbStudent.department_name || "Electronics and Computer Science Engineering",
        section: dbStudent.section || "B",
        batch: dbStudent.batch || "Batch 3",
        submissions: 0,
        avgSimilarity: 0,
        flagged: 0,
        email: dbStudent.email,
      };
    }
  } catch {}
  return undefined;
}

