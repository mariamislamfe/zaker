-- Run this in your Supabase SQL editor (Database → SQL editor → New query)
-- These functions run as postgres (SECURITY DEFINER) so they bypass RLS.

-- 1. Total study seconds across ALL users
CREATE OR REPLACE FUNCTION admin_get_total_study_seconds()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(duration_seconds), 0)::bigint
  FROM sessions
  WHERE status = 'completed';
$$;

-- 2. Per-user breakdown: username, total study time, session count
CREATE OR REPLACE FUNCTION admin_get_user_study_stats()
RETURNS TABLE(
  user_id       uuid,
  username      text,
  full_name     text,
  total_seconds bigint,
  session_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id            AS user_id,
    p.username      AS username,
    p.full_name     AS full_name,
    COALESCE(SUM(s.duration_seconds), 0)::bigint AS total_seconds,
    COUNT(s.id)::bigint                          AS session_count
  FROM profiles p
  LEFT JOIN sessions s ON s.user_id = p.id AND s.status = 'completed'
  GROUP BY p.id, p.username, p.full_name
  ORDER BY total_seconds DESC;
$$;
