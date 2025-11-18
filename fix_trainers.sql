-- Fix Trainers Table - Make user_id optional
-- Run this in your Supabase SQL Editor

-- 1. Make user_id optional (trainers don't need to be users)
ALTER TABLE public.trainers 
ALTER COLUMN user_id DROP NOT NULL;

-- 2. Update existing trainers to have null user_id
UPDATE public.trainers 
SET user_id = NULL 
WHERE user_id IS NULL;

-- 3. Update the RLS policy to allow viewing trainers without user_id
DROP POLICY IF EXISTS "Trainers can manage their sessions" ON public.training_sessions;

CREATE POLICY "Trainers can manage their sessions" ON public.training_sessions
  FOR ALL USING (
    trainer_id IN (SELECT id FROM public.trainers WHERE user_id = auth.uid() OR user_id IS NULL)
  );

-- 4. Allow anyone to view trainers (they're public profiles)
CREATE POLICY "Anyone can view trainers" ON public.trainers
  FOR SELECT USING (true);

-- 5. Test the fix by checking if sessions are now visible
SELECT 
  ts.*,
  t.name as trainer_name,
  t.specialties as trainer_specialties
FROM public.training_sessions ts
LEFT JOIN public.trainers t ON ts.trainer_id = t.id
WHERE ts.status = 'available'
ORDER BY ts.session_date;
