-- =========================================================================================
-- FITVERSE — COMPLETE DATABASE SETUP SCRIPT (v2)
-- =========================================================================================
-- Execute este script no SQL Editor do Supabase Dashboard.
-- É seguro executar múltiplas vezes (idempotente).
-- =========================================================================================

-- ============================================
-- 1. CREATE/UPDATE TABLES
-- ============================================

-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text not null default '',
  username text not null default '',
  avatar_url text default '',
  bio text default '',
  fitness_goals text[] default '{}',
  level integer default 1,
  xp integer default 0,
  streak integer default 0,
  last_active_date timestamptz default now(),
  followers integer default 0,
  following integer default 0,
  total_videos integer default 0,
  total_likes integer default 0,
  rank_position integer,
  badges text[] default '{}',
  is_public boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure all columns exist (safe for tables that already exist)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fitness_goals text[] DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}';

-- VIDEOS / POSTS
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text default '',
  media_type text default 'video',
  username text not null default '',
  user_avatar text default '',
  display_name text not null default '',
  caption text default '',
  hashtags text[] default '{}',
  category text default 'geral',
  likes integer default 0,
  shapes integer default 0,
  boosts integer default 0,
  gym_bag_saves integer default 0,
  comments integer default 0,
  shares integer default 0,
  views integer default 0,
  created_at timestamptz default now()
);

-- Ensure new columns exist
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'video';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shapes integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boosts integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS gym_bag_saves integer DEFAULT 0;

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_ids uuid[] NOT NULL,
  last_message text DEFAULT '',
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text DEFAULT '',
  image_url text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. APPLY BULLETPROOF RLS POLICIES
-- ============================================

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- PROFILES POLICIES
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- VIDEOS POLICIES
CREATE POLICY "Videos are viewable by everyone"
  ON public.videos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can upload videos"
  ON public.videos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos"
  ON public.videos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
  ON public.videos FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS POLICIES
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- MESSAGES POLICIES
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- ============================================
-- 4. PROFILE AUTO-CREATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, username)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(
      coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
      '[^a-z0-9]', '', 'g'
    )) || floor(random() * 9000 + 1000)::text
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;

-- ============================================
-- 6. STORAGE BUCKETS & POLICIES
-- ============================================

-- Create buckets (public) with size limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4','video/webm','video/quicktime','video/x-msvideo'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 104857600;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('posts', 'posts', true, 20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-media', 'chat-media', true, 20971520)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520;

-- Drop all old storage policies
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Videos Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Videos Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Posts Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Posts Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "ChatMedia Public Read" ON storage.objects;
DROP POLICY IF EXISTS "ChatMedia Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Public read — anyone can view files
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'videos', 'posts', 'chat-media'));

-- Authenticated insert — logged-in users can upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND
    bucket_id IN ('avatars', 'videos', 'posts', 'chat-media')
  );

-- Authenticated update — logged-in users can update/overwrite their files
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('avatars', 'videos', 'posts', 'chat-media')
  );

-- Authenticated delete — logged-in users can delete files (e.g. old avatars)
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE USING (
    auth.role() = 'authenticated' AND
    bucket_id IN ('avatars', 'videos', 'posts', 'chat-media')
  );

-- ============================================
-- FINISHED! All tables, RLS, triggers,
-- and storage buckets are ready.
-- ============================================

-- ============================================
-- 7. VIDEO INTERACTIONS (Gym Bag, Shapes, Boosts)
-- ============================================

CREATE TABLE IF NOT EXISTS public.video_interactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_id uuid references public.videos(id) on delete cascade not null,
  interaction_type text not null check (interaction_type in ('shape', 'boost', 'gym_bag')),
  created_at timestamptz default now(),
  UNIQUE(user_id, video_id, interaction_type)
);

-- Enable RLS
ALTER TABLE public.video_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their interactions" ON public.video_interactions;
CREATE POLICY "Users can manage their interactions" 
  ON public.video_interactions FOR ALL 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Interactions are public read" ON public.video_interactions;
CREATE POLICY "Interactions are public read" 
  ON public.video_interactions FOR SELECT 
  USING (true);

-- RPC for toggling interaction generically
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
    -- Remove interaction
    DELETE FROM public.video_interactions 
    WHERE user_id = v_user_id AND video_id = p_video_id AND interaction_type = p_type;
    
    -- Decrement counter on video
    IF p_type = 'shape' THEN
      UPDATE public.videos SET shapes = GREATEST(shapes - 1, 0) WHERE id = p_video_id;
    ELSIF p_type = 'boost' THEN
      UPDATE public.videos SET boosts = GREATEST(boosts - 1, 0) WHERE id = p_video_id;
    ELSIF p_type = 'gym_bag' THEN
      UPDATE public.videos SET gym_bag_saves = GREATEST(gym_bag_saves - 1, 0) WHERE id = p_video_id;
    END IF;
  ELSE
    -- Add interaction
    INSERT INTO public.video_interactions (user_id, video_id, interaction_type) 
    VALUES (v_user_id, p_video_id, p_type);
    
    -- Increment counter on video
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

-- Specific RPC wrappers for the frontend
CREATE OR REPLACE FUNCTION public.toggle_video_shape(p_video_id uuid) RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'shape');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_video_boost(p_video_id uuid) RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'boost');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.toggle_video_gym_bag(p_video_id uuid) RETURNS void AS $$
BEGIN
  PERFORM public.toggle_interaction(p_video_id, 'gym_bag');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
