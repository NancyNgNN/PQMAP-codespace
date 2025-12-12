# Orphaned Child Events Cleanup Script

## Overview
This SQL script safely removes orphaned child events from the `pq_events` table to improve data quality and visualization performance within Supabase's 1000 record limit.

## File Location
```
/workspaces/codespaces-react/supabase/migrations/cleanup_orphaned_child_events.sql
```

## What It Does

### Deletion Scenarios Handled
1. **Option A**: Child events where `parent_event_id` points to non-existent event (parent was deleted)
2. **Option B**: Child events where parent exists but `is_mother_event = false` (invalid parent relationship)
3. **Data Inconsistency 1**: Events where `is_child_event = true` but `parent_event_id IS NULL`
4. **Data Inconsistency 2**: Events where `parent_event_id IS NOT NULL` but `is_child_event = false`

### Safety Features
- ✅ Creates backup tables before deletion (`pq_events_orphaned_backup` and `event_customer_impact_orphaned_backup`)
- ✅ Uses transaction with explicit COMMIT (can be modified to test with ROLLBACK)
- ✅ Provides detailed before/after statistics
- ✅ Includes deletion reason for each backed-up event
- ✅ Automatically handles CASCADE deletion of related `event_customer_impact` records
- ✅ Includes verification queries to confirm data integrity

## How to Use

### Step 1: Review the Script
Open the script in a text editor to understand what it will do.

### Step 2: Run in Supabase SQL Editor
1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `cleanup_orphaned_child_events.sql`
4. Click **Run**

### Step 3: Review the Output
The script will display:

**Before Deletion:**
```
============================================================================
ORPHANED CHILD EVENTS CLEANUP - STATISTICS BEFORE DELETION
============================================================================

Current Database State:
  Total PQ Events:                    5000
  Mother Events (is_mother_event=true): 500
  Valid Child Events:                 3000

Orphaned Child Events to Delete:
  Option A (parent does not exist):   150
  Option B (parent not mother):       50
  Inconsistency 1 (child without parent): 25
  Inconsistency 2 (parent set but not child): 75
  ------------------------------------------------
  TOTAL TO DELETE:                    300

Related Records:
  event_customer_impact records:      120

Backup Table Created:
  Table: pq_events_orphaned_backup
  Records backed up:                  300

After deletion, remaining events:     4700
============================================================================
```

**After Deletion:**
```
============================================================================
DELETION COMPLETED
============================================================================

Events deleted:                       300
Events remaining:                     4700

Backup tables created:
  - pq_events_orphaned_backup
  - event_customer_impact_orphaned_backup
============================================================================
```

### Step 4: Review Backup Tables

**View deleted events by reason:**
```sql
SELECT deletion_reason, COUNT(*) 
FROM pq_events_orphaned_backup 
GROUP BY deletion_reason;
```

**View sample deleted events:**
```sql
SELECT * FROM pq_events_orphaned_backup 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Step 5: Verify Data Integrity

The script automatically runs verification queries. Check the output:

```sql
-- Should show "✓ PASS" with count = 0
SELECT * FROM (
  -- Verification query included in script
  ...
) WHERE status = '✗ FAIL';
```

## Backup Tables Created

### pq_events_orphaned_backup
Contains all deleted events with additional columns:
- `deletion_reason` - Why the event was deleted
- `backed_up_at` - Timestamp when backup was created

### event_customer_impact_orphaned_backup
Contains all related customer impact records that were deleted.

## Restoration (If Needed)

If you need to restore deleted events:

```sql
-- Restore events
INSERT INTO pq_events 
SELECT id, event_type, substation_id, meter_id, timestamp, duration_ms,
       magnitude, severity, status, is_mother_event, parent_event_id,
       root_cause, affected_phases, waveform_data, created_at, resolved_at,
       is_child_event, grouping_type, grouped_at, voltage_level, circuit_id,
       customer_count, remaining_voltage, validated_by_adms, is_special_event,
       false_event, oc, remarks, idr_no, address, equipment_type,
       cause_group, cause, description, object_part_group, object_part_code,
       damage_group, damage_code, outage_type, weather, total_cmi,
       v1, v2, v3, sarfi_10, sarfi_20, sarfi_30, sarfi_40, sarfi_50,
       sarfi_60, sarfi_70, sarfi_80, sarfi_90
FROM pq_events_orphaned_backup;

-- Restore customer impact records
INSERT INTO event_customer_impact
SELECT id, event_id, customer_id, impact_level, estimated_downtime_min, created_at
FROM event_customer_impact_orphaned_backup;
```

## Cleanup After Success

If you're confident the deletion was successful:

**Option 1: Keep Backup Tables (Recommended)**
- Keep for audit trail and future reference
- Tables are timestamped in comments

**Option 2: Drop Backup Tables**
```sql
DROP TABLE pq_events_orphaned_backup;
DROP TABLE event_customer_impact_orphaned_backup;
```

## Testing First (Recommended)

To test without committing changes, modify the script:

1. Change `COMMIT;` to `ROLLBACK;` at line 273
2. Run the script
3. Review all output
4. Change back to `COMMIT;` when ready to proceed

## Expected Results

### Performance Benefits
- ✅ Reduced total event count (closer to 1000 record limit)
- ✅ Improved query performance on pq_events table
- ✅ Better visualization rendering (less data to load)
- ✅ Cleaner data with valid mother-child relationships only

### Data Quality Improvements
- ✅ No orphaned child events
- ✅ All child events have valid mother event parents
- ✅ Consistent `is_child_event` and `parent_event_id` relationships
- ✅ No dangling foreign key references

## Maintenance Schedule

**Recommended Frequency:**
- Run this script monthly or quarterly
- Run after bulk event imports
- Run before critical demos or presentations
- Run when approaching the 1000 record limit

## Troubleshooting

### Script Fails with Foreign Key Error
- Check if there are constraints we missed
- Review the error message and contact support

### Unexpected High Deletion Count
- Review the statistics before deletion
- Check backup table to understand deletion reasons
- Test with ROLLBACK first if concerned

### No Events Deleted
- ✅ This is good! Means your data is clean
- Verify by running the verification queries manually

## Support

If you encounter issues:
1. Check the backup tables to understand what was deleted
2. Review the deletion_reason column for insights
3. Use the verification queries to check data integrity
4. Contact the development team with specific error messages

---

**Created**: December 12, 2025  
**Purpose**: Data quality maintenance for PQ event visualization  
**Status**: Ready for production use
