# 🔧 Fix: "column voltage_level does not exist" Error

## Problem

You're getting this error when running `seed-sarfi-data.sql`:

```
Error: Failed to run sql query: ERROR: 42703: 
column "voltage_level" of relation "pq_meters" does not exist
LINE 43: INSERT INTO pq_meters (meter_id, substation_id, location, voltage_level, ...
```

## Root Cause

**The migration that adds these columns hasn't been run yet!**

Your TypeScript code (in `database.ts`) expects these columns:
- `pq_meters.voltage_level` ❌ Doesn't exist
- `pq_meters.meter_type` ❌ Doesn't exist  
- `pq_events.voltage_level` ❌ Doesn't exist
- `pq_events.circuit_id` ❌ Doesn't exist
- (and 4 more columns...)

But the database doesn't have them yet because migration `20251209000001_add_sarfi_columns.sql` is **NOT APPLIED**.

---

## Solution: 2-Step Fix

### Step 1️⃣: Apply the Migration (Add Missing Columns)

#### Go to Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New query" button

3. **Copy Migration SQL**
   - Open file: `/workspaces/codespaces-react/supabase/migrations/20251209000001_add_sarfi_columns.sql`
   - Copy **ALL contents** (Ctrl+A, Ctrl+C)

4. **Paste and Run**
   - Paste into SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)
   - Wait for success message

5. **Verify Success**
   You should see output like:
   ```
   Success. No rows returned
   ```

   Or run this verification query:
   ```sql
   -- Verify columns were added
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'pq_meters' 
     AND column_name IN ('voltage_level', 'meter_type');
   ```
   
   Expected result: 2 rows showing `voltage_level` and `meter_type`

---

### Step 2️⃣: Run the Seed Script (Populate Data)

#### Still in SQL Editor

1. **New Query**
   - Click "New query" button (or use same tab)

2. **Copy Seed SQL**
   - Open file: `/workspaces/codespaces-react/seed-sarfi-data.sql`
   - Copy **ALL contents** (Ctrl+A, Ctrl+C)

3. **Paste and Run**
   - Paste into SQL Editor
   - Click **"Run"** button

4. **Verify Success**
   You should see NOTICE messages like:
   ```
   NOTICE: Using existing substation with ID: xxx
   NOTICE: Total SARFI meters ready: 8
   NOTICE: SARFI Profile ID: xxx
   NOTICE: Profile weights created: 8
   NOTICE: Total PQ events created: 240
   NOTICE: ✅ SARFI Data Seeding Complete!
   ```

5. **Check Data**
   ```sql
   -- Check meters were created
   SELECT meter_id, location, voltage_level 
   FROM pq_meters 
   WHERE meter_id LIKE 'MTR-SARFI-%';
   
   -- Should show 8 rows
   ```

---

## What Gets Fixed

### Before Migration ❌
```sql
-- pq_meters table (9 columns)
CREATE TABLE pq_meters (
  id uuid,
  meter_id text,
  substation_id uuid,
  location text,
  status meter_status,
  last_communication timestamptz,
  firmware_version text,
  installed_date timestamptz,
  created_at timestamptz
  -- ❌ Missing: meter_type, voltage_level
);
```

### After Migration ✅
```sql
-- pq_meters table (11 columns)
CREATE TABLE pq_meters (
  id uuid,
  meter_id text,
  substation_id uuid,
  location text,
  status meter_status,
  last_communication timestamptz,
  firmware_version text,
  installed_date timestamptz,
  created_at timestamptz,
  meter_type text,           -- ✅ Added
  voltage_level text         -- ✅ Added
);
```

### Plus 6 more columns added to `pq_events`:
- ✅ `voltage_level` (TEXT)
- ✅ `circuit_id` (TEXT)
- ✅ `customer_count` (INTEGER)
- ✅ `remaining_voltage` (DECIMAL)
- ✅ `validated_by_adms` (BOOLEAN)
- ✅ `is_special_event` (BOOLEAN)

---

## Alternative: CLI Method

If you have Supabase CLI installed:

```bash
cd /workspaces/codespaces-react

# Apply all pending migrations
supabase db push

# Or run specific migration
supabase db execute -f supabase/migrations/20251209000001_add_sarfi_columns.sql
```

---

## Files Involved

### 1. Migration File (Run First)
**File:** `supabase/migrations/20251209000001_add_sarfi_columns.sql`
**Purpose:** Adds missing columns to database
**Status:** ⚠️ Not yet applied

### 2. Seed Script (Run Second)
**File:** `seed-sarfi-data.sql`
**Purpose:** Populates SARFI demonstration data
**Status:** ⏳ Ready to run after migration

### 3. TypeScript Types (Already Correct)
**File:** `src/types/database.ts`
**Purpose:** TypeScript interfaces
**Status:** ✅ Correct (expects columns that migration will add)

---

## Troubleshooting

### Error: "relation does not exist"
**Problem:** Base tables not created
**Solution:** Run initial migration: `20251103020125_create_pqmap_schema.sql`

### Error: "duplicate column name"
**Problem:** Migration already applied
**Solution:** Skip Step 1, go directly to Step 2 (seed script)

### Error: "duplicate key value violates unique constraint"
**Problem:** Data already exists
**Solution:** This is OK! Script is idempotent. Check data with:
```sql
SELECT COUNT(*) FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%';
-- Should return 8 if already seeded
```

### No error but no data
**Problem:** Seed script ran but didn't create data
**Solution:** Check notices/output. Look for substation:
```sql
SELECT * FROM substations LIMIT 1;
-- If empty, create one manually first
```

---

## Success Checklist

After completing both steps, verify:

- [ ] Migration applied successfully
- [ ] 8 SARFI meters created (MTR-SARFI-001 to 008)
- [ ] 1 SARFI profile created ("2025 Standard Profile")
- [ ] 8 profile weights created
- [ ] ~240 PQ events created
- [ ] SARFI table displays data in Dashboard
- [ ] No TypeScript errors about missing properties

---

## View Your Data

After successful setup:

1. **Go to Dashboard**
2. **Find SARFI Metrics Trend Chart**
3. **Click Settings Icon** (⚙️)
4. **SARFI Configuration:**
   - Profile: Select "2025 Standard Profile"
   - Voltage Level: "All"
   - ✓ Check "Show Data Table"
   - Click "Apply Filters"
5. **See Results:**
   - Chart updates with trend data
   - Table appears below showing 8 meters
   - Totals row at bottom

---

## Summary

**The error happens because:**
- TypeScript expects columns that don't exist yet
- Seed script tries to insert into non-existent columns
- Migration file exists but hasn't been executed

**Fix by running IN ORDER:**
1. ✅ Migration (adds columns)
2. ✅ Seed script (adds data)

**Then enjoy your SARFI data! 🎉**
