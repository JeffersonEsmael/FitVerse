-- ============================================
-- FITVERSE — SUPABASE DATABASE SCHEMA
-- ============================================
-- Execute este SQL no Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================

-- 1. PROFILES TABLE (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text not null default '',
  username text unique not null default '',
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies: anyone can read profiles, users can update their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- 2. VIDEOS TABLE
create table if not exists public.videos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  video_url text not null,
  thumbnail_url text default '',
  username text not null default '',
  user_avatar text default '',
  display_name text not null default '',
  caption text default '',
  hashtags text[] default '{}',
  category text default 'geral',
  likes integer default 0,
  comments integer default 0,
  shares integer default 0,
  views integer default 0,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.videos enable row level security;

-- Policies: anyone can read, authenticated users can insert
create policy "Videos are viewable by everyone"
  on public.videos for select using (true);

create policy "Authenticated users can upload videos"
  on public.videos for insert with check (auth.uid() = user_id);

create policy "Users can update their own videos"
  on public.videos for update using (auth.uid() = user_id);

create policy "Users can delete their own videos"
  on public.videos for delete using (auth.uid() = user_id);

-- 3. MEALS TABLE (NutriScan)
create table if not exists public.meals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  foods jsonb not null default '[]',
  totals jsonb not null default '{}',
  scanned_at timestamptz default now()
);

-- Enable RLS
alter table public.meals enable row level security;

create policy "Users can view their own meals"
  on public.meals for select using (auth.uid() = user_id);

create policy "Users can insert their own meals"
  on public.meals for insert with check (auth.uid() = user_id);

-- 4. CHALLENGES TABLE
create table if not exists public.challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text default '',
  icon text default '🏆',
  type text default 'geral',
  duration integer default 30,
  participants integer default 0,
  reward integer default 100,
  color text default '#00D4FF',
  active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.challenges enable row level security;

create policy "Challenges are viewable by everyone"
  on public.challenges for select using (true);

-- 5. CHALLENGE PARTICIPANTS TABLE
create table if not exists public.challenge_participants (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references public.challenges(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  progress integer default 0,
  joined_at timestamptz default now(),
  unique(challenge_id, user_id)
);

-- Enable RLS
alter table public.challenge_participants enable row level security;

create policy "Users can view challenge participants"
  on public.challenge_participants for select using (true);

create policy "Users can join challenges"
  on public.challenge_participants for insert with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.challenge_participants for update using (auth.uid() = user_id);

-- 6. VIDEO LIKES TABLE
create table if not exists public.video_likes (
  id uuid default gen_random_uuid() primary key,
  video_id uuid references public.videos(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(video_id, user_id)
);

-- Enable RLS
alter table public.video_likes enable row level security;

create policy "Likes are viewable by everyone"
  on public.video_likes for select using (true);

create policy "Users can like videos"
  on public.video_likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike videos"
  on public.video_likes for delete using (auth.uid() = user_id);

-- 7. FOLLOWERS TABLE
create table if not exists public.followers (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users(id) on delete cascade not null,
  following_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

-- Enable RLS
alter table public.followers enable row level security;

create policy "Follows are viewable by everyone"
  on public.followers for select using (true);

create policy "Users can follow others"
  on public.followers for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow others"
  on public.followers for delete using (auth.uid() = follower_id);

-- 8. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'like', 'comment', 'follow', 'ranking', 'badge'
  from_user_id uuid references auth.users(id) on delete set null,
  from_username text default '',
  message text default '',
  read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "System can create notifications"
  on public.notifications for insert with check (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
create index if not exists idx_videos_created_at on public.videos(created_at desc);
create index if not exists idx_videos_user_id on public.videos(user_id);
create index if not exists idx_videos_category on public.videos(category);
create index if not exists idx_profiles_xp on public.profiles(xp desc);
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_meals_user_date on public.meals(user_id, scanned_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_video_likes_video on public.video_likes(video_id);
create index if not exists idx_followers_following on public.followers(following_id);

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)) || floor(random() * 1000)::text
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: create profile when user signs up
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- STORAGE BUCKETS (create via Dashboard or API)
-- ============================================
-- Go to Supabase Dashboard → Storage → Create Bucket:
--   Name: videos (public)
--   Name: avatars (public)
-- Set policies to allow authenticated uploads
