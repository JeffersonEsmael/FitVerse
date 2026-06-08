-- ============================================================================
-- FITVERSE — WORKOUT SERIES VISIBILITY AND COPIES MIGRATION
-- ============================================================================
-- Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1. Add is_public and copies_count columns to workout_series
ALTER TABLE public.workout_series ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;
ALTER TABLE public.workout_series ADD COLUMN IF NOT EXISTS copies_count integer DEFAULT 0;

-- 2. Update existing rows if any to have defaults
UPDATE public.workout_series SET is_public = true WHERE is_public IS NULL;
UPDATE public.workout_series SET copies_count = 0 WHERE copies_count IS NULL;

-- 3. Update select RLS policy for public.workout_series
DROP POLICY IF EXISTS "Workout series are viewable by everyone" ON public.workout_series;
CREATE POLICY "Workout series are viewable by everyone"
  ON public.workout_series FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- 4. Create SECURITY DEFINER RPC function to increment copies count
CREATE OR REPLACE FUNCTION public.increment_series_copy_count(series_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.workout_series
  SET copies_count = coalesce(copies_count, 0) + 1
  WHERE id = series_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Reload Schema cache
NOTIFY pgrst, 'reload schema';
