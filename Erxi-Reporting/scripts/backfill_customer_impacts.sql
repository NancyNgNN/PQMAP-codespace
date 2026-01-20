-- =====================================================
-- Backfill Customer Impacts for Historical Events
-- =====================================================
-- Purpose: Generate customer impacts for all existing events
--          based on customer_transformer_matching
-- Date: December 15, 2025
-- =====================================================
-- NOTE: Run this AFTER creating customer_transformer_matching mappings
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_total_events INTEGER;
  v_events_with_circuit INTEGER;
  v_total_impacts INTEGER;
  v_event RECORD;
  v_impacts INTEGER;
BEGIN
  RAISE NOTICE '=== BACKFILL CUSTOMER IMPACTS - STARTED ===';
  RAISE NOTICE 'Timestamp: %', now();
  RAISE NOTICE '';
  
  -- Count total events
  SELECT COUNT(*) INTO v_total_events FROM pq_events;
  RAISE NOTICE 'Total events in database: %', v_total_events;
  
  -- Count events with substation and circuit
  SELECT COUNT(*) INTO v_events_with_circuit 
  FROM pq_events 
  WHERE substation_id IS NOT NULL 
  AND circuit_id IS NOT NULL;
  RAISE NOTICE 'Events with substation + circuit: %', v_events_with_circuit;
  RAISE NOTICE '';
  
  -- Check if we have any mappings
  SELECT COUNT(*) INTO v_impacts FROM customer_transformer_matching WHERE active = true;
  IF v_impacts = 0 THEN
    RAISE NOTICE 'WARNING: No active customer_transformer_matching records found!';
    RAISE NOTICE 'Please create mappings first before running this backfill script.';
    RAISE NOTICE '';
    RAISE NOTICE '=== BACKFILL ABORTED ===';
    RETURN;
  END IF;
  RAISE NOTICE 'Active customer mappings found: %', v_impacts;
  RAISE NOTICE 'Starting backfill process...';
  RAISE NOTICE '';
  
  -- Initialize counter
  v_total_impacts := 0;
  
  -- Loop through all events with substation and circuit
  FOR v_event IN 
    SELECT id, substation_id, circuit_id, timestamp
    FROM pq_events 
    WHERE substation_id IS NOT NULL 
    AND circuit_id IS NOT NULL
    ORDER BY timestamp ASC
  LOOP
    -- Generate impacts for this event
    v_impacts := generate_customer_impacts_for_event(v_event.id);
    v_total_impacts := v_total_impacts + v_impacts;
    
    -- Progress logging (every 100 events)
    IF (v_total_impacts > 0) AND (v_total_impacts % 100) = 0 THEN
      RAISE NOTICE 'Progress: % customer impacts generated so far...', v_total_impacts;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== BACKFILL COMPLETE ===';
  RAISE NOTICE 'Total customer impacts generated: %', v_total_impacts;
  RAISE NOTICE 'Average impacts per event: %', 
    CASE WHEN v_events_with_circuit > 0 
    THEN ROUND(v_total_impacts::NUMERIC / v_events_with_circuit, 2)
    ELSE 0 END;
END $$;

-- Show summary statistics
SELECT 
  'Backfill Summary' as report,
  COUNT(DISTINCT event_id) as events_with_impacts,
  COUNT(*) as total_customer_impacts,
  COUNT(DISTINCT customer_id) as unique_customers_affected
FROM event_customer_impact;

-- Show impacts by severity
SELECT 
  'Impact Level Distribution' as report,
  impact_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM event_customer_impact
GROUP BY impact_level
ORDER BY count DESC;

-- Show average downtime
SELECT 
  'Downtime Statistics' as report,
  ROUND(AVG(estimated_downtime_min), 2) as avg_downtime_min,
  ROUND(MIN(estimated_downtime_min), 2) as min_downtime_min,
  ROUND(MAX(estimated_downtime_min), 2) as max_downtime_min,
  COUNT(*) FILTER (WHERE estimated_downtime_min IS NOT NULL) as with_downtime_count
FROM event_customer_impact;

COMMIT;
