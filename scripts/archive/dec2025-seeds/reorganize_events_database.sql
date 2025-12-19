-- =====================================================
-- Event Database Reorganization Script
-- =====================================================
-- Purpose: Reduce events to ~820 total:
--   - 300 mother events (100 per year: 2023/2024/2025)
--   - 514 child events (converted from standalone)
--   - 6 standalone events (demo purposes)
--
-- Strategy:
--   1. Delete mother events with most NULL values
--   2. Convert standalone events to children (grouped by substation/circuit_id)
--   3. Keep 6 diverse standalone events for demo
--
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: ANALYSIS - Current State
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '=== CURRENT DATABASE STATE ===';
END $$;

SELECT 
    'Current Event Count' as metric,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_mother_event = true) as mothers,
    COUNT(*) FILTER (WHERE parent_event_id IS NOT NULL) as children,
    COUNT(*) FILTER (WHERE is_mother_event = false AND parent_event_id IS NULL) as standalone
FROM pq_events;

SELECT 
    'Events by Year' as metric,
    EXTRACT(YEAR FROM timestamp) as year,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_mother_event = true) as mothers,
    COUNT(*) FILTER (WHERE parent_event_id IS NOT NULL) as children,
    COUNT(*) FILTER (WHERE is_mother_event = false AND parent_event_id IS NULL) as standalone
FROM pq_events
GROUP BY EXTRACT(YEAR FROM timestamp)
ORDER BY year;

-- =====================================================
-- STEP 2: IDENTIFY MOTHER EVENTS TO DELETE
-- =====================================================
-- Score mother events based on NULL counts in critical fields
-- Keep the 300 best mothers (100 per year)

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 2: ANALYZING MOTHER EVENTS ===';
END $$;

-- Create temporary table to score mother events
DROP TABLE IF EXISTS temp_mother_scores;
CREATE TEMP TABLE temp_mother_scores AS
SELECT 
    pe.id,
    pe.timestamp,
    EXTRACT(YEAR FROM pe.timestamp) as year,
    pe.substation_id,
    pe.circuit_id,
    pe.voltage_level,
    s.region,
    -- Calculate NULL score (higher = more NULLs = lower quality)
    (
        CASE WHEN s.region IS NULL THEN 4 ELSE 0 END +
        CASE WHEN pe.substation_id IS NULL THEN 3 ELSE 0 END +
        CASE WHEN pe.circuit_id IS NULL THEN 2 ELSE 0 END +
        CASE WHEN pe.voltage_level IS NULL THEN 1 ELSE 0 END
    ) as null_score,
    -- Count existing children
    (SELECT COUNT(*) FROM pq_events child WHERE child.parent_event_id = pe.id) as child_count
FROM pq_events pe
LEFT JOIN substations s ON pe.substation_id = s.id
WHERE pe.is_mother_event = true;

-- Show distribution of NULL scores
SELECT 
    'Mother Events NULL Score Distribution' as analysis,
    null_score,
    COUNT(*) as count,
    MIN(year) as min_year,
    MAX(year) as max_year
FROM temp_mother_scores
GROUP BY null_score
ORDER BY null_score;

-- Identify mothers to KEEP (100 per year, lowest NULL scores)
DROP TABLE IF EXISTS temp_mothers_to_keep;
CREATE TEMP TABLE temp_mothers_to_keep AS
WITH ranked_mothers AS (
    SELECT 
        id,
        year,
        null_score,
        child_count,
        ROW_NUMBER() OVER (
            PARTITION BY year 
            ORDER BY null_score ASC, child_count DESC, timestamp DESC
        ) as rank_in_year
    FROM temp_mother_scores
)
SELECT id, year, null_score, child_count
FROM ranked_mothers
WHERE rank_in_year <= 100;

-- Show mothers to keep by year
SELECT 
    'Mothers to KEEP by Year' as analysis,
    year,
    COUNT(*) as keep_count,
    AVG(null_score) as avg_null_score,
    SUM(child_count) as total_existing_children
FROM temp_mothers_to_keep
GROUP BY year
ORDER BY year;

