-- Seed Voltage Dip Events for InsightChart Visualization
-- This script generates voltage_dip events for 2023, 2024, and 2025
-- With random distribution (3-20 per month) and one substation with >10 events in 2025

-- First, let's get existing substations and meters
DO $$
DECLARE
  v_substation_ids uuid[];
  v_meter_ids uuid[];
  v_substation_id uuid;
  v_meter_id uuid;
  v_year int;
  v_month int;
  v_events_count int;
  v_day int;
  v_hour int;
  v_minute int;
  v_timestamp timestamptz;
  v_severity severity_level;
  v_magnitude decimal;
  v_duration_ms int;
  v_remaining_voltage decimal;
  v_special_substation_id uuid;
  v_cause text;
  v_causes text[] := ARRAY[
    'Equipment Failure',
    'Lightning Strike',
    'Overload',
    'Tree Contact',
    'Animal Contact',
    'Cable Fault',
    'Transformer Failure',
    'Circuit Breaker Trip',
    'Weather Conditions',
    'Third Party Damage',
    'Aging Infrastructure'
  ];
BEGIN
  -- Get all substation IDs
  SELECT array_agg(id) INTO v_substation_ids FROM substations;
  
  -- Get all meter IDs
  SELECT array_agg(id) INTO v_meter_ids FROM pq_meters;
  
  -- Check if we have substations and meters
  IF array_length(v_substation_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No substations found. Please create substations first.';
  END IF;
  
  IF array_length(v_meter_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No meters found. Please create meters first.';
  END IF;
  
  -- Select one substation to have >10 events in 2025
  v_special_substation_id := v_substation_ids[1];
  
  RAISE NOTICE 'Generating voltage_dip events for 2023, 2024, and 2025...';
  RAISE NOTICE 'Special substation (>10 events in 2025): %', v_special_substation_id;
  
  -- Loop through years 2023, 2024, 2025
  FOR v_year IN 2023..2025 LOOP
    -- Loop through months 1-12
    FOR v_month IN 1..12 LOOP
      -- Random events per month (3-20)
      v_events_count := 3 + floor(random() * 18)::int;
      
      -- Special handling for 2025: ensure special substation gets extra events
      IF v_year = 2025 THEN
        -- Add 2-3 extra events for special substation per month
        FOR i IN 1..(2 + floor(random() * 2)::int) LOOP
          -- Random day in month
          v_day := 1 + floor(random() * 28)::int;
          v_hour := floor(random() * 24)::int;
          v_minute := floor(random() * 60)::int;
          
          v_timestamp := make_timestamptz(v_year, v_month, v_day, v_hour, v_minute, 0, 'UTC');
          
          -- Random severity
          CASE floor(random() * 4)::int
            WHEN 0 THEN v_severity := 'critical'::severity_level;
            WHEN 1 THEN v_severity := 'high'::severity_level;
            WHEN 2 THEN v_severity := 'medium'::severity_level;
            ELSE v_severity := 'low'::severity_level;
          END CASE;
          
          -- Random magnitude (0-90% voltage remaining for voltage dips)
          v_remaining_voltage := 10 + random() * 80;
          v_magnitude := 100 - v_remaining_voltage;
          
          -- Random duration (50ms to 5000ms)
          v_duration_ms := 50 + floor(random() * 4950)::int;
          
          -- Random cause
          v_cause := v_causes[1 + floor(random() * array_length(v_causes, 1))::int];
          
          -- Random meter from the list
          v_meter_id := v_meter_ids[1 + floor(random() * array_length(v_meter_ids, 1))::int];
          
          -- Insert event for special substation
          INSERT INTO pq_events (
            event_type,
            substation_id,
            meter_id,
            timestamp,
            duration_ms,
            magnitude,
            severity,
            status,
            is_mother_event,
            parent_event_id,
            is_child_event,
            grouping_type,
            affected_phases,
            voltage_level,
            circuit_id,
            remaining_voltage,
            validated_by_adms,
            is_special_event,
            false_event,
            cause,
            weather,
            created_at
          ) VALUES (
            'voltage_dip',
            v_special_substation_id,
            v_meter_id,
            v_timestamp,
            v_duration_ms,
            v_magnitude,
            v_severity,
            'new',
            true,  -- is_mother_event
            null,
            false,
            null,
            ARRAY['A', 'B', 'C'],
            '11kV',
            'CKT-' || lpad((floor(random() * 999) + 1)::text, 3, '0'),
            v_remaining_voltage,
            false,
            false,
            false,  -- false_event
            v_cause,
            CASE floor(random() * 4)::int
              WHEN 0 THEN 'Clear'
              WHEN 1 THEN 'Rainy'
              WHEN 2 THEN 'Stormy'
              ELSE 'Cloudy'
            END,
            v_timestamp
          );
        END LOOP;
      END IF;
      
      -- Generate regular events distributed across all substations
      FOR i IN 1..v_events_count LOOP
        -- Random day in month
        v_day := 1 + floor(random() * 28)::int;
        v_hour := floor(random() * 24)::int;
        v_minute := floor(random() * 60)::int;
        
        v_timestamp := make_timestamptz(v_year, v_month, v_day, v_hour, v_minute, 0, 'UTC');
        
        -- Random substation
        v_substation_id := v_substation_ids[1 + floor(random() * array_length(v_substation_ids, 1))::int];
        
        -- Random meter
        v_meter_id := v_meter_ids[1 + floor(random() * array_length(v_meter_ids, 1))::int];
        
        -- Random severity
        CASE floor(random() * 4)::int
          WHEN 0 THEN v_severity := 'critical'::severity_level;
          WHEN 1 THEN v_severity := 'high'::severity_level;
          WHEN 2 THEN v_severity := 'medium'::severity_level;
          ELSE v_severity := 'low'::severity_level;
        END CASE;
        
        -- Random magnitude (0-90% voltage remaining for voltage dips)
        v_remaining_voltage := 10 + random() * 80;
        v_magnitude := 100 - v_remaining_voltage;
        
        -- Random duration (50ms to 5000ms)
        v_duration_ms := 50 + floor(random() * 4950)::int;
        
        -- Random cause
        v_cause := v_causes[1 + floor(random() * array_length(v_causes, 1))::int];
        
        -- Insert event
        INSERT INTO pq_events (
          event_type,
          substation_id,
          meter_id,
          timestamp,
          duration_ms,
          magnitude,
          severity,
          status,
          is_mother_event,
          parent_event_id,
          is_child_event,
          grouping_type,
          affected_phases,
          voltage_level,
          circuit_id,
          remaining_voltage,
          validated_by_adms,
          is_special_event,
          false_event,
          cause,
          weather,
          created_at
        ) VALUES (
          'voltage_dip',
          v_substation_id,
          v_meter_id,
          v_timestamp,
          v_duration_ms,
          v_magnitude,
          v_severity,
          'new',
          true,  -- is_mother_event
          null,
          false,
          null,
          ARRAY['A', 'B', 'C'],
          CASE floor(random() * 3)::int
            WHEN 0 THEN '132kV'
            WHEN 1 THEN '11kV'
            ELSE '400V'
          END,
          'CKT-' || lpad((floor(random() * 999) + 1)::text, 3, '0'),
          v_remaining_voltage,
          false,
          false,
          false,  -- false_event
          v_cause,
          CASE floor(random() * 4)::int
            WHEN 0 THEN 'Clear'
            WHEN 1 THEN 'Rainy'
            WHEN 2 THEN 'Stormy'
            ELSE 'Cloudy'
          END,
          v_timestamp
        );
      END LOOP;
      
      RAISE NOTICE 'Year %, Month %: Generated % events', v_year, v_month, v_events_count;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Voltage dip event generation completed!';
  RAISE NOTICE 'Total events created: Check pq_events table';
END $$;

-- Display summary of generated events
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  EXTRACT(MONTH FROM timestamp) as month,
  COUNT(*) as event_count
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = true
  AND false_event = false
  AND EXTRACT(YEAR FROM timestamp) IN (2023, 2024, 2025)
GROUP BY EXTRACT(YEAR FROM timestamp), EXTRACT(MONTH FROM timestamp)
ORDER BY year, month;

-- Show substations with >10 events in 2025
SELECT 
  s.name as substation_name,
  s.code as substation_code,
  COUNT(e.id) as voltage_dip_count
FROM pq_events e
JOIN substations s ON e.substation_id = s.id
WHERE e.event_type = 'voltage_dip'
  AND e.is_mother_event = true
  AND e.false_event = false
  AND EXTRACT(YEAR FROM e.timestamp) = 2025
GROUP BY s.id, s.name, s.code
HAVING COUNT(e.id) > 10
ORDER BY voltage_dip_count DESC;
