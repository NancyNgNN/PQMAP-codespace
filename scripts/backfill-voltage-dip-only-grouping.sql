-- ==================================================================
-- Backfill Script: Enforce Voltage Dip Only Mother-Child Relationships
-- ==================================================================
-- Purpose: Clean up existing mother-child event relationships to ensure
--          only voltage_dip events can have parent-child relationships
--
-- Date: 2025-12-23
-- Author: System Migration
--
-- Rules:
-- 1. Only voltage_dip events can be mothers or children
-- 2. Non-voltage_dip mother events become standalone
-- 3. Non-voltage_dip child events become standalone
-- 4. Voltage_dip children of non-voltage_dip mothers become standalone mothers
-- ==================================================================

-- Create a temporary table to log changes
CREATE TEMP TABLE IF NOT EXISTS event_grouping_migration_log (
  event_id UUID,
  event_type TEXT,
  previous_is_mother_event BOOLEAN,
  previous_is_child_event BOOLEAN,
  previous_parent_event_id UUID,
  new_is_mother_event BOOLEAN,
  new_is_child_event BOOLEAN,
  new_parent_event_id UUID,
  change_reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

-- ==================================================================
-- STEP 1: Find and fix non-voltage_dip mother events
-- ==================================================================
DO $$
DECLARE
  v_record RECORD;
  v_child_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: Processing non-voltage_dip mother events';
  RAISE NOTICE '========================================';
  
  FOR v_record IN 
    SELECT id, event_type, is_mother_event, is_child_event, parent_event_id
    FROM pq_events
    WHERE is_mother_event = true 
      AND event_type != 'voltage_dip'
  LOOP
    -- Count how many children this mother has
    SELECT COUNT(*) INTO v_child_count
    FROM pq_events
    WHERE parent_event_id = v_record.id;
    
    RAISE NOTICE 'Found non-voltage_dip mother event: % (type: %, children: %)', 
      v_record.id, v_record.event_type, v_child_count;
    
    -- Log the change
    INSERT INTO event_grouping_migration_log 
      (event_id, event_type, previous_is_mother_event, previous_is_child_event, 
       previous_parent_event_id, new_is_mother_event, new_is_child_event, 
       new_parent_event_id, change_reason)
    VALUES 
      (v_record.id, v_record.event_type, v_record.is_mother_event, v_record.is_child_event,
       v_record.parent_event_id, false, false, NULL, 
       'Non-voltage_dip event cannot be a mother event');
    
    -- Update the mother event to be standalone
    UPDATE pq_events
    SET 
      is_mother_event = false,
      is_child_event = false,
      parent_event_id = NULL,
      grouping_type = NULL,
      grouped_at = NULL
    WHERE id = v_record.id;
    
    RAISE NOTICE '  → Converted to standalone event';
    
    -- Make all its children standalone (will be processed in next steps)
    UPDATE pq_events
    SET 
      parent_event_id = NULL,
      is_child_event = false
    WHERE parent_event_id = v_record.id;
    
    RAISE NOTICE '  → Released % children', v_child_count;
  END LOOP;
END $$;

-- ==================================================================
-- STEP 2: Find and fix non-voltage_dip child events
-- ==================================================================
DO $$
DECLARE
  v_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: Processing non-voltage_dip child events';
  RAISE NOTICE '========================================';
  
  FOR v_record IN 
    SELECT id, event_type, is_mother_event, is_child_event, parent_event_id
    FROM pq_events
    WHERE is_child_event = true 
      AND event_type != 'voltage_dip'
  LOOP
    RAISE NOTICE 'Found non-voltage_dip child event: % (type: %)', 
      v_record.id, v_record.event_type;
    
    -- Log the change
    INSERT INTO event_grouping_migration_log 
      (event_id, event_type, previous_is_mother_event, previous_is_child_event, 
       previous_parent_event_id, new_is_mother_event, new_is_child_event, 
       new_parent_event_id, change_reason)
    VALUES 
      (v_record.id, v_record.event_type, v_record.is_mother_event, v_record.is_child_event,
       v_record.parent_event_id, false, false, NULL, 
       'Non-voltage_dip event cannot be a child event');
    
    -- Update to standalone event
    UPDATE pq_events
    SET 
      is_mother_event = false,
      is_child_event = false,
      parent_event_id = NULL
    WHERE id = v_record.id;
    
    RAISE NOTICE '  → Converted to standalone event';
  END LOOP;
END $$;

-- ==================================================================
-- STEP 3: Find voltage_dip children whose parents are not voltage_dip
-- ==================================================================
DO $$
DECLARE
  v_record RECORD;
  v_parent_type TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: Processing voltage_dip children with non-voltage_dip parents';
  RAISE NOTICE '========================================';
  
  FOR v_record IN 
    SELECT c.id, c.event_type, c.is_mother_event, c.is_child_event, 
           c.parent_event_id, p.event_type as parent_event_type
    FROM pq_events c
    LEFT JOIN pq_events p ON c.parent_event_id = p.id
    WHERE c.is_child_event = true 
      AND c.event_type = 'voltage_dip'
      AND c.parent_event_id IS NOT NULL
      AND p.event_type != 'voltage_dip'
  LOOP
    RAISE NOTICE 'Found voltage_dip child with non-voltage_dip parent: % (parent type: %)', 
      v_record.id, v_record.parent_event_type;
    
    -- Log the change
    INSERT INTO event_grouping_migration_log 
      (event_id, event_type, previous_is_mother_event, previous_is_child_event, 
       previous_parent_event_id, new_is_mother_event, new_is_child_event, 
       new_parent_event_id, change_reason)
    VALUES 
      (v_record.id, v_record.event_type, v_record.is_mother_event, v_record.is_child_event,
       v_record.parent_event_id, true, false, NULL, 
       'Voltage_dip child promoted to mother after non-voltage_dip parent removed');
    
    -- Convert to mother event (potential mother for future grouping)
    UPDATE pq_events
    SET 
      is_mother_event = true,
      is_child_event = false,
      parent_event_id = NULL,
      grouping_type = NULL,
      grouped_at = NULL
    WHERE id = v_record.id;
    
    RAISE NOTICE '  → Promoted to mother event';
  END LOOP;
END $$;

-- ==================================================================
-- STEP 4: Check for orphaned children (parent_event_id points to non-existent event)
-- ==================================================================
DO $$
DECLARE
  v_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: Processing orphaned child events';
  RAISE NOTICE '========================================';
  
  FOR v_record IN 
    SELECT c.id, c.event_type, c.is_mother_event, c.is_child_event, c.parent_event_id
    FROM pq_events c
    LEFT JOIN pq_events p ON c.parent_event_id = p.id
    WHERE c.parent_event_id IS NOT NULL
      AND p.id IS NULL
  LOOP
    RAISE NOTICE 'Found orphaned child event: % (type: %, parent_id: %)', 
      v_record.id, v_record.event_type, v_record.parent_event_id;
    
    -- Log the change
    INSERT INTO event_grouping_migration_log 
      (event_id, event_type, previous_is_mother_event, previous_is_child_event, 
       previous_parent_event_id, new_is_mother_event, new_is_child_event, 
       new_parent_event_id, change_reason)
    VALUES 
      (v_record.id, v_record.event_type, v_record.is_mother_event, v_record.is_child_event,
       v_record.parent_event_id, 
       CASE WHEN v_record.event_type = 'voltage_dip' THEN true ELSE false END,
       false, NULL, 
       'Orphaned child - parent event does not exist');
    
    -- Fix based on event type
    IF v_record.event_type = 'voltage_dip' THEN
      UPDATE pq_events
      SET 
        is_mother_event = true,
        is_child_event = false,
        parent_event_id = NULL
      WHERE id = v_record.id;
      RAISE NOTICE '  → Promoted voltage_dip to mother event';
    ELSE
      UPDATE pq_events
      SET 
        is_mother_event = false,
        is_child_event = false,
        parent_event_id = NULL
      WHERE id = v_record.id;
      RAISE NOTICE '  → Converted to standalone event';
    END IF;
  END LOOP;
END $$;

-- ==================================================================
-- STEP 5: Verify mother events with no children
-- ==================================================================
DO $$
DECLARE
  v_record RECORD;
  v_child_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: Cleaning up mother events with no children';
  RAISE NOTICE '========================================';
  
  FOR v_record IN 
    SELECT id, event_type, is_mother_event
    FROM pq_events
    WHERE is_mother_event = true
  LOOP
    -- Count children
    SELECT COUNT(*) INTO v_child_count
    FROM pq_events
    WHERE parent_event_id = v_record.id;
    
    IF v_child_count = 0 THEN
      RAISE NOTICE 'Found mother event with no children: % (type: %)', 
        v_record.id, v_record.event_type;
      
      -- Log the change
      INSERT INTO event_grouping_migration_log 
        (event_id, event_type, previous_is_mother_event, previous_is_child_event, 
         previous_parent_event_id, new_is_mother_event, new_is_child_event, 
         new_parent_event_id, change_reason)
      VALUES 
        (v_record.id, v_record.event_type, true, false, NULL, 
         CASE WHEN v_record.event_type = 'voltage_dip' THEN true ELSE false END,
         false, NULL, 
         'Mother event has no children');
      
      -- Keep voltage_dip as potential mother, remove mother status from others
      IF v_record.event_type != 'voltage_dip' THEN
        UPDATE pq_events
        SET 
          is_mother_event = false,
          grouping_type = NULL,
          grouped_at = NULL
        WHERE id = v_record.id;
        RAISE NOTICE '  → Removed mother status from non-voltage_dip event';
      END IF;
    END IF;
  END LOOP;
END $$;

-- ==================================================================
-- STEP 6: Display Migration Summary
-- ==================================================================
DO $$
DECLARE
  v_total_changes INTEGER;
  v_mothers_removed INTEGER;
  v_children_removed INTEGER;
  v_voltage_dip_promoted INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION SUMMARY';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO v_total_changes FROM event_grouping_migration_log;
  
  SELECT COUNT(*) INTO v_mothers_removed 
  FROM event_grouping_migration_log 
  WHERE previous_is_mother_event = true AND new_is_mother_event = false;
  
  SELECT COUNT(*) INTO v_children_removed 
  FROM event_grouping_migration_log 
  WHERE previous_is_child_event = true AND new_is_child_event = false;
  
  SELECT COUNT(*) INTO v_voltage_dip_promoted 
  FROM event_grouping_migration_log 
  WHERE event_type = 'voltage_dip' 
    AND previous_is_mother_event = false 
    AND new_is_mother_event = true;
  
  RAISE NOTICE 'Total events modified: %', v_total_changes;
  RAISE NOTICE 'Mother status removed: %', v_mothers_removed;
  RAISE NOTICE 'Child status removed: %', v_children_removed;
  RAISE NOTICE 'Voltage_dip events promoted to mothers: %', v_voltage_dip_promoted;
  RAISE NOTICE '';
  RAISE NOTICE 'Detailed log saved in event_grouping_migration_log table';
  RAISE NOTICE '========================================';
END $$;

-- ==================================================================
-- Query to review the migration log
-- ==================================================================
-- Uncomment to view the full migration log:
-- SELECT * FROM event_grouping_migration_log ORDER BY changed_at;

-- Query to view summary by change reason:
SELECT 
  change_reason,
  COUNT(*) as event_count,
  STRING_AGG(DISTINCT event_type, ', ') as event_types
FROM event_grouping_migration_log
GROUP BY change_reason
ORDER BY event_count DESC;

-- ==================================================================
-- Validation Queries
-- ==================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VALIDATION CHECKS';
  RAISE NOTICE '========================================';
END $$;

-- Check for non-voltage_dip mother events (should be 0)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pq_events
  WHERE is_mother_event = true AND event_type != 'voltage_dip';
  
  RAISE NOTICE 'Non-voltage_dip mother events remaining: %', v_count;
  IF v_count > 0 THEN
    RAISE WARNING 'ERROR: Still have non-voltage_dip mother events!';
  END IF;
END $$;

-- Check for non-voltage_dip child events (should be 0)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pq_events
  WHERE is_child_event = true AND event_type != 'voltage_dip';
  
  RAISE NOTICE 'Non-voltage_dip child events remaining: %', v_count;
  IF v_count > 0 THEN
    RAISE WARNING 'ERROR: Still have non-voltage_dip child events!';
  END IF;
END $$;

-- Check for orphaned children (should be 0)
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pq_events c
  LEFT JOIN pq_events p ON c.parent_event_id = p.id
  WHERE c.parent_event_id IS NOT NULL AND p.id IS NULL;
  
  RAISE NOTICE 'Orphaned child events remaining: %', v_count;
  IF v_count > 0 THEN
    RAISE WARNING 'ERROR: Still have orphaned child events!';
  END IF;
END $$;

-- Display current grouping statistics
DO $$
DECLARE
  v_mother_count INTEGER;
  v_child_count INTEGER;
  v_voltage_dip_mothers INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_mother_count FROM pq_events WHERE is_mother_event = true;
  SELECT COUNT(*) INTO v_child_count FROM pq_events WHERE is_child_event = true;
  SELECT COUNT(*) INTO v_voltage_dip_mothers 
  FROM pq_events 
  WHERE is_mother_event = true AND event_type = 'voltage_dip';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current Grouping Statistics:';
  RAISE NOTICE '  Total mother events: %', v_mother_count;
  RAISE NOTICE '  Total child events: %', v_child_count;
  RAISE NOTICE '  Voltage_dip mothers: % (should equal total mothers)', v_voltage_dip_mothers;
  RAISE NOTICE '========================================';
END $$;

-- ==================================================================
-- OPTIONAL: Save the migration log to a permanent table
-- ==================================================================
-- Uncomment if you want to keep a permanent record:
-- 
-- CREATE TABLE IF NOT EXISTS event_grouping_migration_archive (
--   id SERIAL PRIMARY KEY,
--   event_id UUID,
--   event_type TEXT,
--   previous_is_mother_event BOOLEAN,
--   previous_is_child_event BOOLEAN,
--   previous_parent_event_id UUID,
--   new_is_mother_event BOOLEAN,
--   new_is_child_event BOOLEAN,
--   new_parent_event_id UUID,
--   change_reason TEXT,
--   changed_at TIMESTAMP
-- );
-- 
-- INSERT INTO event_grouping_migration_archive 
-- SELECT 
--   nextval('event_grouping_migration_archive_id_seq'),
--   event_id,
--   event_type,
--   previous_is_mother_event,
--   previous_is_child_event,
--   previous_parent_event_id,
--   new_is_mother_event,
--   new_is_child_event,
--   new_parent_event_id,
--   change_reason,
--   changed_at
-- FROM event_grouping_migration_log;
-- 
-- RAISE NOTICE 'Migration log archived to event_grouping_migration_archive table';
