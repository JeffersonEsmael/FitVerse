-- =======================================================
-- FITVERSE — GYM CHECK-INS & STREAK SCHEMA MIGRATION
-- =======================================================

-- 1. Create gyms table
CREATE TABLE IF NOT EXISTS public.gyms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  qr_code_token text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

-- Policies for public reading
DROP POLICY IF EXISTS "Gyms are viewable by everyone" ON public.gyms;
CREATE POLICY "Gyms are viewable by everyone" 
  ON public.gyms FOR SELECT 
  USING (true);

-- 2. Create gym_checkins table
CREATE TABLE IF NOT EXISTS public.gym_checkins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gym_id uuid REFERENCES public.gyms(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gym_checkins ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Check-ins are viewable by everyone" ON public.gym_checkins;
CREATE POLICY "Check-ins are viewable by everyone" 
  ON public.gym_checkins FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can check in to gym" ON public.gym_checkins;
CREATE POLICY "Users can check in to gym" 
  ON public.gym_checkins FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 3. Modify profiles table to link to gyms and manage units
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_gym_manager boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS managed_gym_id uuid REFERENCES public.gyms(id) ON DELETE SET NULL;

-- 4. Seed pre-populated gyms
INSERT INTO public.gyms (id, name, address, qr_code_token) VALUES
  ('00000000-0000-0000-0000-000000000001', 'FitVerse Central', 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP', 'gym_central_token'),
  ('00000000-0000-0000-0000-000000000002', 'Alpha Fitness', 'Av. das Américas, 500 - Barra da Tijuca, Rio de Janeiro - RJ', 'gym_alpha_token'),
  ('00000000-0000-0000-0000-000000000003', 'Iron Room Gym', 'Rua Sergipe, 300 - Savassi, Belo Horizonte - MG', 'gym_iron_token')
ON CONFLICT (qr_code_token) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address;
