-- Set user as admin role
-- Run this in your Supabase SQL Editor

-- Method 1: Direct update (if profile already exists)
UPDATE profiles 
SET role = 'admin', 
    department = 'IT Administration'
WHERE email = 'admin@clp.com';

-- Method 2: If the update above shows "0 rows affected", 
-- it means no profile exists. Run these queries:

-- First, get your user ID from auth.users table:
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'admin@clp.com';

-- Then copy the 'id' from above and replace 'YOUR_USER_ID_HERE' below:
-- (Remove the -- comment markers and replace the ID)

-- INSERT INTO profiles (id, email, full_name, role, department, created_at, updated_at)
-- VALUES (
--   'YOUR_USER_ID_HERE',  -- Replace with actual UUID from above query
--   'admin@clp.com',
--   'System Administrator',
--   'admin',
--   'IT Administration',
--   now(),
--   now()
-- )
-- ON CONFLICT (id) 
-- DO UPDATE SET 
--   role = 'admin',
--   department = 'IT Administration',
--   updated_at = now();

-- Verify the update worked:
SELECT id, email, full_name, role, department 
FROM profiles 
WHERE email = 'admin@clp.com';