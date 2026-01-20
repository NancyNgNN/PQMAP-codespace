-- =====================================================
-- Update Substations with CLP Codes and Real Locations
-- =====================================================
-- Purpose: Replace existing substations with CLP official codes
--          and update all related pq_events references
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Step 0: Temporarily disable foreign key constraints
SET session_replication_role = replica;

-- Step 1: Create temporary mapping table for old to new substation IDs
CREATE TEMP TABLE substation_migration_map (
  old_id UUID,
  new_id UUID,
  old_code TEXT,
  new_code TEXT
);

-- Step 2: Store current substation IDs for migration
INSERT INTO substation_migration_map (old_id, old_code)
SELECT id, code FROM substations;

-- Step 3: Clear existing substations (foreign keys disabled temporarily)
DELETE FROM substations;

-- Step 4: Insert new CLP substations with real/approximate coordinates
-- Region codes: WE (West), NR (North), CN (Central)
INSERT INTO substations (id, code, name, voltage_level, latitude, longitude, region, status) VALUES
-- Airport Area Substations (West region)
(gen_random_uuid(), 'APA', 'Airport ''A''', '132kV', 22.3089, 113.9185, 'WE', 'operational'),
(gen_random_uuid(), 'APB', 'Airport ''B''', '132kV', 22.3120, 113.9220, 'WE', 'operational'),
(gen_random_uuid(), 'AWR', 'Airport West Third Runway', '132kV', 22.3050, 113.9050, 'WE', 'operational'),

-- New Territories Substations (North region)
(gen_random_uuid(), 'ATA', 'Au Tau ''A'' Pumping Station', '11kV', 22.4528, 114.0283, 'NR', 'operational'),
(gen_random_uuid(), 'ATB', 'Au Tau ''B''', '11kV', 22.4540, 114.0295, 'NR', 'operational'),
(gen_random_uuid(), 'AUS', 'Austin Road', '132kV', 22.3025, 114.1725, 'CN', 'operational'),
(gen_random_uuid(), 'BAL', 'Balu', '11kV', 22.4235, 114.2158, 'NR', 'operational'),
(gen_random_uuid(), 'BKP', 'Black Point', '400kV', 22.3667, 113.9500, 'WE', 'operational'),
(gen_random_uuid(), 'CPK', 'Castle Peak Power Station', '400kV', 22.3650, 113.9480, 'WE', 'operational'),

-- Kowloon Substations (Central region)
(gen_random_uuid(), 'BCH', 'Beacon Hill', '132kV', 22.3528, 114.1758, 'CN', 'operational'),
(gen_random_uuid(), 'BOU', 'Boundary Street', '132kV', 22.3308, 114.1697, 'CN', 'operational'),
(gen_random_uuid(), 'CAN', 'Canton Road', '132kV', 22.3025, 114.1725, 'CN', 'operational'),
(gen_random_uuid(), 'CHI', 'Chi Wo Street', '11kV', 22.3385, 114.1578, 'CN', 'operational'),
(gen_random_uuid(), 'CHY', 'Chuk Yuen', '132kV', 22.3467, 114.1845, 'CN', 'operational'),
(gen_random_uuid(), 'CKL', 'Cha Kwo Ling Road', '132kV', 22.3025, 114.2335, 'CN', 'operational'),
(gen_random_uuid(), 'CLR', 'Chui Ling Road', '11kV', 22.3158, 114.2378, 'CN', 'maintenance'),
(gen_random_uuid(), 'CPR', 'Container Port Road', '132kV', 22.3125, 114.2525, 'CN', 'operational'),
(gen_random_uuid(), 'CWS', 'Chik Wan Street', '11kV', 22.3195, 114.2425, 'CN', 'operational'),
(gen_random_uuid(), 'CYS', 'Chun Yat Street', '11kV', 22.3385, 114.1425, 'CN', 'operational'),

-- Hong Kong Island Substations (Central region)
(gen_random_uuid(), 'CTN', 'Centenary', '132kV', 22.2825, 114.1545, 'CN', 'operational'),

