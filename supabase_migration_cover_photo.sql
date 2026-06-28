-- ==========================================================
-- FITVERSE — SHOW_COVER COLUMN MIGRATION
-- ==========================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- ==========================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_cover boolean DEFAULT true;
