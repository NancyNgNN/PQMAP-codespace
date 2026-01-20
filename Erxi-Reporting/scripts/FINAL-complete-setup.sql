-- ==========================================
-- COMPLETE PQ SERVICE RECORDS SETUP
-- This script checks and adds missing columns
-- Run this ONCE to ensure structure is correct
-- ==========================================

-- Step 1: Add missing columns if needed
DO $$
BEGIN
    -- Check service_type data type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pq_service_records' 
        AND column_name = 'service_type' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'service_type is TEXT (correct)';
    END IF;

    -- Add event_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pq_service_records' AND column_name = 'event_id'
    ) THEN
        ALTER TABLE pq_service_records ADD COLUMN event_id UUID REFERENCES pq_events(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added event_id column';
    ELSE
        RAISE NOTICE 'event_id column exists';
    END IF;
    
    -- Add content if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pq_service_records' AND column_name = 'content'
    ) THEN
        ALTER TABLE pq_service_records ADD COLUMN content TEXT;
        RAISE NOTICE 'Added content column';
    ELSE
        RAISE NOTICE 'content column exists';
    END IF;
END $$;

-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_pq_service_records_customer_id ON pq_service_records(customer_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_event_id ON pq_service_records(event_id);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_service_date ON pq_service_records(service_date);
CREATE INDEX IF NOT EXISTS idx_pq_service_records_engineer_id ON pq_service_records(engineer_id);

-- Step 3: Add column comments
COMMENT ON COLUMN pq_service_records.event_id IS 'Optional link to PQ event that prompted this service';
COMMENT ON COLUMN pq_service_records.content IS 'Rich text content with notes, observations, and service details';

-- Step 4: Enable RLS if not already enabled
ALTER TABLE pq_service_records ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies (will skip if already exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pq_service_records' AND policyname = 'Enable read access for authenticated users') THEN
        CREATE POLICY "Enable read access for authenticated users" ON pq_service_records
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pq_service_records' AND policyname = 'Enable insert for authenticated users') THEN
        CREATE POLICY "Enable insert for authenticated users" ON pq_service_records
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pq_service_records' AND policyname = 'Enable update for authenticated users') THEN
        CREATE POLICY "Enable update for authenticated users" ON pq_service_records
            FOR UPDATE USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pq_service_records' AND policyname = 'Enable delete for authenticated users') THEN
        CREATE POLICY "Enable delete for authenticated users" ON pq_service_records
            FOR DELETE USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '✓ Setup complete!' as status;

SELECT 'Table Structure:' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
ORDER BY ordinal_position;

SELECT 'Current Record Count:' as check_name;
SELECT COUNT(*) as total_records FROM pq_service_records;
