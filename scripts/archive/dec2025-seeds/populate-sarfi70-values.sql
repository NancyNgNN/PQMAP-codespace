-- =====================================================
-- Populate SARFI-70 Values for Voltage Dip Mother Events
-- =====================================================
-- Purpose: Add realistic SARFI-70 values (0.001 to 0.1) to existing voltage_dip mother events
-- Pattern: Higher values after June (summer/typhoon season)
-- Testing: 10 events will have NULL values to test "show 0" functionality

DO $$
DECLARE
  v_event RECORD;
  v_sarfi70 NUMERIC(10, 6);
  v_base_value NUMERIC(10, 6);
  v_month INT;
  v_null_count INT := 0;
  v_total_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting SARFI-70 population for voltage_dip mother events...';
  
  -- Loop through all voltage_dip mother events
  FOR v_event IN 
    SELECT id, timestamp, false_event
    FROM pq_events
    WHERE event_type = 'voltage_dip'
      AND is_mother_event = TRUE
      AND false_event = FALSE
    ORDER BY timestamp
  LOOP
    v_total_count := v_total_count + 1;
    v_month := EXTRACT(MONTH FROM v_event.timestamp);
    
    -- Leave 10 events with NULL values for testing
    IF v_null_count < 10 AND (v_total_count % 47 = 0) THEN
      -- Every 47th event gets NULL (distributed across the dataset)
      UPDATE pq_events
      SET sarfi_70 = NULL
      WHERE id = v_event.id;
      
      v_null_count := v_null_count + 1;
      RAISE NOTICE 'Event % [%]: Set to NULL for testing (% of 10)', 
        v_total_count, v_event.id, v_null_count;
    ELSE
      -- Calculate base SARFI-70 value
      -- Lower values (0.001 to 0.03) for Jan-June
      -- Higher values (0.03 to 0.1) for July-Dec (summer/typhoon season)
      IF v_month <= 6 THEN
        -- January to June: 0.001 to 0.03
        v_base_value := 0.001 + (random() * 0.029);
      ELSE
        -- July to December: 0.03 to 0.1 (significantly higher)
        v_base_value := 0.03 + (random() * 0.07);
      END IF;
      
      -- Add some random variation
      v_sarfi70 := v_base_value * (0.8 + random() * 0.4); -- ±20% variation
      
      -- Ensure within bounds
      v_sarfi70 := LEAST(GREATEST(v_sarfi70, 0.001), 0.1);
      
      -- Update the event
      UPDATE pq_events
      SET sarfi_70 = v_sarfi70
      WHERE id = v_event.id;
      
      IF v_total_count % 50 = 0 THEN
        RAISE NOTICE 'Processed % events...', v_total_count;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'SARFI-70 Population Complete!';
  RAISE NOTICE 'Total events updated: %', v_total_count;
  RAISE NOTICE 'Events with NULL values: %', v_null_count;
  RAISE NOTICE 'Events with SARFI-70 values: %', v_total_count - v_null_count;
  RAISE NOTICE '==============================================';
  
END $$;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check distribution by year and month
SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  EXTRACT(MONTH FROM timestamp) AS month,
  COUNT(*) AS total_events,
  COUNT(sarfi_70) AS events_with_sarfi70,
  COUNT(*) - COUNT(sarfi_70) AS null_sarfi70,
  ROUND(AVG(sarfi_70)::numeric, 6) AS avg_sarfi70,
  ROUND(MIN(sarfi_70)::numeric, 6) AS min_sarfi70,
  ROUND(MAX(sarfi_70)::numeric, 6) AS max_sarfi70,
  ROUND(SUM(sarfi_70)::numeric, 4) AS monthly_sarfi70_sum
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE
  AND false_event = FALSE
GROUP BY year, month
ORDER BY year, month;

-- Check overall statistics
SELECT 
  'Overall Statistics' AS category,
  COUNT(*) AS total_events,
  COUNT(sarfi_70) AS events_with_values,
  COUNT(*) - COUNT(sarfi_70) AS null_values,
  ROUND(AVG(sarfi_70)::numeric, 6) AS avg_sarfi70,
  ROUND(MIN(sarfi_70)::numeric, 6) AS min_sarfi70,
  ROUND(MAX(sarfi_70)::numeric, 6) AS max_sarfi70
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE
  AND false_event = FALSE;

-- Check seasonal difference (Jan-Jun vs Jul-Dec)
SELECT 
  CASE 
    WHEN EXTRACT(MONTH FROM timestamp) <= 6 THEN 'Jan-Jun (Lower)'
    ELSE 'Jul-Dec (Higher)'
  END AS season,
  COUNT(*) AS total_events,
  COUNT(sarfi_70) AS events_with_values,
  ROUND(AVG(sarfi_70)::numeric, 6) AS avg_sarfi70,
  ROUND(MIN(sarfi_70)::numeric, 6) AS min_sarfi70,
  ROUND(MAX(sarfi_70)::numeric, 6) AS max_sarfi70
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE
  AND false_event = FALSE
  AND sarfi_70 IS NOT NULL
GROUP BY season
ORDER BY season;

-- Sample some events to verify
SELECT 
  id,
  TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
  EXTRACT(MONTH FROM timestamp) AS month,
  sarfi_70,
  CASE 
    WHEN sarfi_70 IS NULL THEN 'NULL (test case)'
    WHEN sarfi_70 < 0.03 THEN 'Low (Jan-Jun pattern)'
    ELSE 'High (Jul-Dec pattern)'
  END AS value_category
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE
  AND false_event = FALSE
ORDER BY timestamp
LIMIT 20;

-- =====================================================
-- Year-over-Year Comparison
-- =====================================================
SELECT 
  EXTRACT(YEAR FROM timestamp) AS year,
  COUNT(*) AS total_events,
  COUNT(sarfi_70) AS events_with_values,
  ROUND(SUM(sarfi_70)::numeric, 4) AS total_sarfi70,
  ROUND(AVG(sarfi_70)::numeric, 6) AS avg_sarfi70_per_event,
  CASE 
    WHEN EXTRACT(YEAR FROM timestamp) = 2023 THEN 'Baseline Year'
    WHEN EXTRACT(YEAR FROM timestamp) = 2024 THEN 
      CASE 
        WHEN SUM(sarfi_70) > (SELECT SUM(sarfi_70) FROM pq_events 
                               WHERE EXTRACT(YEAR FROM timestamp) = 2023 
                               AND event_type = 'voltage_dip' 
                               AND is_mother_event = TRUE 
                               AND false_event = FALSE)
        THEN '📈 Degrading (Higher)'
        ELSE '📉 Improving (Lower)'
      END
    WHEN EXTRACT(YEAR FROM timestamp) = 2025 THEN 
      CASE 
        WHEN SUM(sarfi_70) > (SELECT SUM(sarfi_70) FROM pq_events 
                               WHERE EXTRACT(YEAR FROM timestamp) = 2024 
                               AND event_type = 'voltage_dip' 
                               AND is_mother_event = TRUE 
                               AND false_event = FALSE)
        THEN '📈 Degrading (Higher)'
        ELSE '📉 Improving (Lower)'
      END
  END AS trend
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = TRUE
  AND false_event = FALSE
GROUP BY year
ORDER BY year;
