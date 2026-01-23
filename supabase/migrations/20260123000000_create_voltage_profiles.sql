-- Create voltage_profiles table for saving user profile configurations
CREATE TABLE IF NOT EXISTS voltage_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  data_type TEXT NOT NULL, -- 'voltage' or 'current'
  value_type TEXT NOT NULL, -- 'average' or 'raw'
  voltage_level TEXT, -- 'All', '400kV', '132kV', '33kV', '11kV', '380V'
  selected_meters UUID[], -- Array of pq_meters.id
  parameters TEXT[], -- ['V1', 'V2', 'V3'] or ['I1', 'I2', 'I3']
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_voltage_profiles_user_id ON voltage_profiles(user_id);

-- Enable RLS
ALTER TABLE voltage_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profiles"
  ON voltage_profiles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own profiles"
  ON voltage_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own profiles"
  ON voltage_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own profiles"
  ON voltage_profiles FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Create meter_voltage_readings table for storing historical voltage/current data
CREATE TABLE IF NOT EXISTS meter_voltage_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id UUID NOT NULL REFERENCES pq_meters(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  v1 NUMERIC(10, 2), -- Phase 1 voltage
  v2 NUMERIC(10, 2), -- Phase 2 voltage
  v3 NUMERIC(10, 2), -- Phase 3 voltage
  i1 NUMERIC(10, 2), -- Phase 1 current
  i2 NUMERIC(10, 2), -- Phase 2 current
  i3 NUMERIC(10, 2), -- Phase 3 current
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meter_voltage_readings_meter_id ON meter_voltage_readings(meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_voltage_readings_timestamp ON meter_voltage_readings(timestamp);
CREATE INDEX IF NOT EXISTS idx_meter_voltage_readings_meter_timestamp ON meter_voltage_readings(meter_id, timestamp);

-- Enable RLS
ALTER TABLE meter_voltage_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policy - all authenticated users can read voltage readings
CREATE POLICY "Authenticated users can view voltage readings"
  ON meter_voltage_readings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins and operators can insert voltage readings (server-side ingestion)
CREATE POLICY "Operators and admins can insert voltage readings"
  ON meter_voltage_readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.role IN ('admin', 'operator')
    )
  );