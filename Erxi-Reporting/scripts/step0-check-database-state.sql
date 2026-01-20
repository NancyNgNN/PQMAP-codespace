-- STEP 1: Check what exists in your database
-- Run this FIRST to understand your current state

-- Check if service_type enum exists
SELECT 
    'service_type enum' as object_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_type')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as status;

-- If service_type exists, show all values
SELECT 
    'Current service_type values:' as info,
    enumlabel as value
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type'
ORDER BY enumsortorder;

-- Check if pq_service_records table exists
SELECT 
    'pq_service_records table' as object_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pq_service_records')
        THEN '✅ EXISTS'
        ELSE '❌ DOES NOT EXIST'
    END as status;

-- If table exists, show current columns
SELECT 
    'Current columns in pq_service_records:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pq_service_records'
ORDER BY ordinal_position;