-- Identify mothers to DELETE
DROP TABLE IF EXISTS temp_mothers_to_delete;
CREATE TEMP TABLE temp_mothers_to_delete AS
SELECT ms.id, ms.year, ms.null_score, ms.child_count
FROM temp_mother_scores ms
WHERE ms.id NOT IN (SELECT id FROM temp_mothers_to_keep);

SELECT 
    'Mothers to DELETE by Year' as analysis,
    year,
    COUNT(*) as delete_count,
    AVG(null_score) as avg_null_score
FROM temp_mothers_to_delete
GROUP BY year
ORDER BY year;

-- =====================================================
-- STEP 3: HANDLE CHILDREN OF DELETED MOTHERS
-- =====================================================
-- Convert children of deleted mothers to standalone events

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 3: CONVERTING ORPHANED CHILDREN TO STANDALONE ===';
END $$;

-- Update children of deleted mothers to become standalone
UPDATE pq_events
SET 
    parent_event_id = NULL,
    is_mother_event = false
WHERE parent_event_id IN (SELECT id FROM temp_mothers_to_delete);

SELECT 
    'Children Converted to Standalone' as result,
    COUNT(*) as count
FROM pq_events
WHERE id IN (
    SELECT pe.id 
    FROM pq_events pe
    WHERE pe.parent_event_id IN (SELECT id FROM temp_mothers_to_delete)
);

-- =====================================================
-- STEP 4: DELETE MOTHER EVENTS WITH POOR DATA QUALITY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 4: DELETING MOTHER EVENTS ===';
END $$;

-- Delete associated customer impact records first
DELETE FROM event_customer_impact
WHERE event_id IN (SELECT id FROM temp_mothers_to_delete);

-- Delete the mother events
DELETE FROM pq_events
WHERE id IN (SELECT id FROM temp_mothers_to_delete);

SELECT 
    'Mother Events Deleted' as result,
    (SELECT COUNT(*) FROM temp_mothers_to_delete) as count;

-- =====================================================
-- STEP 5: SELECT STANDALONE EVENTS FOR DEMO
-- =====================================================
-- Keep 6 standalone events with different voltage levels

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 5: SELECTING DEMO STANDALONE EVENTS ===';
END $$;

-- Get diverse standalone events (different voltage levels, good data quality)
DROP TABLE IF EXISTS temp_demo_standalone;
CREATE TEMP TABLE temp_demo_standalone AS
WITH ranked_standalone AS (
    SELECT 
        pe.id,
        pe.voltage_level,
        s.region,
        pe.substation_id,
        pe.circuit_id,
        -- Calculate NULL score
        (
            CASE WHEN s.region IS NULL THEN 4 ELSE 0 END +
            CASE WHEN pe.substation_id IS NULL THEN 3 ELSE 0 END +
            CASE WHEN pe.circuit_id IS NULL THEN 2 ELSE 0 END +
            CASE WHEN pe.voltage_level IS NULL THEN 1 ELSE 0 END
        ) as null_score,
        ROW_NUMBER() OVER (
            PARTITION BY pe.voltage_level 
            ORDER BY 
                CASE WHEN s.region IS NULL THEN 4 ELSE 0 END +
                CASE WHEN pe.substation_id IS NULL THEN 3 ELSE 0 END +
                CASE WHEN pe.circuit_id IS NULL THEN 2 ELSE 0 END +
                CASE WHEN pe.voltage_level IS NULL THEN 1 ELSE 0 END ASC,
                pe.timestamp DESC
        ) as rank_in_voltage
    FROM pq_events pe
    LEFT JOIN substations s ON pe.substation_id = s.id
    WHERE pe.is_mother_event = false 
    AND pe.parent_event_id IS NULL
)
SELECT id, voltage_level, null_score
FROM ranked_standalone
WHERE rank_in_voltage = 1
ORDER BY null_score ASC
LIMIT 6;

SELECT 
    'Demo Standalone Events Selected' as result,
    voltage_level,
    COUNT(*) as count
FROM temp_demo_standalone
GROUP BY voltage_level
ORDER BY voltage_level;

-- =====================================================
-- STEP 6: CONVERT STANDALONE EVENTS TO CHILDREN
-- =====================================================
-- Group remaining standalone events under mothers by substation/circuit

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 6: GROUPING STANDALONE EVENTS AS CHILDREN ===';
END $$;

