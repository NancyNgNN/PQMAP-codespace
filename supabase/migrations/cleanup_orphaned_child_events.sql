/*
  # Cleanup Orphaned Child Events
  
  ## Purpose
  Delete child events without valid mother events to improve data quality and 
  stay within Supabase's 1000 record limit for better visualization performance.
  
  ## What This Script Does
  1. Creates a backup table with all events to be deleted
  2. Identifies and deletes orphaned child events in the following scenarios:
     - Option A: Child events where parent_event_id points to non-existent event
     - Option B: Child events where parent exists but is_mother_event = false
     - Data inconsistency: Events where is_child_event = true but parent_event_id IS NULL
     - Data inconsistency: Events where parent_event_id IS NOT NULL but is_child_event = false
  3. Related records in event_customer_impact are automatically deleted via CASCADE
  
  ## Safety Features
  - Creates backup table before deletion
  - Provides detailed statistics before and after
  - Uses transaction for rollback capability
  - Logs all deletion details
  
  ## Usage
  Run this script in Supabase SQL Editor. Review the statistics and backup table
  before committing if needed.
*/

-- ============================================================================
-- STEP 1: Create Backup Table
-- ============================================================================

-- Drop backup table if exists (from previous runs)
DROP TABLE IF EXISTS pq_events_orphaned_backup CASCADE;

-- Create backup table with all orphaned events to be deleted
CREATE TABLE pq_events_orphaned_backup AS
SELECT 
  e.*,
  -- Add metadata about why this event is being deleted
  CASE 
    WHEN e.parent_event_id IS NOT NULL 
         AND NOT EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id)
    THEN 'Option A: Parent event does not exist'
    
    WHEN e.parent_event_id IS NOT NULL 
         AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = false)
    THEN 'Option B: Parent exists but is not a mother event'
    
    WHEN e.is_child_event = true AND e.parent_event_id IS NULL
    THEN 'Data Inconsistency: is_child_event=true but parent_event_id IS NULL'
    
    WHEN e.parent_event_id IS NOT NULL AND e.is_child_event = false
    THEN 'Data Inconsistency: parent_event_id set but is_child_event=false'
    
    ELSE 'Unknown reason'
  END AS deletion_reason,
  now() AS backed_up_at
FROM pq_events e
WHERE 
  -- Option A: Parent event does not exist
  (e.parent_event_id IS NOT NULL 
   AND NOT EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id))
  
  OR
  
  -- Option B: Parent exists but is_mother_event = false
  (e.parent_event_id IS NOT NULL 
   AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = false))
  
  OR
  
  -- Data Inconsistency 1: is_child_event = true but parent_event_id IS NULL
  (e.is_child_event = true AND e.parent_event_id IS NULL)
  
  OR
  
  -- Data Inconsistency 2: parent_event_id IS NOT NULL but is_child_event = false
  (e.parent_event_id IS NOT NULL AND e.is_child_event = false);

-- Add comment to backup table
COMMENT ON TABLE pq_events_orphaned_backup IS 
  'Backup of orphaned child events. This table contains events that were removed because they had invalid parent references.';

-- ============================================================================
-- STEP 2: Display Statistics BEFORE Deletion
-- ============================================================================

DO $$
DECLARE
  v_total_events INTEGER;
  v_orphaned_option_a INTEGER;
  v_orphaned_option_b INTEGER;
  v_inconsistent_1 INTEGER;
  v_inconsistent_2 INTEGER;
  v_total_orphaned INTEGER;
  v_impact_records INTEGER;
  v_mother_events INTEGER;
  v_valid_child_events INTEGER;
