-- Check voltage_dip events by year and month
SELECT 
  EXTRACT(YEAR FROM timestamp) as year,
  EXTRACT(MONTH FROM timestamp) as month,
  event_type,
  is_mother_event,
  false_event,
  COUNT(*) as count
FROM pq_events
WHERE EXTRACT(YEAR FROM timestamp) IN (2023, 2024, 2025)
GROUP BY EXTRACT(YEAR FROM timestamp), EXTRACT(MONTH FROM timestamp), event_type, is_mother_event, false_event
ORDER BY year, month, event_type;
