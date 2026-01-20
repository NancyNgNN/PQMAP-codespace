-- =====================================================
-- Backup Tables Before CLP Substations Migration
-- =====================================================
-- Purpose: Create backup copies of all affected tables
-- Date: December 15, 2025
-- Naming: table_name → table_name_backup_20251215
-- =====================================================

BEGIN;

-- Step 1: Backup substations table
CREATE TABLE substations_backup_20251215 AS 
SELECT * FROM substations;

-- Step 2: Backup pq_events table (might be large, includes all columns)
CREATE TABLE pq_events_backup_20251215 AS 
SELECT * FROM pq_events;

-- Step 3: Backup pq_meters table
CREATE TABLE pq_meters_backup_20251215 AS 
SELECT * FROM pq_meters;

-- Step 4: Backup customers table
CREATE TABLE customers_backup_20251215 AS 
SELECT * FROM customers;

-- Step 5: Backup customer_transformer_matching table
CREATE TABLE customer_transformer_matching_backup_20251215 AS 
SELECT * FROM customer_transformer_matching;

-- Step 6: Add timestamps to backup tables for tracking
COMMENT ON TABLE substations_backup_20251215 IS 
  'Backup created on 2025-12-15 before CLP substations migration';

COMMENT ON TABLE pq_events_backup_20251215 IS 
  'Backup created on 2025-12-15 before CLP substations migration';

COMMENT ON TABLE pq_meters_backup_20251215 IS 
  'Backup created on 2025-12-15 before CLP substations migration';

COMMENT ON TABLE customers_backup_20251215 IS 
  'Backup created on 2025-12-15 before CLP substations migration';

COMMENT ON TABLE customer_transformer_matching_backup_20251215 IS 
  'Backup created on 2025-12-15 before CLP substations migration';

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check backup table sizes
SELECT 
  'substations' as table_name,
  (SELECT COUNT(*) FROM substations) as original_count,
  (SELECT COUNT(*) FROM substations_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM substations) = (SELECT COUNT(*) FROM substations_backup_20251215) 
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END as status
UNION ALL
SELECT 
  'pq_events' as table_name,
  (SELECT COUNT(*) FROM pq_events) as original_count,
  (SELECT COUNT(*) FROM pq_events_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_events) = (SELECT COUNT(*) FROM pq_events_backup_20251215) 
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END as status
UNION ALL
SELECT 
  'pq_meters' as table_name,
  (SELECT COUNT(*) FROM pq_meters) as original_count,
  (SELECT COUNT(*) FROM pq_meters_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_meters) = (SELECT COUNT(*) FROM pq_meters_backup_20251215) 
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END as status
UNION ALL
SELECT 
  'customers' as table_name,
  (SELECT COUNT(*) FROM customers) as original_count,
  (SELECT COUNT(*) FROM customers_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM customers) = (SELECT COUNT(*) FROM customers_backup_20251215) 
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END as status
UNION ALL
SELECT 
  'customer_transformer_matching' as table_name,
  (SELECT COUNT(*) FROM customer_transformer_matching) as original_count,
  (SELECT COUNT(*) FROM customer_transformer_matching_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM customer_transformer_matching) = (SELECT COUNT(*) FROM customer_transformer_matching_backup_20251215) 
    THEN '✅ Match' 
    ELSE '❌ Mismatch' 
  END as status;

-- Show all backup tables
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%_backup_20251215'
ORDER BY table_name;

-- Summary
SELECT 
  '✅ Backup Complete!' as status,
  COUNT(*) as backup_tables_created
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%_backup_20251215';
