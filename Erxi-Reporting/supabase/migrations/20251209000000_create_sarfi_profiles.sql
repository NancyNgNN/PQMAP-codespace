-- Migration: Create SARFI Profiles and Profile Weights tables
-- Description: Stores SARFI calculation profiles with configurable weighting factors per meter

-- Create sarfi_profiles table
CREATE TABLE IF NOT EXISTS sarfi_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_sarfi_profiles_year ON sarfi_profiles(year);
CREATE INDEX idx_sarfi_profiles_active ON sarfi_profiles(is_active);

-- Create partial unique index to ensure only one active profile per year
CREATE UNIQUE INDEX idx_unique_active_profile_per_year 
  ON sarfi_profiles(year) 
  WHERE is_active = true;

-- Create sarfi_profile_weights table to store weighting factors per meter
CREATE TABLE IF NOT EXISTS sarfi_profile_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES sarfi_profiles(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES pq_meters(id) ON DELETE CASCADE,
  weight_factor DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_profile_meter UNIQUE(profile_id, meter_id)
);

-- Create indexes for performance
CREATE INDEX idx_sarfi_profile_weights_profile ON sarfi_profile_weights(profile_id);
CREATE INDEX idx_sarfi_profile_weights_meter ON sarfi_profile_weights(meter_id);

-- Add updated_at trigger for sarfi_profiles
CREATE OR REPLACE FUNCTION update_sarfi_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sarfi_profiles_updated_at
  BEFORE UPDATE ON sarfi_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_sarfi_profiles_updated_at();

-- Add updated_at trigger for sarfi_profile_weights
CREATE OR REPLACE FUNCTION update_sarfi_profile_weights_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sarfi_profile_weights_updated_at
  BEFORE UPDATE ON sarfi_profile_weights
  FOR EACH ROW
  EXECUTE FUNCTION update_sarfi_profile_weights_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE sarfi_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarfi_profile_weights ENABLE ROW LEVEL SECURITY;

-- sarfi_profiles policies
CREATE POLICY "Users can view SARFI profiles"
  ON sarfi_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and operators can manage SARFI profiles"
  ON sarfi_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- sarfi_profile_weights policies
CREATE POLICY "Users can view SARFI profile weights"
  ON sarfi_profile_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and operators can manage SARFI profile weights"
  ON sarfi_profile_weights FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Add comments for documentation
COMMENT ON TABLE sarfi_profiles IS 'Stores SARFI calculation profiles with different weighting configurations by year';
COMMENT ON TABLE sarfi_profile_weights IS 'Stores meter-specific weighting factors for each SARFI profile';
COMMENT ON COLUMN sarfi_profiles.year IS 'Year this profile applies to (e.g., 2023, 2024, 2025)';
COMMENT ON COLUMN sarfi_profiles.is_active IS 'Only one profile per year can be active at a time';
COMMENT ON COLUMN sarfi_profile_weights.weight_factor IS 'Weighting factor for SARFI calculation (typically number of customers per transformer)';
