-- ==========================================
-- Verify and Fix pq_service_records table
-- Run this to check and fix any missing columns
-- ==========================================

-- First, let's see what we have
SELECT 'Current table structure:' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
ORDER BY ordinal_position;

-- Check if event_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pq_service_records' 
        AND column_name = 'event_id'
    ) THEN
        RAISE NOTICE 'event_id column is missing, adding it now...';
        ALTER TABLE pq_service_records 
        ADD COLUMN event_id UUID REFERENCES pq_events(id) ON DELETE SET NULL;
    ELSE
        RAISE NOTICE 'event_id column already exists';
    END IF;
END $$;

-- Check if content column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pq_service_records' 
        AND column_name = 'content'
    ) THEN
        RAISE NOTICE 'content column is missing, adding it now...';
        ALTER TABLE pq_service_records 
        ADD COLUMN content TEXT;
    ELSE
        RAISE NOTICE 'content column already exists';
    END IF;
END $$;

-- Create index for event_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_pq_service_records_event_id ON pq_service_records(event_id);

-- Add comment
COMMENT ON COLUMN pq_service_records.event_id IS 'Optional link to PQ event that prompted this service';
COMMENT ON COLUMN pq_service_records.content IS 'Rich text content with notes, observations, and service details';

-- Verify final structure
SELECT 'Final table structure:' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
ORDER BY ordinal_position;
