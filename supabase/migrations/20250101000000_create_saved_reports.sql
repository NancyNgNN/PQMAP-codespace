-- Create saved_reports table for Report Builder
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  config JSONB NOT NULL,
  shared_with UUID[] DEFAULT ARRAY[]::UUID[],
  is_public BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Create indexes
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_shared_with ON saved_reports USING GIN(shared_with);
CREATE INDEX idx_saved_reports_tags ON saved_reports USING GIN(tags);
CREATE INDEX idx_saved_reports_created_at ON saved_reports(created_at DESC);

-- Enable RLS
ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON saved_reports
  FOR SELECT
  USING (auth.uid() = created_by);

-- Users can view reports shared with them
CREATE POLICY "Users can view shared reports"
  ON saved_reports
  FOR SELECT
  USING (auth.uid() = ANY(shared_with));

-- Users can view public reports
CREATE POLICY "Users can view public reports"
  ON saved_reports
  FOR SELECT
  USING (is_public = TRUE);

-- Users can insert their own reports
CREATE POLICY "Users can create reports"
  ON saved_reports
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
  ON saved_reports
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
  ON saved_reports
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_saved_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_reports_updated_at();

-- Grant permissions
GRANT ALL ON saved_reports TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add comments
COMMENT ON TABLE saved_reports IS 'Stores user-created custom reports with sharing capabilities';
COMMENT ON COLUMN saved_reports.config IS 'JSONB containing ReportConfig (filters, calculated fields, chart settings, etc.)';
COMMENT ON COLUMN saved_reports.shared_with IS 'Array of user UUIDs who have access to this report';
COMMENT ON COLUMN saved_reports.is_public IS 'If true, all authenticated users can view this report';
COMMENT ON COLUMN saved_reports.tags IS 'User-defined tags for organizing reports';