-- Get standalone events to convert (exclude demo events)
DROP TABLE IF EXISTS temp_standalone_to_convert;
CREATE TEMP TABLE temp_standalone_to_convert AS
SELECT 
    pe.id,
    pe.timestamp,
    pe.substation_id,
    pe.circuit_id,
    pe.voltage_level,
    s.region
FROM pq_events pe
LEFT JOIN substations s ON pe.substation_id = s.id
WHERE pe.is_mother_event = false 
AND pe.parent_event_id IS NULL
AND pe.id NOT IN (SELECT id FROM temp_demo_standalone)
ORDER BY RANDOM();  -- Randomize for distribution

-- We need to convert enough standalone to create 500 new children
-- (514 target - 14 existing = 500 new)
-- We'll match them to the 300 mothers

-- Create assignment table with random distribution
DROP TABLE IF EXISTS temp_child_assignments;
CREATE TEMP TABLE temp_child_assignments AS
WITH mothers_extended AS (
    -- Repeat each mother multiple times for assignment capacity
    SELECT 
        m.id as mother_id,
        m.year,
        pe.substation_id as mother_substation,
        pe.circuit_id as mother_circuit,
        generate_series(1, 10) as slot  -- Allow up to 10 children per mother
    FROM temp_mothers_to_keep m
    JOIN pq_events pe ON m.id = pe.id
),
standalone_ranked AS (
    SELECT 
        stc.*,
        ROW_NUMBER() OVER (ORDER BY RANDOM()) as assignment_order
    FROM temp_standalone_to_convert stc
    LIMIT 500  -- Only take 500 standalone events
),
mothers_ranked AS (
    SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY RANDOM()) as assignment_order
    FROM mothers_extended
)
SELECT 
    sr.id as child_id,
    mr.mother_id,
    sr.substation_id as child_substation,
    mr.mother_substation,
    sr.circuit_id as child_circuit,
    mr.mother_circuit,
    -- Check if update needed
    CASE 
        WHEN sr.substation_id IS DISTINCT FROM mr.mother_substation THEN true
        ELSE false
    END as needs_substation_update,
    CASE 
        WHEN sr.circuit_id IS DISTINCT FROM mr.mother_circuit THEN true
        ELSE false
    END as needs_circuit_update
FROM standalone_ranked sr
JOIN mothers_ranked mr ON sr.assignment_order = mr.assignment_order;

-- Show assignment statistics
SELECT 
    'Child Assignment Summary' as analysis,
    COUNT(*) as total_assignments,
    COUNT(*) FILTER (WHERE needs_substation_update) as substation_updates_needed,
    COUNT(*) FILTER (WHERE needs_circuit_update) as circuit_updates_needed
FROM temp_child_assignments;

SELECT 
    'Children per Mother Distribution' as analysis,
    children_count,
    COUNT(*) as mothers_with_this_count
FROM (
    SELECT mother_id, COUNT(*) as children_count
    FROM temp_child_assignments
    GROUP BY mother_id
) dist
GROUP BY children_count
ORDER BY children_count;

-- Update standalone events to become children
-- First, update substation/circuit_id if needed to match mother
UPDATE pq_events pe
SET 
    substation_id = COALESCE(ca.mother_substation, pe.substation_id),
    circuit_id = COALESCE(ca.mother_circuit, pe.circuit_id)
FROM temp_child_assignments ca
WHERE pe.id = ca.child_id
AND (ca.needs_substation_update OR ca.needs_circuit_update);

SELECT 
    'Events Updated (Substation/Circuit_ID)' as result,
    COUNT(*) as count
FROM temp_child_assignments
WHERE needs_substation_update OR needs_circuit_update;

-- Assign parent_event_id to make them children
UPDATE pq_events pe
SET 
    parent_event_id = ca.mother_id,
    is_mother_event = false
FROM temp_child_assignments ca
WHERE pe.id = ca.child_id;

SELECT 
    'Standalone Events Converted to Children' as result,
    COUNT(*) as count
FROM temp_child_assignments;

-- =====================================================
-- STEP 7: DELETE REMAINING STANDALONE EVENTS
-- =====================================================
-- Delete all standalone except the 6 demo events

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== STEP 7: DELETING EXCESS STANDALONE EVENTS ===';
END $$;

