-- Fix RLS Policy for User Insert During Registration
-- This ensures users can insert their own profile when they have an active session
-- Run this in your Supabase SQL Editor

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create policy that allows users to insert their own profile
-- This works when auth.uid() matches the id being inserted
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT 
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL 
    AND 
    -- The id being inserted must match the authenticated user's id
    auth.uid() = id
  );

-- Also ensure the policy allows the insert to work
-- Verify the policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users' 
  AND policyname = 'Users can insert own profile';

-- Test query to verify auth context (run this while logged in)
-- SELECT auth.uid() as current_user_id;

