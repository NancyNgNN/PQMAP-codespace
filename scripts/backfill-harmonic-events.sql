-- ============================================================================
-- Backfill Script: Populate harmonic_events for existing harmonic PQ events
-- Created: January 9, 2026
-- Purpose: Create harmonic_events records for all existing harmonic events
--          with realistic THD, TEHD, TOHD, and TDD values
-- ============================================================================

-- ============================================================================
-- STEP 1: Check current state
-- ============================================================================

-- Count existing harmonic events in pq_events
SELECT 
  'Total harmonic events in pq_events' as description,
  COUNT(*) as count
FROM pq_events
WHERE event_type = 'harmonic';

-- Count existing records in harmonic_events
SELECT 
  'Existing records in harmonic_events' as description,
  COUNT(*) as count
FROM harmonic_events;

-- ============================================================================
-- STEP 2: Backfill harmonic_events table
-- ============================================================================

-- Insert harmonic measurements for all harmonic events
-- Generate realistic values based on event magnitude (if available)
-- magnitude represents average THD% in pq_events for harmonic events

INSERT INTO harmonic_events (
  pqevent_id,
  I1_THD_10m,
  I1_TEHD_10m,
  I1_TOHD_10m,
  I1_TDD_10m,
  I2_THD_10m,
  I2_TEHD_10m,
  I2_TOHD_10m,
  I2_TDD_10m,
  I3_THD_10m,
  I3_TEHD_10m,
  I3_TOHD_10m,
  I3_TDD_10m
)
SELECT 
  pe.id as pqevent_id,
  
  -- Phase 1 (I1) - Use magnitude as base THD with some variation
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2 - 1))::numeric, 2) as I1_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.15 + (random() * 0.5))::numeric, 2) as I1_TEHD_10m,  -- Even harmonics ~15% of THD
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.85 + (random() * 0.5))::numeric, 2) as I1_TOHD_10m,  -- Odd harmonics ~85% of THD
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.9 + (random() * 0.8))::numeric, 2) as I1_TDD_10m,    -- TDD slightly lower than THD
  
  -- Phase 2 (I2) - Slightly different from Phase 1 (typical in 3-phase systems)
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2.5 - 1.25))::numeric, 2) as I2_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.16 + (random() * 0.6))::numeric, 2) as I2_TEHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.84 + (random() * 0.6))::numeric, 2) as I2_TOHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.88 + (random() * 0.9))::numeric, 2) as I2_TDD_10m,
  
  -- Phase 3 (I3) - Another variation
  ROUND((COALESCE(pe.magnitude, 5.0) + (random() * 2 - 1))::numeric, 2) as I3_THD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.14 + (random() * 0.5))::numeric, 2) as I3_TEHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.86 + (random() * 0.5))::numeric, 2) as I3_TOHD_10m,
  ROUND((COALESCE(pe.magnitude, 5.0) * 0.91 + (random() * 0.8))::numeric, 2) as I3_TDD_10m
  
FROM pq_events pe
WHERE 
  pe.event_type = 'harmonic'
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  )
ORDER BY pe.timestamp DESC;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Count records after backfill
SELECT 
  'Records in harmonic_events after backfill' as description,
  COUNT(*) as count
FROM harmonic_events;

-- Show sample records with comparison to pq_events
SELECT 
  pe.id,
  pe.timestamp,
  pe.event_type,
  pe.magnitude as pqevent_magnitude,
  he.I1_THD_10m,
  he.I2_THD_10m,
  he.I3_THD_10m,
  he.I1_TDD_10m,
  he.I2_TDD_10m,
  he.I3_TDD_10m
FROM pq_events pe
LEFT JOIN harmonic_events he ON pe.id = he.pqevent_id
WHERE pe.event_type = 'harmonic'
ORDER BY pe.timestamp DESC
LIMIT 10;

-- Check for any harmonic events without harmonic_events records
SELECT 
  'Harmonic events without harmonic_events records' as description,
  COUNT(*) as count
FROM pq_events pe
WHERE 
  pe.event_type = 'harmonic'
  AND NOT EXISTS (
    SELECT 1 FROM harmonic_events he 
    WHERE he.pqevent_id = pe.id
  );

-- Statistics: Average THD values across all phases
SELECT 
  'Average THD Statistics' as description,
  ROUND(AVG(I1_THD_10m), 2) as avg_I1_THD,
  ROUND(AVG(I2_THD_10m), 2) as avg_I2_THD,
  ROUND(AVG(I3_THD_10m), 2) as avg_I3_THD,
  ROUND(AVG((I1_THD_10m + I2_THD_10m + I3_THD_10m) / 3), 2) as avg_total_THD,
  COUNT(*) as total_records
FROM harmonic_events;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
  '✅ Backfill complete!' as status,
  'All harmonic events now have corresponding harmonic_events records' as message;
