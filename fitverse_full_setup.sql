-- =========================================================================================
-- FITVERSE — COMPLETE DATABASE SETUP SCRIPT
-- =========================================================================================
-- IMPORTANTE: Copie e cole todo este código no "SQL Editor" do seu painel do Supabase.
-- Clique em "RUN" para executar. Isso vai garantir que todas as tabelas, colunas,
-- regras de segurança (RLS) e buckets de storage estejam corretos para o MVP.
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

-- Ensure is_public exists if table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

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

-- Ensure new columns exist if table already existed
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
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. APPLY BULLETPROOF RLS POLICIES
-- ============================================

-- DROP EXISTING POLICIES FIRST (Para evitar erros de duplicação)
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

-- Allow authenticated users to insert their own profile (Required for upsert)
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile (Required for upsert/edit)
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
-- 5. SETUP TRIGGERS FOR PROFILE CREATION
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, username)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)) || floor(random() * 1000)::text
  )
  ON CONFLICT (id) DO NOTHING; -- Ensure it doesn't crash if row already exists
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. ENABLE REALTIME
-- ============================================
-- Create publication if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add messages table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 7. SETUP STORAGE BUCKETS AND PUBLIC ACCESS
-- ============================================
-- This requires the 'storage' schema to be present (which is standard in Supabase)
-- We insert into storage.buckets securely using an ON CONFLICT DO NOTHING approach.

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('videos', 'videos', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO UPDATE SET public = true;

-- Remove old policies to avoid overlap
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

-- Create universal policies for all these public buckets
CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'videos', 'posts', 'chat-media'));

CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('avatars', 'videos', 'posts', 'chat-media')
  );

CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND 
    bucket_id IN ('avatars', 'videos', 'posts', 'chat-media')
  );

-- ============================================
-- FINISHED!
-- ============================================
