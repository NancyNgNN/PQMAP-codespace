-- ==========================================
-- OPTION B: If service_type enum EXISTS but needs new values
-- Run this if service_type already exists with only 3 values
-- ==========================================

-- Check current values
SELECT 'Current service_type values:' as info, enumlabel as value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type'
ORDER BY enumsortorder;

-- Add new values if they don't exist
DO $$ 
BEGIN
    -- Add on_site_study if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'service_type' AND e.enumlabel = 'on_site_study'
    ) THEN
        ALTER TYPE service_type ADD VALUE 'on_site_study';
        RAISE NOTICE 'Added on_site_study';
    END IF;
    
    -- Add power_quality_audit if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'service_type' AND e.enumlabel = 'power_quality_audit'
    ) THEN
        ALTER TYPE service_type ADD VALUE 'power_quality_audit';
        RAISE NOTICE 'Added power_quality_audit';
    END IF;
    
    -- Add installation_support if not exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'service_type' AND e.enumlabel = 'installation_support'
    ) THEN
        ALTER TYPE service_type ADD VALUE 'installation_support';
        RAISE NOTICE 'Added installation_support';
    END IF;
END $$;

-- Add new columns if they don't exist
ALTER TABLE pq_service_records
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES pq_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Add updated_at column if it doesn't exist
ALTER TABLE pq_service_records
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_pq_service_records_event_id ON pq_service_records(event_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_customer_id ON pq_service_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_service_date ON pq_service_records(service_date);

-- Add comments
COMMENT ON COLUMN pq_service_records.event_id IS 'Optional link to PQ event that prompted this service';
COMMENT ON COLUMN pq_service_records.content IS 'Rich text content with notes, observations, and service details';

-- Verify
SELECT 'Update complete! New service_type values:' as status;

SELECT enumlabel as service_type_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type'
ORDER BY enumsortorder;

SELECT 'Updated columns:' as status;

SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
  AND column_name IN ('event_id', 'content', 'updated_at')
ORDER BY ordinal_position;
