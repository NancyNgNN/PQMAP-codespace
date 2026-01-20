-- Migration: Update pq_service_records table for enhanced PQ Services feature
-- Date: December 18, 2025
-- Purpose: Add event_id linking, content field for rich text, and extend service types

-- Create service_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE service_type AS ENUM (
        'site_survey',
        'harmonic_analysis',
        'consultation',
        'on_site_study',
        'power_quality_audit',
        'installation_support'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new values to service_type enum if they don't exist
DO $$ 
BEGIN
    -- Add on_site_study if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'on_site_study' AND enumtypid = 'service_type'::regtype) THEN
        ALTER TYPE service_type ADD VALUE 'on_site_study';
    END IF;
    
    -- Add power_quality_audit if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'power_quality_audit' AND enumtypid = 'service_type'::regtype) THEN
        ALTER TYPE service_type ADD VALUE 'power_quality_audit';
    END IF;
    
    -- Add installation_support if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'installation_support' AND enumtypid = 'service_type'::regtype) THEN
        ALTER TYPE service_type ADD VALUE 'installation_support';
    END IF;
END $$;

-- Add new columns to pq_service_records table
ALTER TABLE pq_service_records
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES pq_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Create index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_pq_service_records_event_id ON pq_service_records(event_id);

-- Create index on customer_id for faster customer service history queries
CREATE INDEX IF NOT EXISTS idx_pq_service_records_customer_id ON pq_service_records(customer_id);

-- Create index on service_date for time-based filtering
CREATE INDEX IF NOT EXISTS idx_pq_service_records_service_date ON pq_service_records(service_date);

-- Add comments for documentation
COMMENT ON COLUMN pq_service_records.event_id IS 'Optional link to PQ event that prompted this service';
COMMENT ON COLUMN pq_service_records.content IS 'Rich text content with notes, observations, and service details';

-- Migrate existing mock data from code to database
-- Note: This will only insert if no records exist
INSERT INTO pq_service_records (
  id,
  customer_id,
  service_date,
  service_type,
  findings,
  recommendations,
  benchmark_standard,
  engineer_id,
  content,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  c.id,
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN '2024-11-15'::date
    WHEN c.name = 'MTR Corporation' THEN '2024-11-20'::date
    ELSE '2024-11-25'::date
  END,
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN 'harmonic_analysis'::service_type
    WHEN c.name = 'MTR Corporation' THEN 'site_survey'::service_type
    ELSE 'consultation'::service_type
  END,
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN 'Elevated THD levels detected in 11kV system during peak hours'
    WHEN c.name = 'MTR Corporation' THEN 'Power quality monitoring equipment installed at critical substations'
    ELSE 'Reviewed current power quality concerns and provided recommendations'
  END,
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN 'Install active harmonic filters, conduct load balancing study'
    WHEN c.name = 'MTR Corporation' THEN 'Establish baseline monitoring, review data quarterly'
    ELSE 'Implement voltage regulation, consider UPS systems for critical loads'
  END,
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN 'IEEE 519'
    WHEN c.name = 'MTR Corporation' THEN 'IEC 61000'
    ELSE 'ITIC Curve'
  END,
  (SELECT id FROM profiles WHERE role = 'engineer' LIMIT 1),
  CASE 
    WHEN c.name = 'Hong Kong Hospital' THEN 'Comprehensive harmonic analysis conducted. THD measurements taken at multiple locations. Recommendations provided for mitigation.'
    WHEN c.name = 'MTR Corporation' THEN 'Site survey completed with power quality monitoring equipment installation. Baseline measurements recorded for future comparison.'
    ELSE 'Consultation session with facility management team. Discussed power quality concerns and provided initial recommendations.'
  END,
  NOW(),
  NOW()
FROM customers c
WHERE c.name IN ('Hong Kong Hospital', 'MTR Corporation', 'Shopping Mall 3')
  AND NOT EXISTS (SELECT 1 FROM pq_service_records WHERE customer_id = c.id)
ON CONFLICT DO NOTHING;

-- Verification query
SELECT 
  COUNT(*) as total_records,
  COUNT(event_id) as records_with_events,
  COUNT(content) as records_with_content
FROM pq_service_records;
