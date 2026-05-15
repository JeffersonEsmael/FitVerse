-- ============================================
-- FITVERSE MVP — MIGRATION SQL
-- ============================================
-- Execute this in Supabase Dashboard → SQL Editor
-- This adds the missing columns and tables
-- for the MVP to work properly.
-- ============================================

-- ═══════════════════════════════════════════
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ═══════════════════════════════════════════

-- Videos: add interaction columns the frontend expects
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS shapes integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS boosts integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS gym_bag_saves integer DEFAULT 0;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'video';

-- Profiles: add public/private toggle
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- ═══════════════════════════════════════════
-- 2. CONVERSATIONS TABLE
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_ids uuid[] NOT NULL,
  last_message text DEFAULT '',
  unread_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Users can view conversations they are part of
CREATE POLICY "Users can view their conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

-- Users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

-- Users can update their conversations
CREATE POLICY "Users can update their conversations"
  ON public.conversations FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_conversations_participants
  ON public.conversations USING GIN (participant_ids);

-- ═══════════════════════════════════════════
-- 3. MESSAGES TABLE
-- ═══════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text DEFAULT '',
  image_url text DEFAULT '',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_id
      AND auth.uid() = ANY(conversations.participant_ids)
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON public.messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON public.messages(sender_id);

-- ═══════════════════════════════════════════
-- 4. ENABLE REALTIME ON MESSAGES
-- ═══════════════════════════════════════════
-- Go to Supabase Dashboard → Database → Replication
-- Enable replication for the 'messages' table
-- OR run:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ═══════════════════════════════════════════
-- 5. STORAGE BUCKET POLICIES
-- ═══════════════════════════════════════════
-- Run these in the SQL Editor as well.
-- They allow authenticated users to upload
-- and everyone to read (since buckets are public).

-- AVATARS bucket policies
INSERT INTO storage.policies (name, bucket_id, definition, action)
SELECT 'Allow authenticated uploads', 'avatars',
  '(auth.role() = ''authenticated'')', 'INSERT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Allow authenticated uploads' AND bucket_id = 'avatars'
);

INSERT INTO storage.policies (name, bucket_id, definition, action)
SELECT 'Allow public read', 'avatars',
  'true', 'SELECT'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.policies WHERE name = 'Allow public read' AND bucket_id = 'avatars'
);

-- Note: If the above INSERT syntax doesn't work in your Supabase version,
-- configure storage policies via Dashboard → Storage → avatars → Policies:
--   - SELECT: Allow all (public read)
--   - INSERT: Allow authenticated users
--   - UPDATE: Allow authenticated users
--   - DELETE: Allow authenticated users (own files)
-- Repeat for: videos, posts, chat-media buckets.

-- ═══════════════════════════════════════════
-- DONE! Verify tables were created correctly
-- ═══════════════════════════════════════════
-- You can verify by running:
-- SELECT * FROM information_schema.columns WHERE table_name = 'videos' AND column_name IN ('shapes','boosts','gym_bag_saves','media_type');
-- SELECT * FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public';
-- SELECT * FROM information_schema.tables WHERE table_name IN ('conversations','messages');
