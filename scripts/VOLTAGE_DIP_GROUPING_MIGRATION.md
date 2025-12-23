# Voltage Dip Only Grouping - Backfill Guide

## Overview

This migration enforces that **only `voltage_dip` events** can have mother-child relationships in the PQMAP system. All other event types (voltage_swell, harmonic, interruption, etc.) must be standalone events.

## What This Script Does

### 1. **Non-voltage_dip Mother Events**
- Converts them to standalone events
- Releases all their children
- Removes `is_mother_event` flag, `grouping_type`, and `grouped_at` timestamp

### 2. **Non-voltage_dip Child Events**
- Converts them to standalone events
- Removes `is_child_event` flag and `parent_event_id`

### 3. **Voltage_dip Children with Non-voltage_dip Parents**
- Promotes them to mother events (eligible for future grouping)
- Sets `is_mother_event = true`, `is_child_event = false`, `parent_event_id = NULL`

### 4. **Orphaned Children**
- Fixes events where `parent_event_id` points to a non-existent event
- Voltage_dip events become mothers, others become standalone

### 5. **Mother Events with No Children**
- Keeps voltage_dip events as potential mothers
- Removes mother status from non-voltage_dip events

## How to Run the Script

### Prerequisites
- Access to Supabase SQL Editor or PostgreSQL command line
- Database backup recommended before running

### Steps

1. **Backup your database** (highly recommended)
   ```sql
   -- Create a backup of the pq_events table
   CREATE TABLE pq_events_backup_20251223 AS 
   SELECT * FROM pq_events;
   ```

2. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and paste the entire script**
   - Open `backfill-voltage-dip-only-grouping.sql`
   - Copy all contents
   - Paste into SQL Editor

4. **Execute the script**
   - Click "Run" button
   - Watch the console output for detailed logs

5. **Review the results**
   - Check the migration summary in the output
   - Review validation checks to ensure success
   - Query the temporary log table to see all changes

## Output Example

```
========================================
STEP 1: Processing non-voltage_dip mother events
========================================
Found non-voltage_dip mother event: abc123... (type: voltage_swell, children: 3)
  → Converted to standalone event
  → Released 3 children

========================================
MIGRATION SUMMARY
========================================
Total events modified: 15
Mother status removed: 5
Child status removed: 8
Voltage_dip events promoted to mothers: 2

========================================
VALIDATION CHECKS
========================================
Non-voltage_dip mother events remaining: 0
Non-voltage_dip child events remaining: 0
Orphaned child events remaining: 0

Current Grouping Statistics:
  Total mother events: 42
  Total child events: 156
  Voltage_dip mothers: 42 (should equal total mothers)
========================================
```

## Reviewing Changes

### View all changes made
```sql
SELECT * FROM event_grouping_migration_log 
ORDER BY changed_at;
```

### View changes by reason
```sql
SELECT 
  change_reason,
  COUNT(*) as event_count,
  STRING_AGG(DISTINCT event_type, ', ') as event_types
FROM event_grouping_migration_log
GROUP BY change_reason
ORDER BY event_count DESC;
```

### View specific event changes
```sql
SELECT 
  event_id,
  event_type,
  previous_is_mother_event,
  previous_is_child_event,
  new_is_mother_event,
  new_is_child_event,
  change_reason
FROM event_grouping_migration_log
WHERE event_id = 'YOUR_EVENT_ID_HERE';
```

## Permanent Log Archive (Optional)

If you want to keep a permanent record of the migration, uncomment the last section of the script to create an `event_grouping_migration_archive` table.

## Frontend Changes

The frontend has been updated to enforce this rule going forward:

### Manual Grouping
- Users can only select and group voltage_dip events
- Error message shown if non-voltage_dip events are included: "Only voltage_dip events can be grouped together"

### Automatic Grouping
- Only processes voltage_dip events
- Skips all other event types automatically
- No error messages needed (silent filtering)

### Ungrouping
- No validation required (can ungroup any event type to clean up bad data)

## Files Modified

1. **Backend/Database**
   - `scripts/backfill-voltage-dip-only-grouping.sql` - SQL migration script

2. **Frontend**
   - `src/services/mother-event-grouping.ts` - Updated grouping service with voltage_dip validation
   - `src/components/EventManagement/EventManagement.tsx` - Uses updated service (no changes needed)

## Validation Queries

After running the script, verify the results:

```sql
-- Should return 0
SELECT COUNT(*) FROM pq_events 
WHERE is_mother_event = true 
  AND event_type != 'voltage_dip';

-- Should return 0  
SELECT COUNT(*) FROM pq_events 
WHERE is_child_event = true 
  AND event_type != 'voltage_dip';

-- Should return 0
SELECT COUNT(*) FROM pq_events c
LEFT JOIN pq_events p ON c.parent_event_id = p.id
WHERE c.parent_event_id IS NOT NULL 
  AND p.id IS NULL;
```

## Rollback (If Needed)

If you created a backup before running the script:

```sql
-- Restore from backup
TRUNCATE pq_events;
INSERT INTO pq_events SELECT * FROM pq_events_backup_20251223;

-- Or restore specific columns
UPDATE pq_events e
SET 
  is_mother_event = b.is_mother_event,
  is_child_event = b.is_child_event,
  parent_event_id = b.parent_event_id,
  grouping_type = b.grouping_type,
  grouped_at = b.grouped_at
FROM pq_events_backup_20251223 b
WHERE e.id = b.id;
```

## Support

If you encounter any issues:
1. Check the validation queries output
2. Review the migration log table
3. Verify frontend changes are deployed
4. Check browser console for any errors

## Migration Checklist

- [ ] Database backup created
- [ ] SQL script executed successfully
- [ ] Migration summary reviewed
- [ ] Validation checks passed (all zeros)
- [ ] Migration log reviewed
- [ ] Frontend updated and deployed
- [ ] Manual grouping tested (voltage_dip only)
- [ ] Automatic grouping tested
- [ ] Error messages verified for non-voltage_dip selection

---

**Date:** December 23, 2025  
**Version:** 1.0  
**Status:** Ready for execution
