-- Backfill load_type for all pq_meters with weighted random distribution
-- Distribution: 40% RES-HRB, 40% RES-NOC, 20% others (DC, EV, RE-PV, RES, others)

-- Update all meters with NULL load_type using weighted random distribution
UPDATE pq_meters
SET load_type = CASE
  WHEN random() < 0.40 THEN 'RES-HRB'   -- 40%
  WHEN random() < 0.80 THEN 'RES-NOC'   -- 40% (cumulative 80%)
  WHEN random() < 0.84 THEN 'DC'        -- 4% (cumulative 84%)
  WHEN random() < 0.88 THEN 'EV'        -- 4% (cumulative 88%)
  WHEN random() < 0.92 THEN 'RE-PV'     -- 4% (cumulative 92%)
  WHEN random() < 0.96 THEN 'RES'       -- 4% (cumulative 96%)
  ELSE 'others'                          -- 4% (remaining 4%)
END
WHERE load_type IS NULL;

-- Verify distribution
SELECT 
  load_type,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM pq_meters), 2) as percentage
FROM pq_meters
WHERE load_type IS NOT NULL
GROUP BY load_type
ORDER BY count DESC;

-- Expected output:
-- RES-HRB: ~40%
-- RES-NOC: ~40%
-- DC: ~4%
-- EV: ~4%
-- RE-PV: ~4%
-- RES: ~4%
-- others: ~4%
