-- ==========================================================
-- FITVERSE — PERSONAL TRAINER PROFILE COLUMNS MIGRATION
-- ==========================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- ==========================================================

-- 1. Adicionar colunas para o perfil de Personal Trainer na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_photo_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS years_experience integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS students_count text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialties jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certifications text;
