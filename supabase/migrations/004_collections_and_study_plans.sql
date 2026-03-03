-- ============================================================================
-- LearnAnything — Collections, Study Plans, and Lessons
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ── Collections table ────────────────────────────────────────────────────────
-- A Collection is the top-level study unit (like a "notebook" or "course").
-- Users upload multiple PDFs to a collection and generate a Study Plan from all of them.

create table if not exists public.collections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  emoji      text not null default '📚',
  status     text not null default 'active'
               check (status in ('active', 'processing', 'ready', 'error')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_collections_user_id
  on public.collections (user_id, created_at desc);

alter table public.collections enable row level security;

create policy "Users can view own collections"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Users can insert own collections"
  on public.collections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own collections"
  on public.collections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.collections for delete
  using (auth.uid() = user_id);

create trigger collections_updated_at
  before update on public.collections
  for each row execute function public.handle_updated_at();

-- ── Add collection_id to documents ──────────────────────────────────────────
-- Nullable so existing documents are preserved as "uncategorized"

alter table public.documents
  add column if not exists collection_id uuid
    references public.collections(id) on delete set null;

create index if not exists idx_documents_collection_id
  on public.documents (collection_id);

-- ── Study Plans table ────────────────────────────────────────────────────────
-- One study plan per collection. Created by AI from all PDFs in the collection.

create table if not exists public.study_plans (
  id            uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  description   text,
  status        text not null default 'generating'
                  check (status in ('generating', 'ready', 'error')),
  error_message text,
  created_at    timestamptz default now() not null
);

create index if not exists idx_study_plans_collection_id
  on public.study_plans (collection_id);

create index if not exists idx_study_plans_user_id
  on public.study_plans (user_id, created_at desc);

alter table public.study_plans enable row level security;

create policy "Users can view own study plans"
  on public.study_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own study plans"
  on public.study_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own study plans"
  on public.study_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own study plans"
  on public.study_plans for delete
  using (auth.uid() = user_id);

-- ── Lessons table ────────────────────────────────────────────────────────────
-- AI divides the study plan into ordered lessons (like Duolingo units).

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  study_plan_id uuid not null references public.study_plans(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null,
  summary       text,
  order_index   int not null,
  created_at    timestamptz default now() not null
);

create index if not exists idx_lessons_study_plan_id
  on public.lessons (study_plan_id, order_index);

alter table public.lessons enable row level security;

create policy "Users can view own lessons"
  on public.lessons for select
  using (auth.uid() = user_id);

create policy "Users can insert own lessons"
  on public.lessons for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own lessons"
  on public.lessons for delete
  using (auth.uid() = user_id);

-- ── Add lesson_id to quizzes ─────────────────────────────────────────────────
-- Nullable so existing standalone quizzes are preserved

alter table public.quizzes
  add column if not exists lesson_id uuid
    references public.lessons(id) on delete cascade;

create index if not exists idx_quizzes_lesson_id
  on public.quizzes (lesson_id);
