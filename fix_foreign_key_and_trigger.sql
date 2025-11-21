-- Fix Foreign Key Constraint and Ensure Trigger Works Properly
-- Run this in your Supabase SQL Editor

-- 1. Drop and recreate the trigger function to ensure it works correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recreate the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  -- Use ON CONFLICT to handle cases where user might already exist
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure RLS policies allow the trigger function to work
-- The trigger runs as SECURITY DEFINER, so it bypasses RLS, but we should still ensure policies exist

-- 5. Update RLS policies to allow trainers to update bookings
DROP POLICY IF EXISTS "Trainers can update session bookings" ON public.bookings;

CREATE POLICY "Trainers can update session bookings" ON public.bookings
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  );

-- 6. Verify the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 7. Test query to check if users table is accessible
SELECT COUNT(*) as user_count FROM public.users;

