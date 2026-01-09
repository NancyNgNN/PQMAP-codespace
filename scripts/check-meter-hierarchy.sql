-- ============================================================================
-- Script: Check Meter Hierarchy Completeness
-- Created: January 9, 2026
-- Purpose: Identify meters with missing transformer codes
-- ============================================================================

-- ============================================================================
-- SECTION 1: Count meters by voltage level with missing transformer codes
-- ============================================================================

SELECT 
  voltage_level,
  COUNT(*) as total_meters,
  COUNT(*) FILTER (WHERE ss400 IS NULL OR ss400 = '') as missing_ss400,
  COUNT(*) FILTER (WHERE ss132 IS NULL OR ss132 = '') as missing_ss132,
  COUNT(*) FILTER (WHERE ss011 IS NULL OR ss011 = '') as missing_ss011,
  COUNT(*) FILTER (WHERE area IS NULL OR area = '') as missing_area
FROM pq_meters
GROUP BY voltage_level
ORDER BY 
  CASE voltage_level
    WHEN '400kV' THEN 1
    WHEN '132kV' THEN 2
    WHEN '11kV' THEN 3
    WHEN '380V' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- SECTION 2: List all orphan meters (no transformer codes at all)
-- ============================================================================

SELECT 
  id,
  meter_id,
  voltage_level,
  area,
  region,
  location,
  ss400,
  ss132,
  ss011,
  enable
FROM pq_meters
WHERE (ss400 IS NULL OR ss400 = '')
  AND (ss132 IS NULL OR ss132 = '')
  AND (ss011 IS NULL OR ss011 = '')
ORDER BY voltage_level, meter_id;

-- ============================================================================
-- SECTION 3: Check hierarchy violations by voltage level
-- ============================================================================

-- 400kV meters should have ONLY ss400
SELECT 
  'Violation: 400kV' as issue_type,
  meter_id,
  voltage_level,
  area,
  ss400,
  ss132,
  ss011
FROM pq_meters
WHERE voltage_level = '400kV'
  AND (ss400 IS NULL OR ss400 = '' OR ss132 IS NOT NULL OR ss011 IS NOT NULL)
ORDER BY meter_id;

-- 132kV meters should have ss400 AND ss132 (no ss011)
SELECT 
  'Violation: 132kV' as issue_type,
  meter_id,
  voltage_level,
  area,
  ss400,
  ss132,
  ss011
FROM pq_meters
WHERE voltage_level = '132kV'
  AND (ss400 IS NULL OR ss400 = '' OR ss132 IS NULL OR ss132 = '' OR ss011 IS NOT NULL)
ORDER BY meter_id;

-- 11kV meters should have ss132 AND ss011 (no ss400)
SELECT 
  'Violation: 11kV' as issue_type,
  meter_id,
  voltage_level,
  area,
  ss400,
  ss132,
  ss011
FROM pq_meters
WHERE voltage_level = '11kV'
  AND (ss132 IS NULL OR ss132 = '' OR ss011 IS NULL OR ss011 = '' OR ss400 IS NOT NULL)
ORDER BY meter_id;

-- 380V meters should have ONLY ss011
SELECT 
  'Violation: 380V' as issue_type,
  meter_id,
  voltage_level,
  area,
  ss400,
  ss132,
  ss011
FROM pq_meters
WHERE voltage_level = '380V'
  AND (ss011 IS NULL OR ss011 = '' OR ss400 IS NOT NULL OR ss132 IS NOT NULL)
ORDER BY meter_id;

-- ============================================================================
-- SECTION 4: Check for missing area codes
-- ============================================================================

SELECT 
  voltage_level,
  meter_id,
  area,
  location
FROM pq_meters
WHERE area IS NULL OR area = ''
ORDER BY voltage_level, meter_id;

-- ============================================================================
-- SECTION 5: Summary statistics
-- ============================================================================

SELECT 
  'Total Meters' as metric,
  COUNT(*) as count
FROM pq_meters
UNION ALL
SELECT 
  'Complete Hierarchy' as metric,
  COUNT(*) as count
FROM pq_meters
WHERE CASE 
  WHEN voltage_level = '400kV' THEN 
    ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NULL AND ss011 IS NULL
  WHEN voltage_level = '132kV' THEN 
    ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NULL
  WHEN voltage_level = '11kV' THEN 
    ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL
  WHEN voltage_level = '380V' THEN 
    ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL AND ss132 IS NULL
  ELSE FALSE
END
UNION ALL
SELECT 
  'Incomplete Hierarchy' as metric,
  COUNT(*) as count
FROM pq_meters
WHERE NOT CASE 
  WHEN voltage_level = '400kV' THEN 
    ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NULL AND ss011 IS NULL
  WHEN voltage_level = '132kV' THEN 
    ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NULL
  WHEN voltage_level = '11kV' THEN 
    ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL
  WHEN voltage_level = '380V' THEN 
    ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL AND ss132 IS NULL
  ELSE FALSE
END;
