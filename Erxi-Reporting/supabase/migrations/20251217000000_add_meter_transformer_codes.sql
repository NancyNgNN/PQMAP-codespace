-- =====================================================
-- Add Transformer Code Columns to PQ Meters
-- =====================================================
-- Date: December 17, 2025
-- Purpose: Add Area and SS400/SS132/SS011 transformer code columns
--          with automatic population via trigger
-- =====================================================

-- Add new columns to pq_meters table
ALTER TABLE pq_meters
  ADD COLUMN IF NOT EXISTS area VARCHAR(10) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ss400 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ss132 VARCHAR(20),
  ADD COLUMN IF NOT EXISTS ss011 VARCHAR(20);

-- Create function to auto-populate SS codes based on substation and voltage level
CREATE OR REPLACE FUNCTION auto_populate_ss_codes()
RETURNS TRIGGER AS $$
DECLARE
  substation_code TEXT;
BEGIN
  -- Get the substation code
  SELECT code INTO substation_code
  FROM substations
  WHERE id = NEW.substation_id;

  -- Clear all SS codes first
  NEW.ss400 := NULL;
  NEW.ss132 := NULL;
  NEW.ss011 := NULL;

  -- Populate the appropriate SS code based on voltage level
  IF NEW.voltage_level = '400kV' THEN
    NEW.ss400 := substation_code || '400';
  ELSIF NEW.voltage_level = '132kV' THEN
    NEW.ss132 := substation_code || '132';
  ELSIF NEW.voltage_level = '11kV' THEN
    NEW.ss132 := substation_code || '132';  -- 11kV also gets SS132
    NEW.ss011 := substation_code || '011';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-populate SS codes on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_populate_ss_codes ON pq_meters;
CREATE TRIGGER trigger_auto_populate_ss_codes
  BEFORE INSERT OR UPDATE OF substation_id, voltage_level
  ON pq_meters
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_ss_codes();

-- Add comment to document the columns
COMMENT ON COLUMN pq_meters.area IS 'Detail location code (e.g., CPK, TWE)';
COMMENT ON COLUMN pq_meters.ss400 IS 'Transformer code for 400kV meters (e.g., APA400)';
COMMENT ON COLUMN pq_meters.ss132 IS 'Transformer code for 132kV and 11kV meters (e.g., APA132)';
COMMENT ON COLUMN pq_meters.ss011 IS 'Transformer code for 11kV meters (e.g., APA011)';

-- Success message
SELECT 'Migration completed: Added area, ss400, ss132, ss011 columns with auto-population trigger' as status;
