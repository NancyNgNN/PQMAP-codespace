-- Check mother events with their child events
SELECT 
  mother.id as mother_id,
  mother.event_type as mother_type,
  mother.timestamp as mother_time,
  mother.is_mother_event,
  COUNT(child.id) as child_count,
  ARRAY_AGG(child.id) as child_ids,
  ARRAY_AGG(child.is_child_event) as children_marked_as_child,
  ARRAY_AGG(child.false_event) as children_false_event_status
FROM pq_events mother
LEFT JOIN pq_events child ON child.parent_event_id = mother.id
WHERE mother.is_mother_event = true
GROUP BY mother.id, mother.event_type, mother.timestamp, mother.is_mother_event
HAVING COUNT(child.id) > 0
ORDER BY mother.timestamp DESC
LIMIT 10;
