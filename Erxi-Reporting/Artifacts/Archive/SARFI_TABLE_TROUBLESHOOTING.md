# SARFI Data Table Troubleshooting Guide

## Issue: "No data available for the selected filters"

You're seeing the SARFI chart with metrics, but the data table shows "No data available" message.

---

## Quick Diagnosis Steps

### Step 1: Check Browser Console (F12)

Open browser DevTools and look for these log messages when you enable "Show Data Table":

**Expected Console Output:**
```
🔄 Fetching SARFI table data with filters: {...}
🔍 fetchFilteredSARFIData called with filters: {...}
📊 Step 1: Fetching profile weights for profile: [UUID]
✅ Fetched weights: 8 meters
📊 Step 2: Fetching meter details...
✅ Fetched meters: 8
📊 Step 3: Fetching events...
✅ Fetched events: 240
📊 Step 4: Calculating SARFI indices...
📊 Initialized meters: 8
✅ Final SARFI data points: 8
✅ Fetched SARFI table data: 8 meters
```

**If you see this instead:**
```
⚠️ No weights found for profile: [UUID]
```
→ **Problem:** Profile has no weights. See Solution A below.

**If you see this:**
```
✅ Fetched weights: 8 meters
✅ Fetched meters: 8
✅ Fetched events: 0
```
→ **Problem:** No events match the filter criteria. See Solution B below.

---

### Step 2: Run Debug Script

1. **Open Browser Console** (F12 → Console tab)
2. **Copy & paste** the contents of `debug-sarfi-table.js`
3. **Press Enter**
4. **Review the detailed output**

The script will show you:
- ✅ How many profiles exist
- ✅ How many weights per profile
- ✅ How many meters match
- ✅ How many events exist
- ✅ Voltage level distribution
- ✅ SARFI threshold analysis

---

## Common Problems & Solutions

### Problem A: No Profile Weights

**Symptoms:**
- Console shows: "Fetched weights: 0 meters"
- Or: "No weights found for profile"

**Cause:** The selected profile has no weight factors assigned to meters.

**Solution:**

Run this SQL in Supabase SQL Editor:

```sql
-- Check which profiles exist
SELECT id, name, year FROM sarfi_profiles;

-- Check weights for a specific profile (replace UUID)
SELECT COUNT(*) as weight_count
FROM sarfi_profile_weights
WHERE profile_id = 'YOUR-PROFILE-UUID-HERE';
```

If weight_count is 0, you need to seed weights:

```sql
-- Create weights for all meters in the profile
INSERT INTO sarfi_profile_weights (profile_id, meter_id, weight_factor, notes)
SELECT 
  'YOUR-PROFILE-UUID-HERE'::uuid,
  m.id,
  CASE 
    WHEN m.voltage_level = '400kV' THEN 1.5
    WHEN m.voltage_level = '132kV' THEN 1.2
    WHEN m.voltage_level = '11kV' THEN 1.0
    ELSE 0.8
  END,
  'Weight factor based on voltage level'
FROM pq_meters m
WHERE m.meter_id NOT LIKE 'MTR-SARFI-%' -- Your actual meters
ON CONFLICT (profile_id, meter_id) DO NOTHING;
```

---

### Problem B: No Events Match Filter

**Symptoms:**
- Console shows: "Fetched events: 0"
- Weights and meters exist

**Possible Causes:**

#### B1: No voltage_dip events

Check event types:

```sql
SELECT event_type, COUNT(*) as count
FROM pq_events
GROUP BY event_type;
```

If no `voltage_dip` events exist, SARFI won't show data (SARFI only counts voltage dips).

**Solution:** Your events might be type `voltage_sag` or something else. Either:

Option 1: Change event type:
```sql
UPDATE pq_events 
SET event_type = 'voltage_dip'::event_type
WHERE event_type IN ('voltage_sag', 'sag');
```

Option 2: Modify the query in `sarfiService.ts` to include other types.

---

#### B2: Voltage Level Mismatch

Check voltage levels on events:

```sql
SELECT voltage_level, COUNT(*) as count
FROM pq_events
WHERE event_type = 'voltage_dip'
GROUP BY voltage_level;
```

