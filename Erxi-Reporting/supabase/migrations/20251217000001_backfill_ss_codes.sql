-- =====================================================
-- Backfill SS Codes for Existing Meters
-- =====================================================
-- Date: December 17, 2025
-- Purpose: Populate SS400/SS132/SS011 codes for existing records
--          based on substation_id and voltage_level
-- =====================================================

-- Update existing records to populate SS codes
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

-- Display results
SELECT 
  'Backfill completed!' as status,
  COUNT(*) FILTER (WHERE ss400 IS NOT NULL) as meters_with_ss400,
  COUNT(*) FILTER (WHERE ss132 IS NOT NULL) as meters_with_ss132,
  COUNT(*) FILTER (WHERE ss011 IS NOT NULL) as meters_with_ss011,
  COUNT(*) as total_meters_updated
FROM pq_meters
WHERE voltage_level IS NOT NULL;

-- Show sample of populated data
SELECT 
  m.meter_id,
  m.voltage_level,
  s.code as substation_code,
  m.area,
  m.ss400,
  m.ss132,
  m.ss011
FROM pq_meters m
LEFT JOIN substations s ON m.substation_id = s.id
WHERE m.voltage_level IS NOT NULL
ORDER BY m.voltage_level, s.code
LIMIT 20;
