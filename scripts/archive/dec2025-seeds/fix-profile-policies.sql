-- Additional SQL to fix profile creation during signup
-- Run this in your Supabase SQL Editor after running the main migration

-- Allow users to insert their own profile during signup
CREATE POLICY "Users can insert own profile during signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Also allow anonymous users to insert profiles (needed during signup process)
CREATE POLICY "Allow profile creation during signup"
  ON profiles FOR INSERT
  TO anon
  WITH CHECK (true);