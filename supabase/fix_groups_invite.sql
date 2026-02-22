-- ═══════════════════════════════════════════════════════════
-- FIX: Groups invite-code join fails with "Invalid invite code"
--
-- Root cause: RLS policy on `groups` only allows SELECT if
--   is_public = TRUE OR created_by = auth.uid()
-- So a private group is invisible to the joining user → query
-- returns no rows → hook throws "Invalid invite code".
--
-- Fix: SECURITY DEFINER function that bypasses RLS for the
-- invite-code lookup, then inserts the member row.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.join_group_by_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER           -- runs as the function owner, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_group  public.groups%ROWTYPE;
  v_uid    UUID := auth.uid();
BEGIN
  -- Look up the group (bypasses RLS because of SECURITY DEFINER)
  SELECT * INTO v_group
  FROM   public.groups
  WHERE  invite_code = UPPER(TRIM(p_code))
  LIMIT  1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code' USING HINT = 'No group with that invite code';
  END IF;

  -- Insert membership (ignore duplicate)
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group.id, v_uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;

  -- Return the group as JSON
  RETURN row_to_json(v_group);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.join_group_by_code(TEXT) TO authenticated;

-- Also allow members to read groups they belong to
-- (needed to display the group card after joining)
DROP POLICY IF EXISTS "groups_member_read" ON public.groups;
CREATE POLICY "groups_member_read" ON public.groups FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
    )
  );
