-- ============================================
-- FITVERSE — CHALLENGES & CHECKINS FIX MIGRATION
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para criar a tabela de check-ins de desafios e conceder as políticas de acesso corretas.
-- ============================================

-- 1. Criação da tabela challenge_checkins se não existir
CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_title text NOT NULL,
  photo_url text,
  metric_value numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores para evitar duplicados
DROP POLICY IF EXISTS "Challenge checkins are viewable by everyone" ON public.challenge_checkins;
DROP POLICY IF EXISTS "Users can check in to challenges" ON public.challenge_checkins;

-- Criação das políticas de segurança
CREATE POLICY "Challenge checkins are viewable by everyone"
  ON public.challenge_checkins FOR SELECT
  USING (true);

CREATE POLICY "Users can check in to challenges"
  ON public.challenge_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. Política de UPDATE na tabela challenges para contagem de participantes
DROP POLICY IF EXISTS "Users can update challenge participant count" ON public.challenges;
CREATE POLICY "Users can update challenge participant count"
  ON public.challenges FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
