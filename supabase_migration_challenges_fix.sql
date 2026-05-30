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

-- ============================================
-- 3. SEED DEFAULT CHALLENGES & MIGRATE EXISTING POSTS
-- ============================================

-- Seed standard challenges
INSERT INTO public.challenges (id, title, description, icon, type, duration, reward, color, active)
VALUES
  ('8b69324c-e836-47b3-8b77-cfc81f33f92d', '30 Dias de Treino', 'Treine todos os dias por 30 dias', '🏋️', 'treino', 30, 500, '#00D4FF', true),
  ('c9705aeb-c3eb-460d-83cc-0bb6b7e61a49', 'Hidratação Master', 'Beba 3L de água por dia', '💧', 'saúde', 14, 200, '#39FF14', true),
  ('f643bf17-06de-4ee4-90a6-4b681816e257', 'Cardio Challenge', '150min de cardio por semana', '🏃', 'cardio', 7, 150, '#FF6B35', true),
  ('ea584f23-6627-4638-958a-3606f23851b3', 'Clean Eating', 'Registre todas as refeições no NutriScan', '🥗', 'nutrição', 21, 300, '#A855F7', true)
ON CONFLICT (id) DO NOTHING;

-- Create participations for users who made posts related to these challenges
INSERT INTO public.challenge_participants (challenge_id, user_id, progress)
SELECT DISTINCT c.id, v.user_id, 0
FROM public.videos v
JOIN public.challenges c ON (lower(v.caption) LIKE '%' || lower(c.title) || '%')
WHERE v.category = 'desafio'
ON CONFLICT (challenge_id, user_id) DO NOTHING;

-- Populate challenge checkins from the video posts table
INSERT INTO public.challenge_checkins (challenge_id, user_id, activity_title, photo_url, created_at)
SELECT c.id, v.user_id, 'Check-in Diário', v.video_url, v.created_at
FROM public.videos v
JOIN public.challenges c ON (lower(v.caption) LIKE '%' || lower(c.title) || '%')
WHERE v.category = 'desafio'
AND NOT EXISTS (
  SELECT 1 FROM public.challenge_checkins cc 
  WHERE cc.challenge_id = c.id 
    AND cc.user_id = v.user_id 
    AND cc.photo_url = v.video_url
);

-- Update the progress of each participation to match their actual check-in counts
UPDATE public.challenge_participants cp
SET progress = (
  SELECT count(*) 
  FROM public.challenge_checkins cc 
  WHERE cc.challenge_id = cp.challenge_id 
    AND cc.user_id = cp.user_id
);

