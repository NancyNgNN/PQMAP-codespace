-- Drop meter_type column from pq_meters table
-- This field is being replaced by load_type for electrical load classification
-- Migration: 20260102000001
-- Date: January 2, 2026

-- Drop the meter_type column
ALTER TABLE pq_meters
DROP COLUMN IF EXISTS meter_type;

-- Verify column has been dropped
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pq_meters'
  AND column_name = 'meter_type';

-- Expected: No rows returned (column should be gone)
