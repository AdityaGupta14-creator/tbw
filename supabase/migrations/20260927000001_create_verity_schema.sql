-- ==============================================================================
-- Migration: 20260927000001_create_verity_schema.sql
-- Description: Complete PostgreSQL / Supabase Schema for Verity Academic Integrity Platform
-- 
-- STRICT DEPENDENCY ORDER:
--   1. Extension (pgcrypto)
--   2. Generic trigger functions (handle_updated_at)
--   3. institutions table
--   4. departments table
--   5. profiles table
--   6. courses table
--   7. course_members table
--   8. assignments table
--   9. submissions table
--   10. documents table
--   11. analyses table
--   12. similarity_matches table
--   13. feedback table
--   14. Helper functions (get_current_user_role, get_current_profile_id, is_course_faculty, is_course_student, prevent_role_escalation)
--   15. Performance indexes
--   16. Enable RLS on all 11 tables
--   17. Row-Level Security (RLS) policies
--   18. Storage bucket ('submission-documents')
--   19. Storage policies
-- ==============================================================================

-- ==============================================================================
-- 1. Extensions
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Timestamp Trigger Function (no table dependencies)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Institutions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 4. Departments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL, -- e.g. 'ENG-CSE'
  faculty_count INTEGER NOT NULL DEFAULT 0,
  student_count INTEGER NOT NULL DEFAULT 0,
  course_count INTEGER NOT NULL DEFAULT 0,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_institution_dept_code UNIQUE (institution_id, code)
);

CREATE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. Profiles Table (Faculty, Students, Academic Admins)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('faculty', 'student', 'admin')) DEFAULT 'student',
  roll_number TEXT, -- Student identifier (e.g. '22CSE057')
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  department_name TEXT, -- Cached for fast UI display
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. Courses Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  department_name TEXT,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  faculty_name TEXT,
  course_code TEXT NOT NULL, -- e.g. 'ENG-CSE-301'
  name TEXT NOT NULL,        -- e.g. 'Data Structures'
  section TEXT NOT NULL DEFAULT 'A',
  semester TEXT NOT NULL DEFAULT 'Autumn',
  academic_year TEXT NOT NULL DEFAULT '2026–27',
  description TEXT,
  student_count INTEGER NOT NULL DEFAULT 0,
  assignment_count INTEGER NOT NULL DEFAULT 0,
  pending_count INTEGER NOT NULL DEFAULT 0,
  pending_reviews INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. Course Members Table (Enrollments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.course_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'dropped', 'completed')) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_course_student UNIQUE (course_id, student_id)
);

CREATE TRIGGER set_course_members_updated_at
  BEFORE UPDATE ON public.course_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. Assignments Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_code TEXT,
  course_name TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignment_type TEXT NOT NULL DEFAULT 'Technical Report',
  due_date TIMESTAMPTZ NOT NULL,
  max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  word_limit INTEGER,
  page_limit INTEGER,
  citation_style TEXT NOT NULL CHECK (citation_style IN ('IEEE', 'APA', 'ACM', 'ASME', 'Chicago', 'Other')) DEFAULT 'IEEE',
  enable_similarity BOOLEAN NOT NULL DEFAULT true,
  enable_student_comparison BOOLEAN NOT NULL DEFAULT true,
  enable_citation_analysis BOOLEAN NOT NULL DEFAULT true,
  enable_revision_history BOOLEAN NOT NULL DEFAULT true,
  enable_writing_pattern_analysis BOOLEAN NOT NULL DEFAULT true,
  submitted_count INTEGER NOT NULL DEFAULT 0,
  total_students INTEGER NOT NULL DEFAULT 0,
  avg_similarity NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  pending_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. Submissions Table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_code TEXT NOT NULL UNIQUE, -- e.g. 'SUB-2026-09124'
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  assignment_title TEXT,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  course_code TEXT,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name TEXT,
  student_roll TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (
    status IN ('draft', 'submitted', 'processing', 'analyzed', 'needs_review', 'reviewed', 'returned')
  ) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  is_final BOOLEAN NOT NULL DEFAULT true,
  similarity_percentage NUMERIC(5,2),
  matched_source_count INTEGER DEFAULT 0,
  citation_issue_count INTEGER DEFAULT 0,
  drafts_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 10. Documents Table (Ingested & Extracted Content)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- MIME type: application/pdf, docx, etc.
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL, -- Path in Supabase Storage 'submission-documents'
  extracted_text TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 1,
  word_count INTEGER NOT NULL DEFAULT 0,
  paragraphs JSONB DEFAULT '[]'::jsonb, -- Structured [{id, heading, text}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_documents_submission UNIQUE (submission_id)
);

