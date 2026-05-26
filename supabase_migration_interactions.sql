-- ============================================
-- MYORA — INTERACTIONS & FOLLOWERS SYSTEM MIGRATION
-- ============================================
-- Execute este script no Supabase Dashboard → SQL Editor
-- para garantir que shapes, boosts, gym_bag e seguidores funcionem perfeitamente.
-- ============================================

-- 1. Garante que as colunas de contagem existam na tabela videos
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shapes integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boosts integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS gym_bag_saves integer DEFAULT 0;

-- 2. Criação da tabela de interações se não existir
CREATE TABLE IF NOT EXISTS public.video_interactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('shape', 'boost', 'gym_bag')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id, interaction_type)
);

-- Habilita RLS na tabela de interações
ALTER TABLE public.video_interactions ENABLE ROW LEVEL SECURITY;

-- Remove políticas anteriores para evitar duplicações/erros
DROP POLICY IF EXISTS "Interactions are public read" ON public.video_interactions;
DROP POLICY IF EXISTS "Users can manage their interactions" ON public.video_interactions;

-- Cria políticas limpas
CREATE POLICY "Interactions are public read" 
  ON public.video_interactions FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage their interactions" 
  ON public.video_interactions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- 3. Função Genérica de Toggle para Interações (Shapes, Boosts, GymBag)
CREATE OR REPLACE FUNCTION public.toggle_interaction(p_video_id uuid, p_type text)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.video_interactions 
    WHERE user_id = v_user_id AND video_id = p_video_id AND interaction_type = p_type
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove a interação
    DELETE FROM public.video_interactions 
    WHERE user_id = v_user_id AND video_id = p_video_id AND interaction_type = p_type;
    
    -- Decrementa o respectivo contador na tabela de vídeos
    IF p_type = 'shape' THEN
      UPDATE public.videos SET shapes = GREATEST(shapes - 1, 0) WHERE id = p_video_id;
    ELSIF p_type = 'boost' THEN
      UPDATE public.videos SET boosts = GREATEST(boosts - 1, 0) WHERE id = p_video_id;
    ELSIF p_type = 'gym_bag' THEN
      UPDATE public.videos SET gym_bag_saves = GREATEST(gym_bag_saves - 1, 0) WHERE id = p_video_id;
    END IF;
  ELSE
    -- Adiciona a interação
    INSERT INTO public.video_interactions (user_id, video_id, interaction_type) 
    VALUES (v_user_id, p_video_id, p_type);
    
    -- Incrementa o respectivo contador na tabela de vídeos
    IF p_type = 'shape' THEN
      UPDATE public.videos SET shapes = shapes + 1 WHERE id = p_video_id;
    ELSIF p_type = 'boost' THEN
      UPDATE public.videos SET boosts = boosts + 1 WHERE id = p_video_id;
    ELSIF p_type = 'gym_bag' THEN
      UPDATE public.videos SET gym_bag_saves = gym_bag_saves + 1 WHERE id = p_video_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Funções Wrappers específicas para a API Frontend do Supabase RPC
CREATE OR REPLACE FUNCTION public.toggle_video_shape(p_video_id uuid) 
RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'shape');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_video_boost(p_video_id uuid) 
RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'boost');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_video_gym_bag(p_video_id uuid) 
RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'gym_bag');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Tabelas e Triggers de Seguidores para garantir que as contagens sincronizem
CREATE TABLE IF NOT EXISTS public.followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Followers are public read" ON public.followers;
DROP POLICY IF EXISTS "Users can manage their follows" ON public.followers;

CREATE POLICY "Followers are public read" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can manage their follows" ON public.followers FOR ALL USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

-- Função do trigger para atualizar seguidores e seguindo nas tabelas de perfis
CREATE OR REPLACE FUNCTION public.handle_follower_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Incrementa seguinte
    UPDATE public.profiles
    SET following = following + 1
    WHERE id = NEW.follower_id;

    -- Incrementa seguidor
    UPDATE public.profiles
    SET followers = followers + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementa seguinte
    UPDATE public.profiles
    SET following = GREATEST(following - 1, 0)
    WHERE id = OLD.follower_id;

    -- Decrementa seguidor
    UPDATE public.profiles
    SET followers = GREATEST(followers - 1, 0)
    WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger de seguidores
DROP TRIGGER IF EXISTS tr_follower_change ON public.followers;
CREATE TRIGGER tr_follower_change
  AFTER INSERT OR DELETE ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_follower_change();
