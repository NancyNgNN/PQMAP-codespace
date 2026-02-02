-- Add IDR number to PQ service records (PQSIS key mapping)
-- Purpose: Map PQSIS service records to PQMAP Voltage Dip events using IDR number as the primary key.

ALTER TABLE pq_service_records
  ADD COLUMN IF NOT EXISTS idr_no TEXT;

-- Optional index for faster lookups / mapping
CREATE INDEX IF NOT EXISTS idx_pq_service_records_idr_no
  ON pq_service_records (idr_no);

-- Backfill idr_no from existing event_id linkage (if present)
UPDATE pq_service_records s
SET idr_no = e.idr_no
FROM pq_events e
WHERE s.idr_no IS NULL
  AND s.event_id IS NOT NULL
  AND e.id = s.event_id
  AND e.idr_no IS NOT NULL;
