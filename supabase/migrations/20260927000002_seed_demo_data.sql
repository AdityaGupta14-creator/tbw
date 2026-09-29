-- ==============================================================================
-- Migration: 20260927000002_seed_demo_data.sql
-- Description: Seed Data for Verity Academic Integrity Platform
-- Fictional University: ABC Institute of Technology
-- ==============================================================================

-- 1. Institution
INSERT INTO public.institutions (id, name, domain)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Vidyalankar Institute of Technology',
  'abcit.edu'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  domain = EXCLUDED.domain;

-- 2. Departments
INSERT INTO public.departments (id, institution_id, name, code, faculty_count, student_count, course_count, submission_count)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Computer Engineering', 'ENG-CSE', 24, 612, 18, 2140),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Electrical Engineering', 'ENG-EEE', 18, 486, 14, 1502),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Mechanical Engineering', 'ENG-ME', 21, 524, 16, 1638),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Civil Engineering', 'ENG-CE', 15, 398, 12, 1104)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  faculty_count = EXCLUDED.faculty_count,
  student_count = EXCLUDED.student_count,
  course_count = EXCLUDED.course_count,
  submission_count = EXCLUDED.submission_count;

-- 3. Profiles (Faculty, Students, Admin)
INSERT INTO public.profiles (id, full_name, email, role, roll_number, institution_id, department_id, department_name)
VALUES
  -- Faculty
  ('b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'p.kulkarni@abcit.edu', 'faculty', NULL, 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  -- Students
  ('b0000000-0000-0000-0000-000000000002', 'Riya Sharma', 'riya.sharma@abcit.edu', 'student', '22CSE057', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  ('b0000000-0000-0000-0000-000000000003', 'Aarav Mehta', 'aarav.mehta@abcit.edu', 'student', '22CSE041', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  ('b0000000-0000-0000-0000-000000000004', 'Kabir Patel', 'kabir.patel@abcit.edu', 'student', '22CSE063', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  ('b0000000-0000-0000-0000-000000000005', 'Ananya Iyer', 'ananya.iyer@abcit.edu', 'student', '22CSE018', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  ('b0000000-0000-0000-0000-000000000006', 'Aditya Rao', 'aditya.rao@abcit.edu', 'student', '22CSE032', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering'),
  -- Admin
  ('b0000000-0000-0000-0000-000000000007', 'Registrar Office', 'registrar@abcit.edu', 'admin', NULL, 'a0000000-0000-0000-0000-000000000001', NULL, NULL)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  roll_number = EXCLUDED.roll_number,
  department_name = EXCLUDED.department_name;

-- 4. Courses
INSERT INTO public.courses (id, institution_id, department_id, department_name, faculty_id, faculty_name, course_code, name, section, semester, academic_year, description, student_count, assignment_count, pending_count, pending_reviews)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering', 'b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'ENG-CSE-301', 'Data Structures', 'A', 'Autumn', '2026–27', 'Balanced search trees, graph algorithms, and indexing structures.', 64, 5, 3, 3),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering', 'b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'ENG-CSE-305', 'Database Management Systems', 'B', 'Autumn', '2026–27', 'Relational algebra, normal forms, transaction ACID properties.', 58, 4, 5, 5),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Computer Engineering', 'b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'ENG-CSE-312', 'Computer Networks', 'A', 'Autumn', '2026–27', 'Layered architectures, TCP congestion control, socket programming.', 60, 3, 2, 2),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'Electrical Engineering', 'b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'ENG-EEE-204', 'Digital Electronics', 'A', 'Autumn', '2026–27', 'Synchronous state machines, logic synthesis, hardware testbenches.', 61, 6, 2, 2),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'Mechanical Engineering', 'b0000000-0000-0000-0000-000000000001', 'Dr. P. Kulkarni', 'ENG-ME-210', 'Engineering Mechanics', 'C', 'Autumn', '2026–27', 'Stress analysis, static equilibrium, finite element approximations.', 55, 4, 2, 2)
ON CONFLICT (id) DO UPDATE SET
  course_code = EXCLUDED.course_code,
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 5. Course Memberships (Enrollments)
INSERT INTO public.course_members (course_id, student_id, status)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'active'), -- Riya in CSE-301
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'active'), -- Aarav in CSE-301
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'active'), -- Kabir in CSE-301
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'active'), -- Ananya in CSE-301
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 'active'), -- Aditya in CSE-301
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'active'), -- Riya in CSE-305
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000003', 'active')  -- Aarav in CSE-305
ON CONFLICT (course_id, student_id) DO NOTHING;

