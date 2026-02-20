-- ============================================================================
-- LearnAnything — Quizzes + Quiz Attempts tables
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ── Quizzes table ───────────────────────────────────────────────────────────

create table if not exists public.quizzes (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  questions    jsonb not null default '[]'::jsonb,
  difficulty   text not null default 'medium'
                 check (difficulty in ('easy', 'medium', 'hard')),
  created_at   timestamptz default now() not null
);

create index if not exists idx_quizzes_document_id
  on public.quizzes (document_id);

create index if not exists idx_quizzes_user_id
  on public.quizzes (user_id, created_at desc);

alter table public.quizzes enable row level security;

create policy "Users can view own quizzes"
  on public.quizzes for select
  using (auth.uid() = user_id);

create policy "Users can insert own quizzes"
  on public.quizzes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own quizzes"
  on public.quizzes for delete
  using (auth.uid() = user_id);

-- ── Quiz Attempts table ─────────────────────────────────────────────────────

create table if not exists public.quiz_attempts (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  score           int not null,
  total_questions int not null,
  answers         jsonb not null default '[]'::jsonb,
  completed_at    timestamptz default now() not null
);

create index if not exists idx_quiz_attempts_user_id
  on public.quiz_attempts (user_id, completed_at desc);

create index if not exists idx_quiz_attempts_quiz_id
  on public.quiz_attempts (quiz_id);

alter table public.quiz_attempts enable row level security;

create policy "Users can view own attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can insert own attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);
