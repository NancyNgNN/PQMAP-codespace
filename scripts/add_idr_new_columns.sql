-- Add new columns to idr_records table for IDR tab reorganization
-- Migration: 20260130000000_add_idr_new_columns.sql
-- Date: January 30, 2026

-- Add circuit column
ALTER TABLE idr_records ADD COLUMN IF NOT EXISTS circuit TEXT;

-- Add faulty_component column
ALTER TABLE idr_records ADD COLUMN IF NOT EXISTS faulty_component TEXT;

-- Add external_internal column with check constraint
ALTER TABLE idr_records ADD COLUMN IF NOT EXISTS external_internal TEXT CHECK (external_internal IN ('external', 'internal'));

-- Add comments for documentation
COMMENT ON COLUMN idr_records.circuit IS 'Circuit identifier for the IDR record';
COMMENT ON COLUMN idr_records.faulty_component IS 'Description of the faulty component';
COMMENT ON COLUMN idr_records.external_internal IS 'Whether the fault is external or internal (external/internal)';