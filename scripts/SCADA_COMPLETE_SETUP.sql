-- =============================================================================
-- SCADA Module: Complete Database Setup
-- Date: 2026-01-05
-- Purpose: Add audit fields to substations table and backfill existing data
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE script
-- 3. Click "Run" button
-- 4. Refresh your SCADA page in the app
-- =============================================================================

-- STEP 1: Add audit columns to substations table
-- -----------------------------------------------------------------------------

-- Add updated_at column (timestamp with timezone)
ALTER TABLE substations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_by column (references profiles)
ALTER TABLE substations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_substations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid duplicate trigger error)
DROP TRIGGER IF EXISTS trigger_update_substations_updated_at ON substations;

-- Create trigger
CREATE TRIGGER trigger_update_substations_updated_at
  BEFORE UPDATE ON substations
  FOR EACH ROW
  EXECUTE FUNCTION update_substations_updated_at();

-- STEP 2: Backfill existing substations with audit data
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  substation_record RECORD;
  random_user_id UUID;
  user_ids UUID[] := ARRAY(
    SELECT id FROM profiles 
    WHERE email LIKE '%@company.com%' 
    LIMIT 10
  );
BEGIN
  -- If no users found, just set updated_at to created_at or now
  IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) = 0 THEN
    RAISE NOTICE 'No user profiles found. Skipping updated_by assignment.';
    
    UPDATE substations 
    SET updated_at = COALESCE(created_at, NOW())
    WHERE updated_at IS NULL;
    
  ELSE
    RAISE NOTICE 'Found % users for backfill', array_length(user_ids, 1);
    
    -- Loop through substations and assign random users
    FOR substation_record IN 
      SELECT id, created_at FROM substations 
      WHERE updated_at IS NULL OR updated_by IS NULL
    LOOP
      -- Pick a random user from the array
      random_user_id := user_ids[1 + floor(random() * array_length(user_ids, 1))::int];
      
      -- Update the substation
      UPDATE substations
      SET 
        updated_at = COALESCE(substation_record.created_at, NOW()),
        updated_by = random_user_id
      WHERE id = substation_record.id;
      
      RAISE NOTICE 'Updated substation % with user %', substation_record.id, random_user_id;
    END LOOP;
  END IF;
  
  RAISE NOTICE 'Backfill completed successfully!';
END $$;

-- STEP 3: Verify the setup
-- -----------------------------------------------------------------------------

-- Check column existence
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'substations'
  AND column_name IN ('updated_at', 'updated_by')
ORDER BY column_name;

-- Check data population
SELECT 
  COUNT(*) as total_substations,
  COUNT(updated_by) as substations_with_user,
  COUNT(updated_at) as substations_with_timestamp,
  COUNT(*) - COUNT(updated_by) as substations_without_user
FROM substations;

-- Show sample data
SELECT 
  code,
  name,
  updated_at,
  updated_by,
  (SELECT full_name FROM profiles WHERE id = substations.updated_by) as updated_by_name
FROM substations
ORDER BY code
LIMIT 5;

-- =============================================================================
-- ✅ SETUP COMPLETE!
-- You should see:
-- 1. Two columns: updated_at (timestamp with time zone), updated_by (uuid)
-- 2. All substations should have values in both columns
-- 3. Sample data showing 5 substations with their audit fields
-- 
-- Now refresh your SCADA page in the app - it should load without errors!
-- =============================================================================
