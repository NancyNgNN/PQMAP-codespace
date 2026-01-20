/*
  # Add IDR (Incident Data Record) Fields to PQ Events
  
  ## Purpose
  Add new fields to support IDR functionality for detailed incident reporting
  and analysis in the Event Management system.
  
  ## New Fields Added to pq_events:
  - fault_type: Type of fault (free text)
  - weather_condition: Weather condition description (e.g., "Heavy Rain", "Typhoon")
  - responsible_oc: Responsible Operating Center (free text)
  - manual_create_idr: Flag indicating if IDR was manually created (Y/N)
  
  ## Substation Region Update:
  - Updates existing substation regions to standardized codes (WE/NR)
*/

-- ============================================================================
-- STEP 1: Add New Columns to pq_events Table
-- ============================================================================

ALTER TABLE pq_events
ADD COLUMN IF NOT EXISTS fault_type TEXT,
ADD COLUMN IF NOT EXISTS weather_condition TEXT,
ADD COLUMN IF NOT EXISTS responsible_oc TEXT,
ADD COLUMN IF NOT EXISTS manual_create_idr BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN pq_events.fault_type IS 'Type of fault (e.g., equipment failure, external factor)';
COMMENT ON COLUMN pq_events.weather_condition IS 'Weather condition description (e.g., Heavy Rain, Typhoon, Clear)';
COMMENT ON COLUMN pq_events.responsible_oc IS 'Responsible Operating Center for incident handling';
COMMENT ON COLUMN pq_events.manual_create_idr IS 'Flag indicating if IDR was manually created (true) or automatically generated (false)';

-- ============================================================================
-- STEP 2: Update Substation Regions to Standardized Codes (WE/NR)
-- ============================================================================

-- Update substations with random assignment of WE or NR
-- This uses a deterministic random based on substation ID to ensure consistency
UPDATE substations
SET region = CASE 
  WHEN (hashtext(id::text) % 2) = 0 THEN 'WE'
  ELSE 'NR'
END
WHERE region IS NULL OR region NOT IN ('WE', 'NR', 'CN');

-- If you want to preserve existing valid regions and only update invalid ones:
-- UPDATE substations
-- SET region = CASE 
--   WHEN (hashtext(id::text) % 2) = 0 THEN 'WE'
--   ELSE 'NR'
-- END
-- WHERE region NOT IN ('WE', 'NR', 'CN');

-- Add constraint to ensure region values are valid
ALTER TABLE substations
DROP CONSTRAINT IF EXISTS substations_region_check;

ALTER TABLE substations
ADD CONSTRAINT substations_region_check 
CHECK (region IN ('WE', 'NR', 'CN'));

COMMENT ON CONSTRAINT substations_region_check ON substations IS 
  'Valid region codes: WE (West), NR (North), CN (Central)';

-- ============================================================================
-- STEP 3: Create Indexes for Better Query Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pq_events_fault_type ON pq_events(fault_type);
CREATE INDEX IF NOT EXISTS idx_pq_events_manual_create_idr ON pq_events(manual_create_idr);
CREATE INDEX IF NOT EXISTS idx_substations_region ON substations(region);

-- ============================================================================
-- STEP 4: Display Statistics
-- ============================================================================

DO $$
DECLARE
  v_total_events INTEGER;
  v_total_substations INTEGER;
  v_we_count INTEGER;
  v_nr_count INTEGER;
  v_cn_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_events FROM pq_events;
  SELECT COUNT(*) INTO v_total_substations FROM substations;
  SELECT COUNT(*) INTO v_we_count FROM substations WHERE region = 'WE';
  SELECT COUNT(*) INTO v_nr_count FROM substations WHERE region = 'NR';
  SELECT COUNT(*) INTO v_cn_count FROM substations WHERE region = 'CN';
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'IDR FIELDS MIGRATION COMPLETED';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'New Columns Added to pq_events:';
  RAISE NOTICE '  - fault_type (TEXT)';
  RAISE NOTICE '  - weather_condition (TEXT)';
  RAISE NOTICE '  - responsible_oc (TEXT)';
  RAISE NOTICE '  - manual_create_idr (BOOLEAN, default: false)';
  RAISE NOTICE '';
  RAISE NOTICE 'Substation Region Distribution:';
  RAISE NOTICE '  Total Substations: %', v_total_substations;
  RAISE NOTICE '  WE (West):         %', v_we_count;
  RAISE NOTICE '  NR (North):        %', v_nr_count;
  RAISE NOTICE '  CN (Central):      %', v_cn_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Total Events:        %', v_total_events;
  RAISE NOTICE '';
  RAISE NOTICE 'All events now have IDR fields available.';
  RAISE NOTICE 'Region constraint applied: region IN (''WE'', ''NR'', ''CN'')';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify new columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'pq_events'
  AND column_name IN ('fault_type', 'weather_condition', 'responsible_oc', 'manual_create_idr')
ORDER BY column_name;

-- Verify substation regions
SELECT 
  region,
  COUNT(*) as substation_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM substations), 2) as percentage
FROM substations
GROUP BY region
ORDER BY region;

-- Sample of events with new fields (all should be null/false initially)
SELECT 
  id,
  idr_no,
  fault_type,
  weather_condition,
  responsible_oc,
  manual_create_idr
FROM pq_events
LIMIT 5;
