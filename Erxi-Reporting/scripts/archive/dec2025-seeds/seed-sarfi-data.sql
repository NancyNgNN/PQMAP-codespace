-- ============================================================================
-- SARFI Demonstration Data - SQL Script
-- Run this directly in Supabase SQL Editor
-- ============================================================================
-- This script creates:
-- 1. Demo substation (if needed)
-- 2. 8 PQ Meters with different voltage levels
-- 3. SARFI Profile for 2025
-- 4. Profile Weights for each meter
-- 5. ~240 Sample PQ Events for SARFI calculation
-- ============================================================================

-- Step 1: Get or create a substation
DO $$
DECLARE
  v_substation_id UUID;
BEGIN
  -- Try to get existing substation
  SELECT id INTO v_substation_id
  FROM substations
  LIMIT 1;
  
  -- If no substation exists, create one
  IF v_substation_id IS NULL THEN
    INSERT INTO substations (name, voltage_level, location, latitude, longitude)
    VALUES ('Demo Main Substation', '132kV', 'Demo Location', 1.3521, 103.8198)
    RETURNING id INTO v_substation_id;
    
    RAISE NOTICE 'Created new substation with ID: %', v_substation_id;
  ELSE
    RAISE NOTICE 'Using existing substation with ID: %', v_substation_id;
  END IF;
  
  -- Store substation_id for later use
  CREATE TEMP TABLE IF NOT EXISTS temp_vars (
    substation_id UUID
  );
  DELETE FROM temp_vars;
  INSERT INTO temp_vars VALUES (v_substation_id);
END $$;

-- Step 2: Create PQ Meters
INSERT INTO pq_meters (meter_id, substation_id, location, voltage_level, meter_type, installed_date)
SELECT * FROM (VALUES
  ('MTR-SARFI-001', (SELECT substation_id FROM temp_vars), 'Main Street Substation', '132kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-002', (SELECT substation_id FROM temp_vars), 'Industrial Park A', '132kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-003', (SELECT substation_id FROM temp_vars), 'Downtown District', '11kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-004', (SELECT substation_id FROM temp_vars), 'Residential Area North', '11kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-005', (SELECT substation_id FROM temp_vars), 'Commercial Zone East', '11kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-006', (SELECT substation_id FROM temp_vars), 'Factory Complex B', '400kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-007', (SELECT substation_id FROM temp_vars), 'Hospital District', '11kV', 'PQ Monitor', '2024-01-01'::timestamptz),
  ('MTR-SARFI-008', (SELECT substation_id FROM temp_vars), 'Tech Park South', '132kV', 'PQ Monitor', '2024-01-01'::timestamptz)
) AS v(meter_id, substation_id, location, voltage_level, meter_type, installed_date)
ON CONFLICT (meter_id) DO NOTHING;

-- Check how many meters were created/exist
DO $$
DECLARE
  v_meter_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_meter_count
  FROM pq_meters
  WHERE meter_id LIKE 'MTR-SARFI-%';
  
  RAISE NOTICE 'Total SARFI meters ready: %', v_meter_count;
END $$;

-- Step 3: Create SARFI Profile for 2025
INSERT INTO sarfi_profiles (name, description, year, is_active)
VALUES ('2025 Standard Profile', 'Standard SARFI calculation profile for 2025 with weighted factors', 2025, true)
ON CONFLICT (name) DO NOTHING;

-- Store profile_id for later use
DO $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id
  FROM sarfi_profiles
  WHERE name = '2025 Standard Profile';
  
  CREATE TEMP TABLE IF NOT EXISTS temp_profile (
    profile_id UUID
  );
  DELETE FROM temp_profile;
  INSERT INTO temp_profile VALUES (v_profile_id);
  
  RAISE NOTICE 'SARFI Profile ID: %', v_profile_id;
END $$;

-- Step 4: Create Profile Weights
-- Weight factors: 400kV=1.5, 132kV=1.2, 11kV=1.0
INSERT INTO sarfi_profile_weights (profile_id, meter_id, weight_factor, notes)
SELECT 
  (SELECT profile_id FROM temp_profile),
  m.id,
  CASE 
    WHEN m.voltage_level = '400kV' THEN 1.5
    WHEN m.voltage_level = '132kV' THEN 1.2
    WHEN m.voltage_level = '11kV' THEN 1.0
    ELSE 0.8
  END,
  'Weight factor based on ' || COALESCE(m.voltage_level, 'unknown') || ' voltage level'
FROM pq_meters m
WHERE m.meter_id LIKE 'MTR-SARFI-%'
ON CONFLICT (profile_id, meter_id) 
DO UPDATE SET 
  weight_factor = EXCLUDED.weight_factor,
  notes = EXCLUDED.notes;

-- Check weights created
DO $$
DECLARE
  v_weight_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_weight_count
  FROM sarfi_profile_weights
  WHERE profile_id = (SELECT profile_id FROM temp_profile);
  
  RAISE NOTICE 'Profile weights created: %', v_weight_count;
