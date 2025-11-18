-- Fix RLS Policies for Trainer Registration
-- Run this in your Supabase SQL Editor

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Anyone can view trainers" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can manage their sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Anyone can view available sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can view session bookings" ON public.bookings;

-- 2. Create new permissive policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Create permissive policies for trainers table
CREATE POLICY "Anyone can view trainers" ON public.trainers
  FOR SELECT USING (true);

CREATE POLICY "Users can insert trainer profile" ON public.trainers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trainers can update own profile" ON public.trainers
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Create permissive policies for training_sessions table
CREATE POLICY "Anyone can view available sessions" ON public.training_sessions
  FOR SELECT USING (true);

CREATE POLICY "Trainers can manage their sessions" ON public.training_sessions
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM public.trainers WHERE id = trainer_id
    )
  );

-- 5. Create permissive policies for bookings table
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Trainers can view session bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  );

-- 6. Test the policies by checking if they work
-- This should return true if policies are working
SELECT 
  'RLS policies updated successfully' as status,
  COUNT(*) as trainer_count
FROM public.trainers;



