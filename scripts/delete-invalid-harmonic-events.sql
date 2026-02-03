-- ============================================================================
-- Script: Delete Invalid Harmonic Events
-- Purpose: Remove harmonic events that are NOT at 11kV or 380V voltage levels
-- Reason: Only 11kV and 380V systems should have harmonic events in the system
-- Date: January 29, 2026
-- ============================================================================

-- IMPORTANT: Review the counts below before proceeding with deletion!

-- ============================================================================
-- STEP 1: Check Current Data (DO NOT DELETE - FOR REVIEW ONLY)
-- ============================================================================

-- Count total harmonic events by voltage level
SELECT 
  'Total harmonic events by voltage level' as description,
  m.voltage_level,
  COUNT(*) as event_count,
  CASE 
    WHEN m.voltage_level IN ('11kV', '380V') THEN '✅ KEEP'
    ELSE '❌ DELETE'
  END as action
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- Count harmonic events to be DELETED (not 11kV or 380V)
SELECT 
  'Harmonic events to be DELETED' as description,
  COUNT(*) as events_to_delete
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
  AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL);

-- Count harmonic events to be KEPT (11kV or 380V)
SELECT 
  'Harmonic events to be KEPT' as description,
  COUNT(*) as events_to_keep
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
  AND m.voltage_level IN ('11kV', '380V');

-- Check if harmonic_events table has related records
SELECT 
  'Related harmonic_events records to be deleted' as description,
  COUNT(*) as related_records
FROM harmonic_events he
WHERE EXISTS (
  SELECT 1 FROM pq_events pe
  LEFT JOIN pq_meters m ON pe.meter_id = m.id
  WHERE pe.id = he.pqevent_id
    AND pe.event_type = 'harmonic'
    AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL)
);

-- ============================================================================
-- STEP 2: Backup (OPTIONAL - Uncomment if you want to keep a backup)
-- ============================================================================

-- Create backup table for deleted harmonic events
-- UNCOMMENT THE LINES BELOW IF YOU WANT TO CREATE A BACKUP:

/*
CREATE TABLE IF NOT EXISTS deleted_harmonic_events_backup (
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  original_event JSONB
);

INSERT INTO deleted_harmonic_events_backup (original_event)
SELECT row_to_json(pe.*)::jsonb
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
  AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL);

SELECT 
  'Backup created' as status,
  COUNT(*) as backed_up_records
FROM deleted_harmonic_events_backup;
*/

-- ============================================================================
-- STEP 3: DELETE Invalid Harmonic Events
-- ============================================================================

-- WARNING: This will permanently delete data!
-- Review the counts above before proceeding.

-- Step 3A: Delete from harmonic_events table first (child table)
DELETE FROM harmonic_events he
USING pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE he.pqevent_id = pe.id
  AND pe.event_type = 'harmonic'
  AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL);

-- Get count of deleted harmonic_events records
SELECT 
  'Deleted from harmonic_events table' as description,
  COUNT(*) as deleted_count
FROM harmonic_events he
WHERE NOT EXISTS (
  SELECT 1 FROM pq_events pe 
  WHERE pe.id = he.pqevent_id
);

-- Step 3B: Delete from pq_events table (parent table)
-- First, get the IDs to delete using a CTE to avoid self-reference issues
WITH events_to_delete AS (
  SELECT pe.id
  FROM pq_events pe
  LEFT JOIN pq_meters m ON pe.meter_id = m.id
  WHERE pe.event_type = 'harmonic'
    AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL)
)
DELETE FROM pq_events
WHERE id IN (SELECT id FROM events_to_delete);

-- ============================================================================
-- STEP 4: Verify Deletion Results
-- ============================================================================

-- Count remaining harmonic events (should only be 11kV and 380V)
SELECT 
  'Remaining harmonic events by voltage level' as description,
  m.voltage_level,
  COUNT(*) as event_count
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
GROUP BY m.voltage_level
ORDER BY m.voltage_level;

-- Verify NO harmonic events exist at other voltage levels
SELECT 
  'Verification: Invalid harmonic events remaining' as description,
  COUNT(*) as invalid_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ SUCCESS - All invalid events deleted'
    ELSE '❌ ERROR - Some invalid events still exist'
  END as status
FROM pq_events pe
LEFT JOIN pq_meters m ON pe.meter_id = m.id
WHERE pe.event_type = 'harmonic'
  AND (m.voltage_level NOT IN ('11kV', '380V') OR m.voltage_level IS NULL);

-- Count total harmonic events remaining
SELECT 
  'Total harmonic events remaining' as description,
  COUNT(*) as total_harmonic_events
FROM pq_events
WHERE event_type = 'harmonic';

-- Count related harmonic_events records remaining
SELECT 
  'Related harmonic_events records remaining' as description,
  COUNT(*) as related_records
FROM harmonic_events;

-- ============================================================================
-- STEP 5: Clean Up Orphaned Records (if any)
-- ============================================================================

-- Check for orphaned harmonic_events records (should be none after deletion)
SELECT 
  'Orphaned harmonic_events records' as description,
  COUNT(*) as orphaned_count
FROM harmonic_events he
WHERE NOT EXISTS (
  SELECT 1 FROM pq_events pe
  WHERE pe.id = he.pqevent_id
);

-- Clean up orphaned records if any exist
DELETE FROM harmonic_events he
WHERE NOT EXISTS (
  SELECT 1 FROM pq_events pe
  WHERE pe.id = he.pqevent_id
);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if backup was created)
-- ============================================================================

-- IF YOU CREATED A BACKUP AND NEED TO RESTORE:
-- Run this query to see the backed up data:
-- SELECT * FROM deleted_harmonic_events_backup;

-- To restore (requires manual effort - contact DBA):
-- 1. Extract JSON data from backup table
-- 2. Use jsonb_populate_record() to convert back to table rows
-- 3. INSERT back into pq_events and harmonic_events tables

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

SELECT 
  '✅ Script execution complete' as status,
  NOW() as completed_at;