END $$;

-- Step 5: Create Sample PQ Events
-- Generate events for the past 3 months with realistic voltage dip magnitudes
DO $$
DECLARE
  v_substation_id UUID;
  v_meter RECORD;
  v_month_offset INTEGER;
  v_event_count INTEGER;
  v_event_date TIMESTAMP;
  v_magnitude DECIMAL;
  v_rand DECIMAL;
  v_total_events INTEGER := 0;
BEGIN
  SELECT substation_id INTO v_substation_id FROM temp_vars;
  
  -- Loop through past 3 months
  FOR v_month_offset IN 0..2 LOOP
    -- Loop through each meter
    FOR v_meter IN 
      SELECT id, meter_id, voltage_level 
      FROM pq_meters 
      WHERE meter_id LIKE 'MTR-SARFI-%'
    LOOP
      -- Create 10-20 random events per meter per month
      v_event_count := 10 + floor(random() * 11)::INTEGER;
      
      FOR i IN 1..v_event_count LOOP
        -- Random date within the month
        v_event_date := (
          CURRENT_DATE - (v_month_offset || ' months')::INTERVAL 
          - (floor(random() * 28) || ' days')::INTERVAL
          - (floor(random() * 24) || ' hours')::INTERVAL
          - (floor(random() * 60) || ' minutes')::INTERVAL
        );
        
        -- Generate magnitude based on SARFI thresholds
        -- SARFI-10: voltage <= 90%, SARFI-30: <= 70%, SARFI-50: <= 50%
        -- SARFI-70: voltage <= 30%, SARFI-80: <= 20%, SARFI-90: <= 10%
        v_rand := random();
        
        IF v_rand < 0.5 THEN
          v_magnitude := 70 + random() * 20; -- 70-90% (SARFI-10, 30)
        ELSIF v_rand < 0.75 THEN
          v_magnitude := 50 + random() * 20; -- 50-70% (SARFI-10, 30, 50)
        ELSIF v_rand < 0.9 THEN
          v_magnitude := 20 + random() * 30; -- 20-50% (SARFI-10, 30, 50, 70)
        ELSE
          v_magnitude := 5 + random() * 15;  -- 5-20% (All SARFI thresholds)
        END IF;
        
        -- Insert event
        INSERT INTO pq_events (
          event_type,
          substation_id,
          meter_id,
          timestamp,
          duration_ms,
          magnitude,
          remaining_voltage,
          severity,
          status,
          affected_phases,
          customer_count,
          circuit_id,
          voltage_level,
          is_special_event
        ) VALUES (
          'voltage_dip'::event_type,
          v_substation_id,
          v_meter.id,
          v_event_date,
          100 + floor(random() * 5000),
          ROUND(v_magnitude::NUMERIC, 2),
          ROUND(v_magnitude::NUMERIC, 2),
          CASE 
            WHEN v_magnitude < 50 THEN 'critical'::severity_level
            WHEN v_magnitude < 70 THEN 'high'::severity_level
            ELSE 'medium'::severity_level
          END,
          'resolved'::event_status,
          ARRAY['A', 'B', 'C'],
          10 + floor(random() * 50),
          'CKT-' || v_meter.meter_id,
          v_meter.voltage_level,
          random() < 0.1 -- 10% chance of special event
        );
        
        v_total_events := v_total_events + 1;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Total PQ events created: %', v_total_events;
END $$;

-- Final Summary
DO $$
DECLARE
  v_meter_count INTEGER;
  v_weight_count INTEGER;
  v_event_count INTEGER;
  v_profile_name TEXT;
BEGIN
  SELECT COUNT(*) INTO v_meter_count
  FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%';
  
  SELECT COUNT(*) INTO v_weight_count
  FROM sarfi_profile_weights
  WHERE profile_id = (SELECT profile_id FROM temp_profile);
  
  SELECT COUNT(*) INTO v_event_count
  FROM pq_events
  WHERE meter_id IN (SELECT id FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%');
  
  SELECT name INTO v_profile_name
  FROM sarfi_profiles
  WHERE id = (SELECT profile_id FROM temp_profile);
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ SARFI Data Seeding Complete!';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Profile: %', v_profile_name;
  RAISE NOTICE 'Meters: %', v_meter_count;
  RAISE NOTICE 'Weights: %', v_weight_count;
  RAISE NOTICE 'Events: %', v_event_count;
  RAISE NOTICE '';
  RAISE NOTICE '📊 Next Steps:';
  RAISE NOTICE '1. Go to Dashboard';
  RAISE NOTICE '2. Click Settings icon on SARFI chart';
  RAISE NOTICE '3. Select "2025 Standard Profile"';
  RAISE NOTICE '4. Enable "Show Data Table"';
  RAISE NOTICE '5. Apply filters and view the data!';
  RAISE NOTICE '============================================================';
END $$;

-- Clean up temp tables
DROP TABLE IF EXISTS temp_vars;
DROP TABLE IF EXISTS temp_profile;
