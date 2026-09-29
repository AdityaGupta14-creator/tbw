-- Migration: 20260929000002_student_notifications.sql
-- Description: Institutional student review notification table and RLS policies

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  submission_id text not null,
  assignment_id text,
  type text not null check (type in (
    'review_started',
    'explanation_requested',
    'explanation_received',
    'review_completed',
    'faculty_feedback',
    'system_update'
  )),
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint uq_student_submission_notification unique (student_id, submission_id, type)
);

create index if not exists idx_notifications_student_read on public.notifications(student_id, is_read);
create index if not exists idx_notifications_submission on public.notifications(submission_id);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

-- Row-Level Security
alter table public.notifications enable row level security;

-- Students view only their own notifications
create policy "Students can view their own notifications"
  on public.notifications for select
  using (
    auth.role() = 'authenticated' and (
      student_id = auth.uid()::text or
      student_id in (select id::text from public.profiles where auth_user_id = auth.uid())
    )
  );

-- Students can mark their own notifications as read
create policy "Students can mark their notifications as read"
  on public.notifications for update
  using (
    auth.role() = 'authenticated' and (
      student_id = auth.uid()::text or
      student_id in (select id::text from public.profiles where auth_user_id = auth.uid())
    )
  )
  with check (
    is_read = true
  );

-- Faculty and system can create student notifications
create policy "Faculty and system can create student notifications"
  on public.notifications for insert
  with check (true);
