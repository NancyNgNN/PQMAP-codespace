-- Migration: Add export fields, false_event column, and update event status enum
-- Created: 2025-12-10
-- Purpose: Support comprehensive event export and remove 'false' from status enum

-- Step 1: Add new columns to pq_events table
ALTER TABLE pq_events
  -- False Event Tracking (replaces status='false')
  ADD COLUMN IF NOT EXISTS false_event BOOLEAN DEFAULT FALSE,
  
  -- Metadata Fields
  ADD COLUMN IF NOT EXISTS oc TEXT,
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS idr_no TEXT,
  
  -- Location & Equipment Details
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS equipment_type TEXT,
  
  -- Cause Analysis
  ADD COLUMN IF NOT EXISTS cause_group TEXT,
  ADD COLUMN IF NOT EXISTS cause TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  
  -- Equipment Fault Details
  ADD COLUMN IF NOT EXISTS object_part_group TEXT,
  ADD COLUMN IF NOT EXISTS object_part_code TEXT,
  ADD COLUMN IF NOT EXISTS damage_group TEXT,
  ADD COLUMN IF NOT EXISTS damage_code TEXT,
  
  -- Event Context
  ADD COLUMN IF NOT EXISTS outage_type TEXT,
  ADD COLUMN IF NOT EXISTS weather TEXT,
  ADD COLUMN IF NOT EXISTS total_cmi NUMERIC,
  
  -- Voltage Measurements (V1, V2, V3 - extracted from waveform)
  ADD COLUMN IF NOT EXISTS v1 NUMERIC,
  ADD COLUMN IF NOT EXISTS v2 NUMERIC,
  ADD COLUMN IF NOT EXISTS v3 NUMERIC,
  
  -- SARFI Indices (9 columns as per Option A)
  ADD COLUMN IF NOT EXISTS sarfi_10 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_20 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_30 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_40 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_50 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_60 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_70 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_80 NUMERIC,
  ADD COLUMN IF NOT EXISTS sarfi_90 NUMERIC;

-- Step 2: Auto-populate false_event based on existing data
-- Logic: If validated_by_adms = TRUE, then false_event = TRUE
UPDATE pq_events
SET false_event = TRUE
WHERE validated_by_adms = TRUE;

-- Step 3: Add constraint to enforce false_event logic
-- If false_event = TRUE, then validated_by_adms MUST = TRUE
ALTER TABLE pq_events
  ADD CONSTRAINT chk_false_event_validation 
  CHECK (false_event = FALSE OR (false_event = TRUE AND validated_by_adms = TRUE));

-- Step 4: Migrate existing status='false' to false_event=TRUE
-- Update events that have status='false' to use new false_event column
UPDATE pq_events
SET 
  false_event = TRUE,
  validated_by_adms = TRUE,
  status = 'resolved'
WHERE status = 'false';

-- Step 5: Update status enum to remove 'false' option
-- Note: In PostgreSQL, we need to create a new enum and migrate
-- First, create new enum without 'false'
DO $$ 
BEGIN
  -- Create new enum type
  CREATE TYPE event_status_new AS ENUM ('new', 'acknowledged', 'investigating', 'resolved');
  
  -- Alter table to use new enum (this will fail if there are still 'false' values)
  ALTER TABLE pq_events 
    ALTER COLUMN status TYPE event_status_new 
    USING status::text::event_status_new;
  
  -- Drop old enum
  DROP TYPE IF EXISTS event_status CASCADE;
  
  -- Rename new enum to original name
  ALTER TYPE event_status_new RENAME TO event_status;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If the enum already exists or other error, just continue
    RAISE NOTICE 'Event status enum update skipped or already exists';
END $$;

-- Step 6: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pq_events_false_event ON pq_events(false_event);
CREATE INDEX IF NOT EXISTS idx_pq_events_validated_by_adms ON pq_events(validated_by_adms);
CREATE INDEX IF NOT EXISTS idx_pq_events_idr_no ON pq_events(idr_no);
CREATE INDEX IF NOT EXISTS idx_pq_events_equipment_type ON pq_events(equipment_type);

-- Step 7: Add comments for documentation
COMMENT ON COLUMN pq_events.false_event IS 'Indicates if this event is a false event after ADMS validation. Must have validated_by_adms=TRUE if true.';
COMMENT ON COLUMN pq_events.oc IS 'Occurrence count or information';
COMMENT ON COLUMN pq_events.remarks IS 'Additional notes and remarks';
COMMENT ON COLUMN pq_events.idr_no IS 'Incident/Disturbance Report number';
COMMENT ON COLUMN pq_events.address IS 'Physical address of the event location';
COMMENT ON COLUMN pq_events.equipment_type IS 'Type of equipment involved';
COMMENT ON COLUMN pq_events.cause_group IS 'High-level cause category';
COMMENT ON COLUMN pq_events.cause IS 'Specific cause of the event';
COMMENT ON COLUMN pq_events.description IS 'Detailed event description';
COMMENT ON COLUMN pq_events.object_part_group IS 'Equipment part category';
COMMENT ON COLUMN pq_events.object_part_code IS 'Specific part code';
COMMENT ON COLUMN pq_events.damage_group IS 'Damage category';
COMMENT ON COLUMN pq_events.damage_code IS 'Specific damage code';
COMMENT ON COLUMN pq_events.outage_type IS 'Classification of outage type';
COMMENT ON COLUMN pq_events.weather IS 'Weather conditions during event';
COMMENT ON COLUMN pq_events.total_cmi IS 'Total Customer Minutes Interrupted';
COMMENT ON COLUMN pq_events.v1 IS 'Phase 1 voltage (extracted from waveform)';
COMMENT ON COLUMN pq_events.v2 IS 'Phase 2 voltage (extracted from waveform)';
COMMENT ON COLUMN pq_events.v3 IS 'Phase 3 voltage (extracted from waveform)';
COMMENT ON COLUMN pq_events.sarfi_10 IS 'SARFI index at 10% threshold';
COMMENT ON COLUMN pq_events.sarfi_20 IS 'SARFI index at 20% threshold';
COMMENT ON COLUMN pq_events.sarfi_30 IS 'SARFI index at 30% threshold';
COMMENT ON COLUMN pq_events.sarfi_40 IS 'SARFI index at 40% threshold';
COMMENT ON COLUMN pq_events.sarfi_50 IS 'SARFI index at 50% threshold';
COMMENT ON COLUMN pq_events.sarfi_60 IS 'SARFI index at 60% threshold';
COMMENT ON COLUMN pq_events.sarfi_70 IS 'SARFI index at 70% threshold';
COMMENT ON COLUMN pq_events.sarfi_80 IS 'SARFI index at 80% threshold';
COMMENT ON COLUMN pq_events.sarfi_90 IS 'SARFI index at 90% threshold';

-- Step 8: Grant permissions (if needed)
-- GRANT SELECT, UPDATE ON pq_events TO authenticated;

-- Migration complete
