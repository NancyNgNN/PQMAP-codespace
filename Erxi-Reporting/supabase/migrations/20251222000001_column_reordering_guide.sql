-- =====================================================
-- Column Reordering Guide for PQ Tables
-- =====================================================
-- Date: December 22, 2025
-- Purpose: Document and optionally apply column reordering
--          to match TypeScript interface definitions
-- Note: PostgreSQL doesn't support direct column reordering.
--       This requires recreating tables or accepting logical order.
-- =====================================================

-- IMPORTANT: Column order in PostgreSQL doesn't affect performance,
-- only visual organization in tools like pgAdmin or SELECT * queries.
-- The application uses named columns, so physical order doesn't matter.

-- =====================================================
-- Option 1: View Current Column Order
-- =====================================================

-- View current PQ Meters column order
SELECT 
  ordinal_position,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pq_meters'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- View current PQ Events column order  
SELECT 
  ordinal_position,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pq_events'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- Option 2: Create Ordered View (Recommended)
-- =====================================================
-- This approach creates views with columns in desired order
-- without modifying the actual tables.

-- PQ Meters view with organized column order
-- Only includes columns that actually exist in the database
CREATE OR REPLACE VIEW pq_meters_ordered AS
SELECT
  -- Identity
  id,
  meter_id,
  -- PQ Meter location
  substation_id,
  location,
  -- Meter status
  status,
  last_communication,
  firmware_version,
  installed_date,
  created_at,
  -- Transformer Code fields (added in migration 20251217000000)
  area,
  ss400,
  ss132,
  ss011
FROM pq_meters;

-- PQ Events view with organized column order
-- Only includes columns that actually exist in the database
CREATE OR REPLACE VIEW pq_events_ordered AS
SELECT
  -- Identity
  id,
  -- Event characteristics
  is_mother_event,
  is_child_event,
  parent_event_id,
  is_special_event,
  false_event,
  -- Event timestamp
  timestamp,
  -- Event location (reference from PQmeter)
  event_type,
  meter_id,
  site_id,
  voltage_level,
  substation_id,
  circuit_id,
  region,
  oc,
  -- Event impact & measurements
  duration_ms,
  -- Voltage Measurements (V1, V2, V3)
  v1,
  v2,
  v3,
  customer_count,
  -- SARFI Indices
  sarfi_10,
  sarfi_20,
  sarfi_30,
  sarfi_40,
  sarfi_50,
  sarfi_60,
  sarfi_70,
  sarfi_80,
  sarfi_90,
  magnitude,
  remaining_voltage,
  affected_phases,
  severity,
  waveform_data,
  validated_by_adms,
  status,
  -- Mother Event Grouping properties
  grouping_type,
  grouped_at,
  remarks,
  -- IDR details
  idr_no,
  created_at,
  resolved_at,
  -- Location & Equipment Details
  address,
  equipment_type,
  -- Cause Analysis
  cause_group,
  cause,
  description,
  -- Equipment Fault Details
  object_part_group,
  object_part_code,
  damage_group,
  damage_code,
  -- Event Context
  outage_type,
  weather,
  total_cmi
FROM pq_events;

-- Grant permissions on views
GRANT SELECT ON pq_meters_ordered TO authenticated;
GRANT SELECT ON pq_events_ordered TO authenticated;

-- =====================================================
-- Option 3: Full Table Rebuild (DANGEROUS - USE WITH CAUTION)
-- =====================================================
-- Uncomment only if you absolutely need physical column reordering
-- This is a destructive operation and requires downtime
-- NOTE: Only includes columns that actually exist in the current schema

/*
-- BACKUP FIRST!
CREATE TABLE pq_events_backup AS SELECT * FROM pq_events;

-- Create new table with desired column order (only existing columns)
CREATE TABLE pq_events_new (
  -- Identity
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Event characteristics
  is_mother_event boolean DEFAULT false,
  is_child_event boolean DEFAULT false,
  parent_event_id uuid REFERENCES pq_events_new(id),
  is_special_event boolean DEFAULT false,
  false_event boolean DEFAULT false,
  -- Event timestamp
  timestamp timestamptz NOT NULL,
  -- Event location
  event_type event_type NOT NULL,
  meter_id uuid,
  site_id VARCHAR(50),
  voltage_level TEXT,
  substation_id uuid REFERENCES substations(id),
  circuit_id TEXT,
  region VARCHAR(100),
  oc TEXT,
  -- Event impact & measurements
  duration_ms integer,
  v1 NUMERIC,
  v2 NUMERIC,
  v3 NUMERIC,
  customer_count INTEGER,
  sarfi_10 NUMERIC,
  sarfi_20 NUMERIC,
  sarfi_30 NUMERIC,
  sarfi_40 NUMERIC,
  sarfi_50 NUMERIC,
  sarfi_60 NUMERIC,
  sarfi_70 NUMERIC,
  sarfi_80 NUMERIC,
  sarfi_90 NUMERIC,
  magnitude decimal(10, 3),
  remaining_voltage DECIMAL(5, 2),
  affected_phases text[] DEFAULT ARRAY['A', 'B', 'C'],
  severity severity_level DEFAULT 'low',
  waveform_data jsonb,
  validated_by_adms BOOLEAN DEFAULT FALSE,
  status event_status DEFAULT 'new',
  -- Mother Event Grouping properties
  grouping_type TEXT,
  grouped_at timestamptz,
  remarks TEXT,
  -- IDR details
  idr_no TEXT,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  -- Location & Equipment Details
  address TEXT,
  equipment_type TEXT,
  -- Cause Analysis
  cause_group TEXT,
  cause TEXT,
  description TEXT,
  -- Equipment Fault Details
  object_part_group TEXT,
  object_part_code TEXT,
  damage_group TEXT,
  damage_code TEXT,
  -- Event Context
  outage_type TEXT,
  weather TEXT,
  total_cmi NUMERIC
);

-- Copy data (all columns that exist)
INSERT INTO pq_events_new SELECT 
  id, is_mother_event, is_child_event, parent_event_id, is_special_event, 
  false_event, timestamp, event_type, meter_id, site_id, voltage_level,
  substation_id, circuit_id, region, oc, duration_ms, v1, v2, v3,
  customer_count, sarfi_10, sarfi_20, sarfi_30, sarfi_40, sarfi_50,
  sarfi_60, sarfi_70, sarfi_80, sarfi_90, magnitude, remaining_voltage,
  affected_phases, severity, waveform_data, validated_by_adms, status,
  grouping_type, grouped_at, remarks, idr_no, created_at, resolved_at,
  address, equipment_type, cause_group, cause, description,
  object_part_group, object_part_code, damage_group, damage_code,
  outage_type, weather, total_cmi
FROM pq_events;

-- Drop old table and rename new one
DROP TABLE pq_events CASCADE;
ALTER TABLE pq_events_new RENAME TO pq_events;

-- Recreate all indexes, constraints, and triggers
-- (You would need to list all of them here from previous migrations)
*/

-- =====================================================
-- Summary
-- =====================================================
-- Recommended Approach: Use Option 2 (Views)
-- - No data migration risk
-- - No downtime required
-- - Achieves visual organization for tools
-- - Application code unaffected (uses named columns)
--
-- For human management in pgAdmin or similar tools:
-- - Use the ordered views for browsing
-- - Original tables remain unchanged for safety
-- =====================================================

SELECT '✅ Column ordering documentation and views created successfully!' as status;
