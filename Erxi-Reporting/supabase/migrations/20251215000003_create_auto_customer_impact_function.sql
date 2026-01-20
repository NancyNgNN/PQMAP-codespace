-- =====================================================
-- Automatic Customer Impact Generation Function
-- =====================================================
-- Purpose: Automatically create event_customer_impact records
--          when new events are created
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Function to generate customer impacts for an event
CREATE OR REPLACE FUNCTION generate_customer_impacts_for_event(event_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  v_substation_id UUID;
  v_circuit_id TEXT;
  v_severity TEXT;
  v_duration_ms INTEGER;
  v_impact_level TEXT;
  v_downtime_min NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- Get event details
  SELECT substation_id, circuit_id, severity, duration_ms
  INTO v_substation_id, v_circuit_id, v_severity, v_duration_ms
  FROM pq_events
  WHERE id = event_id_param;

  -- If event has no substation or circuit, skip
  IF v_substation_id IS NULL OR v_circuit_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Map event severity to impact level
  v_impact_level := CASE v_severity
    WHEN 'critical' THEN 'severe'
    WHEN 'high' THEN 'moderate'
    WHEN 'medium' THEN 'minor'
    WHEN 'low' THEN 'minor'
    ELSE 'minor'
  END;

  -- Calculate downtime in minutes (convert ms to minutes)
  v_downtime_min := CASE 
    WHEN v_duration_ms IS NOT NULL THEN ROUND(v_duration_ms::NUMERIC / 60000, 2)
    ELSE NULL
  END;

  -- Insert customer impacts for all matched customers
  INSERT INTO event_customer_impact (
    event_id,
    customer_id,
    impact_level,
    estimated_downtime_min,
    created_at
  )
  SELECT 
    event_id_param,
    ctm.customer_id,
    v_impact_level,
    v_downtime_min,
    now()
  FROM customer_transformer_matching ctm
  WHERE ctm.substation_id = v_substation_id
    AND ctm.circuit_id = v_circuit_id
    AND ctm.active = true
  ON CONFLICT DO NOTHING;  -- Prevent duplicates

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_customer_impacts_for_event(UUID) IS 
'Generates event_customer_impact records for all customers mapped to the event''s substation and circuit. Converts duration_ms to minutes for estimated_downtime_min.';

-- Trigger function to auto-generate on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_customer_impacts()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate customer impacts for new event
  PERFORM generate_customer_impacts_for_event(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on pq_events INSERT
CREATE TRIGGER trigger_auto_generate_customer_impacts
  AFTER INSERT ON pq_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_customer_impacts();

COMMENT ON TRIGGER trigger_auto_generate_customer_impacts ON pq_events IS 
'Automatically generates customer impact records when new events are created';

COMMIT;

-- =====================================================
-- Test the function
-- =====================================================

-- Manual test (uncomment to test):
/*
-- Get a test event
SELECT id, substation_id, circuit_id, severity, duration_ms
FROM pq_events 
WHERE substation_id IS NOT NULL 
AND circuit_id IS NOT NULL 
LIMIT 1;

-- Run function manually
SELECT generate_customer_impacts_for_event('<event_id_here>');

-- Check results
SELECT * FROM event_customer_impact WHERE event_id = '<event_id_here>';
*/