If all events have `NULL` voltage_level but you're filtering by "132kV", nothing will match.

**Solution:**

Option 1: Use "All" voltage level filter (recommended for now)

Option 2: Set voltage levels on events:
```sql
-- Copy voltage level from meters
UPDATE pq_events e
SET voltage_level = m.voltage_level
FROM pq_meters m
WHERE e.meter_id = m.id
  AND e.voltage_level IS NULL
  AND m.voltage_level IS NOT NULL;
```

---

#### B3: Meter ID Mismatch

Check if event meter_ids match profile meter_ids:

```sql
-- Get meter IDs from profile weights
SELECT meter_id 
FROM sarfi_profile_weights 
WHERE profile_id = 'YOUR-PROFILE-UUID-HERE'
LIMIT 5;

-- Check if events exist for those meters
SELECT meter_id, COUNT(*) as event_count
FROM pq_events
WHERE meter_id IN (
  SELECT meter_id FROM sarfi_profile_weights 
  WHERE profile_id = 'YOUR-PROFILE-UUID-HERE'
)
GROUP BY meter_id;
```

If event_count is 0, the meters in the profile have no events.

**Solution:** Either:
- Add events for those meters
- Or update profile weights to include meters that have events

---

### Problem C: Missing remaining_voltage Column

**Symptoms:**
- Events exist but SARFI counts are all 0

**Cause:** Events don't have `remaining_voltage` set, and `magnitude` is > 100% or NULL.

Check:

```sql
SELECT 
  COUNT(*) as total,
  COUNT(remaining_voltage) as has_remaining_voltage,
  COUNT(magnitude) as has_magnitude,
  AVG(COALESCE(remaining_voltage, magnitude)) as avg_value
FROM pq_events
WHERE event_type = 'voltage_dip';
```

**Solution:**

```sql
-- Copy magnitude to remaining_voltage
UPDATE pq_events
SET remaining_voltage = magnitude
WHERE remaining_voltage IS NULL 
  AND magnitude IS NOT NULL;
```

---

### Problem D: All Events Are Special Events

**Symptoms:**
- Events exist
- Filter has "Exclude Special Events" checked
- But table shows no data

Check:

```sql
SELECT 
  is_special_event,
  COUNT(*) as count
FROM pq_events
WHERE event_type = 'voltage_dip'
GROUP BY is_special_event;
```

**Solution:** Uncheck "Exclude Special Events" in SARFI configuration, OR:

```sql
-- Mark most events as non-special
UPDATE pq_events
SET is_special_event = false
WHERE is_special_event = true
  AND id NOT IN (
    SELECT id FROM pq_events 
    WHERE is_special_event = true 
    ORDER BY timestamp DESC 
    LIMIT 10
  );
```

---

## Step-by-Step Verification

### 1. Verify Database Has Data

```sql
-- Check tables have records
SELECT 
  (SELECT COUNT(*) FROM sarfi_profiles) as profiles,
  (SELECT COUNT(*) FROM sarfi_profile_weights) as weights,
  (SELECT COUNT(*) FROM pq_meters) as meters,
  (SELECT COUNT(*) FROM pq_events WHERE event_type = 'voltage_dip') as voltage_dips;
```

**Expected:** All counts > 0

---

### 2. Verify Profile Configuration

```sql
-- Get active profile details
SELECT 
  p.id,
  p.name,
  p.year,
  p.is_active,
  COUNT(w.id) as meter_count
FROM sarfi_profiles p
LEFT JOIN sarfi_profile_weights w ON w.profile_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name, p.year, p.is_active;
```

**Expected:** meter_count > 0

---

### 3. Verify Events Have Proper Values

```sql
-- Check event data quality
SELECT 
  COUNT(*) as total_events,
  COUNT(meter_id) as has_meter_id,
  COUNT(voltage_level) as has_voltage_level,
  COUNT(remaining_voltage) as has_remaining_voltage,
  COUNT(magnitude) as has_magnitude,
  SUM(CASE WHEN COALESCE(remaining_voltage, magnitude) <= 90 THEN 1 ELSE 0 END) as sarfi_10_count,
  SUM(CASE WHEN COALESCE(remaining_voltage, magnitude) <= 70 THEN 1 ELSE 0 END) as sarfi_30_count
FROM pq_events
WHERE event_type = 'voltage_dip';
```