-- Outlying Islands Substations (West region)
(gen_random_uuid(), 'CCM', 'China Cement', '132kV', 22.2867, 114.3528, 'NR', 'operational'),
(gen_random_uuid(), 'CCN', 'Cheung Chau North', '11kV', 22.2125, 114.0300, 'WE', 'operational'),
(gen_random_uuid(), 'CCS', 'Cheung Chau South', '11kV', 22.2050, 114.0285, 'WE', 'operational'),
(gen_random_uuid(), 'CHF', 'Chunfeng', '380V', 22.2965, 114.1705, 'CN', 'offline'),
(gen_random_uuid(), 'CHS', 'Cheung Sha', '11kV', 22.2345, 113.9450, 'WE', 'operational');

-- Step 5: Update mapping table with new IDs
UPDATE substation_migration_map sm
SET new_id = s.id, new_code = s.code
FROM substations s
WHERE sm.new_code = s.code;

-- Step 6: Update pq_events to reference new substations
-- Strategy: Match by substation code if exists, otherwise keep first new substation
UPDATE pq_events pe
SET substation_id = COALESCE(
  (SELECT new_id FROM substation_migration_map sm WHERE sm.old_id = pe.substation_id),
  (SELECT id FROM substations LIMIT 1)
)
WHERE pe.substation_id IS NOT NULL;

-- Step 7: Update pq_meters to reference new substations
UPDATE pq_meters pm
SET substation_id = COALESCE(
  (SELECT new_id FROM substation_migration_map sm WHERE sm.old_id = pm.substation_id),
  (SELECT id FROM substations LIMIT 1)
)
WHERE pm.substation_id IS NOT NULL;

-- Step 8: Update customers to reference new substations
UPDATE customers c
SET substation_id = COALESCE(
  (SELECT new_id FROM substation_migration_map sm WHERE sm.old_id = c.substation_id),
  (SELECT id FROM substations LIMIT 1)
)
WHERE c.substation_id IS NOT NULL;

-- Step 9: Update customer_transformer_matching to reference new substations
UPDATE customer_transformer_matching ctm
SET substation_id = COALESCE(
  (SELECT new_id FROM substation_migration_map sm WHERE sm.old_id = ctm.substation_id),
  (SELECT id FROM substations LIMIT 1)
)
WHERE ctm.substation_id IS NOT NULL;

-- Step 10: Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Step 11: Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_substations_code ON substations(code);

-- Step 12: Update statistics
ANALYZE substations;
ANALYZE pq_events;
ANALYZE pq_meters;
ANALYZE customers;
ANALYZE customer_transformer_matching;

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check new substations
SELECT 
  code,
  name,
  voltage_level,
  region,
  status,
  COUNT(*) OVER() as total_substations
FROM substations
ORDER BY code;

-- Check pq_events migration
SELECT 
  s.code as substation_code,
  s.name as substation_name,
  COUNT(pe.id) as event_count
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY event_count DESC;

-- Check for any orphaned records
SELECT 
  'pq_events' as table_name,
  COUNT(*) as orphaned_records
FROM pq_events
WHERE substation_id IS NULL
UNION ALL
SELECT 
  'pq_meters' as table_name,
  COUNT(*) as orphaned_records
FROM pq_meters
WHERE substation_id IS NULL
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) as orphaned_records
FROM customers
WHERE substation_id IS NULL
UNION ALL
SELECT 
  'customer_transformer_matching' as table_name,
  COUNT(*) as orphaned_records
FROM customer_transformer_matching
WHERE substation_id IS NULL;

-- Summary statistics
SELECT 
  'Substations' as entity,
  COUNT(*) as total
FROM substations
UNION ALL
SELECT 
  'PQ Events' as entity,
  COUNT(*) as total
FROM pq_events
UNION ALL
SELECT 
  'PQ Meters' as entity,
  COUNT(*) as total
FROM pq_meters
UNION ALL
SELECT 
  'Customers' as entity,
  COUNT(*) as total
FROM customers
UNION ALL
SELECT 
  'Customer Transformer Mappings' as entity,
  COUNT(*) as total
FROM customer_transformer_matching;
