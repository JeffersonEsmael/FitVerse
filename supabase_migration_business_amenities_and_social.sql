-- ==========================================================
-- FITVERSE — BUSINESS PROFILE AMENITIES & SOCIAL LINKS MIGRATION
-- ==========================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==========================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS amenities jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
