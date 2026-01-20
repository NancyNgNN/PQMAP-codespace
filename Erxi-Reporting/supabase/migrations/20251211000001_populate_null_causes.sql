-- Migration: Populate NULL causes with realistic power quality causes
-- Date: 2025-12-11
-- Description: Update all PQEvents where cause IS NULL with randomly assigned realistic causes

-- Update NULL causes with random realistic power quality causes
UPDATE pq_events
SET cause = (
  CASE floor(random() * 12)::int
    WHEN 0 THEN 'Equipment Failure'
    WHEN 1 THEN 'Lightning Strike'
    WHEN 2 THEN 'Overload'
    WHEN 3 THEN 'Tree Contact'
    WHEN 4 THEN 'Animal Contact'
    WHEN 5 THEN 'Cable Fault'
    WHEN 6 THEN 'Transformer Failure'
    WHEN 7 THEN 'Circuit Breaker Trip'
    WHEN 8 THEN 'Planned Maintenance'
    WHEN 9 THEN 'Weather Conditions'
    WHEN 10 THEN 'Third Party Damage'
    ELSE 'Aging Infrastructure'
  END
)
WHERE cause IS NULL;

-- Verify the update (can be run manually to check results)
-- SELECT cause, COUNT(*) as count
-- FROM pq_events
-- WHERE cause IS NOT NULL
-- GROUP BY cause
-- ORDER BY count DESC;
