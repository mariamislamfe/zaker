-- ═══════════════════════════════════════════════════════════
-- NUCLEAR RLS FIX — paste this entire file into Supabase SQL Editor
-- Removes all recursive policies. Timer + analytics will work immediately.
-- ═══════════════════════════════════════════════════════════

-- ── 1. sessions: drop the policy that queries group_members ──────────────────
--    This is what causes every sessions query to 500-error right now.
DROP POLICY IF EXISTS "sessions_group_read" ON public.sessions;

-- ── 2. group_members: drop ALL policies and add a simple safe one ─────────────
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "group_members_read"       ON public.group_members;
DROP POLICY IF EXISTS "group_members_own_insert" ON public.group_members;
DROP POLICY IF EXISTS "group_members_own_delete" ON public.group_members;

-- Users can only see / manage their own membership rows
CREATE POLICY "gm_select" ON public.group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gm_insert" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gm_delete" ON public.group_members FOR DELETE USING (
  auth.uid() = user_id
  OR group_id IN (SELECT id FROM public.groups WHERE created_by = auth.uid())
);

-- ── 3. groups: remove the sub-query on group_members ─────────────────────────
DROP POLICY IF EXISTS "groups_public_read" ON public.groups;

-- Public groups or groups you created — no group_members sub-query
CREATE POLICY "groups_public_read" ON public.groups FOR SELECT
  USING (is_public = TRUE OR created_by = auth.uid());
