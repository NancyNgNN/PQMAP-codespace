-- Migration: Add audit fields to substations table
-- Date: 2026-01-05
-- Purpose: Add updated_at and updated_by fields for tracking changes

-- Add updated_at column (timestamp with timezone)
ALTER TABLE substations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add updated_by column (references profiles)
ALTER TABLE substations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id);

-- Create trigger to automatically update updated_at on row changes
CREATE OR REPLACE FUNCTION update_substations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_substations_updated_at ON substations;

CREATE TRIGGER trigger_substations_updated_at
  BEFORE UPDATE ON substations
  FOR EACH ROW
  EXECUTE FUNCTION update_substations_updated_at();

-- Add comment
COMMENT ON COLUMN substations.updated_at IS 'Timestamp of last update';
COMMENT ON COLUMN substations.updated_by IS 'User ID who last updated the record';
