-- Migration: Add dashboard_layout column to profiles table
-- Date: December 24, 2025
-- Purpose: Enable user-customized dashboard widget layouts

BEGIN;

-- Add dashboard_layout column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS dashboard_layout JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.dashboard_layout IS 
  'User-customized dashboard widget layout. Structure: { version: string, widgets: [{ id, col, row, width, visible, settings }] }';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_dashboard_layout 
  ON profiles USING GIN (dashboard_layout);

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check column created
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND column_name = 'dashboard_layout';

-- Check index created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles' 
  AND indexname = 'idx_profiles_dashboard_layout';

-- Show existing profiles (should have NULL dashboard_layout initially)
SELECT id, email, role, dashboard_layout
FROM profiles
LIMIT 5;
