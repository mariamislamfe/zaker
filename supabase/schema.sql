-- ═══════════════════════════════════════════════════════════
-- ZAKER — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- SUBJECTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subjects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  icon        TEXT NOT NULL DEFAULT '📚',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- ─────────────────────────────────────────────────────────────
-- SESSIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id        UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER DEFAULT 0,
  status            TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_subject_id ON public.sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at);

-- ─────────────────────────────────────────────────────────────
-- BREAKS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.breaks (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id        UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  break_type        TEXT NOT NULL CHECK (break_type IN ('prayer', 'meal', 'rest')),
  started_at        TIMESTAMPTZ DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  duration_seconds  INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_breaks_session_id ON public.breaks(session_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user_id    ON public.breaks(user_id);

-- ─────────────────────────────────────────────────────────────
-- GROUPS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code  TEXT UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)),
  is_public    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by  ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);

-- ─────────────────────────────────────────────────────────────
-- GROUP MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id  ON public.group_members(user_id);

-- ─────────────────────────────────────────────────────────────
-- ANALYTICS FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Global leaderboard (last N days)
CREATE OR REPLACE FUNCTION public.get_leaderboard(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  user_id      UUID,
  username     TEXT,
  full_name    TEXT,
  avatar_url   TEXT,
  total_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id            AS user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(s.duration_seconds), 0)::BIGINT AS total_seconds
  FROM public.profiles p
  LEFT JOIN public.sessions s
    ON s.user_id = p.id
    AND s.status = 'completed'
    AND s.started_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY p.id, p.username, p.full_name, p.avatar_url
  ORDER BY total_seconds DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Group leaderboard
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(
  p_group_id UUID,
  days_back  INTEGER DEFAULT 7
)
RETURNS TABLE (
  user_id       UUID,
  username      TEXT,
  full_name     TEXT,
  avatar_url    TEXT,
  total_seconds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id            AS user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    COALESCE(SUM(s.duration_seconds), 0)::BIGINT AS total_seconds
  FROM public.group_members gm
  JOIN public.profiles p ON p.id = gm.user_id
  LEFT JOIN public.sessions s
    ON s.user_id = gm.user_id
    AND s.status = 'completed'
    AND s.started_at >= NOW() - (days_back || ' days')::INTERVAL
  WHERE gm.group_id = p_group_id
  GROUP BY p.id, p.username, p.full_name, p.avatar_url
  ORDER BY total_seconds DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breaks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- PROFILES: public read, own write
CREATE POLICY "profiles_public_read"  ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_own_insert"   ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update"   ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- SUBJECTS: own CRUD
CREATE POLICY "subjects_own_all" ON public.subjects
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- SESSIONS: own CRUD + group members can read
CREATE POLICY "sessions_own_all" ON public.sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_group_read" ON public.sessions FOR SELECT
  USING (
    user_id IN (
      SELECT gm2.user_id FROM public.group_members gm2
      WHERE gm2.group_id IN (
        SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
      )
    )
  );

-- BREAKS: own CRUD
CREATE POLICY "breaks_own_all" ON public.breaks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GROUPS: public read if public, members read private
CREATE POLICY "groups_public_read" ON public.groups FOR SELECT
  USING (is_public = TRUE OR created_by = auth.uid() OR id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  ));
CREATE POLICY "groups_own_insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_own_update" ON public.groups FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "groups_own_delete" ON public.groups FOR DELETE USING (auth.uid() = created_by);

-- GROUP MEMBERS: members can read own group's members
CREATE POLICY "group_members_read" ON public.group_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM public.group_members gm WHERE gm.user_id = auth.uid()
    )
    OR group_id IN (SELECT id FROM public.groups WHERE is_public = TRUE)
  );
CREATE POLICY "group_members_own_insert" ON public.group_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "group_members_own_delete" ON public.group_members FOR DELETE
  USING (auth.uid() = user_id OR group_id IN (
    SELECT id FROM public.groups WHERE created_by = auth.uid()
  ));

-- ─────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────

-- Enable realtime on tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
