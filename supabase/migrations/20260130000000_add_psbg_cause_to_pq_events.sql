-- Add PSBG Cause field to pq_events table
-- Migration: 20260130000000_add_psbg_cause_to_pq_events.sql
-- Date: January 30, 2026
-- Purpose: Add PSBG cause field for power quality event root cause analysis

-- Create enum type for PSBG cause options
CREATE TYPE psbg_cause_type AS ENUM (
  'VEGETATION',
  'DAMAGED BY THIRD PARTY',
  'UNCONFIRMED',
  'ANIMALS, BIRDS, INSECTS'
);

-- Add psbg_cause column to pq_events table
ALTER TABLE pq_events
ADD COLUMN psbg_cause psbg_cause_type;

-- Add comment for documentation
COMMENT ON COLUMN pq_events.psbg_cause IS 'PSBG (Power System Business Group) cause classification for root cause analysis';

-- Create index for performance on psbg_cause queries
CREATE INDEX idx_pq_events_psbg_cause ON pq_events(psbg_cause);

-- Update RLS policies if needed (existing policies should cover this column)
-- No changes needed as existing policies allow access to all pq_events columns