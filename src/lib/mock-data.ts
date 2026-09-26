// Mock academic data for the Verity prototype. All data is fictional.
// Structured so it can later be replaced by API calls.

export type ReviewStatus = "reviewed" | "review" | "pending" | "flagged";

export interface Course {
  id: string;
  code: string;
  title: string;
  department: string;
  section: string;
  students: number;
  assignments: number;
  pending: number;
}

export interface Assignment {
  id: string;
  courseCode: string;
  title: string;
  type: string;
  due: string;
  submitted: number;
  total: number;
  avgSimilarity: number;
  pending: number;
  citationStyle: string;
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
  courseCode: string;
  section: string;
  submissions: number;
  avgSimilarity: number;
  flagged: number;
  email: string;
}

export const semesters = ["2026–27", "2025–26", "2024–25"];

export const courses: Course[] = [
  {
    id: "eng-cse-301",
    code: "ENG-CSE-301",
    title: "Data Structures",
    department: "Computer Engineering",
    section: "A",
    students: 64,
    assignments: 5,
    pending: 3,
  },
  {
    id: "eng-cse-305",
    code: "ENG-CSE-305",
    title: "Database Management Systems",
    department: "Computer Engineering",
    section: "B",
    students: 58,
    assignments: 4,
    pending: 5,
  },
  {
    id: "eng-cse-312",
    code: "ENG-CSE-312",
    title: "Computer Networks",
    department: "Computer Engineering",
    section: "A",
    students: 60,
    assignments: 3,
    pending: 2,
  },
  {
    id: "eng-eee-204",
    code: "ENG-EEE-204",
    title: "Digital Electronics",
    department: "Electrical Engineering",
    section: "A",
    students: 61,
    assignments: 6,
    pending: 2,
  },
  {
    id: "eng-me-210",
    code: "ENG-ME-210",
    title: "Engineering Mechanics",
    department: "Mechanical Engineering",
    section: "C",
    students: 55,
    assignments: 4,
    pending: 2,
  },
];

export const assignments: Assignment[] = [
  {
    id: "asg-301-02",
    courseCode: "ENG-CSE-301",
    title: "Technical Report 02",
    type: "Technical Report",
    due: "24 Sep 2026",
    submitted: 58,
    total: 64,
    avgSimilarity: 12,
    pending: 3,
    citationStyle: "IEEE",
  },
  {
    id: "asg-301-bst",
    courseCode: "ENG-CSE-301",
    title: "Binary Search Tree Analysis",
    type: "Technical Report",
    due: "24 Sep 2026",
    submitted: 58,
    total: 64,
    avgSimilarity: 12,
    pending: 3,
    citationStyle: "IEEE",
  },
  {
    id: "asg-301-lab04",
    courseCode: "ENG-CSE-301",
    title: "Lab Report 04",
    type: "Lab Report",
    due: "22 Sep 2026",
    submitted: 64,
    total: 64,
    avgSimilarity: 8,
    pending: 0,
    citationStyle: "IEEE",
  },
  {
    id: "asg-305-norm",
    courseCode: "ENG-CSE-305",
    title: "Database Normalization Report",
    type: "Technical Report",
    due: "26 Sep 2026",
    submitted: 51,
    total: 58,
    avgSimilarity: 15,
    pending: 5,
    citationStyle: "APA",
  },
  {
    id: "asg-312-tcp",
    courseCode: "ENG-CSE-312",
    title: "TCP/IP Protocol Analysis",
    type: "Research Paper",
    due: "30 Sep 2026",
    submitted: 41,
    total: 60,
    avgSimilarity: 14,
    pending: 6,
    citationStyle: "IEEE",
  },
  {
    id: "asg-204-logic",
    courseCode: "ENG-EEE-204",
    title: "Digital Logic Lab Report",
    type: "Lab Report",
    due: "20 Sep 2026",
    submitted: 61,
    total: 61,
    avgSimilarity: 9,
    pending: 1,
    citationStyle: "IEEE",
  },
  {
    id: "asg-210-fea",
    courseCode: "ENG-ME-210",
    title: "Finite Element Analysis Report",
    type: "Project Report",
    due: "02 Oct 2026",
    submitted: 33,
    total: 55,
    avgSimilarity: 11,
    pending: 4,
    citationStyle: "ASME",
  },
];