-- 6. Assignments
INSERT INTO public.assignments (id, course_id, course_code, course_name, created_by, title, description, assignment_type, due_date, max_marks, word_limit, page_limit, citation_style, submitted_count, total_students, avg_similarity, pending_count)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'Data Structures', 'b0000000-0000-0000-0000-000000000001', 'Technical Report 02', 'Comparative Analysis of Balanced Binary Search Trees under dynamic insertions.', 'Technical Report', '2026-09-24 23:59:59+00', 100, 2000, 8, 'IEEE', 58, 64, 12.00, 3),
  ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'Data Structures', 'b0000000-0000-0000-0000-000000000001', 'Binary Search Tree Analysis', 'Empirical benchmarking of rotation frequencies in self-balancing structures.', 'Technical Report', '2026-09-24 23:59:59+00', 100, 2500, 10, 'IEEE', 58, 64, 12.00, 3),
  ('e0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'Data Structures', 'b0000000-0000-0000-0000-000000000001', 'Lab Report 04', 'Graph shortest path algorithms implementation and asymptotic complexity.', 'Lab Report', '2026-09-22 23:59:59+00', 50, 1500, 5, 'IEEE', 64, 64, 8.00, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description;

-- 7. Submissions
INSERT INTO public.submissions (id, submission_code, assignment_id, assignment_title, course_id, course_code, student_id, student_name, student_roll, version_number, status, submitted_at, is_final, similarity_percentage, matched_source_count, citation_issue_count, drafts_count)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'SUB-2026-09124', 'e0000000-0000-0000-0000-000000000001', 'Technical Report 02', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'b0000000-0000-0000-0000-000000000002', 'Riya Sharma', '22CSE057', 3, 'needs_review', timezone('utc'::text, now()), true, 27.00, 6, 2, 3),
  ('f0000000-0000-0000-0000-000000000002', 'SUB-2026-09125', 'e0000000-0000-0000-0000-000000000001', 'Technical Report 02', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'b0000000-0000-0000-0000-000000000003', 'Aarav Mehta', '22CSE041', 2, 'reviewed', timezone('utc'::text, now()), true, 8.00, 2, 0, 2),
  ('f0000000-0000-0000-0000-000000000003', 'SUB-2026-09126', 'e0000000-0000-0000-0000-000000000003', 'Lab Report 04', 'c0000000-0000-0000-0000-000000000001', 'ENG-CSE-301', 'b0000000-0000-0000-0000-000000000004', 'Kabir Patel', '22CSE063', 1, 'needs_review', timezone('utc'::text, now()), true, 41.00, 9, 3, 1)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  similarity_percentage = EXCLUDED.similarity_percentage;

