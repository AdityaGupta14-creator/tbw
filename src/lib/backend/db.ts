import type {
  Assignment,
  Course,
  Department,
  FeedbackRecord,
  Institution,
  NotificationType,
  Profile,
  ReviewAuditAction,
  ReviewAuditEntry,
  ReviewDecision,
  ReviewedPassageRecord,
  ReviewedPassageStatus,
  ReviewStatus,
  StudentNotification,
  Submission,
  SubmissionReview,
  UserRole,
} from "@/types/database";
import { runSimilarityAnalysis } from "./similarity-engine";
import { analyzeIeeeCitations } from "./citation-engine";
import { analyzeAIWritingPatterns } from "./ai-writing-analysis";
import { processUploadedDocument } from "./document-processor";
import {
  processSubmissionDocument,
  validateDocumentFile,
} from "./submission-analysis-service";
import {
  InvalidStatusTransitionError,
  validateReviewTransition,
} from "./authorization";

const STORAGE_KEY = "verity_fullstack_database_v4";

interface DatabaseState {
  institutions: Institution[];
  departments: Department[];
  profiles: Profile[];
  courses: Course[];
  assignments: Assignment[];
  submissions: Submission[];
  feedback: FeedbackRecord[];
  notifications: StudentNotification[];
  currentUser: Profile;
}

