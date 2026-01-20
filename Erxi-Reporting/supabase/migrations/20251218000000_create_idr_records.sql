-- Migration: Create IDR Records Table
-- Created: 2025-12-18
-- Purpose: Store Incident Data Records separately from pq_events with 1:1 relationship

-- ============================================================================
-- STEP 1: Create idr_records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS idr_records (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key (REQUIRED - 1:1 relationship with pq_events)
  event_id uuid NOT NULL UNIQUE REFERENCES pq_events(id) ON DELETE CASCADE,
  
  -- Basic Information (copied from pq_events or user input)
  idr_no TEXT,
  status TEXT,
  voltage_level TEXT,
  duration_ms INTEGER,
  
  -- Location & Equipment
  address TEXT,
  equipment_type TEXT,
  
  -- Voltage Measurements
  v1 DECIMAL(10, 2),
  v2 DECIMAL(10, 2),
  v3 DECIMAL(10, 2),
  
  -- Fault Details
  fault_type TEXT,
  
  -- Cause Analysis (REQUIRED fields for CSV import)
  cause_group TEXT,
  cause TEXT NOT NULL, -- REQUIRED for CSV
  remarks TEXT,
  object_part_group TEXT,
  object_part_code TEXT,
  damage_group TEXT,
  damage_code TEXT,
  
  -- Environment & Operations
  outage_type TEXT,
  weather TEXT,
  weather_condition TEXT,
  responsible_oc TEXT,
  total_cmi DECIMAL(10, 2),
  
  -- CSV-specific fields (optional in CSV upload)
  equipment_affected TEXT, -- Equipment details from CSV
  restoration_actions TEXT, -- Restoration steps from CSV
  notes TEXT, -- Additional notes from CSV
  
  -- Metadata
  uploaded_by uuid REFERENCES profiles(id),
  upload_source TEXT DEFAULT 'manual_entry', -- 'csv_import' or 'manual_entry'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- STEP 2: Create Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_idr_records_event_id ON idr_records(event_id);
CREATE INDEX IF NOT EXISTS idx_idr_records_uploaded_by ON idr_records(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_idr_records_created_at ON idr_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_idr_records_upload_source ON idr_records(upload_source);

-- ============================================================================
-- STEP 3: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE idr_records IS 'Incident Data Records (IDR) for detailed event documentation with 1:1 relationship to pq_events';
COMMENT ON COLUMN idr_records.event_id IS 'Links to pq_events table (REQUIRED, UNIQUE - 1:1 relationship)';
COMMENT ON COLUMN idr_records.cause IS 'Root cause of the incident (REQUIRED field)';
COMMENT ON COLUMN idr_records.duration_ms IS 'Event duration in milliseconds';
COMMENT ON COLUMN idr_records.equipment_affected IS 'Equipment affected (from CSV or manual entry)';
COMMENT ON COLUMN idr_records.restoration_actions IS 'Actions taken to restore service (from CSV or manual entry)';
COMMENT ON COLUMN idr_records.notes IS 'Additional notes and comments (from CSV or manual entry)';
COMMENT ON COLUMN idr_records.upload_source IS 'Source of IDR data: csv_import or manual_entry';

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE idr_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all IDR records
CREATE POLICY "Users can view all IDR records"
  ON idr_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can insert IDR records
CREATE POLICY "Users can insert IDR records"
  ON idr_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Users can update IDR records
CREATE POLICY "Users can update IDR records"
  ON idr_records
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Users can delete IDR records
CREATE POLICY "Users can delete IDR records"
  ON idr_records
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 5: Create Updated_At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_idr_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_idr_records_updated_at
  BEFORE UPDATE ON idr_records
  FOR EACH ROW
  EXECUTE FUNCTION update_idr_records_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'idr_records'
  ) INTO v_table_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'IDR Records Table Migration Complete';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Table Created: %', v_table_exists;
  RAISE NOTICE '1:1 Relationship: event_id has UNIQUE constraint';
  RAISE NOTICE 'Indexes Created: 4 indexes for performance';
  RAISE NOTICE 'RLS Enabled: Row Level Security policies applied';
  RAISE NOTICE 'Trigger Created: auto-update updated_at timestamp';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
END $$;
