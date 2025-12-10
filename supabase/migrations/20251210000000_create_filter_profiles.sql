-- Create filter_profiles table for storing user filter configurations
-- Migration: 20251210000000_create_filter_profiles.sql
-- Date: December 10, 2025
-- Purpose: Enable multi-device sync for event filter profiles

-- Create filter_profiles table
CREATE TABLE IF NOT EXISTS filter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Filter configuration stored as JSONB
  filters JSONB NOT NULL,
  
  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT filter_profiles_name_user_unique UNIQUE(user_id, name)
);

-- Add indexes for performance
CREATE INDEX idx_filter_profiles_user_id ON filter_profiles(user_id);
CREATE INDEX idx_filter_profiles_created_at ON filter_profiles(created_at DESC);
CREATE INDEX idx_filter_profiles_default ON filter_profiles(user_id, is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE filter_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for filter_profiles

-- Users can view their own profiles
CREATE POLICY "Users can view own filter profiles"
  ON filter_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own profiles
CREATE POLICY "Users can insert own filter profiles"
  ON filter_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own profiles
CREATE POLICY "Users can update own filter profiles"
  ON filter_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own profiles
CREATE POLICY "Users can delete own filter profiles"
  ON filter_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all profiles (for management purposes)
CREATE POLICY "Admins can view all filter profiles"
  ON filter_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_filter_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_filter_profiles_updated_at_trigger
  BEFORE UPDATE ON filter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_filter_profiles_updated_at();

-- Function to ensure only one default profile per user
CREATE OR REPLACE FUNCTION ensure_single_default_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default profiles for this user
    UPDATE filter_profiles
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default profile per user
CREATE TRIGGER ensure_single_default_profile_trigger
  BEFORE INSERT OR UPDATE ON filter_profiles
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_profile();

-- Add comment to table
COMMENT ON TABLE filter_profiles IS 'Stores user-defined filter configurations for event management with multi-device sync';
COMMENT ON COLUMN filter_profiles.filters IS 'JSONB object containing EventFilter interface data (startDate, endDate, eventTypes, meterIds, etc.)';
COMMENT ON COLUMN filter_profiles.is_default IS 'If true, this profile is automatically loaded on page load';
