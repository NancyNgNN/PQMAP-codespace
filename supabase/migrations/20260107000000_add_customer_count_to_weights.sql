-- Migration: Add customer_count column to sarfi_profile_weights
-- Purpose: Store customer count per meter in weight profiles for auto-calculating weight factors
-- Date: 2026-01-07

-- Add customer_count column
ALTER TABLE sarfi_profile_weights 
ADD COLUMN IF NOT EXISTS customer_count INTEGER DEFAULT 0 NOT NULL;

-- Add comment
COMMENT ON COLUMN sarfi_profile_weights.customer_count IS 'Number of customers associated with this meter in the profile period';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sarfi_profile_weights_customer_count 
ON sarfi_profile_weights(customer_count);

-- Update existing records to have customer_count = 0 if null
UPDATE sarfi_profile_weights 
SET customer_count = 0 
WHERE customer_count IS NULL;

-- Log completion
DO $$ 
BEGIN 
  RAISE NOTICE 'Migration completed: Added customer_count column to sarfi_profile_weights';
END $$;
