-- ============================================
-- FITVERSE — NOTIFICATIONS SCHEMA FIX
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para recriar a tabela de notificações com o schema correto.
-- ============================================

-- 1. Remove a tabela antiga para evitar conflitos de schema
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Criação da nova tabela com a coluna sender_id e reference_id
CREATE TABLE public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'follow', 'message', 'save', 'shape', 'comment', 'boost', 'mention'
  reference_id uuid, -- ID do vídeo, comentário ou conversa correspondente
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. Habilita RLS (Row Level Security)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Criação das políticas de segurança
CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 5. Índice de performance para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
