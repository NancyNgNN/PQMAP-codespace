-- =====================================================
-- Update Circuit IDs to H1/H2/H3 Format
-- =====================================================
-- Purpose: Update circuit_id to real transformer format (H1, H2, H3)
--          and generate customer_transformer_matching mappings
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Step 1: Assign random number of circuits (1-3) to each substation
CREATE TEMP TABLE substation_circuits AS
SELECT 
  id as substation_id,
  code,
  FLOOR(RANDOM() * 3 + 1)::INTEGER as circuit_count  -- Random 1-3 circuits
FROM substations;

-- Step 2: Update pq_events circuit_id to H1, H2, or H3
UPDATE pq_events pe
SET circuit_id = 'H' || (FLOOR(RANDOM() * 
  (SELECT circuit_count FROM substation_circuits sc WHERE sc.substation_id = pe.substation_id)
) + 1)::TEXT
WHERE substation_id IS NOT NULL;

-- Step 3: Update pq_meters circuit_id to H1, H2, or H3
UPDATE pq_meters pm
SET circuit_id = 'H' || (FLOOR(RANDOM() * 
  (SELECT circuit_count FROM substation_circuits sc WHERE sc.substation_id = pm.substation_id)
) + 1)::TEXT
WHERE substation_id IS NOT NULL;

-- Step 4: Clear existing customer_transformer_matching records (if any)
TRUNCATE TABLE customer_transformer_matching CASCADE;

-- Step 5: Generate customer_transformer_matching records
-- Map each customer to their substation with random transformer (H1/H2/H3)
INSERT INTO customer_transformer_matching (
  customer_id,
  substation_id,
  circuit_id,
  active,
  created_at,
  updated_at,
  updated_by
)
SELECT 
  c.id as customer_id,
  c.substation_id,
  'H' || (FLOOR(RANDOM() * 
    (SELECT circuit_count FROM substation_circuits sc WHERE sc.substation_id = c.substation_id)
  ) + 1)::TEXT as circuit_id,
  true as active,
  now() as created_at,
  now() as updated_at,
  NULL as updated_by
FROM customers c
WHERE c.substation_id IS NOT NULL;

-- Step 6: Drop temporary table
DROP TABLE substation_circuits;

-- Step 7: Update statistics
ANALYZE pq_events;
ANALYZE pq_meters;
ANALYZE customer_transformer_matching;

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check circuit distribution in pq_events
SELECT 
  s.code as substation_code,
  s.name as substation_name,
  pe.circuit_id,
  COUNT(*) as event_count
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
WHERE pe.circuit_id IS NOT NULL
GROUP BY s.id, s.code, s.name, pe.circuit_id
ORDER BY s.code, pe.circuit_id;

-- Check circuit distribution in pq_meters
SELECT 
  s.code as substation_code,
  s.name as substation_name,
  pm.circuit_id,
  COUNT(*) as meter_count
FROM substations s
LEFT JOIN pq_meters pm ON pm.substation_id = s.id
WHERE pm.circuit_id IS NOT NULL
GROUP BY s.id, s.code, s.name, pm.circuit_id
ORDER BY s.code, pm.circuit_id;

-- Check customer_transformer_matching distribution
SELECT 
  s.code as substation_code,
  s.name as substation_name,
  ctm.circuit_id,
  COUNT(*) as customer_count
FROM substations s
LEFT JOIN customer_transformer_matching ctm ON ctm.substation_id = s.id
WHERE ctm.circuit_id IS NOT NULL
GROUP BY s.id, s.code, s.name, ctm.circuit_id
ORDER BY s.code, ctm.circuit_id;

-- Summary: Unique circuits per substation (from events)
SELECT 
  s.code,
  s.name,
  COUNT(DISTINCT pe.circuit_id) as unique_circuits,
  STRING_AGG(DISTINCT pe.circuit_id, ', ' ORDER BY pe.circuit_id) as circuits
FROM substations s
LEFT JOIN pq_events pe ON pe.substation_id = s.id
WHERE pe.circuit_id IS NOT NULL
GROUP BY s.id, s.code, s.name
ORDER BY unique_circuits DESC, s.code;

-- Verify customer mappings created
SELECT 
  'Total customers' as metric,
  COUNT(*) as count
FROM customers
WHERE substation_id IS NOT NULL
UNION ALL
SELECT 
  'Total mappings created' as metric,
  COUNT(*) as count
FROM customer_transformer_matching
UNION ALL
SELECT 
  'Active mappings' as metric,
  COUNT(*) as count
FROM customer_transformer_matching
WHERE active = true;

-- Sample customer mappings
SELECT 
  c.account_number,
  c.name as customer_name,
  s.code as substation_code,
  s.name as substation_name,
  ctm.circuit_id as transformer_id,
  ctm.active
FROM customer_transformer_matching ctm
JOIN customers c ON c.id = ctm.customer_id
JOIN substations s ON s.id = ctm.substation_id
ORDER BY s.code, ctm.circuit_id, c.account_number
LIMIT 20;

-- Check for unique circuits (should only see H1, H2, H3)
SELECT 
  DISTINCT circuit_id,
  'pq_events' as source
FROM pq_events
WHERE circuit_id IS NOT NULL
UNION
SELECT 
  DISTINCT circuit_id,
  'pq_meters' as source
FROM pq_meters
WHERE circuit_id IS NOT NULL
UNION
SELECT 
  DISTINCT circuit_id,
  'customer_transformer_matching' as source
FROM customer_transformer_matching
WHERE circuit_id IS NOT NULL
ORDER BY circuit_id;

-- ✅ Success summary
SELECT 
  '✅ Circuit ID Update Complete!' as status,
  (SELECT COUNT(DISTINCT circuit_id) FROM pq_events WHERE circuit_id IS NOT NULL) as unique_event_circuits,
  (SELECT COUNT(DISTINCT circuit_id) FROM pq_meters WHERE circuit_id IS NOT NULL) as unique_meter_circuits,
  (SELECT COUNT(DISTINCT circuit_id) FROM customer_transformer_matching WHERE circuit_id IS NOT NULL) as unique_mapping_circuits,
  (SELECT COUNT(*) FROM customer_transformer_matching WHERE active = true) as total_active_mappings;
