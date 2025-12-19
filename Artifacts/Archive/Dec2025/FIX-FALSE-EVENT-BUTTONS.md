# Fix False Event Buttons - Testing Guide

## Problem Identified

The console logs show that **child events in your database have `is_child_event: false`** even though they have a `parent_event_id`. This is a data consistency issue that prevents the "Mark as False Event" button from appearing.

### Console Output Analysis:
```
🔍 [Mark False Button Condition] 
{
  childId: '0bf55a8b-9d1a-4b88-bafd-b3f46fb35892', 
  is_child_event: false,  ← SHOULD BE TRUE for child events!
  false_event: false, 
  shouldShow: false
}
```

## Solution

Run the SQL script to:
1. **Fix existing child events** - Set `is_child_event = true` for all events with `parent_event_id`
2. **Generate test data** - Create a mother event with 4 children (2 real, 2 false events)

## Steps to Test

### 1. Run the Fix & Generate Script

```bash
# Copy the SQL to your database tool or run with psql
psql -h your-host -U your-user -d your-db -f fix-and-generate-test-data.sql
```

Or use your Supabase SQL editor to run: `fix-and-generate-test-data.sql`

### 2. Expected Results

The script will:
- ✅ Fix any child events with incorrect `is_child_event` flag
- ✅ Create 1 mother event
- ✅ Create 2 real child events
- ✅ Create 2 **false child events** (these should show the "Mark as False Event" button)

### 3. Test the Buttons

#### A. Test "Convert to Standalone" Button
1. Navigate to Event Management
2. Open one of the 5 **standalone false events** you generated earlier
3. Click "Overview" tab
4. **Expected**: Orange "False Event Detected" banner with "Convert to Standalone" button
5. Console should show:
   ```
   🔍 [Convert Button Condition] 
   { false_event: true, shouldShow: true }
   ```

#### B. Test "Mark as False Event" Button
1. Navigate to Event Management
2. Find and open the **mother event** (remarks: "Test mother event for false child event demonstration")
3. Click "Child Events" tab
4. **Expected**: See 4 child events in the table
5. For the 2 **false child events** (with remarks about "measurement noise" or "transient spike"):
   - Console should show: `🔍 [Mark False Button Condition] { is_child_event: true, false_event: true, shouldShow: false }`
   - Button should **NOT appear** (already marked as false)
6. For the 2 **real child events**:
   - Console should show: `🔍 [Mark False Button Condition] { is_child_event: true, false_event: false, shouldShow: true }`
   - Red "Mark False" button **SHOULD appear** in the Actions column
7. Click "Mark False" on a real child event
8. Confirm the dialog
9. **Expected**: Event is removed from the group and marked as false

## Button Visibility Rules

### "Convert to Standalone" (Overview Tab)
- **Shows when**: `currentEvent.false_event === true`
- **Location**: Overview tab, in orange banner
- **Purpose**: Convert a false event back to a real standalone event

### "Mark as False Event" (Child Events Tab)
- **Shows when**: `childEvent.is_child_event === true && childEvent.false_event === false`
- **Location**: Child Events tab, Actions column (for each child)
- **Purpose**: Mark a child event as a false detection and remove it from the group

## Troubleshooting

### Button still not showing?

1. **Check console logs** - Look for the `🔍` emoji logs
2. **Verify data**:
   ```sql
   -- Check the test mother event and its children
   SELECT 
     CASE 
       WHEN is_mother_event THEN '🔴 MOTHER'
       WHEN false_event THEN '⚠️ FALSE CHILD'
       ELSE '✅ REAL CHILD'
     END as type,
     id,
     is_child_event,
     false_event,
     validated_by_adms,
     remarks
   FROM pq_events
   WHERE 
     remarks = 'Test mother event for false child event demonstration'
     OR parent_event_id IN (
       SELECT id FROM pq_events 
       WHERE remarks = 'Test mother event for false child event demonstration'
     )
   ORDER BY is_mother_event DESC, timestamp;
   ```

3. **Expected output**:
   - 1 mother event: `is_mother_event=true, is_child_event=false`
   - 4 child events: `is_child_event=true`
   - 2 of those children: `false_event=true, validated_by_adms=true`
   - 2 of those children: `false_event=false` ← These should show the button

### Database Constraint Issue?

If you get an error about `validated_by_adms`, remember:
- The database has: `CHECK (false_event = FALSE OR validated_by_adms = TRUE)`
- This means: **If marking as false event, MUST also set `validated_by_adms = true`**
- The handler already does this correctly

## Files Changed

1. **EventDetails.tsx**:
   - Added console logging to both button conditions
   - Moved "Mark as False Event" button to individual child event rows
   - Updated `handleMarkChildAsFalse()` to accept `childEvent` parameter

2. **fix-and-generate-test-data.sql** (NEW):
   - Fixes existing child events
   - Generates test data with false child events

## Next Steps

After running the SQL:
1. Refresh your browser
2. Open the test mother event
3. Check the console logs
4. Verify buttons appear correctly
5. Test the functionality by clicking the buttons
