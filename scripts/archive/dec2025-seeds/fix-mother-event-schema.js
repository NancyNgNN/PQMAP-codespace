/**
 * Mother Event Schema Fix - Console Script
 * 
 * This script provides the SQL commands needed to add missing mother event columns.
 * Copy and run these in your Supabase SQL Editor.
 */

console.log('🔧 Mother Event Schema Fix');
console.log('=========================');
console.log('');
console.log('❌ Error: Missing database columns for mother event functionality');
console.log('');
console.log('🎯 Solution: Run this SQL in your Supabase Dashboard');
console.log('');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Click on "SQL Editor" in the left sidebar'); 
console.log('3. Create a new query and paste the following SQL:');
console.log('');
console.log('--- COPY EVERYTHING BELOW THIS LINE ---');
console.log('');
console.log('-- Add Mother Event Grouping columns to pq_events table');
console.log('ALTER TABLE pq_events');
console.log('ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,');
console.log('ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN (\'automatic\', \'manual\')) DEFAULT NULL,');
console.log('ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;');
console.log('');
console.log('-- Add indexes for better performance');
console.log('CREATE INDEX IF NOT EXISTS idx_pq_events_is_child_event ON pq_events (is_child_event);');
console.log('CREATE INDEX IF NOT EXISTS idx_pq_events_grouping_type ON pq_events (grouping_type);');
console.log('CREATE INDEX IF NOT EXISTS idx_pq_events_parent_event_id ON pq_events (parent_event_id);');
console.log('');
console.log('-- Add column comments for documentation');
console.log('COMMENT ON COLUMN pq_events.is_child_event IS \'Flag indicating if this event is a child of a mother event\';');
console.log('COMMENT ON COLUMN pq_events.grouping_type IS \'Type of grouping: automatic or manual\';');
console.log('COMMENT ON COLUMN pq_events.grouped_at IS \'Timestamp when the event was grouped\';');
console.log('');
console.log('--- COPY EVERYTHING ABOVE THIS LINE ---');
console.log('');
console.log('4. Click "RUN" to execute the SQL');
console.log('5. After successful execution, try generating mother events again');
console.log('');
console.log('✅ This will add the missing columns needed for mother event functionality');
console.log('');
console.log('🔄 Alternative: If you have access to migrations, run:');
console.log('   supabase db reset (this will apply all migrations)');
console.log('');

// Export the SQL for programmatic use
export const MOTHER_EVENT_SCHEMA_SQL = `
-- Add Mother Event Grouping columns to pq_events table
ALTER TABLE pq_events
ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN ('automatic', 'manual')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pq_events_is_child_event ON pq_events (is_child_event);
CREATE INDEX IF NOT EXISTS idx_pq_events_grouping_type ON pq_events (grouping_type);
CREATE INDEX IF NOT EXISTS idx_pq_events_parent_event_id ON pq_events (parent_event_id);

-- Add column comments for documentation
COMMENT ON COLUMN pq_events.is_child_event IS 'Flag indicating if this event is a child of a mother event';
COMMENT ON COLUMN pq_events.grouping_type IS 'Type of grouping: automatic or manual';
COMMENT ON COLUMN pq_events.grouped_at IS 'Timestamp when the event was grouped';
`.trim();