BEGIN
  -- Count total events
  SELECT COUNT(*) INTO v_total_events FROM pq_events;
  
  -- Count mother events
  SELECT COUNT(*) INTO v_mother_events FROM pq_events WHERE is_mother_event = true;
  
  -- Count valid child events (with existing mother parent)
  SELECT COUNT(*) INTO v_valid_child_events 
  FROM pq_events e
  WHERE e.is_child_event = true 
    AND e.parent_event_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = true);
  
  -- Count Option A: Parent does not exist
  SELECT COUNT(*) INTO v_orphaned_option_a
  FROM pq_events e
  WHERE e.parent_event_id IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id);
  
  -- Count Option B: Parent exists but is not mother
  SELECT COUNT(*) INTO v_orphaned_option_b
  FROM pq_events e
  WHERE e.parent_event_id IS NOT NULL 
    AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = false);
  
  -- Count Inconsistency 1: is_child_event=true but parent_event_id IS NULL
  SELECT COUNT(*) INTO v_inconsistent_1
  FROM pq_events e
  WHERE e.is_child_event = true AND e.parent_event_id IS NULL;
  
  -- Count Inconsistency 2: parent_event_id set but is_child_event=false
  SELECT COUNT(*) INTO v_inconsistent_2
  FROM pq_events e
  WHERE e.parent_event_id IS NOT NULL AND e.is_child_event = false;
  
  -- Total orphaned (from backup table)
  SELECT COUNT(*) INTO v_total_orphaned FROM pq_events_orphaned_backup;
  
  -- Count related impact records that will be deleted
  SELECT COUNT(*) INTO v_impact_records
  FROM event_customer_impact
  WHERE event_id IN (SELECT id FROM pq_events_orphaned_backup);
  
  -- Display statistics
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'ORPHANED CHILD EVENTS CLEANUP - STATISTICS BEFORE DELETION';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Current Database State:';
  RAISE NOTICE '  Total PQ Events:                    %', v_total_events;
  RAISE NOTICE '  Mother Events (is_mother_event=true): %', v_mother_events;
  RAISE NOTICE '  Valid Child Events:                 %', v_valid_child_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Orphaned Child Events to Delete:';
  RAISE NOTICE '  Option A (parent does not exist):   %', v_orphaned_option_a;
  RAISE NOTICE '  Option B (parent not mother):       %', v_orphaned_option_b;
  RAISE NOTICE '  Inconsistency 1 (child without parent): %', v_inconsistent_1;
  RAISE NOTICE '  Inconsistency 2 (parent set but not child): %', v_inconsistent_2;
  RAISE NOTICE '  ------------------------------------------------';
  RAISE NOTICE '  TOTAL TO DELETE:                    %', v_total_orphaned;
  RAISE NOTICE '';
  RAISE NOTICE 'Related Records:';
  RAISE NOTICE '  event_customer_impact records:      %', v_impact_records;
  RAISE NOTICE '';
  RAISE NOTICE 'Backup Table Created:';
  RAISE NOTICE '  Table: pq_events_orphaned_backup';
  RAISE NOTICE '  Records backed up:                  %', v_total_orphaned;
  RAISE NOTICE '';
  RAISE NOTICE 'After deletion, remaining events:     %', v_total_events - v_total_orphaned;
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Backup Related event_customer_impact Records
-- ============================================================================

-- Create backup table for impact records
DROP TABLE IF EXISTS event_customer_impact_orphaned_backup CASCADE;

CREATE TABLE event_customer_impact_orphaned_backup AS
SELECT 
  i.*,
  now() AS backed_up_at
FROM event_customer_impact i
WHERE event_id IN (SELECT id FROM pq_events_orphaned_backup);

COMMENT ON TABLE event_customer_impact_orphaned_backup IS 
  'Backup of event_customer_impact records deleted along with orphaned events. Check backed_up_at column for deletion timestamp.';

-- ============================================================================
-- STEP 4: DELETE Orphaned Child Events
-- ============================================================================

-- Begin transaction for safety (can be rolled back if needed)
BEGIN;

-- Delete orphaned child events
-- CASCADE will automatically delete related event_customer_impact records
DELETE FROM pq_events
WHERE id IN (SELECT id FROM pq_events_orphaned_backup);

-- Get deletion count
DO $$
DECLARE
  v_deleted_count INTEGER;
  v_remaining_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_deleted_count FROM pq_events_orphaned_backup;
  SELECT COUNT(*) INTO v_remaining_events FROM pq_events;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'DELETION COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Events deleted:                       %', v_deleted_count;
  RAISE NOTICE 'Events remaining:                     %', v_remaining_events;
  RAISE NOTICE '';
  RAISE NOTICE 'Backup tables created:';
  RAISE NOTICE '  - pq_events_orphaned_backup';
  RAISE NOTICE '  - event_customer_impact_orphaned_backup';
  RAISE NOTICE '';
  RAISE NOTICE 'To review deleted events, query:';
  RAISE NOTICE '  SELECT * FROM pq_events_orphaned_backup ORDER BY deletion_reason;';
  RAISE NOTICE '';
  RAISE NOTICE 'To view deletion breakdown by reason:';
  RAISE NOTICE '  SELECT deletion_reason, COUNT(*) FROM pq_events_orphaned_backup GROUP BY deletion_reason;';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;

