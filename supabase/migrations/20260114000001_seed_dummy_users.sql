-- Migration: Seed dummy users for notification group demonstration
-- Created: 2026-01-14
-- Purpose: Populate profiles table with mock users from userManagementService.ts

-- NOTE: This migration temporarily disables the FK constraint to auth.users
-- This is acceptable for development/demo purposes
-- In production, you would create actual authenticated users first

-- Step 1: Temporarily disable FK constraint to auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Step 2: Insert dummy users into profiles table
-- Using specific UUIDs for consistency with the mock data
-- Note: Database user_role enum has: 'admin', 'operator', 'viewer'
--       Mapping: system_admin/system_owner -> 'admin'

INSERT INTO profiles (id, email, full_name, role, department, created_at, updated_at)
VALUES
  -- Admins (includes System Admin and System Owners from UAM)
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
  
  -- Manual Implementators
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
  
  -- Watchers (Viewers)
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

-- Step 3: Verify insertion
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles WHERE email LIKE '%@company.com';
  RAISE NOTICE 'Inserted/Updated % dummy users for notification group demonstration', user_count;
END $$;

-- Step 4: Optional - Re-enable FK constraint
-- Note: Commented out for demo purposes. Uncomment if you need strict referential integrity
-- and ensure auth.users entries exist first

-- ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
--   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create a comment explaining the role mapping
COMMENT ON TABLE profiles IS 'User profiles table. Note: Database has enum user_role (admin, operator, viewer). UAM roles map as: system_admin/system_owner -> admin, manual_implementator -> operator, watcher -> viewer';

-- Optional: Display all dummy users
SELECT 
  full_name,
  email,
  role,
  department,
  created_at
FROM profiles
WHERE email LIKE '%@company.com'
ORDER BY role, full_name;
