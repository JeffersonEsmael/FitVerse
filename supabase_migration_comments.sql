-- ============================================
-- MYORA — COMMENTS SYSTEM MIGRATION
-- ============================================
-- Execute this in your Supabase Dashboard → SQL Editor
-- ============================================

-- Create video_comments table
CREATE TABLE IF NOT EXISTS public.video_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  avatar_url text DEFAULT '',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;

-- Select policy: public read
CREATE POLICY "Comments are publicly readable"
  ON public.video_comments FOR SELECT
  USING (true);

-- Insert policy: authenticated users
CREATE POLICY "Authenticated users can post comments"
  ON public.video_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete policy: users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON public.video_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_video_comments_video
  ON public.video_comments(video_id, created_at DESC);

-- Also verify if the videos table has comments count. If not, add it
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS comments integer DEFAULT 0;
