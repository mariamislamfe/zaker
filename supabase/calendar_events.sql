-- ═══════════════════════════════════════════════════════════
-- Calendar events (quizzes, deadlines…) with dashboard reminders.
-- Run once in the Supabase SQL Editor (safe to re-run).
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  event_date         DATE NOT NULL,
  -- The dashboard reminder appears this many days before event_date
  -- and stays until the event is marked done.
  remind_days_before INTEGER NOT NULL DEFAULT 1 CHECK (remind_days_before BETWEEN 0 AND 30),
  done               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date
  ON public.calendar_events(user_id, event_date);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_own_all" ON public.calendar_events;
CREATE POLICY "calendar_events_own_all" ON public.calendar_events
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
