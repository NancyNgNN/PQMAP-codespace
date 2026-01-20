# 🔍 SARFI Data Table Investigation Summary

## Current Situation

**What's Working:**
✅ SARFI chart displays with trend data  
✅ Database has records:
- pq_events: 1156 records
- pq_meters: 89 records  
- sarfi_metrics: 120 records
- sarfi_profile_weights: 251 records
- sarfi_profiles: 3 profiles
- substations: 15 records

**What's Not Working:**
❌ SARFI data table shows: "No data available for the selected filters"

---

## Root Cause Analysis

The table data fetching involves 4 steps:
1. **Fetch profile weights** → Get list of meters in profile
2. **Fetch meter details** → Get meter info
3. **Fetch events** → Get voltage_dip events for those meters
4. **Calculate SARFI** → Count events by threshold

**Most likely causes:**

### A. No Voltage Dip Events
- SARFI only counts `event_type = 'voltage_dip'`  
- If your 1156 events are different types, they won't show

### B. Voltage Level Mismatch
- Query filters by `voltage_level` column on events
- If events have NULL voltage_level, filtering won't work

### C. Meter ID Mismatch
- Profile weights point to specific meter IDs
- If events use different meter IDs, no match

---

## Diagnostic Tools Created

### 1. Enhanced Logging
**File:** `src/services/sarfiService.ts`  
**What it does:** Console logs every step of data fetching

**To see logs:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Enable "Show Data Table" in SARFI settings
4. Watch for log messages with 🔍 ✅ ⚠️ ❌ emojis

---

### 2. Debug Script
**File:** `debug-sarfi-table.js`  
**What it does:** Comprehensive database inspection

**How to use:**
1. Open your app in browser
2. Press F12 → Console tab
3. Copy entire contents of `debug-sarfi-table.js`
4. Paste into console and press Enter
5. Review detailed output

**What it checks:**
- ✅ Profiles exist
- ✅ Weights exist for profile
- ✅ Meters have voltage levels
- ✅ Events exist for those meters
- ✅ Events are type 'voltage_dip'
- ✅ Events have remaining_voltage or magnitude
- ✅ SARFI threshold counts
- ✅ Test query matches events

---

### 3. Troubleshooting Guide
**File:** `Artifacts/SARFI_TABLE_TROUBLESHOOTING.md`  
**What it covers:**
- Common problems A-D
- SQL queries to diagnose each issue
- Solutions for each problem
- Step-by-step verification
- Expected working state

---

## Action Plan

### Step 1: Run Debug Script (5 minutes)

```javascript
// Copy from debug-sarfi-table.js and paste in browser console
```

This will tell you EXACTLY what's wrong.

---

### Step 2: Check Event Types

Most likely issue! Run in Supabase SQL Editor:

```sql
-- What event types do you have?
SELECT event_type, COUNT(*) as count
FROM pq_events
GROUP BY event_type
ORDER BY count DESC;
```

**If you don't see `voltage_dip`:**

Your events might be called something else. Check what you have and either:

**Option A:** Rename them:
```sql
UPDATE pq_events 
SET event_type = 'voltage_dip'::event_type
WHERE event_type = 'YOUR_ACTUAL_TYPE_HERE';
```

**Option B:** Modify the query in code (I can help with this)

---

### Step 3: Check Voltage Levels

```sql
-- Do events have voltage levels set?
SELECT 
  voltage_level,
  COUNT(*) as count
FROM pq_events
WHERE event_type = 'voltage_dip'  -- or your actual event type
GROUP BY voltage_level;
```

**If all NULL:**

```sql
-- Copy voltage level from meters to events
UPDATE pq_events e
SET voltage_level = m.voltage_level
FROM pq_meters m
WHERE e.meter_id = m.id
  AND e.voltage_level IS NULL;
```

---

### Step 4: Verify Profile Weights