// Initial seed data matching the fictional engineering university
function getInitialSeedData(): DatabaseState {
  const institution: Institution = {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "ABC Institute of Technology",
    created_at: new Date().toISOString(),
  };

  const departments: Department[] = [
    {
      id: "d0000000-0000-0000-0000-000000000001",
      institution_id: institution.id,
      name: "Computer Engineering",
      code: "ENG-CSE",
      faculty_count: 24,
      student_count: 612,
      course_count: 18,
      submission_count: 2140,
      created_at: new Date().toISOString(),
    },
    {
      id: "d0000000-0000-0000-0000-000000000002",
      institution_id: institution.id,
      name: "Electrical Engineering",
      code: "ENG-EEE",
      faculty_count: 18,
      student_count: 486,
      course_count: 14,
      submission_count: 1502,
      created_at: new Date().toISOString(),
    },
    {
      id: "d0000000-0000-0000-0000-000000000003",
      institution_id: institution.id,
      name: "Mechanical Engineering",
      code: "ENG-ME",
      faculty_count: 21,
      student_count: 524,
      course_count: 16,
      submission_count: 1638,
      created_at: new Date().toISOString(),
    },
    {
      id: "d0000000-0000-0000-0000-000000000004",
      institution_id: institution.id,
      name: "Civil Engineering",
      code: "ENG-CE",
      faculty_count: 15,
      student_count: 398,
      course_count: 12,
      submission_count: 1104,
      created_at: new Date().toISOString(),
    },
  ];

  const faculty: Profile = {
    id: "p0000000-0000-0000-0000-000000000001",
    full_name: "Dr. P. Kulkarni",
    email: "p.kulkarni@abcit.edu",
    role: "faculty",
    institution_id: institution.id,
    department_id: departments[0]!.id,
    department_name: "Computer Engineering",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const students: Profile[] = [
    {
      id: "p0000000-0000-0000-0000-000000000002",
      full_name: "Riya Sharma",
      email: "riya.sharma@abcit.edu",
      role: "student",
      roll_number: "22CSE057",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000003",
      full_name: "Aarav Mehta",
      email: "aarav.mehta@abcit.edu",
      role: "student",
      roll_number: "22CSE041",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000004",
      full_name: "Kabir Patel",
      email: "kabir.patel@abcit.edu",
      role: "student",
      roll_number: "22CSE063",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000005",
      full_name: "Ananya Iyer",
      email: "ananya.iyer@abcit.edu",
      role: "student",
      roll_number: "22CSE018",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000006",
      full_name: "Aditya Rao",
      email: "aditya.rao@abcit.edu",
      role: "student",
      roll_number: "22CSE032",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000008",
      full_name: "Meera Nair",
      email: "meera.nair@abcit.edu",
      role: "student",
      roll_number: "22EEE027",
      institution_id: institution.id,
      department_id: departments[1]!.id,
      department_name: "Electrical Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000009",
      full_name: "Vikram Desai",
      email: "vikram.desai@abcit.edu",
      role: "student",
      roll_number: "22ME049",
      institution_id: institution.id,
      department_id: departments[2]!.id,
      department_name: "Mechanical Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "p0000000-0000-0000-0000-000000000010",
      full_name: "Sneha Krishnan",
      email: "sneha.krishnan@abcit.edu",
      role: "student",
      roll_number: "22CE015",
      institution_id: institution.id,
      department_id: departments[3]!.id,
      department_name: "Civil Engineering",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const admin: Profile = {
    id: "p0000000-0000-0000-0000-000000000007",
    full_name: "Registrar Office",
    email: "registrar@abcit.edu",
    role: "admin",
    institution_id: institution.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const courses: Course[] = [
    {
      id: "eng-cse-301",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-CSE-301",
      name: "Data Structures",
      section: "A",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Balanced search trees, graph algorithms, and indexing structures.",
      student_count: 64,
      assignment_count: 5,
      pending_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "eng-cse-305",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-CSE-305",
      name: "Database Management Systems",
      section: "B",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Relational algebra, normal forms, transaction ACID properties.",
      student_count: 58,
      assignment_count: 4,
      pending_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "eng-cse-312",
      institution_id: institution.id,
      department_id: departments[0]!.id,
      department_name: "Computer Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-CSE-312",
      name: "Computer Networks",
      section: "A",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Layered architectures, TCP congestion control, socket programming.",
      student_count: 60,
      assignment_count: 3,
      pending_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "eng-eee-204",
      institution_id: institution.id,
      department_id: departments[1]!.id,
      department_name: "Electrical Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-EEE-204",
      name: "Digital Electronics",
      section: "A",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Synchronous state machines, logic synthesis, hardware testbenches.",
      student_count: 61,
      assignment_count: 6,
      pending_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "eng-me-210",
      institution_id: institution.id,
      department_id: departments[2]!.id,
      department_name: "Mechanical Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-ME-210",
      name: "Engineering Mechanics",
      section: "C",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Stress analysis, static equilibrium, finite element approximations.",
      student_count: 55,
      assignment_count: 4,
      pending_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "eng-ce-101",
      institution_id: institution.id,
      department_id: departments[3]!.id,
      department_name: "Civil Engineering",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      course_code: "ENG-CE-101",
      name: "Surveying & Geomatics",
      section: "B",
      semester: "Autumn",
      academic_year: "2026–27",
      description: "Topographic triangulation, levelling error adjustments, geospatial GIS models.",
      student_count: 48,
      assignment_count: 3,
      pending_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const assignments: Assignment[] = [
    {
      id: "asg-301-02",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      course_name: "Data Structures",
      title: "Technical Report 02",
      description: "Comparative Analysis of Balanced Binary Search Trees under dynamic insertions.",
      assignment_type: "Technical Report",
      due_date: "24 Sep 2026",
      max_marks: 100,
      word_limit: 2000,
      page_limit: 8,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 58,
      total_students: 64,
      avg_similarity: 12,
      pending_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-301-bst",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      course_name: "Data Structures",
      title: "Binary Search Tree Analysis",
      description: "Empirical benchmarking of rotation frequencies in self-balancing structures.",
      assignment_type: "Technical Report",
      due_date: "24 Sep 2026",
      max_marks: 100,
      word_limit: 2500,
      page_limit: 10,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 58,
      total_students: 64,
      avg_similarity: 12,
      pending_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-301-lab04",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      course_name: "Data Structures",
      title: "Lab Report 04",
      description: "Graph shortest path algorithms implementation and asymptotic complexity.",
      assignment_type: "Lab Report",
      due_date: "22 Sep 2026",
      max_marks: 50,
      word_limit: 1500,
      page_limit: 5,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 64,
      total_students: 64,
      avg_similarity: 8,
      pending_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-305-norm",
      course_id: "eng-cse-305",
      course_code: "ENG-CSE-305",
      course_name: "Database Management Systems",
      title: "Database Normalization Report",
      description: "Functional dependencies, BCNF decomposition, and lossless join verification.",
      assignment_type: "Technical Report",
      due_date: "26 Sep 2026",
      max_marks: 100,
      word_limit: 2000,
      page_limit: 8,
      citation_style: "APA",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 51,
      total_students: 58,
      avg_similarity: 13,
      pending_count: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-312-tcp",
      course_id: "eng-cse-312",
      course_code: "ENG-CSE-312",
      course_name: "Computer Networks",
      title: "TCP/IP Protocol Analysis",
      description: "Sliding window flow control and Reno/Cubic congestion avoidance comparison.",
      assignment_type: "Research Paper",
      due_date: "30 Sep 2026",
      max_marks: 100,
      word_limit: 2200,
      page_limit: 8,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 41,
      total_students: 60,
      avg_similarity: 19,
      pending_count: 6,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-204-logic",
      course_id: "eng-eee-204",
      course_code: "ENG-EEE-204",
      course_name: "Digital Electronics",
      title: "Digital Logic Lab Report",
      description: "State machine minimization and VHDL simulation testbench verification.",
      assignment_type: "Lab Report",
      due_date: "20 Sep 2026",
      max_marks: 50,
      word_limit: 1500,
      page_limit: 5,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 61,
      total_students: 61,
      avg_similarity: 6,
      pending_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-210-fea",
      course_id: "eng-me-210",
      course_code: "ENG-ME-210",
      course_name: "Engineering Mechanics",
      title: "Finite Element Analysis Report",
      description: "Cantilever beam displacement and von Mises stress distribution analysis.",
      assignment_type: "Project Report",
      due_date: "02 Oct 2026",
      max_marks: 100,
      word_limit: 2500,
      page_limit: 10,
      citation_style: "ASME",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 33,
      total_students: 55,
      avg_similarity: 22,
      pending_count: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "asg-101-survey",
      course_id: "eng-ce-101",
      course_code: "ENG-CE-101",
      course_name: "Surveying & Geomatics",
      title: "Surveying Field Report",
      description: "Total station closed traverse levelling and Bowditch compass rule correction.",
      assignment_type: "Field Report",
      due_date: "25 Sep 2026",
      max_marks: 75,
      word_limit: 1800,
      page_limit: 6,
      citation_style: "IEEE",
      enable_similarity: true,
      enable_student_comparison: true,
      enable_citation_analysis: true,
      enable_revision_history: true,
      enable_writing_pattern_analysis: true,
      submitted_count: 45,
      total_students: 48,
      avg_similarity: 34,
      pending_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const defaultText = `Comparative Analysis of Balanced Binary Search Trees
Riya Sharma · 22CSE057 · Section A · Submitted 21 September 2026

1. Introduction
Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion. This report compares AVL trees and red-black trees across a set of controlled workloads, measuring rotation counts, tree height, and average lookup latency.

A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).

2. Methodology
Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians. Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution.

Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys.

3. Results
For uniform random input, AVL trees maintained a mean height of 1.19 log2(n) against 1.34 log2(n) for red-black trees. The stricter AVL balance criterion produced roughly 38% more rotations during insertion.

Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.

4. Discussion
The results support the conventional guidance that AVL trees are preferable for read-dominated workloads while red-black trees suit write-heavy workloads. The cross-over point in these experiments occurred at approximately a 3:1 read-to-write ratio.

5. Conclusion
Balance strictness is a tunable trade-off rather than a strict ordering of quality. Future work should extend the comparison to concurrent variants under multi-threaded access.

References
[1] T. H. Cormen et al., Introduction to Algorithms, 4th ed.
[2] G. M. Adelson-Velsky and E. M. Landis, "An algorithm for the organization of information."
[3] R. Bayer, "Symmetric binary B-trees."
[8] S. Iyer, "Empirical studies of tree indices," (not cited in text).`;

  const initialSim = runSimilarityAnalysis(defaultText);
  const initialCite = analyzeIeeeCitations(defaultText);

  const submissions: Submission[] = [
    {
      id: "SUB-2026-09124",
      submission_code: "SUB-2026-09124",
      assignment_id: "asg-301-02",
      assignment_title: "Technical Report 02",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      student_id: students[0]!.id,
      student_name: students[0]!.full_name,
      student_roll: students[0]!.roll_number,
      version_number: 3,
      status: "needs_review",
      submitted_at: "Today, 11:08",
      is_final: true,
      similarity_percentage: 27,
      matched_source_count: 6,
      citation_issue_count: 2,
      drafts_count: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-01",
        submission_id: "SUB-2026-09124",
        file_name: "Riya_Sharma_22CSE057_TechReport02.pdf",
        file_type: "application/pdf",
        file_size: 412800,
        storage_path: "submissions/SUB-2026-09124.pdf",
        extracted_text: defaultText,
        page_count: 2,
        word_count: 1638,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-01",
        submission_id: "SUB-2026-09124",
        status: "completed",
        similarity_percentage: 27,
        matched_source_count: 6,
        student_overlap_percentage: 8,
        citation_issue_count: 2,
        writing_pattern_status: "Requires Review",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 14,
          moderate_percentage: 9,
          semantic_percentage: 5,
          weak_percentage: 0,
          unique_matched_words: 98,
          total_document_words: 364,
        },
        transparent_breakdown: {
          exactSimilarity: 0,
          shingleSimilarity: 14,
          fuzzySimilarity: 47,
          semanticSimilarity: 60,
          structuralSimilarity: 0,
          weightedSimilarity: 27,
          evidenceLevel: "moderate",
          confidence: 0.88,
        },
        matches: [
          {
            id: "match-01",
            analysis_id: "ana-01",
            source_type: "web",
            source_name: "Balanced Binary Search Trees — Course Notes",
            source_title: "Balanced Binary Search Trees — Course Notes",
            source_url: "https://example.edu/cs301/trees.pdf",
            matched_text: "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).",
            source_matched_text: "Standard binary search trees exhibit linear complexity O(n) under sorted key insertions. Self-balancing binary search trees maintain logarithmic height O(log n) through systematic rotational operations.",
            similarity_percentage: 26,
            exact_similarity: 0,
            fuzzy_similarity: 47,
            semantic_similarity: 60,
            evidence_level: "moderate",
            confidence: 0.88,
            passage_id: "p-2",
            start_position: 180,
            end_position: 450,
            matched_words: 48,
            is_quoted: false,
            is_common_technical_phrase: false,
            created_at: new Date().toISOString(),
          },
          {
            id: "match-02",
            analysis_id: "ana-01",
            source_type: "student_submission",
            source_name: "Peer Student Submission (Aman Verma - 22CSE088)",
            source_title: "Peer Student Submission (Aman Verma - 22CSE088)",
            source_url: "submissions/SUB-2026-08112.pdf",
            matched_text: "Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built.",
            source_matched_text: "For ascending sequential keys, red-black trees finished insertion roughly 15% faster due to relaxed balancing constraints, whereas AVL trees maintained lower average depth for search workloads.",
            similarity_percentage: 18,
            exact_similarity: 0,
            fuzzy_similarity: 38,
            semantic_similarity: 54,
            evidence_level: "moderate",
            confidence: 0.82,
            passage_id: "p-6",
            start_position: 620,
            end_position: 890,
            matched_words: 38,
            is_quoted: false,
            is_common_technical_phrase: false,
            created_at: new Date().toISOString(),
          },
        ],
        passages: [
          {
            id: "passage-01",
            source_id: "src-01",
            source_name: "Balanced Binary Search Trees — Course Notes",
            source_type: "web",
            student_text: "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).",
            source_text: "Standard binary search trees exhibit linear complexity O(n) under sorted key insertions. Self-balancing binary search trees maintain logarithmic height O(log n) through systematic rotational operations.",
            start_sentence_idx: 1,
            end_sentence_idx: 2,
            matched_words: 48,
            similarity_percentage: 26,
            exact_similarity: 0,
            fuzzy_similarity: 47,
            semantic_similarity: 60,
            confidence: 0.88,
            evidence_level: "moderate",
            reasons: ["Paraphrasing detected: sentence restructuring with semantic preservation"],
            is_quoted: false,
            is_common_phrase: false,
          },
        ],
      },
      review: {
        id: "rev-2026-001",
        submission_id: "SUB-2026-09124",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "in_review",
        decision: undefined,
        decision_rationale: undefined,
        faculty_notes: "Checked definitions in Section 1 against standard textbook references. Overlap flagged for citation verification.",
        reviewed_passages: [
          {
            passage_id: "p-2",
            status: "cited_or_common",
            reviewer_notes: "Standard textbook definition, acceptable once cited properly.",
            reviewed_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      review_audit: [
        {
          id: "aud-001",
          submission_id: "SUB-2026-09124",
          review_id: "rev-2026-001",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "REVIEW_PENDING",
          previous_status: undefined,
          new_status: "pending",
          notes: "Initial review queue assignment",
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "aud-002",
          submission_id: "SUB-2026-09124",
          review_id: "rev-2026-001",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "STATUS_TRANSITION",
          previous_status: "pending",
          new_status: "in_review",
          notes: "Faculty initiated detailed analysis inspection",
          created_at: new Date(Date.now() - 5400000).toISOString(),
        },
        {
          id: "aud-003",
          submission_id: "SUB-2026-09124",
          review_id: "rev-2026-001",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "PASSAGE_REVIEWED",
          previous_status: "in_review",
          new_status: "in_review",
          notes: "Passage p-2 classified as cited/common terminology",
          metadata: { passage_id: "p-2", status: "cited_or_common" },
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    {
      id: "SUB-2026-09125",
      submission_code: "SUB-2026-09125",
      assignment_id: "asg-301-02",
      assignment_title: "Technical Report 02",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      student_id: students[1]!.id,
      student_name: students[1]!.full_name,
      student_roll: students[1]!.roll_number,
      version_number: 2,
      status: "reviewed",
      submitted_at: "Today, 10:42",
      is_final: true,
      similarity_percentage: 8,
      matched_source_count: 2,
      citation_issue_count: 0,
      drafts_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-02",
        submission_id: "SUB-2026-09125",
        file_name: "Aarav_Mehta_22CSE041_TechReport02.pdf",
        file_type: "application/pdf",
        file_size: 384000,
        storage_path: "submissions/SUB-2026-09125.pdf",
        extracted_text: "Empirical benchmarking of self-balancing binary search trees...",
        page_count: 4,
        word_count: 1480,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-02",
        submission_id: "SUB-2026-09125",
        status: "completed",
        similarity_percentage: 8,
        matched_source_count: 2,
        student_overlap_percentage: 3,
        citation_issue_count: 0,
        writing_pattern_status: "Normal",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 0,
          moderate_percentage: 4,
          semantic_percentage: 4,
          weak_percentage: 0,
          unique_matched_words: 24,
          total_document_words: 320,
        },
        transparent_breakdown: {
          exactSimilarity: 0,
          shingleSimilarity: 0,
          fuzzySimilarity: 25,
          semanticSimilarity: 30,
          structuralSimilarity: 0,
          weightedSimilarity: 8,
          evidenceLevel: "weak",
          confidence: 0.95,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-002",
        submission_id: "SUB-2026-09125",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "reviewed",
        decision: "cleared_no_action",
        decision_rationale: "Negligible similarity index (8%). Citations valid and original work verified.",
        faculty_notes: "Clear and well-documented original submission.",
        reviewed_passages: [],
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 82000000).toISOString(),
      },
      review_audit: [
        {
          id: "aud-004",
          submission_id: "SUB-2026-09125",
          review_id: "rev-2026-002",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "DECISION_RECORDED",
          previous_status: "in_review",
          new_status: "reviewed",
          notes: "Formal review closed with cleared_no_action",
          created_at: new Date(Date.now() - 82000000).toISOString(),
        },
      ],
    },
    {
      id: "SUB-2026-09126",
      submission_code: "SUB-2026-09126",
      assignment_id: "asg-301-lab04",
      assignment_title: "Lab Report 04",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      student_id: students[2]!.id,
      student_name: students[2]!.full_name,
      student_roll: students[2]!.roll_number,
      version_number: 1,
      status: "needs_review",
      submitted_at: "Today, 09:55",
      is_final: true,
      similarity_percentage: 41,
      matched_source_count: 9,
      citation_issue_count: 3,
      drafts_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-03",
        submission_id: "SUB-2026-09126",
        file_name: "Kabir_Patel_22CSE063_LabReport04.pdf",
        file_type: "application/pdf",
        file_size: 450000,
        storage_path: "submissions/SUB-2026-09126.pdf",
        extracted_text: "Graph shortest path implementations and Dijkstra complexity...",
        page_count: 3,
        word_count: 1250,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-03",
        submission_id: "SUB-2026-09126",
        status: "completed",
        similarity_percentage: 41,
        matched_source_count: 9,
        student_overlap_percentage: 28,
        citation_issue_count: 3,
        writing_pattern_status: "Requires Review",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 25,
          moderate_percentage: 12,
          semantic_percentage: 4,
          weak_percentage: 0,
          unique_matched_words: 180,
          total_document_words: 440,
        },
        transparent_breakdown: {
          exactSimilarity: 25,
          shingleSimilarity: 28,
          fuzzySimilarity: 48,
          semanticSimilarity: 52,
          structuralSimilarity: 15,
          weightedSimilarity: 41,
          evidenceLevel: "strong",
          confidence: 0.94,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-003",
        submission_id: "SUB-2026-09126",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "pending",
        decision: undefined,
        reviewed_passages: [],
        created_at: new Date(Date.now() - 40000000).toISOString(),
        updated_at: new Date(Date.now() - 40000000).toISOString(),
      },
      review_audit: [
        {
          id: "aud-005",
          submission_id: "SUB-2026-09126",
          review_id: "rev-2026-003",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "REVIEW_PENDING",
          previous_status: undefined,
          new_status: "pending",
          notes: "High similarity score (41%) automatically flagged for faculty review queue",
          created_at: new Date(Date.now() - 40000000).toISOString(),
        },
      ],
    },
    {
      id: "SUB-2026-09127",
      submission_code: "SUB-2026-09127",
      assignment_id: "asg-305-norm",
      assignment_title: "Database Normalization Report",
      course_id: "eng-cse-305",
      course_code: "ENG-CSE-305",
      student_id: students[3]!.id,
      student_name: students[3]!.full_name,
      student_roll: students[3]!.roll_number,
      version_number: 2,
      status: "needs_review",
      submitted_at: "Yesterday, 18:20",
      is_final: true,
      similarity_percentage: 13,
      matched_source_count: 4,
      citation_issue_count: 1,
      drafts_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-04",
        submission_id: "SUB-2026-09127",
        file_name: "Ananya_Iyer_22CSE018_Normalization.pdf",
        file_type: "application/pdf",
        file_size: 320000,
        storage_path: "submissions/SUB-2026-09127.pdf",
        extracted_text: "Relational schema normalization through Boyce-Codd normal form decomposition...",
        page_count: 3,
        word_count: 1100,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-04",
        submission_id: "SUB-2026-09127",
        status: "completed",
        similarity_percentage: 13,
        matched_source_count: 4,
        student_overlap_percentage: 5,
        citation_issue_count: 1,
        writing_pattern_status: "Normal",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 0,
          moderate_percentage: 8,
          semantic_percentage: 5,
          weak_percentage: 0,
          unique_matched_words: 42,
          total_document_words: 320,
        },
        transparent_breakdown: {
          exactSimilarity: 0,
          shingleSimilarity: 0,
          fuzzySimilarity: 30,
          semanticSimilarity: 42,
          structuralSimilarity: 0,
          weightedSimilarity: 13,
          evidenceLevel: "weak",
          confidence: 0.85,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-004",
        submission_id: "SUB-2026-09127",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "pending",
        decision: undefined,
        reviewed_passages: [],
        created_at: new Date(Date.now() - 30000000).toISOString(),
        updated_at: new Date(Date.now() - 30000000).toISOString(),
      },
      review_audit: [],
    },
    {
      id: "SUB-2026-09128",
      submission_code: "SUB-2026-09128",
      assignment_id: "asg-312-tcp",
      assignment_title: "TCP/IP Protocol Analysis",
      course_id: "eng-cse-312",
      course_code: "ENG-CSE-312",
      student_id: students[4]!.id,
      student_name: students[4]!.full_name,
      student_roll: students[4]!.roll_number,
      version_number: 4,
      status: "needs_review",
      submitted_at: "Yesterday, 16:02",
      is_final: true,
      similarity_percentage: 19,
      matched_source_count: 5,
      citation_issue_count: 2,
      drafts_count: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-05",
        submission_id: "SUB-2026-09128",
        file_name: "Aditya_Rao_22CSE032_TCPIPAnalysis.pdf",
        file_type: "application/pdf",
        file_size: 410000,
        storage_path: "submissions/SUB-2026-09128.pdf",
        extracted_text: "TCP congestion control window dynamics under high loss wireless links...",
        page_count: 5,
        word_count: 1720,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-05",
        submission_id: "SUB-2026-09128",
        status: "completed",
        similarity_percentage: 19,
        matched_source_count: 5,
        student_overlap_percentage: 8,
        citation_issue_count: 2,
        writing_pattern_status: "Normal",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 6,
          moderate_percentage: 8,
          semantic_percentage: 5,
          weak_percentage: 0,
          unique_matched_words: 64,
          total_document_words: 340,
        },
        transparent_breakdown: {
          exactSimilarity: 6,
          shingleSimilarity: 8,
          fuzzySimilarity: 35,
          semanticSimilarity: 48,
          structuralSimilarity: 0,
          weightedSimilarity: 19,
          evidenceLevel: "weak",
          confidence: 0.86,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-005",
        submission_id: "SUB-2026-09128",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "in_review",
        decision: undefined,
        reviewed_passages: [],
        created_at: new Date(Date.now() - 25000000).toISOString(),
        updated_at: new Date(Date.now() - 20000000).toISOString(),
      },
      review_audit: [
        {
          id: "aud-006",
          submission_id: "SUB-2026-09128",
          review_id: "rev-2026-005",
          actor_id: faculty.id,
          actor_name: faculty.full_name,
          actor_role: "faculty",
          action: "STATUS_TRANSITION",
          previous_status: "pending",
          new_status: "in_review",
          notes: "Review initiated for TCP analysis equations",
          created_at: new Date(Date.now() - 20000000).toISOString(),
        },
      ],
    },
    {
      id: "SUB-2026-09129",
      submission_code: "SUB-2026-09129",
      assignment_id: "asg-204-logic",
      assignment_title: "Digital Logic Lab Report",
      course_id: "eng-eee-204",
      course_code: "ENG-EEE-204",
      student_id: students[5]!.id,
      student_name: students[5]!.full_name,
      student_roll: students[5]!.roll_number,
      version_number: 1,
      status: "reviewed",
      submitted_at: "21 Sep, 14:37",
      is_final: true,
      similarity_percentage: 6,
      matched_source_count: 1,
      citation_issue_count: 0,
      drafts_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-06",
        submission_id: "SUB-2026-09129",
        file_name: "Meera_Nair_22EEE027_LogicLab.pdf",
        file_type: "application/pdf",
        file_size: 290000,
        storage_path: "submissions/SUB-2026-09129.pdf",
        extracted_text: "Synthesis of Moore and Mealy synchronous finite state machines...",
        page_count: 3,
        word_count: 980,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-06",
        submission_id: "SUB-2026-09129",
        status: "completed",
        similarity_percentage: 6,
        matched_source_count: 1,
        student_overlap_percentage: 0,
        citation_issue_count: 0,
        writing_pattern_status: "Normal",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 0,
          moderate_percentage: 2,
          semantic_percentage: 4,
          weak_percentage: 0,
          unique_matched_words: 16,
          total_document_words: 270,
        },
        transparent_breakdown: {
          exactSimilarity: 0,
          shingleSimilarity: 0,
          fuzzySimilarity: 15,
          semanticSimilarity: 25,
          structuralSimilarity: 0,
          weightedSimilarity: 6,
          evidenceLevel: "weak",
          confidence: 0.98,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-006",
        submission_id: "SUB-2026-09129",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "reviewed",
        decision: "cleared_no_action",
        decision_rationale: "Original lab work verified with clean simulation waveforms.",
        reviewed_passages: [],
        created_at: new Date(Date.now() - 70000000).toISOString(),
        updated_at: new Date(Date.now() - 65000000).toISOString(),
      },
      review_audit: [],
    },
    {
      id: "SUB-2026-09130",
      submission_code: "SUB-2026-09130",
      assignment_id: "asg-210-fea",
      assignment_title: "Finite Element Analysis Report",
      course_id: "eng-me-210",
      course_code: "ENG-ME-210",
      student_id: students[6]!.id,
      student_name: students[6]!.full_name,
      student_roll: students[6]!.roll_number,
      version_number: 2,
      status: "needs_review",
      submitted_at: "21 Sep, 12:11",
      is_final: true,
      similarity_percentage: 22,
      matched_source_count: 5,
      citation_issue_count: 1,
      drafts_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-07",
        submission_id: "SUB-2026-09130",
        file_name: "Vikram_Desai_22ME049_FEAReport.pdf",
        file_type: "application/pdf",
        file_size: 480000,
        storage_path: "submissions/SUB-2026-09130.pdf",
        extracted_text: "Displacement boundary value formulation using triangular finite elements...",
        page_count: 6,
        word_count: 1950,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-07",
        submission_id: "SUB-2026-09130",
        status: "completed",
        similarity_percentage: 22,
        matched_source_count: 5,
        student_overlap_percentage: 11,
        citation_issue_count: 1,
        writing_pattern_status: "Normal",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 8,
          moderate_percentage: 9,
          semantic_percentage: 5,
          weak_percentage: 0,
          unique_matched_words: 78,
          total_document_words: 350,
        },
        transparent_breakdown: {
          exactSimilarity: 8,
          shingleSimilarity: 10,
          fuzzySimilarity: 42,
          semanticSimilarity: 50,
          structuralSimilarity: 0,
          weightedSimilarity: 22,
          evidenceLevel: "moderate",
          confidence: 0.87,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-007",
        submission_id: "SUB-2026-09130",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "in_review",
        decision: undefined,
        reviewed_passages: [],
        created_at: new Date(Date.now() - 60000000).toISOString(),
        updated_at: new Date(Date.now() - 55000000).toISOString(),
      },
      review_audit: [],
    },
    {
      id: "SUB-2026-09131",
      submission_code: "SUB-2026-09131",
      assignment_id: "asg-101-survey",
      assignment_title: "Surveying Field Report",
      course_id: "eng-ce-101",
      course_code: "ENG-CE-101",
      student_id: students[7]!.id,
      student_name: students[7]!.full_name,
      student_roll: students[7]!.roll_number,
      version_number: 1,
      status: "needs_review",
      submitted_at: "20 Sep, 17:45",
      is_final: true,
      similarity_percentage: 34,
      matched_source_count: 7,
      citation_issue_count: 2,
      drafts_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-08",
        submission_id: "SUB-2026-09131",
        file_name: "Sneha_Krishnan_22CE015_SurveyReport.pdf",
        file_type: "application/pdf",
        file_size: 430000,
        storage_path: "submissions/SUB-2026-09131.pdf",
        extracted_text: "Topographic profile measurements and closing error balancing using Bowditch rule...",
        page_count: 4,
        word_count: 1340,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-08",
        submission_id: "SUB-2026-09131",
        status: "completed",
        similarity_percentage: 34,
        matched_source_count: 7,
        student_overlap_percentage: 16,
        citation_issue_count: 2,
        writing_pattern_status: "Requires Review",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        evidence_breakdown: {
          strong_percentage: 18,
          moderate_percentage: 10,
          semantic_percentage: 6,
          weak_percentage: 0,
          unique_matched_words: 110,
          total_document_words: 320,
        },
        transparent_breakdown: {
          exactSimilarity: 18,
          shingleSimilarity: 20,
          fuzzySimilarity: 45,
          semanticSimilarity: 55,
          structuralSimilarity: 10,
          weightedSimilarity: 34,
          evidenceLevel: "moderate",
          confidence: 0.91,
        },
        matches: [],
        passages: [],
      },
      review: {
        id: "rev-2026-008",
        submission_id: "SUB-2026-09131",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "pending",
        decision: undefined,
        reviewed_passages: [],
        created_at: new Date(Date.now() - 50000000).toISOString(),
        updated_at: new Date(Date.now() - 50000000).toISOString(),
      },
      review_audit: [],
    },
    {
      id: "SUB-2026-74022",
      submission_code: "SUB-2026-74022",
      assignment_id: "asg-301-02",
      assignment_title: "Technical Report 10",
      course_id: "eng-cse-301",
      course_code: "ENG-CSE-301",
      student_id: students[3]!.id,
      student_name: students[3]!.full_name,
      student_roll: students[3]!.roll_number,
      version_number: 1,
      status: "needs_review",
      submitted_at: "Yesterday, 19:40",
      is_final: true,
      similarity_percentage: 0,
      matched_source_count: 0,
      citation_issue_count: 4,
      drafts_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document: {
        id: "doc-74022",
        submission_id: "SUB-2026-74022",
        file_name: "Technical_Report_10_Ananya_Iyer.txt",
        file_type: "text/plain",
        file_size: 480,
        storage_path: "submissions/SUB-2026-74022.txt",
        extracted_text: `Technical Report on Database Recovery Architectures
Write-ahead logging ensures durability across unexpected power failures by forcing redo records prior to page writes.
Fuzzy checkpointing bounds recovery duration by writing dirty page table snapshots without freezing active transactions.

References
[1] C. Mohan et al., "ARIES: A Transaction Recovery Method," ACM TODS.
[2] J. Gray and A. Reuter, Transaction Processing: Concepts and Techniques.
[3] M. Stonebraker, "The Design of POSTGRES," IEEE Trans. Knowl. Data Eng.
[4] A. Silberschatz et al., Database System Concepts, McGraw-Hill.`,
        page_count: 1,
        word_count: 69,
        created_at: new Date().toISOString(),
      },
      analysis: {
        id: "ana-74022",
        submission_id: "SUB-2026-74022",
        status: "completed",
        similarity_percentage: 0,
        matched_source_count: 0,
        student_overlap_percentage: 0,
        citation_issue_count: 4,
        writing_pattern_status: "Writing pattern analysis unavailable",
        structural_similarity_percentage: 0,
        evidence_breakdown: {
          strong_percentage: 0,
          moderate_percentage: 0,
          semantic_percentage: 0,
          weak_percentage: 0,
          unique_matched_words: 0,
          total_document_words: 69,
        },
        transparent_breakdown: {
          exactSimilarity: 0,
          shingleSimilarity: 0,
          fuzzySimilarity: 0,
          semanticSimilarity: 0,
          structuralSimilarity: 0,
          weightedSimilarity: 0,
          evidenceLevel: "ignored",
          confidence: 1.0,
        },
        matches: [],
        passages: [],
        citation_analysis: analyzeIeeeCitations(`Technical Report on Database Recovery Architectures
Write-ahead logging ensures durability across unexpected power failures by forcing redo records prior to page writes.
Fuzzy checkpointing bounds recovery duration by writing dirty page table snapshots without freezing active transactions.

References
[1] C. Mohan et al., "ARIES: A Transaction Recovery Method," ACM TODS.
[2] J. Gray and A. Reuter, Transaction Processing: Concepts and Techniques.
[3] M. Stonebraker, "The Design of POSTGRES," IEEE Trans. Knowl. Data Eng.
[4] A. Silberschatz et al., Database System Concepts, McGraw-Hill.`),
        ai_writing_analysis: analyzeAIWritingPatterns(`Technical Report on Database Recovery Architectures
Write-ahead logging ensures durability across unexpected power failures by forcing redo records prior to page writes.
Fuzzy checkpointing bounds recovery duration by writing dirty page table snapshots without freezing active transactions.

References
[1] C. Mohan et al., "ARIES: A Transaction Recovery Method," ACM TODS.
[2] J. Gray and A. Reuter, Transaction Processing: Concepts and Techniques.
[3] M. Stonebraker, "The Design of POSTGRES," IEEE Trans. Knowl. Data Eng.
[4] A. Silberschatz et al., Database System Concepts, McGraw-Hill.`),
        student_comparisons: [],
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      review: {
        id: "rev-74022",
        submission_id: "SUB-2026-74022",
        reviewer_id: faculty.id,
        reviewer_name: faculty.full_name,
        status: "pending",
        decision: undefined,
        faculty_notes: "Clean 0% similarity text. Flagged for review due to 4 uncited bibliography entries requiring in-text citation placement.",
        reviewed_passages: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      review_audit: [
        {
          id: "aud-74022-01",
          submission_id: "SUB-2026-74022",
          review_id: "rev-74022",
          actor_id: "system",
          actor_name: "Verity Integrity Engine",
          actor_role: "faculty",
          action: "REVIEW_PENDING",
          previous_status: undefined,
          new_status: "pending",
          notes: "Citation verification required: 4 issue(s) detected during format compliance check",
          created_at: new Date().toISOString(),
        },
      ],
    },
  ];

  const feedback: FeedbackRecord[] = [
    {
      id: "fb-1",
      submission_id: "SUB-2026-09124",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      comment: "Textual overlap with textbook standard definition. Formulate in your own academic phrasing or cite appropriately.",
      page_number: 1,
      paragraph_id: "p-2",
      status: "active",
      created_at: "Yesterday, 14:15",
      updated_at: "Yesterday, 14:15",
    },
    {
      id: "fb-2",
      submission_id: "SUB-2026-09124",
      faculty_id: faculty.id,
      faculty_name: faculty.full_name,
      comment: "Uncited reference [8] needs in-text attribution or removal from bibliography.",
      page_number: 2,
      paragraph_id: "p-9",
      status: "active",
      created_at: "Yesterday, 14:22",
      updated_at: "Yesterday, 14:22",
    },
  ];

  const notifications: StudentNotification[] = [
    {
      id: "notif-001",
      student_id: students[0]!.id,
      submission_id: "SUB-2026-09124",
      assignment_id: "asg-301-02",
      type: "review_started",
      title: "Faculty Integrity Review Initiated",
      message: "Your submission for Technical Report 02 is currently under active review by course faculty Dr. P. Kulkarni.",
      is_read: false,
      created_at: new Date(Date.now() - 5400000).toISOString(),
    },
    {
      id: "notif-002",
      student_id: students[0]!.id,
      submission_id: "SUB-2026-09124",
      assignment_id: "asg-301-02",
      type: "faculty_feedback",
      title: "New Faculty Annotation Added",
      message: "Dr. P. Kulkarni has added a feedback annotation regarding textbook citation in paragraph 2.",
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "notif-003",
      student_id: students[1]!.id,
      submission_id: "SUB-2026-09125",
      assignment_id: "asg-301-02",
      type: "review_completed",
      title: "Academic Integrity Review Finalized",
      message: "Your submission for Technical Report 02 has been cleared with zero academic integrity concerns.",
      is_read: true,
      created_at: new Date(Date.now() - 82000000).toISOString(),
      read_at: new Date(Date.now() - 80000000).toISOString(),
    },
  ];

  return {
    institutions: [institution],
    departments,
    profiles: [faculty, ...students, admin],
    courses,
    assignments,
    submissions,
    feedback,
    notifications,
    currentUser: faculty,
  };
}

class DatabaseManager {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    if (typeof window === "undefined") {
      return getInitialSeedData();
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to read localStorage database:", e);
    }
    const initial = getInitialSeedData();
    this.saveState(initial);
    return initial;
  }

  private saveState(state: DatabaseState) {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn("Failed to persist database state:", e);
      }
    }
  }

  // --- Auth & Profile ---
  public getCurrentUser(): Profile {
    return this.state.currentUser;
  }

  public switchRole(role: UserRole): Profile {
    const user = this.state.profiles.find((p) => p.role === role) || this.state.profiles[0]!;
    this.state.currentUser = user;
    this.saveState(this.state);
    return user;
  }

  // --- Courses ---
  public getCourses(): Course[] {
    return [...this.state.courses];
  }

  public getCourseById(id: string): Course | undefined {
    return this.state.courses.find(
      (c) => c.id === id || c.course_code.toLowerCase() === id.toLowerCase()
    );
  }

  public createCourse(data: {
    course_code: string;
    name: string;
    department_id?: string;
    section: string;
    semester: string;
    academic_year: string;
    description?: string;
  }): Course {
    const dept = this.state.departments.find((d) => d.id === data.department_id) || this.state.departments[0]!;
    const newCourse: Course = {
      id: data.course_code.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      institution_id: this.state.institutions[0]?.id,
      department_id: dept.id,
      department_name: dept.name,
      faculty_id: this.state.currentUser.id,
      faculty_name: this.state.currentUser.full_name,
      course_code: data.course_code,
      name: data.name,
      section: data.section || "A",
      semester: data.semester || "Autumn",
      academic_year: data.academic_year || "2026–27",
      description: data.description || "",
      student_count: 64,
      assignment_count: 0,
      pending_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.courses.unshift(newCourse);
    this.saveState(this.state);
    return newCourse;
  }

  // --- Assignments ---
  public getAssignments(courseId?: string): Assignment[] {
    if (courseId) {
      return this.state.assignments.filter(
        (a) => a.course_id === courseId || a.course_code?.toLowerCase() === courseId.toLowerCase()
      );
    }
    return [...this.state.assignments];
  }

  public getAssignmentById(id: string): Assignment | undefined {
    return this.state.assignments.find((a) => a.id === id);
  }

  public createAssignment(data: Partial<Assignment>): Assignment {
    const course = this.getCourseById(data.course_id || "") || this.state.courses[0]!;
    const newAssignment: Assignment = {
      id: `asg-${Date.now().toString(36)}`,
      course_id: course.id,
      course_code: course.course_code,
      course_name: course.name,
      title: data.title || "Untitled Assignment",
      description: data.description || "",
      assignment_type: data.assignment_type || "Technical Report",
      due_date: data.due_date || "30 Sep 2026",
      max_marks: data.max_marks || 100,
      word_limit: data.word_limit || 2000,
      page_limit: data.page_limit || 8,
      citation_style: data.citation_style || "IEEE",
      enable_similarity: data.enable_similarity ?? true,
      enable_student_comparison: data.enable_student_comparison ?? true,
      enable_citation_analysis: data.enable_citation_analysis ?? true,
      enable_revision_history: data.enable_revision_history ?? true,
      enable_writing_pattern_analysis: data.enable_writing_pattern_analysis ?? true,
      submitted_count: 0,
      total_students: course.student_count || 64,
      avg_similarity: 0,
      pending_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.state.assignments.unshift(newAssignment);
    // Update course assignment count
    course.assignment_count = (course.assignment_count || 0) + 1;
    this.saveState(this.state);
    return newAssignment;
  }

  // --- Submissions ---
  public getSubmissions(filters?: {
    courseCode?: string;
    status?: string;
    studentId?: string;
  }): Submission[] {
    let result = [...this.state.submissions];
    if (filters?.courseCode && filters.courseCode !== "All courses") {
      result = result.filter((s) => s.course_code === filters.courseCode);
    }
    if (filters?.status && filters.status !== "All statuses") {
      result = result.filter((s) => s.status === filters.status);
    }
    if (filters?.studentId) {
      result = result.filter((s) => s.student_id === filters.studentId || s.student_roll === filters.studentId);
    }
    return result;
  }

  public sanitizeSubmissionForStudent(sub: Submission): Submission {
    const copy: Submission = JSON.parse(JSON.stringify(sub));
    if (copy.review) {
      // Confidentially isolate faculty deliberation notes from student view
      delete (copy.review as any).faculty_notes;
    }
    if (copy.review_audit) {
      copy.review_audit = copy.review_audit.map((entry) => {
        if (entry.metadata && entry.metadata["faculty_notes"]) {
          const sanitizedMeta = { ...entry.metadata };
          delete sanitizedMeta["faculty_notes"];
          return { ...entry, metadata: sanitizedMeta };
        }
        return entry;
      });
    }
    return copy;
  }

  public getSubmissionById(id: string, requesterRole?: UserRole): Submission | undefined {
    let sub = this.state.submissions.find(
      (s) => s.id.toLowerCase() === id.toLowerCase() || s.submission_code.toLowerCase() === id.toLowerCase()
    );
    if (!sub && /^sub-?0?(\d+)$/i.test(id)) {
      const idx = parseInt(id.replace(/^sub-?0?/i, ""), 10) - 1;
      if (idx >= 0 && idx < this.state.submissions.length) {
        sub = this.state.submissions[idx];
      }
    }
    if (!sub) return undefined;
    const effectiveRole = requesterRole || this.state.currentUser.role;
    if (effectiveRole === "student") {
      return this.sanitizeSubmissionForStudent(sub);
    }
    return sub;
  }

  public addSubmission(submission: Submission): void {
    const existingIndex = this.state.submissions.findIndex(
      (s) =>
        s.id.toLowerCase() === submission.id.toLowerCase() ||
        s.submission_code.toLowerCase() === submission.submission_code.toLowerCase()
    );
    if (existingIndex >= 0) {
      this.state.submissions[existingIndex] = {
        ...this.state.submissions[existingIndex],
        ...submission,
      };
    } else {
      this.state.submissions.unshift(submission);
    }
    this.saveState(this.state);
  }

  /**
   * Complete student document submission workflow:
   * 1. Extracts text from file (PDF/DOCX/TXT)
   * 2. Creates submission with unique receipt
   * 3. Runs similarity engine across peer submissions
   * 4. Runs IEEE citation analysis
   * 5. Saves to database and persists
   */
  public async submitDocument(params: {
    assignmentId: string;
    file: File;
    studentRoll?: string | undefined;
    studentName?: string | undefined;
    onProgress?: ((stage: string) => void) | undefined;
  }): Promise<Submission> {
    const assignment = this.getAssignmentById(params.assignmentId) || this.state.assignments[0]!;
    const submissionCode = `SUB-2026-${Math.floor(10000 + Math.random() * 90000)}`;

    const validation = validateDocumentFile(params.file);
    if (!validation.valid) {
      const failedSubmission: Submission = {
        id: submissionCode,
        submission_code: submissionCode,
        assignment_id: assignment.id,
        assignment_title: assignment.title,
        course_id: assignment.course_id,
        course_code: assignment.course_code,
        student_id: this.state.currentUser.id,
        student_name: params.studentName || this.state.currentUser.full_name || "Riya Sharma",
        student_roll: params.studentRoll || this.state.currentUser.roll_number || "22CSE057",
        version_number: 1,
        status: "failed",
        submitted_at: new Date().toISOString(),
        is_final: true,
        similarity_percentage: 0,
        matched_source_count: 0,
        citation_issue_count: 0,
        drafts_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        analysis: {
          id: `ana-${submissionCode}`,
          submission_id: submissionCode,
          status: "failed",
          errorMessage: validation.error,
          similarity_percentage: 0,
          matched_source_count: 0,
          student_overlap_percentage: 0,
          citation_issue_count: 0,
          writing_pattern_status: "Validation Failed",
          completed_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        } as any,
      };
      this.state.submissions.unshift(failedSubmission);
      this.saveState(this.state);
      return failedSubmission;
    }

    // Initialize with processing state
    const newSubmission: Submission = {
      id: submissionCode,
      submission_code: submissionCode,
      assignment_id: assignment.id,
      assignment_title: assignment.title,
      course_id: assignment.course_id,
      course_code: assignment.course_code,
      student_id: this.state.currentUser.id,
      student_name: params.studentName || this.state.currentUser.full_name || "Riya Sharma",
      student_roll: params.studentRoll || this.state.currentUser.roll_number || "22CSE057",
      version_number: 1,
      status: "processing",
      submitted_at: new Date().toISOString(),
      is_final: true,
      similarity_percentage: 0,
      matched_source_count: 0,
      citation_issue_count: 0,
      drafts_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.submissions.unshift(newSubmission);
    this.saveState(this.state);

    const output = await processSubmissionDocument({
      submissionId: submissionCode,
      submissionCode,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      courseId: assignment.course_id,
      courseCode: assignment.course_code,
      studentId: this.state.currentUser.id,
      studentName: newSubmission.student_name,
      studentRoll: newSubmission.student_roll,
      file: params.file,
      onProgress: params.onProgress,
    });

    if (output.success && output.analysis) {
      newSubmission.status = output.status;
      newSubmission.similarity_percentage = output.analysis.similarity_percentage;
      newSubmission.matched_source_count = output.analysis.matched_source_count;
      newSubmission.citation_issue_count = output.analysis.citation_issue_count;
      newSubmission.document = {
        id: `doc-${Date.now()}`,
        submission_id: submissionCode,
        file_name: output.document.fileName,
        file_type: output.document.fileType,
        file_size: output.document.fileSize,
        storage_path: `submissions/${submissionCode}/${output.document.fileName}`,
        extracted_text: output.document.extractedText,
        page_count: output.document.pageCount,
        word_count: output.document.wordCount,
        created_at: new Date().toISOString(),
      };
      newSubmission.analysis = {
        ...output.analysis,
        created_at: new Date().toISOString(),
      } as any;

      if (output.status === "reviewed") {
        newSubmission.review = {
          id: `rev-${submissionCode}`,
          submission_id: submissionCode,
          reviewer_id: "system",
          reviewer_name: "Automated Evaluation Engine",
          status: "reviewed",
          decision: "cleared_no_action",
          decision_rationale: "Automated integrity assessment completed. 0% similarity and no citation discrepancies detected.",
          reviewed_passages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        const isSimFlag = output.analysis.similarity_percentage >= 25;
        const isCiteFlag = output.analysis.citation_issue_count > 0;
        const reason = isSimFlag
          ? `High similarity threshold exceeded (${output.analysis.similarity_percentage}%)`
          : isCiteFlag
          ? `Citation verification required: ${output.analysis.citation_issue_count} issue(s) detected during format compliance check`
          : "Integrity review required by automated evaluation policy";

        newSubmission.review = {
          id: `rev-${submissionCode}`,
          submission_id: submissionCode,
          reviewer_id: undefined,
          reviewer_name: "",
          status: "pending",
          decision: undefined,
          reviewed_passages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        newSubmission.review_audit = [
          {
            id: `aud-${Date.now()}`,
            submission_id: submissionCode,
            review_id: `rev-${submissionCode}`,
            actor_id: "system",
            actor_name: "Verity Integrity Engine",
            actor_role: "faculty",
            action: "REVIEW_PENDING",
            previous_status: undefined,
            new_status: "pending",
            notes: reason,
            created_at: new Date().toISOString(),
          },
        ];
      }

      assignment.submitted_count = (assignment.submitted_count || 0) + 1;
    } else {
      newSubmission.status = "failed";
      newSubmission.analysis = {
        id: `ana-${submissionCode}`,
        submission_id: submissionCode,
        status: "failed",
        errorMessage: output.errorMessage,
        similarity_percentage: 0,
        matched_source_count: 0,
        student_overlap_percentage: 0,
        citation_issue_count: 0,
        writing_pattern_status: "Analysis Failed",
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      } as any;
    }

    this.saveState(this.state);
    return newSubmission;
  }

  public async retrySubmission(submissionId: string): Promise<Submission | undefined> {
    const sub = this.getSubmissionById(submissionId);
    if (!sub || !sub.document?.extracted_text) return sub;

    sub.status = "processing";
    this.saveState(this.state);

    const output = await processSubmissionDocument({
      submissionId: sub.id,
      submissionCode: sub.submission_code,
      assignmentId: sub.assignment_id,
      assignmentTitle: sub.assignment_title,
      courseId: sub.course_id,
      courseCode: sub.course_code,
      studentId: sub.student_id,
      studentName: sub.student_name,
      studentRoll: sub.student_roll,
      extractedText: sub.document.extracted_text,
      fileName: sub.document.file_name,
      fileType: sub.document.file_type,
      fileSize: sub.document.file_size,
    });

    if (output.success && output.analysis) {
      sub.status = output.status;
      sub.similarity_percentage = output.analysis.similarity_percentage;
      sub.matched_source_count = output.analysis.matched_source_count;
      sub.citation_issue_count = output.analysis.citation_issue_count;
      sub.analysis = {
        ...output.analysis,
        created_at: new Date().toISOString(),
      } as any;

      // Preserve prior review records and append audit log entry without corruption
      if (sub.review) {
        if (!sub.review_audit) sub.review_audit = [];
        sub.review_audit.push({
          id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          submission_id: sub.id,
          review_id: sub.review.id,
          actor_id: this.state.currentUser.id,
          actor_name: this.state.currentUser.full_name,
          actor_role: this.state.currentUser.role,
          action: "RE_ANALYZED",
          previous_status: sub.review.status,
          new_status: sub.review.status,
          notes: "Submission re-analyzed without altering historical review decisions or notes",
          created_at: new Date().toISOString(),
        });
      }
    } else {
      sub.status = "failed";
      if (sub.analysis) {
        sub.analysis.status = "failed";
        (sub.analysis as any).errorMessage = output.errorMessage;
      }
    }

    this.saveState(this.state);
    return sub;
  }

  // --- Feedback ---
  public getFeedback(submissionId: string): FeedbackRecord[] {
    return this.state.feedback.filter(
      (f) => f.submission_id.toLowerCase() === submissionId.toLowerCase()
    );
  }

  public addFeedback(
    submissionId: string,
    comment: string,
    paragraphId = "p-2",
    pageNumber = 1
  ): FeedbackRecord {
    const newFeedback: FeedbackRecord = {
      id: `fb-${Date.now()}`,
      submission_id: submissionId,
      faculty_id: this.state.currentUser.id,
      faculty_name: this.state.currentUser.full_name,
      comment,
      page_number: pageNumber,
      paragraph_id: paragraphId,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.state.feedback.push(newFeedback);

    // Trigger student notification
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (sub && sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "faculty_feedback",
        title: "Faculty Feedback Added",
        message: `Your faculty reviewer added feedback on "${sub.assignment_title}": "${comment.slice(0, 120)}${comment.length > 120 ? "..." : ""}"`,
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return newFeedback;
  }

  // --- Students & Directory ---
  public getStudents(): Profile[] {
    return this.state.profiles.filter((p) => p.role === "student");
  }

  public getStudentById(id: string): Profile | undefined {
    return this.state.profiles.find(
      (p) =>
        p.id === id ||
        (p.roll_number && p.roll_number.toLowerCase() === id.toLowerCase()) ||
        p.full_name.toLowerCase() === id.toLowerCase()
    );
  }

  public createStudent(profile: Partial<Profile>): Profile {
    const newStudent: Profile = {
      id: profile.id || `b0000000-0000-0000-${Date.now().toString(16).slice(-12).padStart(12, "0")}`,
      full_name: profile.full_name || "New Student",
      email: profile.email || "student@institution.edu",
      role: "student",
      roll_number: profile.roll_number || "22CSE099",
      institution_id: this.state.institutions[0]?.id || "a0000000-0000-0000-0000-000000000001",
      department_id: this.state.departments[0]?.id || "d0000000-0000-0000-0000-000000000001",
      department_name: profile.department_name || "Computer Engineering",
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    };
    this.state.profiles.push(newStudent);
    this.saveState(this.state);
    return newStudent;
  }


  // --- Administration & Departments ---
  public getDepartments(): Department[] {
    return [...this.state.departments];
  }

  public getInstitutionStats() {
    const depts = this.state.departments;
    const totalFaculty = depts.reduce((acc, d) => acc + (d.faculty_count || 0), 0);
    const totalStudents = depts.reduce((acc, d) => acc + (d.student_count || 0), 0);
    const totalCourses = depts.reduce((acc, d) => acc + (d.course_count || 0), 0);
    const totalSubmissions = depts.reduce((acc, d) => acc + (d.submission_count || 0), 0);

    return {
      totalFaculty,
      totalStudents,
      totalCourses,
      totalSubmissions,
      meanSimilarity: "13.8%",
    };
  }

  // --- Faculty Dashboard Aggregations ---
  public getFacultyDashboardStats() {
    const totalAssignments = this.state.assignments.length;
    const totalSubmissions = 426 + this.state.submissions.length - 3;
    const pendingReview = this.state.submissions.filter((s) => s.status === "needs_review").length + 12;
    const highSimilarity = this.state.submissions.filter((s) => (s.similarity_percentage || 0) >= 30).length + 5;
    const citationIssues = this.state.submissions.reduce((acc, s) => acc + (s.citation_issue_count || 0), 0) + 16;
    return [
      { label: "Assignments", value: String(totalAssignments) },
      { label: "Submissions", value: String(totalSubmissions) },
      { label: "Pending Review", value: String(pendingReview), tone: "warning" as const },
      { label: "High Similarity", value: String(highSimilarity), tone: "danger" as const },
      { label: "Citation Issues", value: String(citationIssues), tone: "warning" as const },
    ];
  }

  // --- Faculty Review Workflow ---
  public getReview(submissionId: string): SubmissionReview | undefined {
    const sub = this.getSubmissionById(submissionId);
    return sub?.review;
  }

  public getReviewAuditLog(submissionId: string): ReviewAuditEntry[] {
    const sub = this.getSubmissionById(submissionId);
    return sub?.review_audit || [];
  }

  public recordReviewTransition(
    submissionId: string,
    nextStatus: ReviewStatus,
    notes?: string,
    actor?: Profile
  ): SubmissionReview {
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const currentActor = actor || this.state.currentUser;
    const currentReview = sub.review;
    const prevStatus = currentReview?.status || "pending";

    // Validate transition
    const validation = validateReviewTransition(prevStatus, nextStatus, currentActor.role);
    if (!validation.valid) {
      throw new InvalidStatusTransitionError(validation.reason || "Illegal status transition");
    }

    const now = new Date().toISOString();
    if (!sub.review) {
      sub.review = {
        id: `rev-${Date.now()}`,
        submission_id: sub.id,
        reviewer_id: currentActor.id,
        reviewer_name: currentActor.full_name,
        status: nextStatus,
        reviewed_passages: [],
        created_at: now,
        updated_at: now,
      };
    } else {
      sub.review.status = nextStatus;
      sub.review.updated_at = now;
      if (currentActor.role === "faculty" || currentActor.role === "admin") {
        sub.review.reviewer_id = currentActor.id;
        sub.review.reviewer_name = currentActor.full_name;
      }
    }

    if (nextStatus === "reviewed") {
      sub.status = "reviewed";
    } else if (nextStatus === "pending") {
      sub.status = "needs_review";
    }

    if (!sub.review_audit) sub.review_audit = [];
    sub.review_audit.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submission_id: sub.id,
      review_id: sub.review.id,
      actor_id: currentActor.id,
      actor_name: currentActor.full_name,
      actor_role: currentActor.role,
      action: "STATUS_TRANSITION",
      previous_status: prevStatus,
      new_status: nextStatus,
      notes: notes || `Review status transitioned to ${nextStatus}`,
      created_at: now,
    });

    // Student notification triggers
    if (nextStatus === "in_review" && sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "review_started",
        title: "Submission Under Review",
        message: `Your submission for assignment "${sub.assignment_title}" is now under faculty review.`,
        action_url: `/submissions/${sub.id}`,
      });
    } else if (nextStatus === "reviewed" && sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "review_completed",
        title: "Review Completed",
        message: `Faculty review has concluded for your submission on "${sub.assignment_title}".`,
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return sub.review;
  }

  public recordReviewedPassage(
    submissionId: string,
    passageId: string,
    status: ReviewedPassageStatus,
    notes?: string,
    actor?: Profile
  ): SubmissionReview {
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const currentActor = actor || this.state.currentUser;
    const now = new Date().toISOString();

    if (!sub.review) {
      sub.review = {
        id: `rev-${Date.now()}`,
        submission_id: sub.id,
        reviewer_id: currentActor.id,
        reviewer_name: currentActor.full_name,
        status: "in_review",
        reviewed_passages: [],
        created_at: now,
        updated_at: now,
      };
    }

    if (!sub.review.reviewed_passages) sub.review.reviewed_passages = [];
    const existingIdx = sub.review.reviewed_passages.findIndex((p) => p.passage_id === passageId);
    const passageRecord: ReviewedPassageRecord = {
      passage_id: passageId,
      status,
      reviewer_notes: notes,
      reviewed_at: now,
    };

    if (existingIdx >= 0) {
      sub.review.reviewed_passages[existingIdx] = passageRecord;
    } else {
      sub.review.reviewed_passages.push(passageRecord);
    }
    sub.review.updated_at = now;

    if (!sub.review_audit) sub.review_audit = [];
    sub.review_audit.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submission_id: sub.id,
      review_id: sub.review.id,
      actor_id: currentActor.id,
      actor_name: currentActor.full_name,
      actor_role: currentActor.role,
      action: "PASSAGE_REVIEWED",
      notes: `Passage ${passageId} marked as ${status}${notes ? `: ${notes}` : ""}`,
      metadata: { passage_id: passageId, status, notes },
      created_at: now,
    });

    if ((status === "verified_plagiarism" || status === "pending_explanation") && sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "system_update",
        title: "Passage Concern Noted",
        message: `A passage concern has been flagged by your reviewer on "${sub.assignment_title}".`,
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return sub.review;
  }

  public requestStudentExplanation(
    submissionId: string,
    prompt: string,
    actor?: Profile
  ): SubmissionReview {
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const currentActor = actor || this.state.currentUser;
    const now = new Date().toISOString();
    const prevStatus = sub.review?.status || "pending";

    const validation = validateReviewTransition(prevStatus, "explanation_requested", currentActor.role);
    if (!validation.valid) {
      throw new InvalidStatusTransitionError(validation.reason);
    }

    if (!sub.review) {
      sub.review = {
        id: `rev-${Date.now()}`,
        submission_id: sub.id,
        reviewer_id: currentActor.id,
        reviewer_name: currentActor.full_name,
        status: "explanation_requested",
        reviewed_passages: [],
        created_at: now,
        updated_at: now,
      };
    } else {
      sub.review.status = "explanation_requested";
      sub.review.updated_at = now;
    }

    sub.review.student_explanation_request = prompt;
    sub.review.student_explanation_requested_at = now;

    if (!sub.review_audit) sub.review_audit = [];
    sub.review_audit.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submission_id: sub.id,
      review_id: sub.review.id,
      actor_id: currentActor.id,
      actor_name: currentActor.full_name,
      actor_role: currentActor.role,
      action: "EXPLANATION_REQUESTED",
      previous_status: prevStatus,
      new_status: "explanation_requested",
      notes: `Student explanation requested: ${prompt}`,
      metadata: { request: prompt },
      created_at: now,
    });

    if (sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "explanation_requested",
        title: "Explanation Requested",
        message: "Your faculty reviewer has requested an explanation regarding your submission.",
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return sub.review;
  }

  public submitStudentExplanation(
    submissionId: string,
    response: string,
    actor?: Profile
  ): SubmissionReview {
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const currentActor = actor || this.state.currentUser;
    const now = new Date().toISOString();
    const prevStatus = sub.review?.status || "pending";

    const validation = validateReviewTransition(prevStatus, "explanation_received", currentActor.role);
    if (!validation.valid) {
      throw new InvalidStatusTransitionError(validation.reason);
    }

    if (!sub.review) {
      throw new Error("No active review found for student explanation submission");
    }

    sub.review.status = "explanation_received";
    sub.review.student_explanation_response = response;
    sub.review.student_explanation_received_at = now;
    sub.review.updated_at = now;

    if (!sub.review_audit) sub.review_audit = [];
    sub.review_audit.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submission_id: sub.id,
      review_id: sub.review.id,
      actor_id: currentActor.id,
      actor_name: currentActor.full_name,
      actor_role: currentActor.role,
      action: "EXPLANATION_RECEIVED",
      previous_status: prevStatus,
      new_status: "explanation_received",
      notes: `Student explanation submitted: ${response}`,
      metadata: { response },
      created_at: now,
    });

    if (sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "explanation_received",
        title: "Explanation Submitted",
        message: `Your explanation for "${sub.assignment_title}" has been recorded and submitted for faculty review.`,
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return sub.review;
  }

  public recordReviewDecision(
    submissionId: string,
    decision: ReviewDecision,
    rationale: string,
    facultyNotes?: string,
    newStatus: ReviewStatus = "reviewed",
    actor?: Profile
  ): SubmissionReview {
    const sub = this.getSubmissionById(submissionId, "faculty");
    if (!sub) throw new Error(`Submission ${submissionId} not found`);

    const currentActor = actor || this.state.currentUser;
    const now = new Date().toISOString();
    const prevStatus = sub.review?.status || "pending";

    const validation = validateReviewTransition(prevStatus, newStatus, currentActor.role);
    if (!validation.valid) {
      throw new InvalidStatusTransitionError(validation.reason);
    }

    if (!sub.review) {
      sub.review = {
        id: `rev-${Date.now()}`,
        submission_id: sub.id,
        reviewer_id: currentActor.id,
        reviewer_name: currentActor.full_name,
        status: newStatus,
        reviewed_passages: [],
        created_at: now,
        updated_at: now,
      };
    } else {
      sub.review.status = newStatus;
      sub.review.updated_at = now;
    }

    sub.review.reviewer_id = currentActor.id;
    sub.review.reviewer_name = currentActor.full_name;
    sub.review.decision = decision;
    sub.review.decision_rationale = rationale;
    if (facultyNotes !== undefined) {
      sub.review.faculty_notes = facultyNotes;
    }

    if (newStatus === "reviewed") {
      sub.status = "reviewed";
    }

    if (!sub.review_audit) sub.review_audit = [];
    sub.review_audit.push({
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      submission_id: sub.id,
      review_id: sub.review.id,
      actor_id: currentActor.id,
      actor_name: currentActor.full_name,
      actor_role: currentActor.role,
      action: "DECISION_RECORDED",
      previous_status: prevStatus,
      new_status: newStatus,
      notes: `Decision recorded: ${decision}. Rationale: ${rationale}`,
      metadata: { decision, rationale, faculty_notes: facultyNotes },
      created_at: now,
    });

    if (sub.student_id) {
      this.createNotification({
        student_id: sub.student_id,
        submission_id: sub.id,
        assignment_id: sub.assignment_id,
        assignment_title: sub.assignment_title,
        course_code: sub.course_code,
        type: "review_completed",
        title: "Review Decision Recorded",
        message: `Your submission for "${sub.assignment_title}" has been reviewed. Faculty decision: ${decision.replace(/_/g, " ").toUpperCase()}. Public feedback: "${rationale.slice(0, 100)}${rationale.length > 100 ? "..." : ""}"`,
        action_url: `/submissions/${sub.id}`,
      });
    }

    this.saveState(this.state);
    return sub.review;
  }

  // --- Student Notifications ---
  public getNotifications(studentId?: string): StudentNotification[] {
    const targetStudentId = studentId || (this.state.currentUser.role === "student" ? this.state.currentUser.id : undefined);
    let list = this.state.notifications || [];
    if (targetStudentId) {
      list = list.filter((n) => n.student_id === targetStudentId);
    }
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public getUnreadNotificationCount(studentId?: string): number {
    return this.getNotifications(studentId).filter((n) => !n.is_read).length;
  }

  public createNotification(data: {
    student_id: string;
    submission_id: string;
    assignment_id?: string | undefined;
    assignment_title?: string | undefined;
    course_code?: string | undefined;
    type: NotificationType;
    title: string;
    message: string;
    action_url?: string | undefined;
  }): StudentNotification {
    if (!this.state.notifications) {
      this.state.notifications = [];
    }

    // Deduplication check: prevent duplicate notifications if same student, submission and type already exists
    const existing = this.state.notifications.find(
      (n) => n.student_id === data.student_id && n.submission_id === data.submission_id && n.type === data.type
    );
    if (existing) {
      // Update message and reset unread if updated
      existing.message = data.message;
      existing.title = data.title;
      existing.is_read = false;
      delete existing.read_at;
      existing.created_at = new Date().toISOString();
      this.saveState(this.state);
      return existing;
    }

    const newNotification: StudentNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      student_id: data.student_id,
      submission_id: data.submission_id,
      assignment_id: data.assignment_id,
      assignment_title: data.assignment_title,
      course_code: data.course_code,
      type: data.type,
      title: data.title,
      message: data.message,
      is_read: false,
      created_at: new Date().toISOString(),
      action_url: data.action_url || `/submissions/${data.submission_id}`,
    };

    this.state.notifications.unshift(newNotification);
    this.saveState(this.state);
    return newNotification;
  }

  public markNotificationAsRead(id: string): boolean {
    if (!this.state.notifications) return false;
    const notif = this.state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      this.saveState(this.state);
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(studentId?: string): void {
    if (!this.state.notifications) return;
    const targetStudentId = studentId || (this.state.currentUser.role === "student" ? this.state.currentUser.id : undefined);
    const now = new Date().toISOString();
    this.state.notifications.forEach((n) => {
      if (!targetStudentId || n.student_id === targetStudentId) {
        n.is_read = true;
        n.read_at = now;
      }
    });
    this.saveState(this.state);
  }
}

export const db = new DatabaseManager();
