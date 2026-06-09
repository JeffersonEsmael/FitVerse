-- ==========================================================
-- FITVERSE — PROFILE TYPES & CUSTOM BUSINESS FEEDBACKS MIGRATION
-- ==========================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- ==========================================================

-- 1. Adicionar colunas de tipo, contatos e tema na tabela public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_type text DEFAULT 'personal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_theme_color text DEFAULT 'default';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_garage text DEFAULT 'não';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS operating_hours text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_photos jsonb DEFAULT '[]'::jsonb;

-- 2. Criar a tabela de feedbacks para perfis empresariais (academias/empresas)
CREATE TABLE IF NOT EXISTS public.business_feedbacks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar Row Level Security (RLS) na tabela de feedbacks
ALTER TABLE public.business_feedbacks ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas RLS para public.business_feedbacks
DROP POLICY IF EXISTS "Feedbacks are viewable by everyone" ON public.business_feedbacks;
CREATE POLICY "Feedbacks are viewable by everyone" 
  ON public.business_feedbacks FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can submit feedback" ON public.business_feedbacks;
CREATE POLICY "Authenticated users can submit feedback" 
  ON public.business_feedbacks FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id 
    AND auth.uid() <> business_id -- Impede o dono do perfil empresarial de avaliar a si mesmo
  );
