-- =====================================================
-- Test Data for Customer Transformer Matching
-- =====================================================
-- Purpose: Create sample mappings to test automatic customer impact generation
-- Date: December 15, 2025
-- =====================================================

-- This script creates test mappings between customers, substations, and circuits
-- Use this data to test the automatic customer impact generation

BEGIN;

-- Get some sample customers, substations, and circuits for testing
-- Replace the values below with actual IDs from your database

-- Example: Create mappings for critical customers
-- You'll need to replace these IDs with actual values from your database:

-- Step 1: Find some customers
-- SELECT id, account_number, name FROM customers WHERE critical_customer = true LIMIT 10;

-- Step 2: Find substations
-- SELECT id, code, name FROM substations LIMIT 5;

-- Step 3: Find circuits for those substations
-- SELECT DISTINCT circuit_id FROM pq_events WHERE substation_id = '<your_substation_id>' AND circuit_id IS NOT NULL;

-- Example inserts (REPLACE WITH YOUR ACTUAL DATA):
/*
INSERT INTO customer_transformer_matching (
  customer_id,
  substation_id,
  circuit_id,
  active,
  updated_by
) VALUES
  (
    '<customer_id_1>',
    '<substation_id_1>',
    'CIRCUIT_001',
    true,
    '<your_user_id>'
  ),
  (
    '<customer_id_2>',
    '<substation_id_1>',
    'CIRCUIT_001',
    true,
    '<your_user_id>'
  ),
  (
    '<customer_id_3>',
    '<substation_id_2>',
    'CIRCUIT_002',
    true,
    '<your_user_id>'
  );
*/

-- Verify the mappings were created
SELECT 
  ctm.id,
  c.account_number,
  c.name as customer_name,
  s.code as substation_code,
  ctm.circuit_id,
  ctm.active,
  ctm.created_at
FROM customer_transformer_matching ctm
JOIN customers c ON c.id = ctm.customer_id
JOIN substations s ON s.id = ctm.substation_id
WHERE ctm.active = true
ORDER BY ctm.created_at DESC;

COMMIT;

-- =====================================================
-- After creating mappings, test the auto-generation:
-- =====================================================

-- Option 1: Create a new test event (will auto-generate impacts)
/*
INSERT INTO pq_events (
  event_type,
  substation_id,
  circuit_id,
  meter_id,
  timestamp,
  duration_ms,
  magnitude,
  severity,
  status,
  voltage_level,
  customer_count
) VALUES (
  'voltage_dip',
  '<substation_id_with_mapping>',
  '<circuit_id_with_mapping>',
  '<meter_id>',
  now(),
  5000,  -- 5 seconds
  0.7,   -- 70% voltage
  'high',
  'new',
  '11kV',
  0
);

-- Check if customer impacts were auto-generated
SELECT 
  eci.*,
  c.name as customer_name,
  pe.severity as event_severity
FROM event_customer_impact eci
JOIN customers c ON c.id = eci.customer_id
JOIN pq_events pe ON pe.id = eci.event_id
WHERE eci.event_id = '<your_new_event_id>'
ORDER BY eci.created_at DESC;
*/

-- Option 2: Test backfill on existing event
/*
-- Find an existing event with matching substation/circuit
SELECT id, substation_id, circuit_id, severity, duration_ms
FROM pq_events
WHERE substation_id = '<substation_id_with_mapping>'
AND circuit_id = '<circuit_id_with_mapping>'
LIMIT 1;

-- Manually trigger the function for that event
SELECT generate_customer_impacts_for_event('<event_id>');

-- Check results
SELECT * FROM event_customer_impact WHERE event_id = '<event_id>';
*/

-- =====================================================
-- Helper Queries
-- =====================================================

-- Count mappings by substation
SELECT 
  s.code,
  s.name,
  COUNT(*) as mapping_count
FROM customer_transformer_matching ctm
JOIN substations s ON s.id = ctm.substation_id
WHERE ctm.active = true
GROUP BY s.id, s.code, s.name
ORDER BY mapping_count DESC;

-- Find events that could match your mappings
SELECT 
  pe.id,
  pe.event_type,
  s.code as substation,
  pe.circuit_id,
  pe.severity,
  pe.timestamp,
  COUNT(eci.id) as existing_impacts
FROM pq_events pe
JOIN substations s ON s.id = pe.substation_id
LEFT JOIN event_customer_impact eci ON eci.event_id = pe.id
WHERE pe.substation_id IN (
  SELECT DISTINCT substation_id 
  FROM customer_transformer_matching 
  WHERE active = true
)
AND pe.circuit_id IN (
  SELECT DISTINCT circuit_id 
  FROM customer_transformer_matching 
  WHERE active = true
)
GROUP BY pe.id, s.code, pe.circuit_id, pe.severity, pe.timestamp, pe.event_type
ORDER BY pe.timestamp DESC
LIMIT 20;
