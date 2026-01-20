-- =====================================================
-- Rollback Script: Restore from Backup Tables
-- =====================================================
-- Purpose: Restore original data if migration needs to be reverted
-- Date: December 15, 2025
-- WARNING: This will DELETE current data and restore from backups
-- =====================================================

-- ⚠️ ONLY RUN THIS IF YOU NEED TO ROLLBACK THE MIGRATION ⚠️

BEGIN;

-- Step 1: Disable foreign key checks temporarily (restore in correct order)
SET session_replication_role = replica;

-- Step 2: Clear current tables (in reverse dependency order)
TRUNCATE TABLE customer_transformer_matching CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE pq_meters CASCADE;
TRUNCATE TABLE pq_events CASCADE;
TRUNCATE TABLE substations CASCADE;

-- Step 3: Restore substations first (base table)
INSERT INTO substations 
SELECT * FROM substations_backup_20251215;

-- Step 4: Restore pq_events
INSERT INTO pq_events 
SELECT * FROM pq_events_backup_20251215;

-- Step 5: Restore pq_meters
INSERT INTO pq_meters 
SELECT * FROM pq_meters_backup_20251215;

-- Step 6: Restore customers
INSERT INTO customers 
SELECT * FROM customers_backup_20251215;

-- Step 7: Restore customer_transformer_matching
INSERT INTO customer_transformer_matching 
SELECT * FROM customer_transformer_matching_backup_20251215;

-- Step 8: Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Step 9: Update sequences (if any auto-increment IDs)
-- Note: UUIDs don't need sequence updates

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Verify restoration
SELECT 
  'substations' as table_name,
  (SELECT COUNT(*) FROM substations) as current_count,
  (SELECT COUNT(*) FROM substations_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM substations) = (SELECT COUNT(*) FROM substations_backup_20251215) 
    THEN '✅ Restored' 
    ELSE '❌ Count Mismatch' 
  END as status
UNION ALL
SELECT 
  'pq_events' as table_name,
  (SELECT COUNT(*) FROM pq_events) as current_count,
  (SELECT COUNT(*) FROM pq_events_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_events) = (SELECT COUNT(*) FROM pq_events_backup_20251215) 
    THEN '✅ Restored' 
    ELSE '❌ Count Mismatch' 
  END as status
UNION ALL
SELECT 
  'pq_meters' as table_name,
  (SELECT COUNT(*) FROM pq_meters) as current_count,
  (SELECT COUNT(*) FROM pq_meters_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM pq_meters) = (SELECT COUNT(*) FROM pq_meters_backup_20251215) 
    THEN '✅ Restored' 
    ELSE '❌ Count Mismatch' 
  END as status
UNION ALL
SELECT 
  'customers' as table_name,
  (SELECT COUNT(*) FROM customers) as current_count,
  (SELECT COUNT(*) FROM customers_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM customers) = (SELECT COUNT(*) FROM customers_backup_20251215) 
    THEN '✅ Restored' 
    ELSE '❌ Count Mismatch' 
  END as status
UNION ALL
SELECT 
  'customer_transformer_matching' as table_name,
  (SELECT COUNT(*) FROM customer_transformer_matching) as current_count,
  (SELECT COUNT(*) FROM customer_transformer_matching_backup_20251215) as backup_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM customer_transformer_matching) = (SELECT COUNT(*) FROM customer_transformer_matching_backup_20251215) 
    THEN '✅ Restored' 
    ELSE '❌ Count Mismatch' 
  END as status;

-- Summary
SELECT '✅ Rollback Complete! Data restored from backups.' as status;
