-- Quick Check Script for PQ Services Setup
-- Run this in Supabase SQL Editor to verify everything is ready

-- ==========================================
-- CHECK 1: Verify pq_service_records table structure
-- ==========================================
SELECT 
  'CHECK 1: Table Structure' as check_name,
  CASE 
    WHEN COUNT(*) FILTER (WHERE column_name = 'content') > 0 
      AND COUNT(*) FILTER (WHERE column_name = 'event_id') > 0
    THEN '✅ PASS - All columns exist'
    ELSE '❌ FAIL - Missing columns. Apply migration first!'
  END as result
FROM information_schema.columns 
WHERE table_name = 'pq_service_records'
  AND column_name IN ('content', 'event_id');

-- ==========================================
-- CHECK 2: Verify service_type enum values
-- ==========================================
SELECT 
  'CHECK 2: Service Types' as check_name,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ PASS - All 6 service types available'
    ELSE '❌ FAIL - Only ' || COUNT(*) || ' service types. Run migration!'
  END as result
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'service_type';

-- ==========================================
-- CHECK 3: Verify data exists
-- ==========================================
SELECT 
  'CHECK 3: Historical Data' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' service records exist'
    ELSE '⚠️ WARNING - No service records. Run backfill script!'
  END as result
FROM pq_service_records;

-- ==========================================
-- CHECK 4: Verify customers exist
-- ==========================================
SELECT 
  'CHECK 4: Customers' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' customers exist'
    ELSE '❌ FAIL - No customers found!'
  END as result
FROM customers;

-- ==========================================
-- CHECK 5: Verify profiles/engineers exist
-- ==========================================
SELECT 
  'CHECK 5: Profiles' as check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS - ' || COUNT(*) || ' profiles exist'
    ELSE '⚠️ WARNING - No profiles found!'
  END as result
FROM profiles;

-- ==========================================
-- CHECK 6: Show service type distribution
-- ==========================================
SELECT 
  '📊 Service Distribution' as info,
  service_type,
  COUNT(*) as count
FROM pq_service_records
GROUP BY service_type
ORDER BY count DESC;

-- ==========================================
-- CHECK 7: Show recent services
-- ==========================================
SELECT 
  '📅 Recent Services (Last 5)' as info,
  c.name as customer,
  s.service_date,
  s.service_type,
  CASE WHEN s.content IS NOT NULL THEN '✅' ELSE '❌' END as has_content,
  CASE WHEN s.event_id IS NOT NULL THEN '✅' ELSE '➖' END as has_event_link
FROM pq_service_records s
JOIN customers c ON s.customer_id = c.id
ORDER BY s.service_date DESC
LIMIT 5;

-- ==========================================
-- CHECK 8: Show customers with service counts
-- ==========================================
SELECT 
  '👥 Top 10 Customers by Services' as info,
  c.name as customer,
  c.account_number,
  COUNT(s.id) as total_services,
  MAX(s.service_date) as last_service_date
FROM customers c
LEFT JOIN pq_service_records s ON c.id = s.customer_id
GROUP BY c.id, c.name, c.account_number
ORDER BY total_services DESC
LIMIT 10;

-- ==========================================
-- FINAL STATUS SUMMARY
-- ==========================================
SELECT 
  '🎯 SETUP STATUS' as status,
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_service_records) > 0
      AND (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_name = 'pq_service_records' AND column_name = 'content') > 0
    THEN '✅ ALL READY - You can use PQ Services now!'
    WHEN (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_name = 'pq_service_records' AND column_name = 'content') = 0
    THEN '❌ NOT READY - Apply migration first (20251218000001_update_pq_service_records.sql)'
    ELSE '⚠️ PARTIALLY READY - Migration applied, but run backfill script for test data'
  END as message;
