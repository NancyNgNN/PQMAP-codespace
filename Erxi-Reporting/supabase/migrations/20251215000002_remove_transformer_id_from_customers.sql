-- =====================================================
-- Remove transformer_id from customers table
-- =====================================================
-- Purpose: transformer_id is replaced by customer_transformer_matching table
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Drop the column (no data migration needed as per user)
ALTER TABLE customers 
DROP COLUMN IF EXISTS transformer_id;

COMMENT ON TABLE customers IS 
'Customer accounts and service points. Circuit mapping moved to customer_transformer_matching table.';

COMMIT;

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'transformer_id';
-- Should return 0 rows