-- Commit transaction
COMMIT;

-- ============================================================================
-- STEP 5: Display Summary Statistics by Deletion Reason
-- ============================================================================

SELECT 
  deletion_reason,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pq_events_orphaned_backup), 2) as percentage
FROM pq_events_orphaned_backup
GROUP BY deletion_reason
ORDER BY count DESC;

-- ============================================================================
-- STEP 6: Sample of Deleted Events (First 10 by each reason)
-- ============================================================================

-- Show sample of deleted events
SELECT 
  deletion_reason,
  id,
  event_type,
  timestamp,
  meter_id,
  parent_event_id,
  is_mother_event,
  is_child_event,
  severity
FROM (
  SELECT 
    *,
    ROW_NUMBER() OVER (PARTITION BY deletion_reason ORDER BY timestamp DESC) as rn
  FROM pq_events_orphaned_backup
) sub
WHERE rn <= 10
ORDER BY deletion_reason, timestamp DESC;

-- ============================================================================
-- VERIFICATION QUERIES (Run these after deletion to verify data integrity)
-- ============================================================================

-- Query 1: Verify no orphaned children remain
-- Should return 0 rows
SELECT 
  'VERIFY: Orphaned children check' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✓ PASS' ELSE '✗ FAIL' END as status
FROM pq_events e
WHERE 
  (e.parent_event_id IS NOT NULL 
   AND NOT EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id))
  OR
  (e.parent_event_id IS NOT NULL 
   AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = false))
  OR
  (e.is_child_event = true AND e.parent_event_id IS NULL)
  OR
  (e.parent_event_id IS NOT NULL AND e.is_child_event = false);

-- Query 2: Count valid mother-child relationships
SELECT 
  'Valid mother events' as relationship_type,
  COUNT(*) as count
FROM pq_events
WHERE is_mother_event = true

UNION ALL

SELECT 
  'Valid child events' as relationship_type,
  COUNT(*) as count
FROM pq_events e
WHERE e.is_child_event = true 
  AND e.parent_event_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM pq_events p WHERE p.id = e.parent_event_id AND p.is_mother_event = true)

UNION ALL

SELECT 
  'Total events remaining' as relationship_type,
  COUNT(*) as count
FROM pq_events;

-- ============================================================================
-- CLEANUP INSTRUCTIONS
-- ============================================================================

/*
  WHAT TO DO NEXT:
  
  1. Review the backup tables:
     - pq_events_orphaned_backup
     - event_customer_impact_orphaned_backup
  
  2. If deletion was successful and data looks correct:
     - Keep backup tables for audit trail (recommended)
     - Or drop them if you're confident:
       DROP TABLE pq_events_orphaned_backup;
       DROP TABLE event_customer_impact_orphaned_backup;
  
  3. If you need to restore deleted events:
     INSERT INTO pq_events 
     SELECT id, event_type, substation_id, meter_id, timestamp, duration_ms,
            magnitude, severity, status, is_mother_event, parent_event_id,
            root_cause, affected_phases, waveform_data, created_at, resolved_at,
            is_child_event, grouping_type, grouped_at, voltage_level, circuit_id,
            customer_count, remaining_voltage, validated_by_adms, is_special_event,
            false_event, oc, remarks, idr_no, address, equipment_type,
            cause_group, cause, description, object_part_group, object_part_code,
            damage_group, damage_code, outage_type, weather, total_cmi,
            v1, v2, v3, sarfi_10, sarfi_20, sarfi_30, sarfi_40, sarfi_50,
            sarfi_60, sarfi_70, sarfi_80, sarfi_90
     FROM pq_events_orphaned_backup;
  
  4. Monitor application performance to confirm visualization improvements.
  
  5. Consider running this cleanup script periodically (e.g., monthly) to maintain
     data quality, or integrate it into your data maintenance procedures.
*/
