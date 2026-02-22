-- ── Admin Messages ────────────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor (Dashboard → SQL editor → New query).
-- After running, no restart is required.

CREATE TABLE IF NOT EXISTS admin_messages (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  title         text        NOT NULL,
  content       text        NOT NULL,
  -- NULL  → broadcast to all users
  -- uuid  → targeted to a specific user
  target_user_id uuid       REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active     boolean     DEFAULT true,
  created_by    uuid        REFERENCES auth.users(id)
);

-- Allow any authenticated user to read messages addressed to them or broadcast
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can read their own + broadcast messages"
  ON admin_messages FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (target_user_id IS NULL OR target_user_id = auth.uid())
  );

-- Only the admin can insert / update / delete (enforced in app too)
CREATE POLICY "admin full access"
  ON admin_messages FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