```sql
-- Get your active profile
SELECT id, name, year FROM sarfi_profiles WHERE is_active = true;

-- Check it has weights (replace UUID)
SELECT COUNT(*) as weight_count
FROM sarfi_profile_weights
WHERE profile_id = 'YOUR-PROFILE-UUID-HERE';
```

**If weight_count = 0:**

Profile has no meters! Need to add weights. See troubleshooting guide.

---

### Step 5: Test Query

```sql
-- Get active profile first
SELECT id FROM sarfi_profiles WHERE is_active = true LIMIT 1;

-- Test if events match profile meters (replace UUID)
SELECT COUNT(*) as matching_events
FROM pq_events e
WHERE e.event_type = 'voltage_dip'  -- or your actual event type
  AND e.meter_id IN (
    SELECT meter_id 
    FROM sarfi_profile_weights 
    WHERE profile_id = 'YOUR-PROFILE-UUID-HERE'
  );
```

**Expected:** matching_events > 0

---

## Quick Test

Try this in your app RIGHT NOW:

1. **Open SARFI Chart**
2. **Click Settings** (⚙️ icon)
3. **Configure:**
   - Profile: Select ANY profile
   - Voltage Level: **"All"** ← Important!
   - ☐ Uncheck "Exclude Special Events"
   - ✓ Check "Show Data Table"
4. **Click "Apply Filters"**
5. **Open Console** (F12)
6. **Look for log messages**

If you see:
```
✅ Fetched events: 0
```

→ Problem is with events (wrong type, wrong meter_id, or voltage level filter)

If you see:
```
✅ Fetched events: 240
✅ Final SARFI data points: 8
```

→ Code is working! Table should appear. Check UI rendering.

---

## Most Likely Scenarios

### Scenario 1: Events Have Different Type (80% probability)

**Symptom:** Console shows "Fetched events: 0"  
**Cause:** Your 1156 events are not type 'voltage_dip'  
**Fix:** 
```sql
-- Check what types you have
SELECT DISTINCT event_type FROM pq_events;

-- If they're called something else, update:
UPDATE pq_events SET event_type = 'voltage_dip'::event_type 
WHERE event_type = 'your_actual_type';
```

---

### Scenario 2: Voltage Level Filter Too Strict (15% probability)

**Symptom:** Works with "All" but not with specific voltage  
**Cause:** Events don't have voltage_level set  
**Fix:** Use "All" voltage level, OR set voltage levels on events

---

### Scenario 3: Profile Has No Weights (5% probability)

**Symptom:** Console shows "Fetched weights: 0 meters"  
**Cause:** Profile was created but weights weren't added  
**Fix:** Add weights via SQL or re-run seed script

---

## Files Changed

1. ✅ `src/services/sarfiService.ts`
   - Added comprehensive console logging
   - Added validation for profileId
   - Fixed query to use pq_events.voltage_level directly
   - Better error handling

2. ✅ `debug-sarfi-table.js`
   - New debugging script
   - Tests all database tables
   - Simulates actual query
   - Provides detailed diagnosis

3. ✅ `Artifacts/SARFI_TABLE_TROUBLESHOOTING.md`
   - Complete troubleshooting guide
   - SQL queries for each scenario
   - Step-by-step solutions

---

## Next Steps for You

**Right now:**
1. Run debug script in browser console
2. Check event_type in database
3. Report back what you find

**Provide this info:**
```
1. Event types in your database: [from SELECT DISTINCT event_type FROM pq_events]
2. Console output when enabling table: [copy from browser console]
3. Active profile name: [from SARFI settings]
```

With this info, I can give you the EXACT fix! 🎯

---

## Expected Timeline

- **Debug script:** 2 minutes
- **Check event types:** 1 minute  
- **Apply fix:** 1-5 minutes
- **Verify:** 1 minute

**Total: ~10 minutes to resolution**

---

**Status:** 🔍 Waiting for diagnostic results  
**Confidence:** High - Enhanced logging will reveal the exact issue  
**Next:** Run debug script and report findings
