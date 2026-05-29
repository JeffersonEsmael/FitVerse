-- ALTER TABLES FOR CHALLENGES EXTENSION
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS creator_id uuid references auth.users(id) on delete set null;

-- CREATE POLICY
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.challenges;
CREATE POLICY "Users can insert their own challenges"
  ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- CREATE CHECKINS TABLE
CREATE TABLE IF NOT EXISTS public.challenge_checkins (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  activity_title text not null,
  photo_url text,
  metric_value numeric default 0,
  created_at timestamptz default now()
);

-- ENABLE RLS FOR CHECKINS
ALTER TABLE public.challenge_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Challenge checkins are viewable by everyone" ON public.challenge_checkins;
CREATE POLICY "Challenge checkins are viewable by everyone"
  ON public.challenge_checkins FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can check in to challenges" ON public.challenge_checkins;
CREATE POLICY "Users can check in to challenges"
  ON public.challenge_checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
