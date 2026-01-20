-- =====================================================
-- Add site_id and region to PQ Events
-- =====================================================
-- Date: December 22, 2025
-- Purpose: Add site_id and region columns to pq_events table
--          to reference meter location information
-- =====================================================

-- Add new columns to pq_events table
ALTER TABLE pq_events
  ADD COLUMN IF NOT EXISTS site_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS region VARCHAR(100);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pq_events_site_id ON pq_events(site_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_region ON pq_events(region);

-- Add comment for documentation
COMMENT ON COLUMN pq_events.site_id IS 'Site ID reference from PQ meter';
COMMENT ON COLUMN pq_events.region IS 'Region reference from PQ meter';
