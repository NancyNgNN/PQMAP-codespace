-- =====================================================
-- Fix Child Events Data & Generate Test Data
-- =====================================================
-- Purpose: 
--   1. Fix existing child events to have correct is_child_event flag
--   2. Generate test data: child events marked as false events
-- Date: December 17, 2025
-- =====================================================

-- =====================================================
-- PART 1: Fix Existing Child Events
-- =====================================================
-- Update all events that have parent_event_id to be marked as child events

UPDATE pq_events
SET is_child_event = true
WHERE parent_event_id IS NOT NULL 
  AND is_child_event = false;

-- Display what was fixed
SELECT 
  'Fixed child events!' as message,
  COUNT(*) as events_fixed
FROM pq_events
WHERE parent_event_id IS NOT NULL AND is_child_event = true;

-- =====================================================
-- PART 2: Generate Test Mother Event with False Child Events
-- =====================================================
-- Create a mother event and several child events, where some children are false events

-- Insert Mother Event
DO $$
DECLARE
  mother_event_id UUID;
  child1_id UUID;
  child2_id UUID;
  child3_id UUID;
  child4_id UUID;
BEGIN
  -- Create mother event
  INSERT INTO pq_events (
    event_type,
    timestamp,
    substation_id,
    meter_id,
    voltage_level,
    circuit_id,
    duration_ms,
    magnitude,
    severity,
    status,
    is_mother_event,
    parent_event_id,
    affected_phases,
    is_child_event,
    grouping_type,
    customer_count,
    remaining_voltage,
    validated_by_adms,
    is_special_event,
    false_event,
    remarks,
    created_at
  ) VALUES (
    'voltage_dip',
    NOW() - INTERVAL '1 day',
    (SELECT id FROM substations WHERE code = 'APA' LIMIT 1),
    NULL,
    '132kV',
    'APA-C001',
    850, -- Longer duration
    15.5,
    'medium',
    'investigating',
    true, -- This is a mother event
    NULL,
    ARRAY['A', 'B', 'C'],
    false,
    'automatic',
    25,
    84.5,
    false,
    false,
    false, -- Not a false event
    'Test mother event for false child event demonstration',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO mother_event_id;

  RAISE NOTICE 'Created mother event: %', mother_event_id;

  -- Create Child Event 1 (Real Event)
  INSERT INTO pq_events (
    event_type,
    timestamp,
    substation_id,
    meter_id,
    voltage_level,
    circuit_id,
    duration_ms,
    magnitude,
    severity,
    status,
    is_mother_event,
    parent_event_id,
    affected_phases,
    is_child_event,
    grouping_type,
    customer_count,
    remaining_voltage,
    validated_by_adms,
    is_special_event,
    false_event,
    remarks,
    created_at
  ) VALUES (
    'voltage_dip',
    NOW() - INTERVAL '1 day' + INTERVAL '2 seconds',
    (SELECT id FROM substations WHERE code = 'BCH' LIMIT 1),
    (SELECT id FROM pq_meters WHERE substation_id = (SELECT id FROM substations WHERE code = 'BCH' LIMIT 1) LIMIT 1),
    '132kV',
    'BCH-C002',
    820,
    14.2,
    'medium',
    'investigating',
    false,
    mother_event_id, -- Link to mother
    ARRAY['A', 'B'],
    true, -- This IS a child event
    NULL,
    10,
    85.8,
    false,
    false,
    false, -- NOT a false event
    'Real child event 1',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO child1_id;

  -- Create Child Event 2 (FALSE EVENT)
  INSERT INTO pq_events (
    event_type,
    timestamp,
    substation_id,
    meter_id,
    voltage_level,
    circuit_id,
    duration_ms,
    magnitude,
    severity,
    status,
    is_mother_event,
    parent_event_id,
    affected_phases,
    is_child_event,
    grouping_type,
    customer_count,
    remaining_voltage,
    validated_by_adms,
    is_special_event,
    false_event,
    remarks,
    created_at
  ) VALUES (
    'voltage_dip',
    NOW() - INTERVAL '1 day' + INTERVAL '5 seconds',
    (SELECT id FROM substations WHERE code = 'CAN' LIMIT 1),
    (SELECT id FROM pq_meters WHERE substation_id = (SELECT id FROM substations WHERE code = 'CAN' LIMIT 1) LIMIT 1),
    '132kV',
    'CAN-C101',
    35, -- Very short - suspicious
    1.5,
    'low',
    'investigating',
    false,
    mother_event_id, -- Link to mother
    ARRAY['C'],
    true, -- This IS a child event
    NULL,
    0,
    98.5, -- Very high remaining voltage - suspicious
    true, -- Validated by ADMS
    false,
    true, -- THIS IS A FALSE EVENT
    'False child event - measurement noise detected',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO child2_id;

  -- Create Child Event 3 (Real Event)
  INSERT INTO pq_events (
    event_type,
    timestamp,
    substation_id,
    meter_id,
    voltage_level,
    circuit_id,
    duration_ms,
    magnitude,
    severity,
    status,
    is_mother_event,
    parent_event_id,
    affected_phases,
    is_child_event,
    grouping_type,
    customer_count,
    remaining_voltage,
    validated_by_adms,
    is_special_event,
    false_event,
    remarks,
    created_at
  ) VALUES (
    'voltage_dip',
    NOW() - INTERVAL '1 day' + INTERVAL '8 seconds',
    (SELECT id FROM substations WHERE code = 'BOU' LIMIT 1),
    (SELECT id FROM pq_meters WHERE substation_id = (SELECT id FROM substations WHERE code = 'BOU' LIMIT 1) LIMIT 1),
    '132kV',
    'BOU-C055',
    790,
    13.8,
    'medium',
    'investigating',
    false,
    mother_event_id, -- Link to mother
    ARRAY['A', 'C'],
    true, -- This IS a child event
    NULL,
    8,
    86.2,
    false,
    false,
    false, -- NOT a false event
    'Real child event 3',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO child3_id;

  -- Create Child Event 4 (FALSE EVENT)
  INSERT INTO pq_events (
    event_type,
    timestamp,
    substation_id,
    meter_id,
    voltage_level,
    circuit_id,
    duration_ms,
    magnitude,
    severity,
    status,
    is_mother_event,
    parent_event_id,
    affected_phases,
    is_child_event,
    grouping_type,
    customer_count,
    remaining_voltage,
    validated_by_adms,
    is_special_event,
    false_event,
    remarks,
    created_at
  ) VALUES (
    'voltage_dip',
    NOW() - INTERVAL '1 day' + INTERVAL '12 seconds',
    (SELECT id FROM substations WHERE code = 'CHY' LIMIT 1),
    (SELECT id FROM pq_meters WHERE substation_id = (SELECT id FROM substations WHERE code = 'CHY' LIMIT 1) LIMIT 1),
    '132kV',
    'CHY-C089',
    42, -- Very short - suspicious
    2.1,
    'low',
    'investigating',
    false,
    mother_event_id, -- Link to mother
    ARRAY['B'],
    true, -- This IS a child event
    NULL,
    0,
    97.9, -- Very high remaining voltage - suspicious
    true, -- Validated by ADMS
    false,
    true, -- THIS IS A FALSE EVENT
    'False child event - transient spike, no actual voltage sag',
    NOW() - INTERVAL '1 day'
  ) RETURNING id INTO child4_id;

  -- Display summary
  RAISE NOTICE 'Created test event group:';
  RAISE NOTICE '  Mother Event: %', mother_event_id;
  RAISE NOTICE '  Child 1 (Real): %', child1_id;
  RAISE NOTICE '  Child 2 (FALSE): %', child2_id;
  RAISE NOTICE '  Child 3 (Real): %', child3_id;
  RAISE NOTICE '  Child 4 (FALSE): %', child4_id;
END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT 
  'Test data created successfully!' as status,
  (SELECT COUNT(*) FROM pq_events WHERE is_mother_event = true AND remarks = 'Test mother event for false child event demonstration') as mother_events_created,
  (SELECT COUNT(*) FROM pq_events WHERE is_child_event = true AND parent_event_id IN (SELECT id FROM pq_events WHERE remarks = 'Test mother event for false child event demonstration')) as child_events_created,
  (SELECT COUNT(*) FROM pq_events WHERE is_child_event = true AND false_event = true AND parent_event_id IN (SELECT id FROM pq_events WHERE remarks = 'Test mother event for false child event demonstration')) as false_child_events_created;

-- Show the event group
SELECT 
  CASE 
    WHEN is_mother_event THEN '🔴 MOTHER'
    WHEN false_event THEN '⚠️ FALSE CHILD'
    ELSE '✅ REAL CHILD'
  END as type,
  id,
  event_type,
  timestamp,
  circuit_id,
  duration_ms,
  remaining_voltage,
  is_child_event,
  false_event,
  validated_by_adms,
  remarks
FROM pq_events
WHERE 
  remarks = 'Test mother event for false child event demonstration'
  OR parent_event_id IN (SELECT id FROM pq_events WHERE remarks = 'Test mother event for false child event demonstration')
ORDER BY is_mother_event DESC, timestamp;
