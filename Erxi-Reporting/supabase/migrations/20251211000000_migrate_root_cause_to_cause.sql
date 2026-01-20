-- Migration: Copy root_cause data to cause column and drop root_cause
-- Date: 2025-12-11
-- Description: Migrate existing root_cause data to the cause column, then drop root_cause column

-- Step 1: Copy all root_cause data to cause column (only if cause is null)
UPDATE pq_events 
SET cause = root_cause 
WHERE root_cause IS NOT NULL 
  AND cause IS NULL;

-- Step 2: Verify the migration (optional check - can be run manually)
-- SELECT COUNT(*) as total_events,
--        COUNT(root_cause) as has_root_cause,
--        COUNT(cause) as has_cause
-- FROM pq_events;

-- Step 3: Drop the root_cause column
ALTER TABLE pq_events DROP COLUMN IF EXISTS root_cause;

-- Migration complete
