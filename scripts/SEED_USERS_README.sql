-- Quick Migration Guide: Seed Dummy Users for Notification Groups
-- ================================================================
-- 
-- Purpose: Add 10 mock users to the profiles table for demonstration
-- 
-- OPTION 1: Using Supabase CLI (Recommended)
-- ------------------------------------------
-- Run this in your terminal:
--   cd /workspaces/codespaces-react
--   bash scripts/apply-dummy-users-migration.sh
--
-- OPTION 2: Using Supabase Dashboard SQL Editor
-- ----------------------------------------------
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste the SQL below
-- 4. Click "Run"
--
-- OPTION 3: Using psql or database client
-- ----------------------------------------
-- Connect to your database and run the SQL below
--
-- ================================================================

-- Note about auth.users FK constraint:
-- The profiles table has a FK constraint to auth.users.
-- For development/demo purposes, we'll temporarily disable it.
-- WARNING: Only do this in development environments!

-- Step 1: Temporarily disable FK constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Insert dummy users
-- IMPORTANT: Database user_role enum has: 'admin', 'operator', 'viewer'
-- UAM role mapping: system_admin/system_owner -> 'admin', manual_implementator -> 'operator', watcher -> 'viewer'

INSERT INTO profiles (id, email, full_name, role, department, created_at, updated_at)
VALUES
  -- Admins (3 users) - Includes System Admin and System Owners from UAM
  (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'john.anderson@company.com',
    'John Anderson',
    'admin',
    'Digital Engineering',
    '2024-01-15T08:00:00Z',
    '2024-01-15T08:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000002'::uuid,
    'sarah.chen@company.com',
    'Sarah Chen',
    'admin',
    'Power Systems',
    '2024-02-10T09:30:00Z',
    '2024-02-10T09:30:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000008'::uuid,
    'maria.garcia@company.com',
    'Maria Garcia',
    'admin',
    'Business Success',
    '2024-06-01T10:30:00Z',
    '2024-06-01T10:30:00Z'
  ),
  
  -- Operators (4 users) - Maps from manual_implementator role
  (
    '00000000-0000-0000-0000-000000000003'::uuid,
    'michael.wong@company.com',
    'Michael Wong',
    'operator',
    'Technical Services-PSBG',
    '2024-03-05T10:15:00Z',
    '2024-03-05T10:15:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000004'::uuid,
    'emily.rodriguez@company.com',
    'Emily Rodriguez',
    'operator',
    'Digital Engineering',
    '2024-03-12T11:00:00Z',
    '2024-03-12T11:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000007'::uuid,
    'james.park@company.com',
    'James Park',
    'operator',
    'Power Systems',
    '2024-05-15T09:00:00Z',
    '2024-05-15T09:00:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000010'::uuid,
    'amanda.zhang@company.com',
    'Amanda Zhang',
    'operator',
    'Digital Engineering',
    '2024-08-05T08:30:00Z',
    '2024-08-05T08:30:00Z'
  ),
  
  -- Viewers (3 users) - Maps from watcher role
  (
    '00000000-0000-0000-0000-000000000005'::uuid,
    'david.kim@company.com',
    'David Kim',
    'viewer',
    'Business Success',
    '2024-04-01T08:45:00Z',
    '2024-04-01T08:45:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000006'::uuid,
    'lisa.thompson@company.com',
    'Lisa Thompson',
    'viewer',
    'Technical Services-PSBG',
    '2024-04-10T14:20:00Z',
    '2024-04-10T14:20:00Z'
  ),
  (
    '00000000-0000-0000-0000-000000000009'::uuid,
    'robert.lee@company.com',
    'Robert Lee',
    'viewer',
    'Business Success',
    '2024-07-10T13:15:00Z',
    '2024-07-10T13:15:00Z'
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  department = EXCLUDED.department,
  updated_at = now();

-- Step 3: Re-enable FK constraint (optional - only if you want strict referential integrity)
-- Note: Uncomment the line below if you want to enforce the FK constraint again
-- However, this will fail if the user IDs don't exist in auth.users
-- For demo purposes, it's okay to leave it disabled

-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
--   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Alternative: If you want to keep the constraint, you can use a different approach
-- by inserting into auth.users first (requires service_role access):
-- INSERT INTO auth.users (id, email, ...) VALUES (...) ON CONFLICT DO NOTHING;

-- Step 4: Verify the insertion
SELECT 
  COUNT(*) as total_users,
  role,
  string_agg(full_name, ', ' ORDER BY full_name) as users
FROM profiles
WHERE email LIKE '%@company.com'
GROUP BY role
ORDER BY role;

-- Show all dummy users
SELECT 
  full_name,
  email,
  role,
  department,
  TO_CHAR(created_at, 'YYYY-MM-DD') as created_date
FROM profiles
WHERE email LIKE '%@company.com'
ORDER BY 
  CASE role
    WHEN 'admin' THEN 1
    WHEN 'operator' THEN 2
    WHEN 'viewer' THEN 3
  END,
  full_name;

-- Success message
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles WHERE email LIKE '%@company.com';
  RAISE NOTICE '✅ Successfully seeded % dummy users for notification group demonstration!', user_count;
  RAISE NOTICE '📋 Role Distribution (database enum values):';
  RAISE NOTICE '   - Admin: 3 users (includes System Admin + System Owners from UAM)';
  RAISE NOTICE '   - Operator: 4 users (Manual Implementators from UAM)';
  RAISE NOTICE '   - Viewer: 3 users (Watchers from UAM)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Go to Notifications → Groups tab';
  RAISE NOTICE '   2. Click "New Group"';
  RAISE NOTICE '   3. Add users from the dropdown';
  RAISE NOTICE '   4. Set channel preferences for each member';
END $$;
