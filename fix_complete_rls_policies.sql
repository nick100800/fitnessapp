-- Complete RLS Policy Fix for Fitness App
-- This ensures all features work properly with proper security
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- 1. DROP ALL EXISTING POLICIES (to start fresh)
-- ============================================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Trainers table policies
DROP POLICY IF EXISTS "Anyone can view trainers" ON public.trainers;
DROP POLICY IF EXISTS "Users can insert trainer profile" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can update own profile" ON public.trainers;
DROP POLICY IF EXISTS "Trainers can view own profile" ON public.trainers;

-- Training sessions policies
DROP POLICY IF EXISTS "Anyone can view available sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Trainers can manage their sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Users can view all sessions" ON public.training_sessions;

-- Bookings policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can view session bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can update session bookings" ON public.bookings;

-- ============================================================================
-- 2. USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Users can insert their own profile (for manual creation if needed)
-- This allows authenticated users to create their own profile record
-- IMPORTANT: auth.uid() must match the id being inserted
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL 
    AND 
    -- The id being inserted must match the authenticated user's id
    auth.uid() = id
  );

-- ============================================================================
-- 3. TRAINERS TABLE POLICIES
-- ============================================================================

-- Anyone (authenticated or not) can view trainers (for browsing)
CREATE POLICY "Anyone can view trainers" ON public.trainers
  FOR SELECT 
  USING (true);

-- Users can insert their own trainer profile
-- This allows a user to create a trainer profile linked to their user_id
CREATE POLICY "Users can insert trainer profile" ON public.trainers
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Trainers can update their own profile
CREATE POLICY "Trainers can update own profile" ON public.trainers
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Trainers can view their own profile
CREATE POLICY "Trainers can view own profile" ON public.trainers
  FOR SELECT 
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. TRAINING_SESSIONS TABLE POLICIES
-- ============================================================================

-- Anyone can view available sessions (for browsing)
CREATE POLICY "Anyone can view available sessions" ON public.training_sessions
  FOR SELECT 
  USING (true);

-- Trainers can manage (INSERT, UPDATE, DELETE) their own sessions
CREATE POLICY "Trainers can manage their sessions" ON public.training_sessions
  FOR ALL 
  USING (
    auth.uid() IN (
      SELECT user_id 
      FROM public.trainers 
      WHERE id = trainer_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id 
      FROM public.trainers 
      WHERE id = trainer_id
    )
  );

-- ============================================================================
-- 5. BOOKINGS TABLE POLICIES
-- ============================================================================

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT 
  USING (auth.uid() = client_id);

-- Users can create bookings for themselves
CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT 
  WITH CHECK (auth.uid() = client_id);

-- Users can update their own bookings (e.g., cancel)
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE 
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Trainers can view bookings for their sessions
CREATE POLICY "Trainers can view session bookings" ON public.bookings
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  );

-- Trainers can update bookings for their sessions (e.g., confirm)
CREATE POLICY "Trainers can update session bookings" ON public.bookings
  FOR UPDATE 
  USING (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  );

-- ============================================================================
-- 6. ENSURE TRIGGER IS SET UP CORRECTLY
-- ============================================================================

-- Drop and recreate trigger function with SECURITY DEFINER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function that runs as SECURITY DEFINER (bypasses RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users table
  -- This runs as SECURITY DEFINER, so it bypasses RLS
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 7. VERIFY SETUP
-- ============================================================================

-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check function security
SELECT 
  routine_name,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';

-- Count policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script:
-- 1. Sets up proper RLS policies for all tables
-- 2. Ensures the trigger runs as SECURITY DEFINER (bypasses RLS)
-- 3. Allows users to create their own profiles if trigger fails
-- 4. Allows trainers to manage their sessions and bookings
-- 5. Allows clients to book sessions and manage their bookings
-- 6. Maintains security by ensuring users can only access their own data

