-- Fitness App Database Schema
-- Copy and paste this into your Supabase SQL Editor

-- 1. Create users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  date_of_birth DATE,
  fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  goals TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create trainers table
CREATE TABLE public.trainers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  specialties TEXT[],
  bio TEXT,
  hourly_rate DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create training_sessions table
CREATE TABLE public.training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_type TEXT CHECK (session_type IN ('personal', 'group', 'virtual')),
  status TEXT CHECK (status IN ('available', 'booked', 'completed', 'cancelled')) DEFAULT 'available',
  price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create bookings table
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies

-- Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Training sessions are visible to all authenticated users
CREATE POLICY "Anyone can view available sessions" ON public.training_sessions
  FOR SELECT USING (true);

CREATE POLICY "Trainers can manage their sessions" ON public.training_sessions
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.trainers WHERE id = trainer_id));

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = client_id);

-- Trainers can view all bookings for their sessions
CREATE POLICY "Trainers can view session bookings" ON public.bookings
  FOR SELECT USING (
    auth.uid() IN (
      SELECT t.user_id 
      FROM public.trainers t 
      JOIN public.training_sessions ts ON t.id = ts.trainer_id 
      WHERE ts.id = session_id
    )
  );

-- 7. Insert sample trainers
INSERT INTO public.trainers (name, email, phone, specialties, bio, hourly_rate) VALUES
('John Smith', 'john@fitness.com', '+1234567890', ARRAY['Weight Training', 'Cardio'], 'Certified personal trainer with 5 years experience', 75.00),
('Sarah Johnson', 'sarah@fitness.com', '+1234567891', ARRAY['Yoga', 'Pilates'], 'Yoga instructor and wellness coach', 60.00),
('Mike Wilson', 'mike@fitness.com', '+1234567892', ARRAY['CrossFit', 'Strength Training'], 'CrossFit Level 2 trainer', 80.00);

-- 8. Insert sample training sessions
INSERT INTO public.training_sessions (trainer_id, session_date, start_time, end_time, session_type, price) VALUES
((SELECT id FROM public.trainers WHERE name = 'John Smith'), '2024-10-25', '09:00', '10:00', 'personal', 75.00),
((SELECT id FROM public.trainers WHERE name = 'John Smith'), '2024-10-25', '10:00', '11:00', 'personal', 75.00),
((SELECT id FROM public.trainers WHERE name = 'Sarah Johnson'), '2024-10-25', '14:00', '15:00', 'personal', 60.00),
((SELECT id FROM public.trainers WHERE name = 'Mike Wilson'), '2024-10-26', '08:00', '09:00', 'personal', 80.00),
((SELECT id FROM public.trainers WHERE name = 'John Smith'), '2024-10-26', '11:00', '12:00', 'personal', 75.00),
((SELECT id FROM public.trainers WHERE name = 'Sarah Johnson'), '2024-10-27', '10:00', '11:00', 'personal', 60.00),
((SELECT id FROM public.trainers WHERE name = 'Mike Wilson'), '2024-10-27', '15:00', '16:00', 'personal', 80.00);

-- 9. Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();








