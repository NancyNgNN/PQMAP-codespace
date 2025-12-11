-- Check what voltage_dip events exist and their substation relationships
SELECT 
  EXTRACT(YEAR FROM e.timestamp) as year,
  EXTRACT(MONTH FROM e.timestamp) as month,
  e.event_type,
  e.is_mother_event,
  e.false_event,
  s.name as substation_name,
  s.code as substation_code,
  COUNT(*) as count
FROM pq_events e
LEFT JOIN substations s ON e.substation_id = s.id
WHERE e.event_type = 'voltage_dip'
  AND e.is_mother_event = true
  AND e.false_event = false
  AND EXTRACT(YEAR FROM e.timestamp) IN (2023, 2024, 2025)
GROUP BY 
  EXTRACT(YEAR FROM e.timestamp), 
  EXTRACT(MONTH FROM e.timestamp),
  e.event_type,
  e.is_mother_event,
  e.false_event,
  s.name,
  s.code
ORDER BY year, month;

-- Also check total count
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  COUNT(*) as total_events
FROM pq_events
WHERE event_type = 'voltage_dip'
  AND is_mother_event = true
  AND false_event = false
GROUP BY EXTRACT(YEAR FROM timestamp)
ORDER BY year;
