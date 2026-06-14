-- ==========================================================
-- FITVERSE — Migration: Atomic View Increment RPC
-- ==========================================================
-- Replaces the current SELECT + UPDATE pattern with a single
-- atomic RPC call. Eliminates race conditions and cuts the
-- number of queries per view from 2 to 1.
-- ==========================================================

-- Drop if exists to make this migration idempotent
DROP FUNCTION IF EXISTS increment_video_views(UUID);

CREATE OR REPLACE FUNCTION increment_video_views(p_video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE videos SET views = views + 1 WHERE id = p_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_video_views(UUID) TO authenticated;
