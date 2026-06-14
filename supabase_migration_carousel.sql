-- ============================================
-- FITVERSE — ADICIONAR COLUNA PARA CARROSSEL
-- ============================================
-- Execute este SQL no Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste & Run

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS carousel_urls text[] DEFAULT '{}';
