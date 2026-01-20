-- ==========================================
-- OPTION A: If service_type enum DOES NOT exist
-- Run this if you got: "type service_type does not exist"
-- ==========================================

-- Create the service_type enum with all 6 values
CREATE TYPE service_type AS ENUM (
    'site_survey',
    'harmonic_analysis',
    'consultation',
    'on_site_study',
    'power_quality_audit',
    'installation_support'
);

-- Create pq_service_records table if it doesn't exist
CREATE TABLE IF NOT EXISTS pq_service_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    service_type service_type NOT NULL,
    event_id UUID REFERENCES pq_events(id) ON DELETE SET NULL,
    findings TEXT,
    recommendations TEXT,
    benchmark_standard TEXT,
    engineer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pq_service_records_customer_id ON pq_service_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_event_id ON pq_service_records(event_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_service_date ON pq_service_records(service_date);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_engineer_id ON pq_service_records(engineer_id);

-- Add comments
COMMENT ON COLUMN pq_service_records.event_id IS 'Optional link to PQ event that prompted this service';
COMMENT ON COLUMN pq_service_records.content IS 'Rich text content with notes, observations, and service details';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pq_service_records_updated_at
    BEFORE UPDATE ON pq_service_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE pq_service_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust according to your auth setup)
CREATE POLICY "Enable read access for authenticated users" ON pq_service_records
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON pq_service_records
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON pq_service_records
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON pq_service_records
    FOR DELETE USING (auth.role() = 'authenticated');

-- Verify
SELECT 'Setup complete! Verify below:' as status;

SELECT enumlabel as service_type_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type'
ORDER BY enumsortorder;

SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
ORDER BY ordinal_position;
