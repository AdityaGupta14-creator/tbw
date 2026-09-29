-- ==============================================================================
-- Migration: 20260927000003_enable_demo_and_anon_access.sql
-- Description: Enables anon/demo client access for prototype & demo users in Verity
-- Uses DROP POLICY IF EXISTS before CREATE POLICY for full idempotency
-- ==============================================================================

-- 1. Helper function: Fallback to active demo faculty profile if unauthenticated
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid() LIMIT 1),
    'b0000000-0000-0000-0000-000000000001'::uuid -- Fallback to Dr. P. Kulkarni demo profile
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Helper function: Fallback to faculty role if unauthenticated in demo mode
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid() OR id = auth.uid() LIMIT 1),
    'faculty'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Institutions
DROP POLICY IF EXISTS "Institutions are readable by all authenticated users" ON public.institutions;
DROP POLICY IF EXISTS "Institutions readable by all" ON public.institutions;
CREATE POLICY "Institutions readable by all"
  ON public.institutions FOR SELECT
  TO authenticated, anon
  USING (true);

-- 4. Departments
DROP POLICY IF EXISTS "Departments are readable by all authenticated users" ON public.departments;
DROP POLICY IF EXISTS "Departments readable by all" ON public.departments;
CREATE POLICY "Departments readable by all"
  ON public.departments FOR SELECT
  TO authenticated, anon
  USING (true);

-- 5. Profiles
DROP POLICY IF EXISTS "Profiles readable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by all" ON public.profiles;
CREATE POLICY "Profiles readable by all"
  ON public.profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- 6. Courses
DROP POLICY IF EXISTS "Courses readable by authenticated users" ON public.courses;
DROP POLICY IF EXISTS "Courses readable by all" ON public.courses;
CREATE POLICY "Courses readable by all"
  ON public.courses FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Faculty can insert their own courses" ON public.courses;
DROP POLICY IF EXISTS "Faculty and demo can insert courses" ON public.courses;
CREATE POLICY "Faculty and demo can insert courses"
  ON public.courses FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Faculty can update their courses" ON public.courses;
DROP POLICY IF EXISTS "Courses updateable by all" ON public.courses;
CREATE POLICY "Courses updateable by all"
  ON public.courses FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 7. Assignments
DROP POLICY IF EXISTS "Assignments readable by course faculty, enrolled students, or admins" ON public.assignments;
DROP POLICY IF EXISTS "Assignments readable by all" ON public.assignments;
CREATE POLICY "Assignments readable by all"
  ON public.assignments FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Faculty can manage assignments for their courses" ON public.assignments;
DROP POLICY IF EXISTS "Faculty and demo can manage assignments" ON public.assignments;
CREATE POLICY "Faculty and demo can manage assignments"
  ON public.assignments FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 8. Submissions
DROP POLICY IF EXISTS "Submissions viewable by course faculty, submitting student, or admin" ON public.submissions;
DROP POLICY IF EXISTS "Submissions readable by all" ON public.submissions;
CREATE POLICY "Submissions readable by all"
  ON public.submissions FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Students can submit documents to enrolled courses" ON public.submissions;
DROP POLICY IF EXISTS "Students and demo can submit documents" ON public.submissions;
CREATE POLICY "Students and demo can submit documents"
  ON public.submissions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students can update their own draft submissions" ON public.submissions;
DROP POLICY IF EXISTS "Faculty can update submissions for their courses" ON public.submissions;
DROP POLICY IF EXISTS "Submissions can be updated" ON public.submissions;
CREATE POLICY "Submissions can be updated"
  ON public.submissions FOR UPDATE
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 9. Documents
DROP POLICY IF EXISTS "Documents viewable by course faculty, submitting student, or admin" ON public.documents;
DROP POLICY IF EXISTS "Documents readable by all" ON public.documents;
CREATE POLICY "Documents readable by all"
  ON public.documents FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Students can insert documents for their own submissions" ON public.documents;
DROP POLICY IF EXISTS "Documents insertable by all" ON public.documents;
CREATE POLICY "Documents insertable by all"
  ON public.documents FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 10. Analyses
DROP POLICY IF EXISTS "Analyses viewable by course faculty, submitting student, or admin" ON public.analyses;
DROP POLICY IF EXISTS "Analyses readable by all" ON public.analyses;
CREATE POLICY "Analyses readable by all"
  ON public.analyses FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Faculty and admins can manage analyses" ON public.analyses;
DROP POLICY IF EXISTS "Analyses manageable by all" ON public.analyses;
CREATE POLICY "Analyses manageable by all"
  ON public.analyses FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 11. Similarity Matches
DROP POLICY IF EXISTS "Matches viewable by course faculty, submitting student, or admin" ON public.similarity_matches;
DROP POLICY IF EXISTS "Matches readable by all" ON public.similarity_matches;
CREATE POLICY "Matches readable by all"
  ON public.similarity_matches FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Matches manageable by faculty or admin" ON public.similarity_matches;
DROP POLICY IF EXISTS "Matches manageable by all" ON public.similarity_matches;
CREATE POLICY "Matches manageable by all"
  ON public.similarity_matches FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 12. Feedback
DROP POLICY IF EXISTS "Feedback viewable by submitting student or course faculty" ON public.feedback;
DROP POLICY IF EXISTS "Feedback readable by all" ON public.feedback;
CREATE POLICY "Feedback readable by all"
  ON public.feedback FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Faculty and admin can manage feedback" ON public.feedback;
DROP POLICY IF EXISTS "Feedback manageable by all" ON public.feedback;
CREATE POLICY "Feedback manageable by all"
  ON public.feedback FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 13. Storage Bucket
DROP POLICY IF EXISTS "Allow authenticated students to upload submission documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow demo and student uploads" ON storage.objects;
CREATE POLICY "Allow demo and student uploads"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'submission-documents');

DROP POLICY IF EXISTS "Allow faculty and submission owners to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow demo and faculty reads" ON storage.objects;
CREATE POLICY "Allow demo and faculty reads"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'submission-documents');
