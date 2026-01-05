-- Backfill Script: Populate updated_at and updated_by for existing substations
-- Date: 2026-01-05
-- Purpose: Set initial values for audit fields using random existing users

-- Update existing substations with random users from User Management mock data
-- User IDs from mockUAMUsers: SA001, SO001, MI001, MI002, W001, W002, MI003, SO002, W003, MI004

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
  -- If no users found, use a default system user approach
  IF array_length(user_ids, 1) IS NULL OR array_length(user_ids, 1) = 0 THEN
    RAISE NOTICE 'No user profiles found. Skipping updated_by assignment.';
    
    -- Just set updated_at to created_at or now
    UPDATE substations 
    SET updated_at = COALESCE(created_at, NOW())
    WHERE updated_at IS NULL;
    
  ELSE
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
  
  RAISE NOTICE 'Backfill completed successfully';
END $$;

-- Verify the update
SELECT 
  COUNT(*) as total_substations,
  COUNT(updated_by) as substations_with_user,
  COUNT(*) - COUNT(updated_by) as substations_without_user
FROM substations;
