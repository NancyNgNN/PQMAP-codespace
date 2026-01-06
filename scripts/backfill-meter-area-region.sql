-- Backfill area and region fields for pq_meters table
-- This script updates NULL area and region values with random assignments
-- Created: 2026-01-06

-- Step 1: Create temporary function to get random area
CREATE OR REPLACE FUNCTION get_random_area() 
RETURNS TEXT AS $$
DECLARE
  areas TEXT[] := ARRAY['YUE', 'LME', 'TSE', 'TPE', 'CPK'];
BEGIN
  RETURN areas[floor(random() * array_length(areas, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create temporary function to get random region
CREATE OR REPLACE FUNCTION get_random_region() 
RETURNS TEXT AS $$
DECLARE
  regions TEXT[] := ARRAY['WE', 'NR', 'CN'];
BEGIN
  RETURN regions[floor(random() * array_length(regions, 1) + 1)];
END;
$$ LANGUAGE plpgsql;

-- Step 3: Update NULL area values with random assignments
UPDATE pq_meters
SET area = get_random_area()
WHERE area IS NULL OR area = '';

-- Step 4: Update NULL region values with random assignments
UPDATE pq_meters
SET region = get_random_region()
WHERE region IS NULL OR region = '';

-- Step 5: Verify the updates
SELECT 
  COUNT(*) as total_meters,
  COUNT(CASE WHEN area IS NOT NULL THEN 1 END) as meters_with_area,
  COUNT(CASE WHEN region IS NOT NULL THEN 1 END) as meters_with_region
FROM pq_meters;

-- Step 6: Show distribution
SELECT 
  'Area Distribution' as metric_type,
  area as value,
  COUNT(*) as count
FROM pq_meters
WHERE area IS NOT NULL
GROUP BY area
UNION ALL
SELECT 
  'Region Distribution' as metric_type,
  region as value,
  COUNT(*) as count
FROM pq_meters
WHERE region IS NOT NULL
GROUP BY region
ORDER BY metric_type, value;

-- Step 7: Clean up temporary functions
DROP FUNCTION IF EXISTS get_random_area();
DROP FUNCTION IF EXISTS get_random_region();

-- Completion message
DO $$
BEGIN
  RAISE NOTICE 'Backfill completed successfully!';
  RAISE NOTICE 'All pq_meters records now have area and region values.';
END $$;
