-- Add Mother Event Grouping fields to pq_events table
-- Migration for Mother Event Grouping functionality

-- Add new columns for grouping functionality
ALTER TABLE pq_events 
ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN ('automatic', 'manual')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for better performance on grouping queries
CREATE INDEX IF NOT EXISTS idx_pq_events_parent_event_id ON pq_events (parent_event_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_is_mother_event ON pq_events (is_mother_event);
CREATE INDEX IF NOT EXISTS idx_pq_events_is_child_event ON pq_events (is_child_event);
CREATE INDEX IF NOT EXISTS idx_pq_events_grouping_type ON pq_events (grouping_type);
CREATE INDEX IF NOT EXISTS idx_pq_events_substation_timestamp ON pq_events (substation_id, timestamp);

-- Add comments for documentation
COMMENT ON COLUMN pq_events.is_child_event IS 'Flag indicating if this event is a child of a mother event';
COMMENT ON COLUMN pq_events.grouping_type IS 'Type of grouping: automatic (algorithm-based) or manual (user-created)';
COMMENT ON COLUMN pq_events.grouped_at IS 'Timestamp when the event was grouped';

-- Update existing mother events to have grouping metadata
UPDATE pq_events 
SET grouping_type = 'automatic',
    grouped_at = created_at
WHERE is_mother_event = TRUE 
AND grouping_type IS NULL;

-- Update existing child events
UPDATE pq_events 
SET is_child_event = TRUE
WHERE parent_event_id IS NOT NULL;

-- Create a view for easy querying of event groups
CREATE OR REPLACE VIEW event_groups AS
SELECT 
    mother.id as mother_event_id,
    mother.timestamp as mother_timestamp,
    mother.substation_id,
    mother.grouping_type,
    mother.grouped_at,
    COUNT(child.id) as child_count,
    ARRAY_AGG(child.id) FILTER (WHERE child.id IS NOT NULL) as child_event_ids,
    COUNT(child.id) + 1 as total_events_in_group
FROM pq_events mother
LEFT JOIN pq_events child ON child.parent_event_id = mother.id
WHERE mother.is_mother_event = TRUE
GROUP BY mother.id, mother.timestamp, mother.substation_id, mother.grouping_type, mother.grouped_at
ORDER BY mother.timestamp DESC;

-- Create a view for ungrouped events (candidates for grouping)
CREATE OR REPLACE VIEW ungrouped_events AS
SELECT *
FROM pq_events
WHERE parent_event_id IS NULL 
AND is_mother_event = FALSE
ORDER BY substation_id, timestamp;

-- Grant appropriate permissions
GRANT SELECT ON event_groups TO anon, authenticated;
GRANT SELECT ON ungrouped_events TO anon, authenticated;