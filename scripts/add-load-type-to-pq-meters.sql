-- Migration: Add load_type column to pq_meters table
-- Date: January 2, 2026
-- Purpose: Add load type categorization for meters (DC, EV, RE-PV, etc.)

-- Step 1: Create load_types lookup table
CREATE TABLE IF NOT EXISTS load_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL, -- Hex color for map visualization
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Insert default load types
INSERT INTO load_types (code, name, description, color) VALUES
  ('DC', 'Data Center', 'Data center facilities', '#9333EA'),      -- Purple
  ('EV', 'Electric Vehicle', 'EV charging stations', '#06B6D4'),   -- Cyan
  ('RE-PV', 'Renewable Energy - PV', 'Solar photovoltaic systems', '#22C55E'),  -- Green
  ('RES-HRB', 'Residential - HRB', 'High-rise buildings residential', '#EF4444'), -- Red
  ('RES-NOC', 'Residential - NOC', 'Non-high-rise residential', '#3B82F6'),      -- Blue
  ('RES', 'Residential', 'General residential', '#F59E0B'),         -- Amber
  ('others', 'Others', 'Other load types', '#EAB308')               -- Yellow
ON CONFLICT (code) DO NOTHING;

-- Step 3: Add load_type column to pq_meters table
ALTER TABLE pq_meters 
ADD COLUMN IF NOT EXISTS load_type TEXT;

-- Step 4: Add check constraint to validate load_type values
ALTER TABLE pq_meters
DROP CONSTRAINT IF EXISTS pq_meters_load_type_check;

ALTER TABLE pq_meters
ADD CONSTRAINT pq_meters_load_type_check 
CHECK (load_type IN ('DC', 'EV', 'others', 'RE-PV', 'RES', 'RES-HRB', 'RES-NOC') OR load_type IS NULL);

-- Step 5: Add foreign key to load_types (optional, for referential integrity)
-- Note: This is optional - we can use either FK or CHECK constraint
-- ALTER TABLE pq_meters
-- ADD CONSTRAINT fk_pq_meters_load_type
-- FOREIGN KEY (load_type) REFERENCES load_types(code)
-- ON DELETE SET NULL;

-- Step 6: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_pq_meters_load_type ON pq_meters(load_type);

-- Step 7: Update existing meters with default load_type (optional)
-- UPDATE pq_meters SET load_type = 'others' WHERE load_type IS NULL;

-- Step 8: Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_load_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_load_types_timestamp ON load_types;
CREATE TRIGGER trigger_update_load_types_timestamp
BEFORE UPDATE ON load_types
FOR EACH ROW
EXECUTE FUNCTION update_load_types_updated_at();

-- Verification queries
-- SELECT * FROM load_types ORDER BY code;
-- SELECT load_type, COUNT(*) FROM pq_meters GROUP BY load_type;
