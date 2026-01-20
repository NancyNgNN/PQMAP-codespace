-- =====================================================
-- Cleanup Script: Delete Backup Tables
-- =====================================================
-- Purpose: Remove backup tables after successful migration
-- Date: December 15, 2025
-- WARNING: Run this ONLY after verifying migration is successful
-- =====================================================

-- ⚠️ ONLY RUN THIS AFTER CONFIRMING MIGRATION IS SUCCESSFUL ⚠️
-- ⚠️ ONCE DELETED, BACKUP DATA CANNOT BE RECOVERED ⚠️

BEGIN;

-- Check backup tables exist before dropping
DO $$
DECLARE
  backup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backup_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name LIKE '%_backup_20251215';
  
  RAISE NOTICE 'Found % backup tables to delete', backup_count;
END $$;

-- Drop backup tables
DROP TABLE IF EXISTS substations_backup_20251215;
DROP TABLE IF EXISTS pq_events_backup_20251215;
DROP TABLE IF EXISTS pq_meters_backup_20251215;
DROP TABLE IF EXISTS customers_backup_20251215;
DROP TABLE IF EXISTS customer_transformer_matching_backup_20251215;

COMMIT;

-- =====================================================
-- Verification
-- =====================================================

-- Verify all backup tables are deleted
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ All backup tables deleted successfully!'
    ELSE '⚠️ Warning: ' || COUNT(*) || ' backup tables still exist'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%_backup_20251215';

-- Show remaining tables
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
