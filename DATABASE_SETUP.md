# Fitness App Database Setup

## 🏋️ Database Schema for Fitness Trainer Booking App

### Tables to Create in Supabase Dashboard

#### 1. **users** (extends Supabase auth.users)
```sql
-- This table extends the built-in auth.users table
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
```

#### 2. **trainers**
```sql
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
```

#### 3. **training_sessions**
```sql
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
```

#### 4. **bookings**
```sql
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
```

### Row Level Security (RLS) Policies

#### Enable RLS on all tables:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
```

#### Users can only see/edit their own data:
```sql
-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);
```

#### Training sessions are visible to all authenticated users:
```sql
-- Training sessions policies
CREATE POLICY "Anyone can view available sessions" ON public.training_sessions
  FOR SELECT USING (true);

CREATE POLICY "Trainers can manage their sessions" ON public.training_sessions
  FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.trainers WHERE id = trainer_id));
```

#### Bookings policies:
```sql
-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = client_id);
```

### Sample Data

#### Insert sample trainers:
```sql
INSERT INTO public.trainers (name, email, phone, specialties, bio, hourly_rate) VALUES
('John Smith', 'john@fitness.com', '+1234567890', ARRAY['Weight Training', 'Cardio'], 'Certified personal trainer with 5 years experience', 75.00),
('Sarah Johnson', 'sarah@fitness.com', '+1234567891', ARRAY['Yoga', 'Pilates'], 'Yoga instructor and wellness coach', 60.00),
('Mike Wilson', 'mike@fitness.com', '+1234567892', ARRAY['CrossFit', 'Strength Training'], 'CrossFit Level 2 trainer', 80.00);
```

#### Insert sample training sessions:
```sql
INSERT INTO public.training_sessions (trainer_id, session_date, start_time, end_time, session_type, price) VALUES
((SELECT id FROM public.trainers WHERE name = 'John Smith'), '2024-10-25', '09:00', '10:00', 'personal', 75.00),
((SELECT id FROM public.trainers WHERE name = 'John Smith'), '2024-10-25', '10:00', '11:00', 'personal', 75.00),
((SELECT id FROM public.trainers WHERE name = 'Sarah Johnson'), '2024-10-25', '14:00', '15:00', 'personal', 60.00),
((SELECT id FROM public.trainers WHERE name = 'Mike Wilson'), '2024-10-26', '08:00', '09:00', 'personal', 80.00);
```

## 🚀 Next Steps

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Run the above SQL commands** to create your database schema
4. **Set up authentication** in the Authentication section
5. **Test the connection** with your React app

Your fitness app database will be ready! 💪