-- 8. Document Record for Primary Submission (SUB-2026-09124)
INSERT INTO public.documents (id, submission_id, file_name, file_type, file_size, storage_path, extracted_text, page_count, word_count, paragraphs)
VALUES (
  '11000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'Riya_Sharma_22CSE057_TechReport02.pdf',
  'application/pdf',
  412800,
  'submissions/SUB-2026-09124/Riya_Sharma_22CSE057_TechReport02.pdf',
  'Comparative Analysis of Balanced Binary Search Trees
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
[8] S. Iyer, "Empirical studies of tree indices," (not cited in text).',
  2,
  1638,
  '[
    {"id": "p-1", "heading": "1. Introduction", "text": "Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion. This report compares AVL trees and red-black trees across a set of controlled workloads, measuring rotation counts, tree height, and average lookup latency."},
    {"id": "p-2", "text": "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n)."},
    {"id": "p-3", "heading": "2. Methodology", "text": "Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians. Keys were drawn from three distributions: uniform random, ascending sorted, and a Zipfian distribution."},
    {"id": "p-4", "text": "Rotation counts were instrumented directly in the rebalancing routines. Height was sampled after every 10,000 operations. Lookup latency was measured with a monotonic clock over batches of 1,000 randomly selected present and absent keys."},
    {"id": "p-5", "heading": "3. Results", "text": "For uniform random input, AVL trees maintained a mean height of 1.19 log2(n) against 1.34 log2(n) for red-black trees. The stricter AVL balance criterion produced roughly 38% more rotations during insertion."},
    {"id": "p-6", "text": "Under ascending sorted input the difference widened. Red-black trees completed the insertion phase 14% faster owing to their relaxed invariant, while AVL trees retained the shallower structure and therefore the faster query path once the tree was fully built."},
    {"id": "p-7", "heading": "4. Discussion", "text": "The results support the conventional guidance that AVL trees are preferable for read-dominated workloads while red-black trees suit write-heavy workloads. The cross-over point in these experiments occurred at approximately a 3:1 read-to-write ratio."},
    {"id": "p-8", "heading": "5. Conclusion", "text": "Balance strictness is a tunable trade-off rather than a strict ordering of quality. Future work should extend the comparison to concurrent variants under multi-threaded access."},
    {"id": "p-9", "heading": "References", "text": "[1] T. H. Cormen et al., Introduction to Algorithms, 4th ed.\n[2] G. M. Adelson-Velsky and E. M. Landis, \"An algorithm for the organization of information.\"\n[3] R. Bayer, \"Symmetric binary B-trees.\"\n[8] S. Iyer, \"Empirical studies of tree indices,\" (not cited in text)."}
  ]'::jsonb
)
ON CONFLICT (submission_id) DO UPDATE SET
  extracted_text = EXCLUDED.extracted_text,
  paragraphs = EXCLUDED.paragraphs;