**Expected:** 
- has_meter_id = total_events
- sarfi_10_count > 0

---

### 4. Test Query Manually

```sql
-- Get active profile ID first
SELECT id, name FROM sarfi_profiles WHERE is_active = true LIMIT 1;

-- Then test the full query (replace UUID)
WITH profile_meters AS (
  SELECT meter_id, weight_factor
  FROM sarfi_profile_weights
  WHERE profile_id = 'YOUR-PROFILE-UUID-HERE'
)
SELECT 
  m.meter_id,
  m.location,
  COUNT(*) as event_count,
  SUM(CASE WHEN COALESCE(e.remaining_voltage, e.magnitude) <= 90 THEN 1 ELSE 0 END) as sarfi_10,
  SUM(CASE WHEN COALESCE(e.remaining_voltage, e.magnitude) <= 70 THEN 1 ELSE 0 END) as sarfi_30,
  pm.weight_factor
FROM pq_events e
JOIN pq_meters m ON m.id = e.meter_id
JOIN profile_meters pm ON pm.meter_id = m.id
WHERE e.event_type = 'voltage_dip'
GROUP BY m.meter_id, m.location, pm.weight_factor
ORDER BY m.meter_id;
```

**Expected:** Multiple rows with event_count > 0

---

## Quick Fixes

### Fix 1: Reset to "All" Filters

In the app:
1. Click SARFI Settings (⚙️)
2. Profile: Select any active profile
3. Voltage Level: **"All"**
4. Data Type: "Magnitude"
5. ☐ Uncheck "Exclude Special Events"
6. ✓ Check "Show Data Table"
7. Click "Apply Filters"

---

### Fix 2: Ensure Seed Data Exists

If you ran the seed script and still see no data:

```sql
-- Verify SARFI seed data exists
SELECT COUNT(*) FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%';
-- Should return: 8

SELECT COUNT(*) FROM pq_events 
WHERE meter_id IN (SELECT id FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%');
-- Should return: ~240

-- If both are > 0, check profile weights
SELECT COUNT(*) FROM sarfi_profile_weights 
WHERE meter_id IN (SELECT id FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%');
-- Should return: 8
```

---

## Still Not Working?

### Get Detailed Logs

1. Open browser console (F12)
2. Clear console
3. Go to SARFI chart
4. Open settings
5. Enable "Show Data Table"
6. Click "Apply Filters"
7. **Copy ALL console output**
8. **Check for errors (red text)**

### Common Error Messages

**"column voltage_level does not exist"**
→ Migration not applied. See `FIX_SCHEMA_ERROR.md`

**"relation sarfi_profile_weights does not exist"**
→ Run migration: `20251209000000_create_sarfi_profiles.sql`

**"Cannot read property 'id' of null"**
→ No profile selected or profile doesn't exist

---

## Expected Working State

When everything works correctly:

**Console output:**
```
✅ Fetched SARFI profiles: 3 profiles
📌 Auto-selecting profile: 2025 Standard Profile
🔄 Fetching SARFI table data with filters: {profileId: "...", voltageLevel: "All", ...}
✅ Fetched weights: 8 meters
✅ Fetched meters: 8
✅ Fetched events: 240
✅ Final SARFI data points: 8
✅ Fetched SARFI table data: 8 meters
```

**UI Display:**
- SARFI chart shows trend bars
- Below chart, data table appears
- Table shows 8 rows (meters)
- Each row has SARFI-10, 30, 50, 70, 80, 90 counts
- Bottom row shows totals
- Weight factors shown in last column

---

## Contact Information

If still stuck, provide:
1. Console output (all log messages)
2. SQL query results from "Verify Database Has Data"
3. Selected profile name and ID
4. Screenshot of the "No data available" message

---

**Last Updated:** December 9, 2025
