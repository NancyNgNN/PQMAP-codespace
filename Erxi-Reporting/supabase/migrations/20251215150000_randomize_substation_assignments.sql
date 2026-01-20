-- =====================================================
-- Randomize Substation Assignments and Update Related Fields
-- =====================================================
-- Purpose: Distribute events/meters/customers across CLP substations
--          and update circuit_id to match substation codes
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Step 1: Create a function to randomly assign substations
CREATE OR REPLACE FUNCTION random_substation_id()
RETURNS UUID AS $$
  SELECT id FROM substations ORDER BY RANDOM() LIMIT 1;
$$ LANGUAGE SQL VOLATILE;

-- Step 2: Update pq_events with random substations and matching circuit_ids
UPDATE pq_events
SET 
  substation_id = random_substation_id(),
  circuit_id = 'CKT-' || LPAD(FLOOR(RANDOM() * 999 + 1)::TEXT, 3, '0')
WHERE substation_id IS NOT NULL;

-- Step 3: Update circuit_id to include substation code for better traceability
UPDATE pq_events pe
SET circuit_id = s.code || '-CKT-' || LPAD(FLOOR(RANDOM() * 99 + 1)::TEXT, 2, '0')
FROM substations s
WHERE pe.substation_id = s.id;

-- Step 4: Update pq_meters with random substations
UPDATE pq_meters
SET substation_id = random_substation_id()
WHERE substation_id IS NOT NULL;

-- Step 5: Update meter_id to include substation code
UPDATE pq_meters pm
SET meter_id = 'PQM-' || s.code || '-' || LPAD(FLOOR(RANDOM() * 999 + 1)::TEXT, 3, '0')
FROM substations s
WHERE pm.substation_id = s.id;

-- Step 6: Update customers with random substations
UPDATE customers
SET substation_id = random_substation_id()
WHERE substation_id IS NOT NULL;

-- Step 7: Update customer_transformer_matching with random substations and matching circuits
UPDATE customer_transformer_matching ctm
SET 
  substation_id = random_substation_id(),
  circuit_id = 'CKT-' || LPAD(FLOOR(RANDOM() * 99 + 1)::TEXT, 2, '0')
WHERE substation_id IS NOT NULL;

-- Step 8: Update circuit_id in customer_transformer_matching to match substation code
UPDATE customer_transformer_matching ctm
SET circuit_id = s.code || '-CKT-' || LPAD(FLOOR(RANDOM() * 99 + 1)::TEXT, 2, '0')
FROM substations s
WHERE ctm.substation_id = s.id;

-- Step 9: Drop the temporary function
DROP FUNCTION random_substation_id();

-- Step 10: Update statistics
ANALYZE substations;
ANALYZE pq_events;
ANALYZE pq_meters;
ANALYZE customers;
ANALYZE customer_transformer_matching;

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check distribution of events across substations
SELECT 
  s.code,
  s.name,
  COUNT(pe.id) as event_count,
  ROUND(COUNT(pe.id) * 100.0 / SUM(COUNT(pe.id)) OVER(), 2) as percentage
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY event_count DESC;

-- Check distribution of meters across substations
SELECT 
  s.code,
  s.name,
  COUNT(pm.id) as meter_count
FROM substations s
LEFT JOIN pq_meters pm ON pm.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY meter_count DESC;

-- Check distribution of customers across substations
SELECT 
  s.code,
  s.name,
  COUNT(c.id) as customer_count
FROM substations s
LEFT JOIN customers c ON c.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY customer_count DESC;

-- Check distribution of transformer mappings across substations
SELECT 
  s.code,
  s.name,
  COUNT(ctm.id) as mapping_count
FROM substations s
LEFT JOIN customer_transformer_matching ctm ON ctm.substation_id = s.id
GROUP BY s.id, s.code, s.name
ORDER BY mapping_count DESC;

-- Sample circuit_id patterns by substation
SELECT 
  s.code,
  s.name,
  ARRAY_AGG(DISTINCT pe.circuit_id ORDER BY pe.circuit_id) FILTER (WHERE pe.circuit_id IS NOT NULL) as sample_circuits
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
GROUP BY s.id, s.code, s.name
LIMIT 10;

-- Check for any records still pointing to the old single substation
SELECT 
  'pq_events' as table_name,
  COUNT(*) as count_with_old_id
FROM pq_events
WHERE substation_id = 'e0e62024-8b32-42f4-a5e7-3782705b27b6'
UNION ALL
SELECT 
  'pq_meters' as table_name,
  COUNT(*) as count_with_old_id
FROM pq_meters
WHERE substation_id = 'e0e62024-8b32-42f4-a5e7-3782705b27b6'
UNION ALL
SELECT 
  'customers' as table_name,
  COUNT(*) as count_with_old_id
FROM customers
WHERE substation_id = 'e0e62024-8b32-42f4-a5e7-3782705b27b6'
UNION ALL
SELECT 
  'customer_transformer_matching' as table_name,
  COUNT(*) as count_with_old_id
FROM customer_transformer_matching
WHERE substation_id = 'e0e62024-8b32-42f4-a5e7-3782705b27b6';

-- Summary statistics
SELECT 
  '✅ Randomization Complete!' as status,
  (SELECT COUNT(DISTINCT substation_id) FROM pq_events) as unique_substations_in_events,
  (SELECT COUNT(*) FROM substations) as total_substations,
  (SELECT COUNT(*) FROM pq_events) as total_events,
  (SELECT COUNT(*) FROM pq_meters) as total_meters,
  (SELECT COUNT(*) FROM customers) as total_customers;