-- 9. Analysis Record for SUB-2026-09124
INSERT INTO public.analyses (
  id,
  submission_id,
  status,
  similarity_percentage,
  matched_source_count,
  student_overlap_percentage,
  citation_issue_count,
  writing_pattern_status,
  structural_similarity_percentage,
  evidence_breakdown,
  passages,
  citation_analysis,
  completed_at
)
VALUES (
  '22000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'completed',
  27.00,
  6,
  14.20,
  2,
  'Requires Review',
  85.00,
  '{
    "strong_percentage": 14.5,
    "moderate_percentage": 8.0,
    "semantic_percentage": 4.5,
    "weak_percentage": 3.2,
    "unique_matched_words": 442,
    "total_document_words": 1638
  }'::jsonb,
  '[
    {
      "id": "passage-1",
      "source_name": "MIT OpenCourseWare (6.006)",
      "source_type": "academic",
      "student_text": "Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion. This report compares AVL trees and red-black trees across a set of controlled workloads, measuring rotation counts, tree height, and average lookup latency.",
      "source_text": "Balanced search trees maintain dynamic sets of ordered keys with guaranteed worst-case logarithmic bounds for insertions, queries, and deletions.",
      "start_sentence_idx": 0,
      "end_sentence_idx": 1,
      "matched_words": 34,
      "similarity_percentage": 82.5,
      "evidence_level": "strong",
      "reasons": ["Verbatim 5-gram overlap in algorithmic definition", "Identical workload terminology"]
    },
    {
      "id": "passage-2",
      "source_name": "Introduction to Algorithms (Cormen et al.)",
      "source_type": "academic",
      "student_text": "A binary search tree degrades to linear search behaviour when keys arrive in sorted order. Self-balancing variants restore logarithmic height by performing local rotations after each structural modification, bounding the worst-case cost of search, insertion, and deletion at O(log n).",
      "source_text": "A binary search tree with worst-case linear height performs identically to a linked list. Self-balancing search trees maintain logarithmic height O(log n) via tree rotations.",
      "start_sentence_idx": 2,
      "end_sentence_idx": 3,
      "matched_words": 41,
      "similarity_percentage": 78.0,
      "evidence_level": "strong",
      "reasons": ["High token-sort lexical alignment", "Classic Cormen phrasing"]
    },
    {
      "id": "passage-3",
      "source_name": "Peer Submission (Aarav Mehta · 22CSE041)",
      "source_type": "student_submission",
      "student_text": "Both structures were implemented in C++17 with identical node layouts and compiled at -O2. Each workload was executed ten times on an isolated core; the reported figures are medians.",
      "source_text": "The benchmark was implemented in C++17 compiled with -O2 optimization. All tests were executed ten times on an isolated physical core with median figures reported.",
      "start_sentence_idx": 4,
      "end_sentence_idx": 5,
      "matched_words": 32,
      "similarity_percentage": 74.0,
      "evidence_level": "moderate",
      "reasons": ["High lexical and grammatical structure overlap across peer submissions"]
    }
  ]'::jsonb,
  '{
    "style": "IEEE",
    "totalReferencesCount": 4,
    "inTextCitationsCount": 3,
    "uniqueInTextCited": [1, 2, 3],
    "bibliographyNumbers": [1, 2, 3, 8],
    "issues": [
      {
        "id": "ci-uncited-8",
        "type": "uncited_reference",
        "severity": "potential_issue",
        "text": "Reference [8] appears in bibliography but is not cited in the text.",
        "target": "p-9",
        "referenceNumber": 8
      },
      {
        "id": "ci-methodology-attr",
        "type": "missing_citation",
        "severity": "potential_issue",
        "text": "Paragraph 4 may require a supporting citation for the hardware clock instrumentation method.",
        "target": "p-4"
      }
    ]
  }'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (submission_id) DO UPDATE SET
  similarity_percentage = EXCLUDED.similarity_percentage,
  evidence_breakdown = EXCLUDED.evidence_breakdown,
  passages = EXCLUDED.passages,
  citation_analysis = EXCLUDED.citation_analysis;

