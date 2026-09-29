-- ==============================================================================
-- Migration: 20260927000004_disable_rls_for_prototype.sql
-- Description: Disables Row-Level Security on all prototype tables so that
-- frontend demo queries and inserts succeed without auth/policy hurdles.
-- ==============================================================================

ALTER TABLE public.institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.similarity_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback DISABLE ROW LEVEL SECURITY;
