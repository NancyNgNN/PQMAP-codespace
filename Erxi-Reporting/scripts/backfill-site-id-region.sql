-- =====================================================
-- Backfill site_id and region in PQ Events
-- =====================================================
-- Date: December 22, 2025
-- Purpose: Populate site_id and region from pq_meters table
--          for existing events based on meter_id match
-- =====================================================

-- Update pq_events with site_id and region from pq_meters
-- Note: pq_events.meter_id is a UUID that references pq_meters.id (primary key)
UPDATE pq_events e
SET 
  site_id = m.site_id,
  region = m.region
FROM pq_meters m
WHERE e.meter_id = m.id
  AND e.meter_id IS NOT NULL;

-- Check results
DO $$
DECLARE
  total_events INTEGER;
  updated_events INTEGER;
  null_meter_events INTEGER;
BEGIN
  -- Get statistics
  SELECT COUNT(*) INTO total_events FROM pq_events;
  SELECT COUNT(*) INTO updated_events FROM pq_events WHERE site_id IS NOT NULL OR region IS NOT NULL;
  SELECT COUNT(*) INTO null_meter_events FROM pq_events WHERE meter_id IS NULL;

  -- Output results
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Backfill Results for site_id and region';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Total events: %', total_events;
  RAISE NOTICE 'Events updated with site_id/region: %', updated_events;
  RAISE NOTICE 'Events without meter_id: %', null_meter_events;
  RAISE NOTICE '=================================================';
END $$;

-- Verify sample data
SELECT 
  e.id,
  e.meter_id,
  e.site_id,
  e.region,
  m.site_id as meter_site_id,
  m.region as meter_region
FROM pq_events e
LEFT JOIN pq_meters m ON e.meter_id = m.id
LIMIT 10;