-- 10. Similarity Matches for Primary Submission
INSERT INTO public.similarity_matches (
  id,
  analysis_id,
  source_type,
  source_name,
  source_title,
  source_url,
  matched_text,
  source_matched_text,
  similarity_percentage,
  exact_similarity,
  fuzzy_similarity,
  semantic_similarity,
  evidence_level,
  matched_words,
  matched_shingle_sizes,
  is_quoted,
  is_common_technical_phrase
)
VALUES
  (
    '33000000-0000-0000-0000-000000000001',
    '22000000-0000-0000-0000-000000000001',
    'academic',
    'MIT OpenCourseWare (6.006)',
    'Introduction to Algorithms: Binary Search Trees',
    'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-006-fall-2011/lecture-notes/',
    'Balanced search trees provide an efficient method for maintaining ordered collections under dynamic insertion and deletion.',
    'Balanced search trees maintain dynamic sets of ordered keys with guaranteed worst-case logarithmic bounds for insertions.',
    82.50,
    76.00,
    88.00,
    91.00,
    'strong',
    18,
    ARRAY[3, 4, 5],
    false,
    false
  ),
  (
    '33000000-0000-0000-0000-000000000002',
    '22000000-0000-0000-0000-000000000001',
    'academic',
    'Introduction to Algorithms (Cormen et al.)',
    'Chapter 13: Red-Black Trees (4th Ed.)',
    'https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/',
    'A binary search tree degrades to linear search behaviour when keys arrive in sorted order.',
    'A binary search tree with worst-case linear height performs identically to a singly linked list when populated in sorted order.',
    78.00,
    65.00,
    82.00,
    86.00,
    'strong',
    16,
    ARRAY[3, 4],
    false,
    false
  ),
  (
    '33000000-0000-0000-0000-000000000003',
    '22000000-0000-0000-0000-000000000001',
    'student_submission',
    'Peer Submission (Aarav Mehta · 22CSE041)',
    'Technical Report 02 - Aarav Mehta',
    NULL,
    'Both structures were implemented in C++17 with identical node layouts and compiled at -O2.',
    'The benchmark was implemented in C++17 compiled with -O2 optimization and identical node layouts.',
    74.00,
    60.00,
    80.00,
    82.00,
    'moderate',
    15,
    ARRAY[3, 4, 5],
    false,
    false
  ),
  (
    '33000000-0000-0000-0000-000000000004',
    '22000000-0000-0000-0000-000000000001',
    'academic',
    'ACM Digital Library',
    'Empirical Comparison of Self-Balancing Binary Search Trees',
    'https://dl.acm.org/doi/10.1145/tree-benchmarks',
    'AVL trees maintained a mean height of 1.19 log2(n) against 1.34 log2(n) for red-black trees.',
    'Mean height observed was 1.19 log2(n) for AVL trees, contrasted with 1.34 log2(n) for red-black trees under uniform random load.',
    89.00,
    85.00,
    92.00,
    94.00,
    'strong',
    17,
    ARRAY[3, 4, 5, 7],
    false,
    false
  ),
  (
    '33000000-0000-0000-0000-000000000005',
    '22000000-0000-0000-0000-000000000001',
    'web',
    'Wikipedia: Red-Black Tree',
    'Red-black tree properties and rotation bounds',
    'https://en.wikipedia.org/wiki/Red%E2%80%93black_tree',
    'Self-balancing variants restore logarithmic height by performing local rotations after each structural modification',
    'The tree self-balances by performing local tree rotations after insertions or deletions to guarantee logarithmic height.',
    69.00,
    45.00,
    72.00,
    80.00,
    'moderate',
    14,
    ARRAY[3, 4],
    false,
    false
  ),
  (
    '33000000-0000-0000-0000-000000000006',
    '22000000-0000-0000-0000-000000000001',
    'academic',
    'IEEE Trans. Computers',
    'Analysis of Balanced Tree Performance in Storage Systems',
    'https://ieeexplore.ieee.org/document/tree-storage-eval',
    'bounding the worst-case cost of search, insertion, and deletion at O(log n)',
    'bounding the worst-case cost of search, insertion, and deletion at O(log n)',
    100.00,
    100.00,
    100.00,
    100.00,
    'weak',
    13,
    ARRAY[3, 4, 5, 7, 10],
    false,
    true -- Standard academic/technical phrase
  )
ON CONFLICT (id) DO NOTHING;

-- 11. Faculty Feedback
INSERT INTO public.feedback (id, submission_id, faculty_id, faculty_name, comment, page_number, text_reference, paragraph_id, status)
VALUES
  (
    '44000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Dr. P. Kulkarni',
    'Textual overlap with textbook standard definition. Formulate in your own academic phrasing or cite appropriately.',
    1,
    'A binary search tree degrades to linear search behaviour...',
    'p-2',
    'active'
  ),
  (
    '44000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Dr. P. Kulkarni',
    'Uncited reference [8] needs in-text attribution or removal from bibliography.',
    2,
    '[8] S. Iyer, Empirical studies of tree indices...',
    'p-9',
    'active'
  )
ON CONFLICT (id) DO UPDATE SET
  comment = EXCLUDED.comment,
  status = EXCLUDED.status;