-- Get list of standalone events to delete
DROP TABLE IF EXISTS temp_standalone_to_delete;
CREATE TEMP TABLE temp_standalone_to_delete AS
SELECT id
FROM pq_events
WHERE is_mother_event = false 
AND parent_event_id IS NULL
AND id NOT IN (SELECT id FROM temp_demo_standalone);

-- Delete customer impact records
DELETE FROM event_customer_impact
WHERE event_id IN (SELECT id FROM temp_standalone_to_delete);

-- Delete the events
DELETE FROM pq_events
WHERE id IN (SELECT id FROM temp_standalone_to_delete);

SELECT 
    'Excess Standalone Events Deleted' as result,
    (SELECT COUNT(*) FROM temp_standalone_to_delete) as count;

-- =====================================================
-- STEP 8: FINAL STATISTICS
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL DATABASE STATE ===';
END $$;

SELECT 
    'Final Event Count' as metric,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_mother_event = true) as mothers,
    COUNT(*) FILTER (WHERE parent_event_id IS NOT NULL) as children,
    COUNT(*) FILTER (WHERE is_mother_event = false AND parent_event_id IS NULL) as standalone
FROM pq_events;

SELECT 
    'Final Events by Year' as metric,
    EXTRACT(YEAR FROM timestamp) as year,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_mother_event = true) as mothers,
    COUNT(*) FILTER (WHERE parent_event_id IS NOT NULL) as children,
    COUNT(*) FILTER (WHERE is_mother_event = false AND parent_event_id IS NULL) as standalone
FROM pq_events
GROUP BY EXTRACT(YEAR FROM timestamp)
ORDER BY year;

-- Show children per mother distribution
SELECT 
    'Final Children per Mother' as metric,
    child_count,
    COUNT(*) as mother_count
FROM (
    SELECT 
        m.id,
        COUNT(c.id) as child_count
    FROM pq_events m
    LEFT JOIN pq_events c ON c.parent_event_id = m.id
    WHERE m.is_mother_event = true
    GROUP BY m.id
) dist
GROUP BY child_count
ORDER BY child_count;

-- Show demo standalone events details
SELECT 
    'Demo Standalone Events' as metric,
    pe.id,
    pe.voltage_level,
    s.region,
    pe.substation_id,
    pe.circuit_id,
    TO_CHAR(pe.timestamp, 'YYYY-MM-DD HH24:MI:SS') as timestamp
FROM pq_events pe
LEFT JOIN substations s ON pe.substation_id = s.id
WHERE pe.is_mother_event = false 
AND pe.parent_event_id IS NULL
ORDER BY pe.voltage_level, pe.timestamp;

-- Verify data integrity
SELECT 
    'Data Integrity Check' as check_type,
    'Orphaned Children' as issue,
    COUNT(*) as count
FROM pq_events
WHERE parent_event_id IS NOT NULL
AND parent_event_id NOT IN (SELECT id FROM pq_events WHERE is_mother_event = true);

SELECT 
    'Data Integrity Check' as check_type,
    'Mothers with is_mother_event=false' as issue,
    COUNT(*) as count
FROM pq_events m
WHERE is_mother_event = false
AND EXISTS (SELECT 1 FROM pq_events c WHERE c.parent_event_id = m.id);

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES (Run after script)
-- =====================================================

-- Uncomment to run verification:
/*
-- Total count
SELECT 'Total Events' as metric, COUNT(*) FROM pq_events;

-- By type
SELECT 
    CASE 
        WHEN is_mother_event THEN 'Mother'
        WHEN parent_event_id IS NOT NULL THEN 'Child'
        ELSE 'Standalone'
    END as event_type,
    COUNT(*) as count
FROM pq_events
GROUP BY 
    CASE 
        WHEN is_mother_event THEN 'Mother'
        WHEN parent_event_id IS NOT NULL THEN 'Child'
        ELSE 'Standalone'
    END;

-- By year
SELECT 
    EXTRACT(YEAR FROM timestamp) as year,
    COUNT(*) as total
FROM pq_events
GROUP BY year
ORDER BY year;
*/