CREATE TRIGGER set_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 11. Analyses Table (Aggregated Similarity, Citation & Pattern Results)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  similarity_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  matched_source_count INTEGER NOT NULL DEFAULT 0,
  student_overlap_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  citation_issue_count INTEGER NOT NULL DEFAULT 0,
  writing_pattern_status TEXT NOT NULL DEFAULT 'Normal',
  structural_similarity_percentage NUMERIC(5,2) DEFAULT 0.00,
  evidence_breakdown JSONB, -- Strong, moderate, semantic, weak % and word counts
  passages JSONB DEFAULT '[]'::jsonb, -- Aligned passages consolidated across document
  citation_analysis JSONB DEFAULT '{}'::jsonb, -- Style, cited keys, bibliography, issues
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_analyses_submission UNIQUE (submission_id)
);

CREATE TRIGGER set_analyses_updated_at
  BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 12. Similarity Matches Table (Granular Match Records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.similarity_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('web', 'academic', 'student_submission', 'internal_document')),
  source_name TEXT NOT NULL,
  source_title TEXT,
  source_url TEXT,
  matched_text TEXT NOT NULL,
  source_matched_text TEXT,
  similarity_percentage NUMERIC(5,2) NOT NULL,
  exact_similarity NUMERIC(5,2),
  fuzzy_similarity NUMERIC(5,2),
  semantic_similarity NUMERIC(5,2),
  evidence_level TEXT CHECK (evidence_level IN ('strong', 'moderate', 'weak')) DEFAULT 'moderate',
  confidence NUMERIC(5,2),
  passage_id TEXT,
  start_position INTEGER,
  end_position INTEGER,
  source_start_position INTEGER,
  source_end_position INTEGER,
  matched_words INTEGER NOT NULL DEFAULT 0,
  matched_shingle_sizes INTEGER[],
  is_quoted BOOLEAN NOT NULL DEFAULT false,
  is_common_technical_phrase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 13. Feedback Table (Faculty Annotations & Review Comments)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  faculty_name TEXT,
  comment TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  text_reference TEXT,
  paragraph_id TEXT DEFAULT 'p-1',
  status TEXT NOT NULL CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER set_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 14. Helper Functions that Query the Tables & Security Triggers
-- ==============================================================================
-- (All tables referenced below have now been safely created)

-- Resolves the current authenticated user's role from profiles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles 
  WHERE auth_user_id = auth.uid() OR id = auth.uid() 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Resolves the current user's profile ID
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
  SELECT id FROM public.profiles 
  WHERE auth_user_id = auth.uid() OR id = auth.uid() 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifies if the current user is the faculty assigned to a course