export const submissions: Submission[] = [
  {
    id: "SUB-2026-09124",
    student: "Riya Sharma",
    roll: "22CSE057",
    courseCode: "ENG-CSE-301",
    assignmentId: "asg-301-02",
    assignment: "Technical Report 02",
    submitted: "Today, 11:08",
    similarity: 27,
    citationIssues: 2,
    status: "review",
    drafts: 3,
    matchedSources: 6,
  },
  {
    id: "SUB-2026-09125",
    student: "Aarav Mehta",
    roll: "22CSE041",
    courseCode: "ENG-CSE-301",
    assignmentId: "asg-301-02",
    assignment: "Technical Report 02",
    submitted: "Today, 10:42",
    similarity: 8,
    citationIssues: 0,
    status: "reviewed",
    drafts: 2,
    matchedSources: 2,
  },
  {
    id: "SUB-2026-09126",
    student: "Kabir Patel",
    roll: "22CSE063",
    courseCode: "ENG-CSE-301",
    assignmentId: "asg-301-lab04",
    assignment: "Lab Report 04",
    submitted: "Today, 09:55",
    similarity: 41,
    citationIssues: 3,
    status: "flagged",
    drafts: 1,
    matchedSources: 9,
  },
  {
    id: "SUB-2026-09127",
    student: "Ananya Iyer",
    roll: "22CSE018",
    courseCode: "ENG-CSE-305",
    assignmentId: "asg-305-norm",
    assignment: "Database Normalization Report",
    submitted: "Yesterday, 18:20",
    similarity: 13,
    citationIssues: 1,
    status: "pending",
    drafts: 2,
    matchedSources: 4,
  },
  {
    id: "SUB-2026-09128",
    student: "Aditya Rao",
    roll: "22CSE032",
    courseCode: "ENG-CSE-312",
    assignmentId: "asg-312-tcp",
    assignment: "TCP/IP Protocol Analysis",
    submitted: "Yesterday, 16:02",
    similarity: 19,
    citationIssues: 2,
    status: "review",
    drafts: 4,
    matchedSources: 5,
  },
  {
    id: "SUB-2026-09129",
    student: "Meera Nair",
    roll: "22EEE027",
    courseCode: "ENG-EEE-204",
    assignmentId: "asg-204-logic",
    assignment: "Digital Logic Lab Report",
    submitted: "21 Sep, 14:37",
    similarity: 6,
    citationIssues: 0,
    status: "reviewed",
    drafts: 1,
    matchedSources: 1,
  },
  {
    id: "SUB-2026-09130",
    student: "Vikram Desai",
    roll: "22ME049",
    courseCode: "ENG-ME-210",
    assignmentId: "asg-210-fea",
    assignment: "Finite Element Analysis Report",
    submitted: "21 Sep, 12:11",
    similarity: 22,
    citationIssues: 1,
    status: "review",
    drafts: 2,
    matchedSources: 5,
  },
  {
    id: "SUB-2026-09131",
    student: "Sneha Krishnan",
    roll: "22CSE072",
    courseCode: "ENG-CSE-305",
    assignmentId: "asg-305-norm",
    assignment: "Database Normalization Report",
    submitted: "20 Sep, 22:48",
    similarity: 34,
    citationIssues: 4,
    status: "flagged",
    drafts: 3,
    matchedSources: 8,
  },
];

export const students: Student[] = [
  {
    id: "22cse057",
    name: "Riya Sharma",
    roll: "22CSE057",
    courseCode: "ENG-CSE-301",
    section: "A",
    submissions: 5,
    avgSimilarity: 18,
    flagged: 1,
    email: "riya.sharma@abcit.edu",
  },
  {
    id: "22cse041",
    name: "Aarav Mehta",
    roll: "22CSE041",
    courseCode: "ENG-CSE-301",
    section: "A",
    submissions: 5,
    avgSimilarity: 9,
    flagged: 0,
    email: "aarav.mehta@abcit.edu",
  },
  {
    id: "22cse063",
    name: "Kabir Patel",
    roll: "22CSE063",
    courseCode: "ENG-CSE-301",
    section: "A",
    submissions: 4,
    avgSimilarity: 31,
    flagged: 2,
    email: "kabir.patel@abcit.edu",
  },
  {
    id: "22cse018",
    name: "Ananya Iyer",
    roll: "22CSE018",
    courseCode: "ENG-CSE-305",
    section: "B",
    submissions: 4,
    avgSimilarity: 12,
    flagged: 0,
    email: "ananya.iyer@abcit.edu",
  },
  {
    id: "22cse032",
    name: "Aditya Rao",
    roll: "22CSE032",
    courseCode: "ENG-CSE-312",
    section: "A",
    submissions: 3,
    avgSimilarity: 17,
    flagged: 1,
    email: "aditya.rao@abcit.edu",
  },
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
    title: "Balanced Binary Search Trees — Course Notes",
    domain: "example.edu",
    type: "Web",
    contribution: 8.4,
    words: 142,
  },
  {
    id: "src-02",
    title: "Self-Balancing Tree Structures in Practice",
    domain: "research-paper.example",
    type: "Academic",
    contribution: 4.8,
    words: 128,
  },
  {
    id: "src-03",
    title: "Submission by 22CSE041 · Technical Report 02",
    domain: "Institutional repository",
    type: "Student submission",
    contribution: 3.2,
    words: 86,
  },
  {
    id: "src-04",
    title: "AVL Rotation Reference Implementation",
    domain: "docs.example.org",
    type: "Web",
    contribution: 5.1,
    words: 97,
  },
  {
    id: "src-05",
    title: "Red-Black Trees: An Empirical Comparison",
    domain: "journals.example",
    type: "Academic",
    contribution: 3.4,
    words: 74,
  },
  {
    id: "src-06",
    title: "Data Structures Lab Manual (2024)",
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

export const departments = [
  { name: "Computer Engineering", faculty: 24, students: 612, courses: 18, submissions: 2140 },
  { name: "Electrical Engineering", faculty: 18, students: 486, courses: 14, submissions: 1502 },
  { name: "Mechanical Engineering", faculty: 21, students: 524, courses: 16, submissions: 1638 },
  { name: "Civil Engineering", faculty: 15, students: 398, courses: 12, submissions: 1104 },
];

export function findCourse(id: string) {
  return courses.find((c) => c.id === id || c.code.toLowerCase() === id.toLowerCase());
}

export function findAssignment(id: string) {
  return assignments.find((a) => a.id === id);
}

export function findSubmission(id: string) {
  return submissions.find((s) => s.id.toLowerCase() === id.toLowerCase());
}

export function findStudent(id: string) {
  return students.find((s) => s.id === id || s.roll.toLowerCase() === id.toLowerCase());
}
