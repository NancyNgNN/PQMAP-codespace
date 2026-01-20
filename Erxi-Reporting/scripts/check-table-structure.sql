-- Check pq_service_records table structure
SELECT 'Checking pq_service_records table...' as status;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pq_service_records'
ORDER BY ordinal_position;

-- Check if table is empty
SELECT 'Record count in pq_service_records:' as status;
SELECT COUNT(*) as record_count FROM pq_service_records;

-- Check service_type enum values
SELECT 'Service type enum values:' as status;
SELECT enumlabel as service_type_values
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type'
ORDER BY enumsortorder;

-- Check if pq_events table exists
SELECT 'Checking pq_events table...' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'pq_events'
ORDER BY ordinal_position
LIMIT 5;

SELECT 'PQ Events count:' as status;
SELECT COUNT(*) as event_count FROM pq_events;
