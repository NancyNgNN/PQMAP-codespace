-- Quick verification before running backfill
-- Run these queries to check your database state

-- 1. Check your specific event
SELECT 
  id,
  event_type,
  substation_id,
  circuit_id,
  customer_count,
  timestamp
FROM pq_events
WHERE id = '61dd3e52-94ed-4370-9f68-94453c09ca6b';

-- Expected: Should show customer_count = 56, and have valid substation_id and circuit_id

-- 2. Check if any customer impacts exist for this event
SELECT COUNT(*) as existing_impacts
FROM event_customer_impact
WHERE event_id = '61dd3e52-94ed-4370-9f68-94453c09ca6b';

-- Expected: Should return 0 (that's why the tab is empty)

-- 3. Check customer_transformer_matching records
SELECT COUNT(*) as total_mappings,
       COUNT(DISTINCT customer_id) as unique_customers,
       COUNT(DISTINCT substation_id) as unique_substations
FROM customer_transformer_matching
WHERE active = true;

-- Expected: Should have mappings (>0) if migration ran successfully

-- 4. Check if generate function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'generate_customer_impacts_for_event'
AND routine_schema = 'public';

-- Expected: Should return 1 row with routine_type = 'FUNCTION'

-- 5. Sample customers that should be affected
SELECT 
  c.id,
  c.name,
  c.account_number,
  ctm.substation_id,
  ctm.circuit_id,
  s.code as substation_code
FROM customer_transformer_matching ctm
JOIN customers c ON c.id = ctm.customer_id
JOIN substations s ON s.id = ctm.substation_id
WHERE ctm.active = true
AND ctm.substation_id = (
  SELECT substation_id 
  FROM pq_events 
  WHERE id = '61dd3e52-94ed-4370-9f68-94453c09ca6b'
)
AND ctm.circuit_id = (
  SELECT circuit_id 
  FROM pq_events 
  WHERE id = '61dd3e52-94ed-4370-9f68-94453c09ca6b'
)
LIMIT 5;

-- Expected: Should show 5 sample customers that will be affected by this event
