-- ============================================================================
-- Script: Update False Event - Voltage Dip/Swell Only
-- Purpose: Set false_event to FALSE for all events except voltage_dip and voltage_swell
-- Reason: False event detection only applies to voltage dip and voltage swell events
-- Date: January 29, 2026
-- ============================================================================

-- IMPORTANT: Review the counts below before proceeding with update!

-- ============================================================================
-- STEP 1: Check Current Data (DO NOT UPDATE - FOR REVIEW ONLY)
-- ============================================================================

-- Count events by type and false_event status
SELECT 
  'Events by type and false_event status' as description,
  event_type,
  false_event,
  COUNT(*) as event_count
FROM pq_events
GROUP BY event_type, false_event
ORDER BY event_type, false_event;

-- Count events that will be updated (false_event = TRUE for non voltage_dip/voltage_swell)
SELECT 
  'Events with false_event=TRUE to be set to FALSE' as description,
  event_type,
  COUNT(*) as events_to_update
FROM pq_events
WHERE false_event = TRUE
  AND event_type NOT IN ('voltage_dip', 'voltage_swell')
GROUP BY event_type
ORDER BY event_type;

-- Total events that will be updated
SELECT 
  'Total events to be updated' as description,
  COUNT(*) as total_updates
FROM pq_events
WHERE false_event = TRUE
  AND event_type NOT IN ('voltage_dip', 'voltage_swell');

-- Verify voltage_dip and voltage_swell will not be changed
SELECT 
  'Voltage dip/swell events (will NOT be changed)' as description,
  event_type,
  false_event,
  COUNT(*) as event_count
FROM pq_events
WHERE event_type IN ('voltage_dip', 'voltage_swell')
GROUP BY event_type, false_event
ORDER BY event_type, false_event;

-- ============================================================================
-- STEP 2: Backup (OPTIONAL - Uncomment if you want to keep a backup)
-- ============================================================================

-- Create backup table for events being updated
-- UNCOMMENT THE LINES BELOW IF YOU WANT TO CREATE A BACKUP:

/*
CREATE TABLE IF NOT EXISTS false_event_update_backup (
  backup_date TIMESTAMPTZ DEFAULT NOW(),
  event_id UUID,
  event_type TEXT,
  old_false_event BOOLEAN,
  new_false_event BOOLEAN,
  remarks TEXT
);

INSERT INTO false_event_update_backup (event_id, event_type, old_false_event, new_false_event, remarks)
SELECT 
  id,
  event_type,
  false_event as old_false_event,
  FALSE as new_false_event,
  remarks
FROM pq_events
WHERE false_event = TRUE
  AND event_type NOT IN ('voltage_dip', 'voltage_swell');

SELECT 
  'Backup created' as status,
  COUNT(*) as backed_up_records
FROM false_event_update_backup;
*/

-- ============================================================================
-- STEP 3: UPDATE False Event Status
-- ============================================================================

-- WARNING: This will modify existing data!
-- Review the counts above before proceeding.

-- Update false_event to FALSE for all non voltage_dip/voltage_swell events
WITH updated AS (
  UPDATE pq_events
  SET false_event = FALSE
  WHERE false_event = TRUE
    AND event_type NOT IN ('voltage_dip', 'voltage_swell')
  RETURNING id
)
SELECT 
  'Records updated' as description,
  COUNT(*) as updated_count
FROM updated;

-- ============================================================================
-- STEP 4: Verify Update Results
-- ============================================================================

-- Verify no non voltage_dip/voltage_swell events have false_event = TRUE
SELECT 
  'Verification: Non voltage_dip/swell events with false_event=TRUE' as description,
  COUNT(*) as invalid_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS - All non voltage_dip/swell events updated'
    ELSE '❌ ERROR - Some events still have false_event=TRUE'
  END as status
FROM pq_events
WHERE false_event = TRUE
  AND event_type NOT IN ('voltage_dip', 'voltage_swell');

-- Show current distribution after update
SELECT 
  'Events by type and false_event after update' as description,
  event_type,
  false_event,
  COUNT(*) as event_count
FROM pq_events
GROUP BY event_type, false_event
ORDER BY event_type, false_event;

-- Show voltage_dip and voltage_swell false event counts (should be unchanged)
SELECT 
  'Voltage dip/swell false events (should be unchanged)' as description,
  event_type,
  COUNT(*) as false_event_count
FROM pq_events
WHERE event_type IN ('voltage_dip', 'voltage_swell')
  AND false_event = TRUE
GROUP BY event_type;

-- ============================================================================
-- STEP 5: Add Database Constraint (OPTIONAL - Recommended for data integrity)
-- ============================================================================

-- This constraint prevents false_event = TRUE for non voltage_dip/voltage_swell events
-- UNCOMMENT THE LINES BELOW IF YOU WANT TO ADD THIS CONSTRAINT:

/*
ALTER TABLE pq_events
ADD CONSTRAINT check_false_event_voltage_only
CHECK (
  false_event = FALSE 
  OR 
  (false_event = TRUE AND event_type IN ('voltage_dip', 'voltage_swell'))
);

SELECT 
  '✅ Constraint added successfully' as status,
  'false_event can only be TRUE for voltage_dip and voltage_swell events' as description;
*/

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if backup was created)
-- ============================================================================

-- IF YOU CREATED A BACKUP AND NEED TO RESTORE:
/*
UPDATE pq_events pe
SET false_event = b.old_false_event
FROM false_event_update_backup b
WHERE pe.id = b.event_id;

SELECT 
  'Rollback complete' as status,
  COUNT(*) as restored_records
FROM false_event_update_backup;
*/

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

SELECT 
  '✅ Script execution complete' as status,
  NOW() as completed_at;
