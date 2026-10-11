-- ═══════════════════════════════════════════════════════════
-- Education profile (high school / university), nicknames, new rankings.
-- Run once in the Supabase SQL Editor (safe to re-run).
-- ═══════════════════════════════════════════════════════════

-- ── 1. Profile columns ───────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hs_track        TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university      TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS faculty         TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hidden_from_leaderboard BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_education_level_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_education_level_check
  CHECK (education_level IS NULL OR education_level IN ('high_school', 'university'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_hs_track_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_hs_track_check
  CHECK (hs_track IS NULL OR hs_track IN ('national', 'stem', 'american'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_faculty_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_faculty_check
  CHECK (faculty IS NULL OR faculty IN ('medicine', 'engineering'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_nickname_check;
ALTER TABLE public.profiles ADD  CONSTRAINT profiles_nickname_check
  CHECK (nickname IS NULL OR char_length(nickname) <= 24);

-- Everyone who already has an account is STEM.
UPDATE public.profiles
SET education_level = 'high_school', hs_track = 'stem'
WHERE education_level IS NULL;

-- Hiding from the leaderboard is no longer an option: make everyone visible again.
UPDATE public.profiles SET hidden_from_leaderboard = FALSE WHERE hidden_from_leaderboard IS TRUE;

-- ── 2. Signup trigger: read the new fields from signup metadata ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_level   TEXT := NULLIF(NEW.raw_user_meta_data->>'education_level', '');
  v_track   TEXT := NULLIF(NEW.raw_user_meta_data->>'hs_track', '');
  v_faculty TEXT := NULLIF(NEW.raw_user_meta_data->>'faculty', '');
BEGIN
  IF v_level   NOT IN ('high_school', 'university')          THEN v_level   := NULL; END IF;
  IF v_track   NOT IN ('national', 'stem', 'american')       THEN v_track   := NULL; END IF;
  IF v_faculty NOT IN ('medicine', 'engineering')            THEN v_faculty := NULL; END IF;

  INSERT INTO public.profiles
    (id, username, full_name, nickname, education_level, hs_track, university, faculty)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    LEFT(NULLIF(BTRIM(NEW.raw_user_meta_data->>'nickname'), ''), 24),
    v_level,
    CASE WHEN v_level = 'high_school' THEN v_track ELSE NULL END,
    CASE WHEN v_level = 'university'  THEN NULLIF(BTRIM(NEW.raw_user_meta_data->>'university'), '') ELSE NULL END,
    CASE WHEN v_level = 'university'  THEN v_faculty ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 3. Rankings ──────────────────────────────────────────────
-- p_days counts calendar days in Cairo time: 1 = today, 7 = today + previous 6 days.

-- Replaced by get_ranked_students (it exposed full names and honoured "hidden").
DROP FUNCTION IF EXISTS public.get_leaderboard(INTEGER);

-- Students. Every filter is optional; NULL means "no filter".
--   all students ............ no filters
--   my track (high school) .. p_track
--   my faculty (all unis) ... p_level = 'university', p_faculty
--   my university ........... p_level = 'university', p_university
-- Returns the top 100 plus the caller's own row, with the true rank.
CREATE OR REPLACE FUNCTION public.get_ranked_students(
  p_days       INTEGER DEFAULT 7,
  p_level      TEXT    DEFAULT NULL,
  p_track      TEXT    DEFAULT NULL,
  p_university TEXT    DEFAULT NULL,
  p_faculty    TEXT    DEFAULT NULL
)
RETURNS TABLE (
  user_id         UUID,
  display_name    TEXT,
  education_level TEXT,
  hs_track        TEXT,
  university      TEXT,
  faculty         TEXT,
  total_seconds   BIGINT,
  rank            BIGINT
) AS $$
  WITH since AS (
    SELECT (date_trunc('day', NOW() AT TIME ZONE 'Africa/Cairo') - make_interval(days => GREATEST(p_days, 1) - 1))
           AT TIME ZONE 'Africa/Cairo' AS ts
  ),
  totals AS (
    SELECT
      p.id,
      COALESCE(NULLIF(BTRIM(p.nickname), ''), p.username) AS display_name,
      p.education_level, p.hs_track, p.university, p.faculty,
      COALESCE(SUM(s.duration_seconds), 0)::BIGINT AS total_seconds
    FROM public.profiles p
    LEFT JOIN public.sessions s
      ON s.user_id = p.id
     AND s.status = 'completed'
     AND s.started_at >= (SELECT ts FROM since)
    WHERE (p_level      IS NULL OR p.education_level = p_level)
      AND (p_track      IS NULL OR p.hs_track = p_track)
      AND (p_university IS NULL OR LOWER(BTRIM(p.university)) = LOWER(BTRIM(p_university)))
      AND (p_faculty    IS NULL OR p.faculty = p_faculty)
    GROUP BY p.id
  ),
  ranked AS (
    SELECT t.*, RANK() OVER (ORDER BY t.total_seconds DESC) AS rank FROM totals t
  )
  SELECT r.id, r.display_name, r.education_level, r.hs_track, r.university, r.faculty, r.total_seconds, r.rank
  FROM ranked r
  WHERE r.rank <= 100 OR r.id = auth.uid()
  ORDER BY r.rank, r.display_name;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Universities (students who picked a university), optionally for one faculty.
CREATE OR REPLACE FUNCTION public.get_university_ranking(
  p_days    INTEGER DEFAULT 7,
  p_faculty TEXT    DEFAULT NULL
)
RETURNS TABLE (
  university    TEXT,
  student_count BIGINT,
  total_seconds BIGINT,
  avg_seconds   BIGINT,
  rank          BIGINT
) AS $$
  WITH since AS (
    SELECT (date_trunc('day', NOW() AT TIME ZONE 'Africa/Cairo') - make_interval(days => GREATEST(p_days, 1) - 1))
           AT TIME ZONE 'Africa/Cairo' AS ts
  ),
  per_student AS (
    SELECT
      p.id,
      LOWER(BTRIM(p.university)) AS uni_key,
      BTRIM(p.university)        AS uni_name,
      COALESCE(SUM(s.duration_seconds), 0)::BIGINT AS secs
    FROM public.profiles p
    LEFT JOIN public.sessions s
      ON s.user_id = p.id
     AND s.status = 'completed'
     AND s.started_at >= (SELECT ts FROM since)
    WHERE p.education_level = 'university'
      AND NULLIF(BTRIM(p.university), '') IS NOT NULL
      AND (p_faculty IS NULL OR p.faculty = p_faculty)
    GROUP BY p.id
  ),
  per_uni AS (
    SELECT
      MIN(uni_name)               AS university,
      COUNT(*)::BIGINT            AS student_count,
      SUM(secs)::BIGINT           AS total_seconds,
      (SUM(secs) / COUNT(*))::BIGINT AS avg_seconds
    FROM per_student
    GROUP BY uni_key
  )
  SELECT u.university, u.student_count, u.total_seconds, u.avg_seconds,
         RANK() OVER (ORDER BY u.total_seconds DESC) AS rank
  FROM per_uni u
  ORDER BY rank, u.university;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Group leaderboard: now returns display_name (nickname) instead of username/full_name.
DROP FUNCTION IF EXISTS public.get_group_leaderboard(UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(
  p_group_id UUID,
  days_back  INTEGER DEFAULT 7
)
RETURNS TABLE (
  user_id         UUID,
  display_name    TEXT,
  education_level TEXT,
  hs_track        TEXT,
  university      TEXT,
  faculty         TEXT,
  total_seconds   BIGINT,
  rank            BIGINT
) AS $$
  WITH since AS (
    SELECT (date_trunc('day', NOW() AT TIME ZONE 'Africa/Cairo') - make_interval(days => GREATEST(days_back, 1) - 1))
           AT TIME ZONE 'Africa/Cairo' AS ts
  ),
  totals AS (
    SELECT
      p.id,
      COALESCE(NULLIF(BTRIM(p.nickname), ''), p.username) AS display_name,
      p.education_level, p.hs_track, p.university, p.faculty,
      COALESCE(SUM(s.duration_seconds), 0)::BIGINT AS total_seconds
    FROM public.group_members gm
    JOIN public.profiles p ON p.id = gm.user_id
    LEFT JOIN public.sessions s
      ON s.user_id = gm.user_id
     AND s.status = 'completed'
     AND s.started_at >= (SELECT ts FROM since)
    WHERE gm.group_id = p_group_id
    GROUP BY p.id
  )
  SELECT t.id, t.display_name, t.education_level, t.hs_track, t.university, t.faculty,
         t.total_seconds, RANK() OVER (ORDER BY t.total_seconds DESC) AS rank
  FROM totals t
  ORDER BY rank, t.display_name;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;
