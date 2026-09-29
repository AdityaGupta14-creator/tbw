-- ==============================================================================
-- Migration: 20260929000001_faculty_review_workflow.sql
-- Description: Step 8 Faculty Review Workflow, Persistent Review Records, and Audit Trail
-- ==============================================================================

-- 1. Submission Reviews Table
CREATE TABLE IF NOT EXISTS public.submission_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (
    status IN ('pending', 'in_review', 'explanation_requested', 'explanation_received', 'reviewed', 'dismissed', 'escalated')
  ) DEFAULT 'pending',
  decision TEXT CHECK (
    decision IN (
      'cleared_no_action',
      'acceptable_citations',
      'minor_amendments_required',
      'explanation_satisfactory',
      'explanation_unsatisfactory',
      'academic_misconduct_verified',
      'not_substantiated',
      'requires_further_review'
    )
  ),
  decision_rationale TEXT,
  faculty_notes TEXT,
  reviewed_passages JSONB DEFAULT '[]'::jsonb,
  student_explanation_request TEXT,
  student_explanation_requested_at TIMESTAMPTZ,
  student_explanation_response TEXT,
  student_explanation_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_submission_review UNIQUE (submission_id)
);

CREATE TRIGGER set_submission_reviews_updated_at
  BEFORE UPDATE ON public.submission_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Review Audit Log Table
CREATE TABLE IF NOT EXISTS public.review_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  review_id UUID REFERENCES public.submission_reviews(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('faculty', 'student', 'admin', 'system')),
  action TEXT NOT NULL CHECK (
    action IN (
      'REVIEW_PENDING',
      'PASSAGE_REVIEWED',
      'EXPLANATION_REQUESTED',
      'EXPLANATION_RECEIVED',
      'DECISION_RECORDED',
      'NOTES_UPDATED',
      'STATUS_TRANSITION',
      'RE_ANALYZED'
    )
  ),
  previous_status TEXT,
  new_status TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_submission_reviews_sub ON public.submission_reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_reviewer ON public.submission_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_status ON public.submission_reviews(status);
CREATE INDEX IF NOT EXISTS idx_submission_reviews_decision ON public.submission_reviews(decision);
CREATE INDEX IF NOT EXISTS idx_review_audit_log_sub ON public.review_audit_log(submission_id);
CREATE INDEX IF NOT EXISTS idx_review_audit_log_review ON public.review_audit_log(review_id);
CREATE INDEX IF NOT EXISTS idx_review_audit_log_created_at ON public.review_audit_log(created_at);

-- 4. Row Level Security Policies
ALTER TABLE public.submission_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_audit_log ENABLE ROW LEVEL SECURITY;

-- Faculty and Admins can view reviews for their courses
DROP POLICY IF EXISTS "Reviews viewable by course faculty or admin" ON public.submission_reviews;
CREATE POLICY "Reviews viewable by course faculty or admin"
  ON public.submission_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_reviews.submission_id
        AND (public.is_course_faculty(s.course_id) OR public.get_current_user_role() = 'admin')
    )
    OR (
      -- Student can view their own review but confidentiality is enforced at query/API layer
      EXISTS (
        SELECT 1 FROM public.submissions s
        WHERE s.id = submission_reviews.submission_id
          AND s.student_id = public.get_current_profile_id()
      )
    )
  );

-- Faculty can insert and update reviews for their courses
DROP POLICY IF EXISTS "Reviews manageable by course faculty or admin" ON public.submission_reviews;
CREATE POLICY "Reviews manageable by course faculty or admin"
  ON public.submission_reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_reviews.submission_id
        AND (public.is_course_faculty(s.course_id) OR public.get_current_user_role() = 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = submission_reviews.submission_id
        AND (public.is_course_faculty(s.course_id) OR public.get_current_user_role() = 'admin')
    )
  );

-- Audit log viewable by authorized course faculty or admins
DROP POLICY IF EXISTS "Audit log viewable by course faculty or admin" ON public.review_audit_log;
CREATE POLICY "Audit log viewable by course faculty or admin"
  ON public.review_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = review_audit_log.submission_id
        AND (public.is_course_faculty(s.course_id) OR public.get_current_user_role() = 'admin')
    )
  );

-- Audit log insertable by authenticated users (faculty or students submitting explanation)
DROP POLICY IF EXISTS "Audit log insertable by authorized actors" ON public.review_audit_log;
CREATE POLICY "Audit log insertable by authorized actors"
  ON public.review_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.submissions s
      WHERE s.id = review_audit_log.submission_id
        AND (
          public.is_course_faculty(s.course_id)
          OR s.student_id = public.get_current_profile_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

-- For prototype compatibility if RLS is disabled across tables:
ALTER TABLE public.submission_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_audit_log DISABLE ROW LEVEL SECURITY;
