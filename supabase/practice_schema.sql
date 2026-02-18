-- ─── Practice Sessions ────────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor

create table if not exists public.practice_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  mode           text not null check (mode in ('stopwatch', 'timer')),
  target_seconds integer not null,
  actual_seconds integer not null,
  passage_count  integer not null default 0,
  average_grade  integer,                   -- null if no passages recorded
  created_at     timestamptz not null default now()
);

create table if not exists public.practice_passages (
  id                   uuid primary key default gen_random_uuid(),
  practice_session_id  uuid not null references public.practice_sessions(id) on delete cascade,
  user_id              uuid not null references auth.users(id) on delete cascade,
  position             integer not null,
  grade                integer not null check (grade >= 0 and grade <= 100),
  created_at           timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists practice_sessions_user_id_idx
  on public.practice_sessions(user_id, created_at desc);

create index if not exists practice_passages_session_idx
  on public.practice_passages(practice_session_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.practice_sessions enable row level security;
alter table public.practice_passages  enable row level security;

-- Practice sessions: users can only see/modify their own
create policy "practice_sessions: own rows"
  on public.practice_sessions
  for all using (auth.uid() = user_id);

-- Practice passages: users can only see/modify their own
create policy "practice_passages: own rows"
  on public.practice_passages
  for all using (auth.uid() = user_id);
