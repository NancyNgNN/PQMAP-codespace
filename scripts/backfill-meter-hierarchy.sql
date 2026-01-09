-- ============================================================================
-- Script: Backfill Meter Hierarchy Transformer Codes
-- Created: January 9, 2026
-- Purpose: Auto-populate ss400, ss132, ss011 based on voltage level and area
-- ============================================================================

-- IMPORTANT: Review the changes in the dry run before executing updates!
-- Run the SELECT statements first, then uncomment UPDATE statements.

-- ============================================================================
-- STEP 1: Backup current state
-- ============================================================================

CREATE TABLE IF NOT EXISTS pq_meters_backup_hierarchy_20260109 AS 
SELECT * FROM pq_meters;

-- ============================================================================
-- STEP 2: Extract area from meter_id for meters missing area code
-- ============================================================================

-- DRY RUN: Preview area extraction
SELECT 
  id,
  meter_id,
  voltage_level,
  area as current_area,
  -- Extract 3-letter area code from meter_id (e.g., "APB" from "PQM-APB-187")
  CASE 
    WHEN area IS NULL OR area = '' THEN
      SUBSTRING(meter_id FROM '[A-Z]{3}')
    ELSE area
  END as new_area
FROM pq_meters
WHERE area IS NULL OR area = ''
ORDER BY meter_id;

-- EXECUTE: Update missing area codes
-- UPDATE pq_meters
-- SET area = SUBSTRING(meter_id FROM '[A-Z]{3}')
-- WHERE (area IS NULL OR area = '')
--   AND meter_id ~ '[A-Z]{3}';

-- ============================================================================
-- STEP 3: Backfill 400kV meters (ss400 only)
-- ============================================================================

-- DRY RUN: Preview 400kV updates
SELECT 
  id,
  meter_id,
  voltage_level,
  area,
  ss400 as current_ss400,
  CONCAT(area, '400') as new_ss400,
  ss132 as current_ss132,
  NULL as new_ss132,
  ss011 as current_ss011,
  NULL as new_ss011
FROM pq_meters
WHERE voltage_level = '400kV'
  AND area IS NOT NULL
  AND area != ''
ORDER BY meter_id;

-- EXECUTE: Update 400kV meters
-- UPDATE pq_meters
-- SET 
--   ss400 = CONCAT(area, '400'),
--   ss132 = NULL,
--   ss011 = NULL
-- WHERE voltage_level = '400kV'
--   AND area IS NOT NULL
--   AND area != '';

-- ============================================================================
-- STEP 4: Backfill 132kV meters (ss400 + ss132)
-- ============================================================================

-- DRY RUN: Preview 132kV updates
SELECT 
  id,
  meter_id,
  voltage_level,
  area,
  ss400 as current_ss400,
  NULL as new_ss400,
  ss132 as current_ss132,
  CONCAT(area, '132') as new_ss132,
  ss011 as current_ss011,
  NULL as new_ss011
FROM pq_meters
WHERE voltage_level = '132kV'
  AND area IS NOT NULL
  AND area != ''
ORDER BY meter_id;

-- EXECUTE: Update 132kV meters
-- UPDATE pq_meters
-- SET 
--   ss400 = NULL,
--   ss132 = CONCAT(area, '132'),
--   ss011 = NULL
-- WHERE voltage_level = '132kV'
--   AND area IS NOT NULL
--   AND area != '';

-- ============================================================================
-- STEP 5: Backfill 11kV meters (ss132 + ss011)
-- ============================================================================

-- DRY RUN: Preview 11kV updates
SELECT 
  id,
  meter_id,
  voltage_level,
  area,
  ss400 as current_ss400,
  NULL as new_ss400,
  ss132 as current_ss132,
  CONCAT(area, '132') as new_ss132,
  ss011 as current_ss011,
  CONCAT(area, '011') as new_ss011
FROM pq_meters
WHERE voltage_level = '11kV'
  AND area IS NOT NULL
  AND area != ''
ORDER BY meter_id;

-- EXECUTE: Update 11kV meters
-- UPDATE pq_meters
-- SET 
--   ss400 = NULL,
--   ss132 = CONCAT(area, '132'),
--   ss011 = CONCAT(area, '011')
-- WHERE voltage_level = '11kV'
--   AND area IS NOT NULL
--   AND area != '';

-- ============================================================================
-- STEP 6: Backfill 380V meters (ss011 only)
-- ============================================================================

-- DRY RUN: Preview 380V updates
SELECT 
  id,
  meter_id,
  voltage_level,
  area,
  ss400 as current_ss400,
  NULL as new_ss400,
  ss132 as current_ss132,
  NULL as new_ss132,
  ss011 as current_ss011,
  CONCAT(area, '011') as new_ss011
FROM pq_meters
WHERE voltage_level = '380V'
  AND area IS NOT NULL
  AND area != ''
ORDER BY meter_id;

-- EXECUTE: Update 380V meters
-- UPDATE pq_meters
-- SET 
--   ss400 = NULL,
--   ss132 = NULL,
--   ss011 = CONCAT(area, '011')
-- WHERE voltage_level = '380V'
--   AND area IS NOT NULL
--   AND area != '';

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

-- Check results by voltage level
SELECT 
  voltage_level,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE ss400 IS NOT NULL AND ss400 != '') as has_ss400,
  COUNT(*) FILTER (WHERE ss132 IS NOT NULL AND ss132 != '') as has_ss132,
  COUNT(*) FILTER (WHERE ss011 IS NOT NULL AND ss011 != '') as has_ss011,
  SUM(CASE 
    WHEN voltage_level = '400kV' AND ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NULL AND ss011 IS NULL THEN 1
    WHEN voltage_level = '132kV' AND ss132 IS NOT NULL AND ss132 != '' AND ss400 IS NULL AND ss011 IS NULL THEN 1
    WHEN voltage_level = '11kV' AND ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL THEN 1
    WHEN voltage_level = '380V' AND ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL AND ss132 IS NULL THEN 1
    ELSE 0
  END) as correct_hierarchy
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

-- Check sample results
SELECT 
  meter_id,
  voltage_level,
  area,
  ss400,
  ss132,
  ss011,
  CASE 
    WHEN voltage_level = '400kV' THEN 
      ss400 IS NOT NULL AND ss400 != '' AND ss132 IS NULL AND ss011 IS NULL
    WHEN voltage_level = '132kV' THEN 
      ss132 IS NOT NULL AND ss132 != '' AND ss400 IS NULL AND ss011 IS NULL
    WHEN voltage_level = '11kV' THEN 
      ss132 IS NOT NULL AND ss132 != '' AND ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL
    WHEN voltage_level = '380V' THEN 
      ss011 IS NOT NULL AND ss011 != '' AND ss400 IS NULL AND ss132 IS NULL
    ELSE FALSE
  END as hierarchy_valid
FROM pq_meters
ORDER BY voltage_level, meter_id
LIMIT 20;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- To rollback changes:
-- DELETE FROM pq_meters;
-- INSERT INTO pq_meters SELECT * FROM pq_meters_backup_hierarchy_20260109;
-- DROP TABLE pq_meters_backup_hierarchy_20260109;
