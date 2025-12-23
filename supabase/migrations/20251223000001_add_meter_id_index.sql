-- ==================================================================
-- Migration: Add index on pq_events.meter_id for performance
-- ==================================================================
-- Purpose: Improve query performance for meter-specific event lookups
-- Date: 2025-12-23
-- Context: Asset Management meter detail modal Event History tab
-- ==================================================================

-- Create index on meter_id for faster event queries
CREATE INDEX IF NOT EXISTS idx_pq_events_meter_id 
  ON pq_events(meter_id);

-- Add comment for documentation
COMMENT ON INDEX idx_pq_events_meter_id IS 
  'Index for optimizing meter-specific event queries in Asset Management';

-- Verification query
DO $$
DECLARE
  v_index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'pq_events'
      AND indexname = 'idx_pq_events_meter_id'
  ) INTO v_index_exists;
  
  IF v_index_exists THEN
    RAISE NOTICE '✅ Index idx_pq_events_meter_id created successfully';
  ELSE
    RAISE WARNING '❌ Failed to create index idx_pq_events_meter_id';
  END IF;
END $$;
