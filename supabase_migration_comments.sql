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

-- ============================================
-- AUTOMATIC FOLLOWER/FOLLOWING COUNTERS
-- ============================================

-- Trigger function to update followers and following counts in profiles table
CREATE OR REPLACE FUNCTION public.handle_follower_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment follower's following count
    UPDATE public.profiles
    SET following = following + 1
    WHERE id = NEW.follower_id;

    -- Increment following's followers count
    UPDATE public.profiles
    SET followers = followers + 1
    WHERE id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement follower's following count
    UPDATE public.profiles
    SET following = GREATEST(following - 1, 0)
    WHERE id = OLD.follower_id;

    -- Decrement following's followers count
    UPDATE public.profiles
    SET followers = GREATEST(followers - 1, 0)
    WHERE id = OLD.following_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS tr_follower_change ON public.followers;
CREATE TRIGGER tr_follower_change
  AFTER INSERT OR DELETE ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_follower_change();

-- ============================================
-- AUTOMATIC COMMENT COUNTERS ON VIDEOS
-- ============================================

-- Trigger to automatically increment/decrement video comments count
CREATE OR REPLACE FUNCTION public.handle_video_comment_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.videos
    SET comments = comments + 1
    WHERE id = NEW.video_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.videos
    SET comments = GREATEST(comments - 1, 0)
    WHERE id = OLD.video_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on video_comments
DROP TRIGGER IF EXISTS tr_video_comment_change ON public.video_comments;
CREATE TRIGGER tr_video_comment_change
  AFTER INSERT OR DELETE ON public.video_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_video_comment_change();

-- ============================================
-- COMMENT REPLIES & COMMENT LIKES SCHEMA UPDATES
-- ============================================

-- Add parent_id for threaded replies
ALTER TABLE public.video_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE;

-- Add likes count column to comments
ALTER TABLE public.video_comments ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_video_comments_parent ON public.video_comments(parent_id);

-- Create table to track individual user likes on comments
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES public.video_comments(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Enable RLS on comment_likes
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Select policy: public read
CREATE POLICY "Comment likes are publicly readable"
  ON public.comment_likes FOR SELECT
  USING (true);

-- Insert policy: authenticated users
CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Delete policy: users can unlike comments
CREATE POLICY "Users can unlike comments"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to automatically increment/decrement comment likes count
CREATE OR REPLACE FUNCTION public.handle_comment_like_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.video_comments
    SET likes = likes + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.video_comments
    SET likes = GREATEST(likes - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on comment_likes
DROP TRIGGER IF EXISTS tr_comment_like_change ON public.comment_likes;
CREATE TRIGGER tr_comment_like_change
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_comment_like_change();