CREATE OR REPLACE FUNCTION public.is_course_faculty(target_course_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.profiles p ON c.faculty_id = p.id
    WHERE c.id = target_course_id 
      AND (p.auth_user_id = auth.uid() OR p.id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Verifies if the current user is an enrolled student in a course
CREATE OR REPLACE FUNCTION public.is_course_student(target_course_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_members cm
    JOIN public.profiles p ON cm.student_id = p.id
    WHERE cm.course_id = target_course_id 
      AND cm.status = 'active'
      AND (p.auth_user_id = auth.uid() OR p.id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Prevents privilege escalation: non-admins cannot change user roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.get_current_user_role() IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Unauthorized: only administrators can modify user roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_profile_role_security ON public.profiles;
CREATE TRIGGER enforce_profile_role_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- ==============================================================================
-- 15. Performance Indexes
-- ==============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_roll_number ON public.profiles(roll_number);

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_institution ON public.departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_faculty ON public.courses(faculty_id);
CREATE INDEX IF NOT EXISTS idx_courses_dept ON public.courses(department_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(course_code);

-- Course members indexes
CREATE INDEX IF NOT EXISTS idx_course_members_course ON public.course_members(course_id);
CREATE INDEX IF NOT EXISTS idx_course_members_student ON public.course_members(student_id);
CREATE INDEX IF NOT EXISTS idx_course_members_status ON public.course_members(status);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON public.submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON public.submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_code ON public.submissions(submission_code);
CREATE INDEX IF NOT EXISTS idx_submissions_course ON public.submissions(course_id);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_submission ON public.documents(submission_id);

-- Analyses indexes
CREATE INDEX IF NOT EXISTS idx_analyses_submission ON public.analyses(submission_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses(status);

-- Similarity matches indexes
CREATE INDEX IF NOT EXISTS idx_similarity_matches_analysis ON public.similarity_matches(analysis_id);
CREATE INDEX IF NOT EXISTS idx_similarity_matches_source_type ON public.similarity_matches(source_type);
CREATE INDEX IF NOT EXISTS idx_similarity_matches_level ON public.similarity_matches(evidence_level);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_submission ON public.feedback(submission_id);
CREATE INDEX IF NOT EXISTS idx_feedback_faculty ON public.feedback(faculty_id);

-- ==============================================================================
-- 16. Enable Row-Level Security (RLS) on All Tables
-- ==============================================================================
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.similarity_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 17. Row-Level Security (RLS) Policies
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Institutions Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Institutions are readable by all authenticated users" ON public.institutions;
CREATE POLICY "Institutions are readable by all authenticated users"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Institutions manageable by admins" ON public.institutions;
CREATE POLICY "Institutions manageable by admins"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- ------------------------------------------------------------------------------
-- Departments Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Departments are readable by all authenticated users" ON public.departments;
CREATE POLICY "Departments are readable by all authenticated users"
  ON public.departments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Departments manageable by admins" ON public.departments;
CREATE POLICY "Departments manageable by admins"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- ------------------------------------------------------------------------------
-- Profiles Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile details" ON public.profiles;
CREATE POLICY "Users can update their own profile details"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id OR auth.uid() = id)
  WITH CHECK (auth.uid() = auth_user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- ------------------------------------------------------------------------------
-- Courses Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Courses readable by authenticated users" ON public.courses;
CREATE POLICY "Courses readable by authenticated users"
  ON public.courses FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Faculty can insert their own courses" ON public.courses;
CREATE POLICY "Faculty can insert their own courses"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (
    (faculty_id = public.get_current_profile_id() AND public.get_current_user_role() = 'faculty')
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Faculty can update their courses" ON public.courses;
CREATE POLICY "Faculty can update their courses"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (
    faculty_id = public.get_current_profile_id() 
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    (faculty_id = public.get_current_profile_id() AND public.get_current_user_role() = 'faculty')
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
CREATE POLICY "Admins can delete courses"
  ON public.courses FOR DELETE
  TO authenticated
  USING (public.get_current_user_role() = 'admin');

-- ------------------------------------------------------------------------------
-- Course Members Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Course members viewable by enrolled students, course faculty, or admins" ON public.course_members;
CREATE POLICY "Course members viewable by enrolled students, course faculty, or admins"
  ON public.course_members FOR SELECT
  TO authenticated
  USING (
    student_id = public.get_current_profile_id()
    OR public.is_course_faculty(course_id)
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Faculty and Admins can manage course enrollments" ON public.course_members;
CREATE POLICY "Faculty and Admins can manage course enrollments"
  ON public.course_members FOR ALL
  TO authenticated
  USING (
    public.is_course_faculty(course_id) 
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    public.is_course_faculty(course_id) 
    OR public.get_current_user_role() = 'admin'
  );

-- ------------------------------------------------------------------------------
-- Assignments Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assignments readable by course faculty, enrolled students, or admins" ON public.assignments;
CREATE POLICY "Assignments readable by course faculty, enrolled students, or admins"
  ON public.assignments FOR SELECT
  TO authenticated
  USING (
    public.is_course_faculty(course_id)
    OR public.is_course_student(course_id)
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Faculty can manage assignments for their courses" ON public.assignments;
CREATE POLICY "Faculty can manage assignments for their courses"
  ON public.assignments FOR ALL
  TO authenticated
  USING (
    public.is_course_faculty(course_id) 
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    public.is_course_faculty(course_id) 
    OR public.get_current_user_role() = 'admin'
  );

-- ------------------------------------------------------------------------------
-- Submissions Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Submissions viewable by course faculty, submitting student, or admin" ON public.submissions;
CREATE POLICY "Submissions viewable by course faculty, submitting student, or admin"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (
    public.is_course_faculty(course_id)
    OR student_id = public.get_current_profile_id()
    OR public.get_current_user_role() = 'admin'
  );

-- Students can ONLY submit for themselves and ONLY to courses they are enrolled in
DROP POLICY IF EXISTS "Students can submit documents to enrolled courses" ON public.submissions;
CREATE POLICY "Students can submit documents to enrolled courses"
  ON public.submissions FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      student_id = public.get_current_profile_id()
      AND public.get_current_user_role() = 'student'
      AND EXISTS (
        SELECT 1 FROM public.assignments a 
        WHERE a.id = assignment_id 
          AND (submissions.course_id IS NULL OR submissions.course_id = a.course_id)
          AND public.is_course_student(a.course_id)
      )
    )
    OR public.get_current_user_role() = 'admin'
  );

-- Students can only modify their own draft submissions; cannot change student_id
DROP POLICY IF EXISTS "Students can update their own draft submissions" ON public.submissions;
CREATE POLICY "Students can update their own draft submissions"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (
    student_id = public.get_current_profile_id()
    AND status = 'draft'
  )
  WITH CHECK (
    student_id = public.get_current_profile_id()
    AND status IN ('draft', 'submitted')
  );

-- Faculty can update submission review status and scores for their courses
DROP POLICY IF EXISTS "Faculty can update submissions for their courses" ON public.submissions;
CREATE POLICY "Faculty can update submissions for their courses"
  ON public.submissions FOR UPDATE
  TO authenticated
  USING (
    public.is_course_faculty(course_id)
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    public.is_course_faculty(course_id)
    OR public.get_current_user_role() = 'admin'
  );

-- ------------------------------------------------------------------------------
-- Documents Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Documents viewable by course faculty, submitting student, or admin" ON public.documents;
CREATE POLICY "Documents viewable by course faculty, submitting student, or admin"
  ON public.documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = documents.submission_id
        AND (
          s.student_id = public.get_current_profile_id()
          OR public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

DROP POLICY IF EXISTS "Students can insert documents for their own submissions" ON public.documents;
CREATE POLICY "Students can insert documents for their own submissions"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = documents.submission_id
        AND s.student_id = public.get_current_profile_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "Students can update their own draft documents" ON public.documents;
CREATE POLICY "Students can update their own draft documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = documents.submission_id
        AND s.student_id = public.get_current_profile_id()
        AND s.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = documents.submission_id
        AND s.student_id = public.get_current_profile_id()
    )
  );

-- ------------------------------------------------------------------------------
-- Analyses Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Analyses viewable by course faculty, submitting student, or admin" ON public.analyses;
CREATE POLICY "Analyses viewable by course faculty, submitting student, or admin"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = analyses.submission_id
        AND (
          s.student_id = public.get_current_profile_id()
          OR public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- Only course faculty or admins (or service workers) can create/modify analyses
DROP POLICY IF EXISTS "Faculty and admins can manage analyses" ON public.analyses;
CREATE POLICY "Faculty and admins can manage analyses"
  ON public.analyses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = analyses.submission_id
        AND (
          public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = analyses.submission_id
        AND (
          public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- ------------------------------------------------------------------------------
-- Similarity Matches Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Matches viewable by course faculty, submitting student, or admin" ON public.similarity_matches;
CREATE POLICY "Matches viewable by course faculty, submitting student, or admin"
  ON public.similarity_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses a
      JOIN public.submissions s ON a.submission_id = s.id
      WHERE a.id = similarity_matches.analysis_id
        AND (
          s.student_id = public.get_current_profile_id()
          OR public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- Only course faculty or admins can insert/update similarity matches
DROP POLICY IF EXISTS "Matches manageable by faculty or admin" ON public.similarity_matches;
CREATE POLICY "Matches manageable by faculty or admin"
  ON public.similarity_matches FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.analyses a
      JOIN public.submissions s ON a.submission_id = s.id
      WHERE a.id = similarity_matches.analysis_id
        AND (
          public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.analyses a
      JOIN public.submissions s ON a.submission_id = s.id
      WHERE a.id = similarity_matches.analysis_id
        AND (
          public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- ------------------------------------------------------------------------------
-- Feedback Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Feedback viewable by submitting student or course faculty" ON public.feedback;
CREATE POLICY "Feedback viewable by submitting student or course faculty"
  ON public.feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = feedback.submission_id
        AND (
          s.student_id = public.get_current_profile_id()
          OR public.is_course_faculty(s.course_id)
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- Students CANNOT create or modify feedback. Only course faculty or admins can.
DROP POLICY IF EXISTS "Faculty and admin can manage feedback" ON public.feedback;
CREATE POLICY "Faculty and admin can manage feedback"
  ON public.feedback FOR ALL
  TO authenticated
  USING (
    (
      faculty_id = public.get_current_profile_id()
      AND public.get_current_user_role() = 'faculty'
      AND EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = feedback.submission_id
          AND public.is_course_faculty(s.course_id)
      )
    )
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    (
      faculty_id = public.get_current_profile_id()
      AND public.get_current_user_role() = 'faculty'
      AND EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = feedback.submission_id
          AND public.is_course_faculty(s.course_id)
      )
    )
    OR public.get_current_user_role() = 'admin'
  );

-- ==============================================================================
-- 18. Private Storage Bucket Setup: 'submission-documents'
-- ==============================================================================

-- Create bucket if it does not already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-documents',
  'submission-documents',
  false, -- Strictly PRIVATE
  52428800, -- 50 MB file size limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

-- ==============================================================================
-- 19. Storage Policies
-- ==============================================================================

-- Upload Policy: Authenticated users can ONLY upload to their own submission/student path
DROP POLICY IF EXISTS "Allow authenticated students to upload submission documents" ON storage.objects;
CREATE POLICY "Allow authenticated students to upload submission documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'submission-documents'
    AND (
      -- Folder pattern 1: <auth_user_id>/...
      (storage.foldername(name))[1] = auth.uid()::text
      -- Folder pattern 2: <profile_id>/...
      OR (storage.foldername(name))[1] = public.get_current_profile_id()::text
      -- Folder pattern 3: submissions/<submission_id_or_code>/... where student owns submission
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND EXISTS (
          SELECT 1 FROM public.submissions s
          WHERE (s.id::text = (storage.foldername(name))[2] OR s.submission_code = (storage.foldername(name))[2])
            AND s.student_id = public.get_current_profile_id()
        )
      )
      -- Admins can upload any file
      OR public.get_current_user_role() = 'admin'
    )
  );

-- Read/Download Policy: Course faculty, submission owners, or admins can download documents
DROP POLICY IF EXISTS "Allow faculty and submission owners to read documents" ON storage.objects;
CREATE POLICY "Allow faculty and submission owners to read documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'submission-documents'
    AND (
      public.get_current_user_role() = 'admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] = public.get_current_profile_id()::text
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND EXISTS (
          SELECT 1 FROM public.submissions s
          WHERE (s.id::text = (storage.foldername(name))[2] OR s.submission_code = (storage.foldername(name))[2])
            AND (
              s.student_id = public.get_current_profile_id()
              OR public.is_course_faculty(s.course_id)
            )
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.documents d
        JOIN public.submissions s ON d.submission_id = s.id
        WHERE d.storage_path = name
          AND public.is_course_faculty(s.course_id)
      )
    )
  );

-- Delete Policy: Users can only delete their own uploaded files for draft submissions
DROP POLICY IF EXISTS "Allow owners to delete their uploaded files" ON storage.objects;
CREATE POLICY "Allow owners to delete their uploaded files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'submission-documents'
    AND (
      public.get_current_user_role() = 'admin'
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR (storage.foldername(name))[1] = public.get_current_profile_id()::text
      OR (
        (storage.foldername(name))[1] = 'submissions'
        AND EXISTS (
          SELECT 1 FROM public.submissions s
          WHERE (s.id::text = (storage.foldername(name))[2] OR s.submission_code = (storage.foldername(name))[2])
            AND s.student_id = public.get_current_profile_id()
            AND s.status = 'draft'
        )
      )
    )
  );
