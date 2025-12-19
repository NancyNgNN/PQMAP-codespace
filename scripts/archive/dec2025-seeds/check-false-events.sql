-- Check the false events we generated
SELECT 
  id,
  event_type,
  timestamp,
  substation_id,
  circuit_id,
  duration_ms,
  remaining_voltage,
  false_event,
  validated_by_adms,
  is_child_event,
  is_mother_event,
  parent_event_id,
  status,
  remarks
FROM pq_events
WHERE remarks LIKE '%Auto-generated false event for demonstration%'
ORDER BY timestamp DESC;
