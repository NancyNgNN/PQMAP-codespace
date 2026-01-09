-- ============================================================================
-- Migration: Create harmonic_events table
-- Created: January 9, 2026
-- Purpose: Store harmonic-specific measurements (THD, TEHD, TOHD, TDD) for 3 current phases
-- ============================================================================

-- ============================================================================
-- STEP 1: Create harmonic_events table
-- ============================================================================

CREATE TABLE IF NOT EXISTS harmonic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pqevent_id uuid NOT NULL REFERENCES pq_events(id) ON DELETE CASCADE,
  
  -- Phase 1 (Current I1) Measurements
  I1_THD_10m numeric,
  I1_TEHD_10m numeric,
  I1_TOHD_10m numeric,
  I1_TDD_10m numeric,
  
  -- Phase 2 (Current I2) Measurements
  I2_THD_10m numeric,
  I2_TEHD_10m numeric,
  I2_TOHD_10m numeric,
  I2_TDD_10m numeric,
  
  -- Phase 3 (Current I3) Measurements
  I3_THD_10m numeric,
  I3_TEHD_10m numeric,
  I3_TOHD_10m numeric,
  I3_TDD_10m numeric,
  
  CONSTRAINT unique_pqevent_harmonic UNIQUE(pqevent_id)
);

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_harmonic_events_pqevent_id ON harmonic_events(pqevent_id);
CREATE INDEX IF NOT EXISTS idx_harmonic_events_thd_values ON harmonic_events(I1_THD_10m, I2_THD_10m, I3_THD_10m);

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE harmonic_events IS 'Harmonic distortion measurements for PQ events with event_type = harmonic';
COMMENT ON COLUMN harmonic_events.pqevent_id IS 'Reference to pq_events table (1:1 relationship)';
COMMENT ON COLUMN harmonic_events.I1_THD_10m IS 'Phase 1 Total Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I1_TEHD_10m IS 'Phase 1 Total Even Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I1_TOHD_10m IS 'Phase 1 Total Odd Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I1_TDD_10m IS 'Phase 1 Total Demand Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I2_THD_10m IS 'Phase 2 Total Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I2_TEHD_10m IS 'Phase 2 Total Even Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I2_TOHD_10m IS 'Phase 2 Total Odd Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I2_TDD_10m IS 'Phase 2 Total Demand Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I3_THD_10m IS 'Phase 3 Total Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I3_TEHD_10m IS 'Phase 3 Total Even Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I3_TOHD_10m IS 'Phase 3 Total Odd Harmonic Distortion (10-minute average)';
COMMENT ON COLUMN harmonic_events.I3_TDD_10m IS 'Phase 3 Total Demand Distortion (10-minute average)';

-- ============================================================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE harmonic_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for harmonic_events
CREATE POLICY "Authenticated users can view harmonic events"
  ON harmonic_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage harmonic events"
  ON harmonic_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- ============================================================================
-- STEP 5: Verification
-- ============================================================================

-- Verify table creation
SELECT 
  'harmonic_events table created successfully' as status,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'harmonic_events';

-- Verify indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'harmonic_events'
ORDER BY indexname;

-- Verify RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'harmonic_events'
ORDER BY policyname;

-- Display table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'harmonic_events'
ORDER BY ordinal_position;
