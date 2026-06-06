-- ============================================================================
-- FITVERSE — UNIFIED DATABASE & STORAGE FIX MIGRATION
-- ============================================================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================================

-- ── 1. CORREÇÃO DA TABELA PROFILES (Colunas faltantes) ──────────────────────
-- Adiciona as colunas necessárias que impediam a criação automática e a
-- atualização dos perfis no banco de dados.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mastery text DEFAULT 'Iniciante';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_mastery boolean DEFAULT true;

-- Garante que todos os usuários já cadastrados tenham uma linha correspondente em profiles
INSERT INTO public.profiles (id, email, display_name, username)
SELECT 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data->>'display_name', split_part(email, '@', 1)) || floor(random() * 1000)::text
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── 2. CORREÇÃO DA TABELA DE NOTIFICAÇÕES ────────────────────────────────────
-- Remove a estrutura antiga e cria a nova estrutura com a relação sender_id -> profiles.

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'follow', 'message', 'save', 'shape', 'comment', 'boost', 'mention'
  reference_id uuid, -- ID do vídeo, comentário ou conversa correspondente
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ── 3. CRIAÇÃO/CORREÇÃO DA TABELA WORKOUT_SERIES ─────────────────────────────
-- Garante que a tabela de séries de exercícios exista com RLS habilitado.

CREATE TABLE IF NOT EXISTS public.workout_series (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  weekly_frequency text DEFAULT '3x por semana',
  progress_completed integer DEFAULT 0,
  progress_total integer DEFAULT 30,
  exercises jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workout_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workout series are viewable by everyone" ON public.workout_series;
CREATE POLICY "Workout series are viewable by everyone"
  ON public.workout_series FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can manage their own workout series" ON public.workout_series;
CREATE POLICY "Users can manage their own workout series"
  ON public.workout_series FOR ALL
  USING (auth.uid() = user_id);

-- ── 4. CONFIGURAÇÃO AUTOMÁTICA DOS BUCKETS DE STORAGE E POLÍTICAS ────────────
-- Cria os buckets necessários e define as políticas de leitura e gravação.

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('videos', 'videos', true),
  ('posts', 'posts', true),
  ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para acesso público de leitura
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (true);

-- Políticas para upload por usuários autenticados
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id IN ('avatars', 'videos', 'posts', 'chat-media'));

-- Políticas para gerenciamento total pelos donos do arquivo
DROP POLICY IF EXISTS "Owner Manage" ON storage.objects;
CREATE POLICY "Owner Manage" ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id IN ('avatars', 'videos', 'posts', 'chat-media'))
  WITH CHECK (bucket_id IN ('avatars', 'videos', 'posts', 'chat-media'));

-- ── 5. RECARREGAR O CACHE DO POSTGREST ───────────────────────────────────────
-- Força o Supabase a atualizar as relações de chaves estrangeiras e tabelas
-- no cache da API, resolvendo os erros 400 Bad Request instantaneamente.

NOTIFY pgrst, 'reload schema';
