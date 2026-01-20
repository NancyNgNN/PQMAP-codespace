-- =====================================================
-- Generate 5 False Event Records for Demonstration
-- =====================================================
-- Purpose: Create sample false events with characteristics
--          indicating false detections (short duration, 
--          high remaining voltage, zero customer impact)
-- Date: December 17, 2025
-- =====================================================

-- Insert 5 false events with different substations
-- These events have suspicious patterns: very short duration (< 100ms) and high remaining voltage (> 95%)

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
) VALUES
-- False Event 1: APA Substation (Airport 'A')
(
  'voltage_dip',
  NOW() - INTERVAL '2 days' - INTERVAL '3 hours',
  (SELECT id FROM substations WHERE code = 'APA' LIMIT 1),
  NULL,
  '132kV',
  'APA-C001',
  45, -- Very short duration: 45ms
  2.5, -- Minimal magnitude
  'low',
  'new',
  false,
  NULL,
  ARRAY['A', 'B', 'C'],
  false,
  NULL,
  0, -- Zero customer impact
  97.5, -- Very high remaining voltage: 97.5%
  true, -- Validated by ADMS
  false,
  true, -- This is a false event
  'Auto-generated false event for demonstration. Pattern: Very short duration (45ms) with minimal voltage drop (97.5% remaining).',
  NOW() - INTERVAL '2 days'
),

-- False Event 2: BCH Substation (Beacon Hill)
(
  'voltage_dip',
  NOW() - INTERVAL '4 days' - INTERVAL '7 hours',
  (SELECT id FROM substations WHERE code = 'BCH' LIMIT 1),
  NULL,
  '132kV',
  'BCH-C002',
  38, -- Very short duration: 38ms
  1.8,
  'low',
  'acknowledged',
  false,
  NULL,
  ARRAY['A'],
  false,
  NULL,
  0,
  98.2, -- Very high remaining voltage: 98.2%
  true,
  false,
  true,
  'Auto-generated false event for demonstration. Pattern: Extremely short duration (38ms) with negligible voltage impact (98.2% remaining). Likely measurement noise.',
  NOW() - INTERVAL '4 days'
),

-- False Event 3: CAN Substation (Canton Road)
(
  'voltage_dip',
  NOW() - INTERVAL '5 days' - INTERVAL '15 hours',
  (SELECT id FROM substations WHERE code = 'CAN' LIMIT 1),
  NULL,
  '132kV',
  'CAN-C101',
  52, -- Short duration: 52ms
  3.2,
  'low',
  'investigating',
  false,
  NULL,
  ARRAY['B', 'C'],
  false,
  NULL,
  0,
  96.8, -- High remaining voltage: 96.8%
  true,
  false,
  true,
  'Auto-generated false event for demonstration. Pattern: Brief disturbance (52ms) with minimal impact (96.8% remaining). Validated as false positive.',
  NOW() - INTERVAL '5 days'
),

-- False Event 4: BOU Substation (Boundary Street)
(
  'voltage_dip',
  NOW() - INTERVAL '6 days' - INTERVAL '4 hours',
  (SELECT id FROM substations WHERE code = 'BOU' LIMIT 1),
  NULL,
  '132kV',
  'BOU-C055',
  42, -- Very short duration: 42ms
  2.1,
  'low',
  'new',
  false,
  NULL,
  ARRAY['A', 'B'],
  false,
  NULL,
  0,
  97.9, -- Very high remaining voltage: 97.9%
  true,
  false,
  true,
  'Auto-generated false event for demonstration. Pattern: Transient spike (42ms) with negligible voltage sag (97.9% remaining). No customer complaints received.',
  NOW() - INTERVAL '6 days'
),

-- False Event 5: CHY Substation (Chuk Yuen)
(
  'voltage_dip',
  NOW() - INTERVAL '7 days' - INTERVAL '10 hours',
  (SELECT id FROM substations WHERE code = 'CHY' LIMIT 1),
  NULL,
  '132kV',
  'CHY-C089',
  35, -- Very short duration: 35ms
  1.5,
  'low',
  'acknowledged',
  false,
  NULL,
  ARRAY['C'],
  false,
  NULL,
  0,
  98.5, -- Very high remaining voltage: 98.5%
  true,
  false,
  true,
  'Auto-generated false event for demonstration. Pattern: Minimal disturbance (35ms) with highest remaining voltage (98.5%). Cross-checked with SCADA - no actual event occurred.',
  NOW() - INTERVAL '7 days'
);

-- Display confirmation
SELECT 
  'False events generated successfully!' as message,
  COUNT(*) as total_false_events,
  MIN(timestamp) as earliest_event,
  MAX(timestamp) as latest_event
FROM pq_events
WHERE false_event = true AND remarks LIKE '%Auto-generated false event for demonstration%';
