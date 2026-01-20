-- =====================================================
-- Customer Transformer Matching Table
-- =====================================================
-- Purpose: Map customers to circuits for automatic 
--          customer impact generation on events
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Create the mapping table
CREATE TABLE IF NOT EXISTS customer_transformer_matching (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  substation_id UUID NOT NULL REFERENCES substations(id) ON DELETE RESTRICT,
  circuit_id TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Unique constraint: One customer can only be mapped once per circuit
CREATE UNIQUE INDEX idx_customer_transformer_unique 
ON customer_transformer_matching(customer_id, substation_id, circuit_id)
WHERE active = true;

-- Performance indexes
CREATE INDEX idx_customer_transformer_substation 
ON customer_transformer_matching(substation_id);

CREATE INDEX idx_customer_transformer_circuit 
ON customer_transformer_matching(substation_id, circuit_id) 
WHERE active = true;

CREATE INDEX idx_customer_transformer_customer 
ON customer_transformer_matching(customer_id);

CREATE INDEX idx_customer_transformer_active 
ON customer_transformer_matching(active);

-- Add comments
COMMENT ON TABLE customer_transformer_matching IS 
'Maps customers to circuits within substations for automatic customer impact generation';

COMMENT ON COLUMN customer_transformer_matching.circuit_id IS 
'Circuit ID (also known as Transformer ID) - matches pq_events.circuit_id';

COMMENT ON COLUMN customer_transformer_matching.active IS 
'Soft delete flag - inactive mappings are not used for impact generation';

COMMENT ON COLUMN customer_transformer_matching.updated_by IS 
'User who last modified this mapping';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_customer_transformer_matching_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_transformer_matching_updated_at
  BEFORE UPDATE ON customer_transformer_matching
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_transformer_matching_updated_at();

-- Row Level Security (RLS)
ALTER TABLE customer_transformer_matching ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "Admins have full access to customer_transformer_matching"
  ON customer_transformer_matching
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Operator: Full access (for now, until user management implemented)
CREATE POLICY "Operators have full access to customer_transformer_matching"
  ON customer_transformer_matching
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Viewer: Read-only
CREATE POLICY "Viewers can read customer_transformer_matching"
  ON customer_transformer_matching
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'viewer'
    )
  );

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'customer_transformer_matching';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'customer_transformer_matching';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customer_transformer_matching';
