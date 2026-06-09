-- ============================================
-- FITVERSE — CHALLENGES EXPIRY MIGRATION
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para adicionar a coluna expires_at na tabela public.challenges.
-- ============================================

ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS expires_at timestamptz;
