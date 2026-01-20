-- Fix user role to admin for seeding
-- Run this in your Supabase SQL Editor

-- First, check current user profiles
SELECT id, email, full_name, role FROM profiles;

-- Update the admin user to have proper admin role
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@clp.com';

-- If no profile exists, create one (replace 'your-user-uuid' with actual UUID from auth.users)
-- First get your user ID:
-- SELECT id, email FROM auth.users WHERE email = 'admin@clp.com';

-- Then insert profile if missing (use the UUID from above):
-- INSERT INTO profiles (id, email, full_name, role, department)
-- VALUES ('your-user-uuid-here', 'admin@clp.com', 'Admin User', 'admin', 'Power Quality')
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';