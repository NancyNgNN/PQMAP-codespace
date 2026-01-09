# Meter Hierarchy Fix Guide

**Created:** January 9, 2026  
**Issue:** Meters with missing transformer codes (ss400/ss132/ss011) appearing incorrectly in tree view

## Problem Summary

Some meters lack proper transformer hierarchy codes, causing them to appear as "orphans" at the root level of the tree view instead of their correct hierarchical position.

**Example:** PQM-APB-187 (380V) shows at top level because it has no `ss011` code.

## Correct Hierarchy Structure

```
400kV → SS400 only
  ↓
132kV → SS400 + SS132
  ↓
11kV  → SS132 + SS011
  ↓
380V  → SS011 only
```

### Expected Transformer Codes by Voltage Level

| Voltage Level | SS400          | SS132          | SS011          |
|---------------|----------------|----------------|----------------|
| 400kV         | {area}400      | NULL           | NULL           |
| 132kV         | {area}400      | {area}132      | NULL           |
| 11kV          | NULL           | {area}132      | {area}011      |
| 380V          | NULL           | NULL           | {area}011      |

**Example for area "CPK":**
- 400kV: ss400 = "CPK400"
- 132kV: ss400 = "CPK400", ss132 = "CPK132"
- 11kV: ss132 = "CPK132", ss011 = "CPK011"
- 380V: ss011 = "CPK011"

## Fix Plan

### Phase 1: Analysis (5 minutes)

1. **Run diagnostic script** in Supabase SQL Editor:
   ```
   scripts/check-meter-hierarchy.sql
   ```

2. **Review results:**
   - Count of meters by voltage level with missing codes
   - List of all orphan meters
   - Hierarchy violations by voltage level
   - Missing area codes

3. **Document findings:**
   - Total meters affected: ?
   - Breakdown by voltage level: ?
   - Meters missing area codes: ?

### Phase 2: Backup (2 minutes)

1. **Automatic backup** created by backfill script:
   ```sql
   -- Table: pq_meters_backup_hierarchy_20260109
   -- Created automatically in Step 1 of backfill script
   ```

2. **Verify backup:**
   ```sql
   SELECT COUNT(*) FROM pq_meters_backup_hierarchy_20260109;
   ```

### Phase 3: Dry Run (10 minutes)

1. **Run backfill script in DRY RUN mode** (all UPDATE statements commented):
   ```
   scripts/backfill-meter-hierarchy.sql
   ```

2. **Review each section's SELECT preview:**
   - Area extraction (if needed)
   - 400kV updates
   - 132kV updates
   - 11kV updates
   - 380V updates

3. **Verify transformer codes look correct:**
   - Check area codes are extracted properly
   - Verify format: {area}400, {area}132, {area}011

### Phase 4: Execute Updates (5 minutes)

1. **Uncomment UPDATE statements** in backfill script one voltage level at a time

2. **Execute updates in order:**
   ```sql
   -- Step 2: Update area codes (if needed)
   UPDATE pq_meters SET area = ...
   
   -- Step 3: Update 400kV meters
   UPDATE pq_meters SET ss400 = ..., ss132 = NULL, ss011 = NULL ...
   
   -- Step 4: Update 132kV meters
   UPDATE pq_meters SET ss400 = ..., ss132 = ..., ss011 = NULL ...
   
   -- Step 5: Update 11kV meters
   UPDATE pq_meters SET ss400 = NULL, ss132 = ..., ss011 = ... ...
   
   -- Step 6: Update 380V meters
   UPDATE pq_meters SET ss400 = NULL, ss132 = NULL, ss011 = ... ...
   ```

3. **Run verification queries** after each voltage level

### Phase 5: Verification (5 minutes)

1. **Check results summary:**
   ```sql
   SELECT 
     voltage_level,
     COUNT(*) as total,
     COUNT(*) FILTER (WHERE hierarchy is correct) as correct_hierarchy
   FROM pq_meters
   GROUP BY voltage_level;
   ```

2. **Verify PQM-APB-187 specifically:**
   ```sql
   SELECT meter_id, voltage_level, area, ss400, ss132, ss011
   FROM pq_meters
   WHERE meter_id = 'PQM-APB-187';
   -- Expected: area='CPK', ss400=NULL, ss132=NULL, ss011='CPK011'
   ```

3. **Test tree view in UI:**
   - Navigate to Meter Hierarchy page
   - Verify no meters in "⚠️ Incomplete Hierarchy" section
   - Check PQM-APB-187 appears under proper 380V parent

### Phase 6: UI Updates (Automatic)

**Already implemented in code:**

1. **Warning indicators** for incomplete hierarchy:
   - `hasIncompleteHierarchy` flag in `MeterTreeNode`
   - Orphan section at bottom of tree with ⚠️ icon

2. **Validation function** `checkMeterHierarchy()`:
   - Returns completeness status
   - Provides helpful error messages
   - Shows expected codes

3. **Tree structure improvements:**
   - Orphans grouped separately
   - Clear visual warnings
   - Prevents confusing display

## Rollback Procedure

If issues occur:

```sql
-- Delete current data
DELETE FROM pq_meters;

-- Restore from backup
INSERT INTO pq_meters 
SELECT * FROM pq_meters_backup_hierarchy_20260109;

-- Verify restoration
SELECT COUNT(*) FROM pq_meters;

-- Drop backup when satisfied
DROP TABLE pq_meters_backup_hierarchy_20260109;
```

## Expected Results

**Before:**
- 19 meters at 380V with no transformer codes
- PQM-APB-187 appears as root-level meter
- Tree structure confusing and incorrect

**After:**
- All 19 meters have ss011 codes based on area
- PQM-APB-187 properly nested under CPK011 hierarchy
- Clean tree view with correct voltage level ordering
- Orphan section empty (or contains only truly problematic meters)

## Validation Checklist

- [ ] Backup created successfully
- [ ] Dry run previews look correct
- [ ] All 400kV meters have ss400 only
- [ ] All 132kV meters have ss400 + ss132
- [ ] All 11kV meters have ss132 + ss011
- [ ] All 380V meters have ss011 only
- [ ] PQM-APB-187 has correct codes (ss011='CPK011')
- [ ] Tree view displays correctly
- [ ] No orphans remain (unless intentional)
- [ ] UI warnings work properly

## Future Prevention

1. **Validation on meter creation:**
   - Already implemented in `createMeter()` function
   - Uses `validateTransformerCodes()`
   - Prevents saving incomplete hierarchy

2. **Auto-population helper:**
   - Already implemented in `autoPopulateFromMeterName()`
   - Suggests codes based on meter name and voltage level
   - Reduces manual entry errors

3. **UI warnings:**
   - Already implemented with `hasIncompleteHierarchy` flag
   - Shows visual indicators for problem meters
   - Guides users to fix issues

## Troubleshooting

**Issue:** Area extraction fails for some meters  
**Solution:** Manually set area codes before running backfill

**Issue:** Some meters have custom transformer codes  
**Solution:** Exclude them from UPDATE with WHERE clause

**Issue:** Rollback needed but backup missing  
**Solution:** Contact DBA for database-level backup restoration

## Contact

For questions or issues during execution:
- Check logs in Supabase SQL Editor
- Review error messages carefully
- Test with small sample first (add LIMIT 10 to UPDATEs)
