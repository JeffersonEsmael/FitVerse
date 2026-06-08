-- ============================================
-- FITVERSE — WORKOUT SERIES MIGRATION
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para criar a tabela de séries de exercícios de cada usuário.
-- ============================================

CREATE TABLE IF NOT EXISTS public.workout_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  weekly_frequency text DEFAULT '3x por semana',
  progress_completed integer DEFAULT 0,
  progress_total integer DEFAULT 30,
  exercises jsonb DEFAULT '[]'::jsonb, -- Array of { id, name, sets, reps, weight, done_today }
  is_active boolean DEFAULT false,
  is_public boolean DEFAULT true,
  copies_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.workout_series ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se houver
DROP POLICY IF EXISTS "Workout series are viewable by everyone" ON public.workout_series;
DROP POLICY IF EXISTS "Users can manage their own workout series" ON public.workout_series;

-- Criar políticas de segurança
CREATE POLICY "Workout series are viewable by everyone"
  ON public.workout_series FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage their own workout series"
  ON public.workout_series FOR ALL
  USING (auth.uid() = user_id);

