-- ============================================================================
-- LearnAnything — Documents table + Storage bucket + RLS policies
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================================

-- ── Documents table ─────────────────────────────────────────────────────────

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  file_path   text not null,
  file_size   bigint,
  page_count  int,
  status      text not null default 'uploaded'
                check (status in ('uploaded', 'processing', 'ready', 'error')),
  error_message text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- Index for listing a user's documents ordered by newest first
create index if not exists idx_documents_user_id
  on public.documents (user_id, created_at desc);

-- Enable RLS
alter table public.documents enable row level security;

-- Users can only see their own documents
create policy "Users can view own documents"
  on public.documents for select
  using (auth.uid() = user_id);

-- Users can insert their own documents
create policy "Users can insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);

-- Users can update their own documents
create policy "Users can update own documents"
  on public.documents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can delete their own documents
create policy "Users can delete own documents"
  on public.documents for delete
  using (auth.uid() = user_id);

-- Auto-update `updated_at`
create trigger documents_updated_at
  before update on public.documents
  for each row execute function public.handle_updated_at();

-- ── Storage bucket ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- Users can upload to their own folder: documents/<user_id>/*
create policy "Users can upload own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read their own files
create policy "Users can read own documents"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "Users can delete own documents"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
