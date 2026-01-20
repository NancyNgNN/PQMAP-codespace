-- =====================================================
-- Update PQ Meters: Voltage Level, Site ID, and SS Codes
-- =====================================================
-- Date: December 17, 2025
-- Purpose: 
--   1. Randomize voltage_level for meters with NULL values
--   2. Extract site_id from meter_id (last digits)
--   3. Backfill SS400/SS132/SS011 codes based on voltage_level
-- =====================================================

-- =====================================================
-- STEP 1: Randomize Voltage Level for NULL values
-- =====================================================
UPDATE pq_meters
SET voltage_level = CASE floor(random() * 4)
  WHEN 0 THEN '400kV'
  WHEN 1 THEN '132kV'
  WHEN 2 THEN '11kV'
  ELSE '380V'
END
WHERE voltage_level IS NULL;

-- Display voltage level randomization results
SELECT 
  'Step 1: Voltage level randomization completed!' as status,
  COUNT(*) FILTER (WHERE voltage_level = '400kV') as meters_400kv,
  COUNT(*) FILTER (WHERE voltage_level = '132kV') as meters_132kv,
  COUNT(*) FILTER (WHERE voltage_level = '11kV') as meters_11kv,
  COUNT(*) FILTER (WHERE voltage_level = '380V') as meters_380v,
  COUNT(*) as total_meters
FROM pq_meters;

-- =====================================================
-- STEP 2: Extract Site ID from Meter ID (last digits)
-- =====================================================
UPDATE pq_meters
SET site_id = (
  SELECT SUBSTRING(meter_id FROM '(\d+)$')
)
WHERE meter_id IS NOT NULL;

-- Display site_id extraction results
SELECT 
  'Step 2: Site ID extraction completed!' as status,
  COUNT(*) FILTER (WHERE site_id IS NOT NULL AND site_id != '') as meters_with_site_id,
  COUNT(*) FILTER (WHERE site_id IS NULL OR site_id = '') as meters_without_site_id,
  COUNT(*) as total_meters
FROM pq_meters;

-- Show sample of site_id extraction
SELECT 
  meter_id,
  site_id,
  voltage_level
FROM pq_meters
WHERE meter_id IS NOT NULL
ORDER BY meter_id
LIMIT 10;

-- =====================================================
-- STEP 3: Backfill SS Codes based on Voltage Level
-- =====================================================
UPDATE pq_meters m
SET 
  ss400 = CASE 
    WHEN m.voltage_level = '400kV' THEN s.code || '400'
    ELSE NULL
  END,
  ss132 = CASE 
    WHEN m.voltage_level IN ('132kV', '11kV') THEN s.code || '132'
    ELSE NULL
  END,
  ss011 = CASE 
    WHEN m.voltage_level = '11kV' THEN s.code || '011'
    ELSE NULL
  END
FROM substations s
WHERE m.substation_id = s.id
  AND m.voltage_level IS NOT NULL;

-- Display SS codes backfill results
SELECT 
  'Step 3: SS codes backfill completed!' as status,
  COUNT(*) FILTER (WHERE ss400 IS NOT NULL) as meters_with_ss400,
  COUNT(*) FILTER (WHERE ss132 IS NOT NULL) as meters_with_ss132,
  COUNT(*) FILTER (WHERE ss011 IS NOT NULL) as meters_with_ss011,
  COUNT(*) as total_meters_updated
FROM pq_meters
WHERE voltage_level IS NOT NULL;

-- =====================================================
-- FINAL SUMMARY: Show sample of all updates
-- =====================================================
SELECT 
  m.meter_id,
  m.site_id,
  m.voltage_level,
  s.code as substation_code,
  m.area,
  m.ss400,
  m.ss132,
  m.ss011
FROM pq_meters m
LEFT JOIN substations s ON m.substation_id = s.id
ORDER BY m.voltage_level, m.meter_id
LIMIT 30;

-- Display final summary
SELECT 
  '=== ALL UPDATES COMPLETED SUCCESSFULLY ===' as summary,
  (SELECT COUNT(*) FROM pq_meters WHERE voltage_level IS NOT NULL) as total_meters_with_voltage,
  (SELECT COUNT(*) FROM pq_meters WHERE site_id IS NOT NULL AND site_id != '') as total_meters_with_site_id,
  (SELECT COUNT(*) FROM pq_meters WHERE ss400 IS NOT NULL OR ss132 IS NOT NULL OR ss011 IS NOT NULL) as total_meters_with_ss_codes;
