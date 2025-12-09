# SARFI Data Setup Guide

## Overview
This guide explains how to populate your database with SARFI (System Average RMS Variation Frequency Index) demonstration data.

## Prerequisites
Before running the seed script, you need to apply the database migration to add required columns.

---

## Step 1: Apply Database Migration

### Option A: Via Supabase Dashboard (Recommended)
1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **SQL Editor**
3. Click **"New query"**
4. Open and copy: `/workspaces/codespaces-react/supabase/migrations/20251209000001_add_sarfi_columns.sql`
5. Paste into SQL Editor
6. Click **"Run"**

### Option B: Via Supabase CLI
```bash
cd /workspaces/codespaces-react
supabase db push
```

### What This Migration Does:
Adds the following columns to existing tables:

**pq_events table:**
- `voltage_level` (TEXT) - Voltage level (400kV, 132kV, 11kV, 380V)
- `circuit_id` (TEXT) - Circuit identifier
- `customer_count` (INTEGER) - Number of affected customers
- `remaining_voltage` (DECIMAL) - Remaining voltage percentage
- `validated_by_adms` (BOOLEAN) - ADMS validation flag
- `is_special_event` (BOOLEAN) - Special event flag for exclusion

**pq_meters table:**
- `meter_type` (TEXT) - Type of meter
- `voltage_level` (TEXT) - Operating voltage level

---

## Step 2: Seed SARFI Data

### Option A: SQL Script (Fastest - Recommended)

1. **Open Supabase SQL Editor**
   - Go to Supabase Dashboard → SQL Editor
   - Click "New query"

2. **Run the Seed Script**
   - Open: `/workspaces/codespaces-react/seed-sarfi-data.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **"Run"**

3. **Verify Success**
   You should see output like:
   ```
   NOTICE: Using existing substation with ID: xxx
   NOTICE: Total SARFI meters ready: 8
   NOTICE: SARFI Profile ID: xxx
   NOTICE: Profile weights created: 8
   NOTICE: Total PQ events created: 240
   NOTICE: ============================================================
   NOTICE: ✅ SARFI Data Seeding Complete!
   NOTICE: ============================================================
   ```

### Option B: UI Component

1. Navigate to **System Health** or **Database Controls**
2. Find **"SARFI Data Seeder"** panel
3. Click **"Seed SARFI Data"** button
4. Wait for completion

### Option C: Browser Console

1. Open your PQMAP Dashboard
2. Press F12 to open Developer Console
3. Copy contents of: `/workspaces/codespaces-react/seed-sarfi-console.js`
4. Paste into console and press Enter

---

## What Gets Created

### 8 PQ Meters (MTR-SARFI-001 to MTR-SARFI-008)
| Meter ID | Location | Voltage | Weight Factor |
|----------|----------|---------|---------------|
| MTR-SARFI-001 | Main Street Substation | 132kV | 1.2 |
| MTR-SARFI-002 | Industrial Park A | 132kV | 1.2 |
| MTR-SARFI-003 | Downtown District | 11kV | 1.0 |
| MTR-SARFI-004 | Residential Area North | 11kV | 1.0 |
| MTR-SARFI-005 | Commercial Zone East | 11kV | 1.0 |
| MTR-SARFI-006 | Factory Complex B | 400kV | 1.5 (highest) |
| MTR-SARFI-007 | Hospital District | 11kV | 1.0 |
| MTR-SARFI-008 | Tech Park South | 132kV | 1.2 |

### 1 SARFI Profile
- **Name:** "2025 Standard Profile"
- **Year:** 2025
- **Status:** Active
- **Description:** Standard SARFI calculation profile with weighted factors

### 8 Profile Weights
Each meter has a weight factor based on voltage criticality:
- 400kV meters: 1.5 (critical infrastructure)
- 132kV meters: 1.2 (transmission)
- 11kV meters: 1.0 (distribution)

### ~240 PQ Events
Distributed across 3 months (Oct-Dec 2025):
- **Event Type:** Voltage dips
- **Distribution:**
  - 50% events: 70-90% voltage remaining (SARFI-10, SARFI-30)
  - 25% events: 50-70% voltage remaining (SARFI-10, 30, 50)
  - 15% events: 20-50% voltage remaining (SARFI-10, 30, 50, 70)
  - 10% events: 5-20% voltage remaining (All SARFI thresholds)

---

## Step 3: View SARFI Data

1. **Navigate to Dashboard**
2. **Find SARFI Metrics Trend Chart**
3. **Click Settings Icon** (⚙️ in top right of chart)
4. **SARFI Configuration Opens:**
   - Select **"2025 Standard Profile"**
   - Choose voltage level (or "All")
   - Check **"Show Data Table"** ✓
   - Optionally check **"Exclude Special Events"**
5. **Click "Apply Filters"**

### Expected Results:
- **Chart Updates:** Shows aggregated SARFI-70, 80, 90 metrics by month
- **Data Table Appears:** Below chart showing meter-level breakdown
- **Table Columns:**
  - Meter No.
  - Location
  - SARFI-10, 30, 50, 70, 80, 90 (incident counts)
  - Weight Factor
- **Totals Row:** Aggregated values at bottom

---

## Troubleshooting

### Error: Column does not exist
**Problem:** Migration not applied
**Solution:** Run Step 1 first to apply the migration

### Error: Relation does not exist
**Problem:** Tables not created
**Solution:** Run initial schema migration: `20251103020125_create_pqmap_schema.sql`

### No data in table
**Problem:** 
- No profile selected, or
- Wrong voltage level filter, or
- Seed script not run

**Solution:**
1. Verify seed script completed successfully
2. Check profile is selected in configuration
3. Try "All" voltage levels
4. Check browser console for errors

### Duplicate key error
**Problem:** Data already exists
**Solution:** This is normal - the script is idempotent and will skip duplicates

---

## SARFI Threshold Explanation

SARFI (System Average RMS Variation Frequency Index) measures the number of measurement locations experiencing voltage variations:

- **SARFI-10:** Remaining voltage ≤ 90% (most events)
- **SARFI-30:** Remaining voltage ≤ 70%
- **SARFI-50:** Remaining voltage ≤ 50%
- **SARFI-70:** Remaining voltage ≤ 30%
- **SARFI-80:** Remaining voltage ≤ 20%
- **SARFI-90:** Remaining voltage ≤ 10% (most severe)

**Formula:** `SARFI-X = (Number of events below threshold) × (Weight Factor)`

Weight factors give more importance to critical infrastructure (higher voltage = higher weight).

---

## Data Cleanup (Optional)

To remove only SARFI demo data:

```sql
-- Delete SARFI events
DELETE FROM pq_events 
WHERE meter_id IN (
  SELECT id FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%'
);

-- Delete profile weights
DELETE FROM sarfi_profile_weights 
WHERE profile_id IN (
  SELECT id FROM sarfi_profiles WHERE name = '2025 Standard Profile'
);

-- Delete SARFI profile
DELETE FROM sarfi_profiles WHERE name = '2025 Standard Profile';

-- Delete SARFI meters
DELETE FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%';
```

---

## Notes

- ✅ **Safe to run multiple times** - Script is idempotent
- ✅ **Uses unique meter IDs** - MTR-SARFI-* prefix avoids conflicts with existing data
- ✅ **Realistic data** - Event magnitudes trigger appropriate SARFI thresholds
- ✅ **3-month history** - Provides enough data for trend analysis
- ⚠️ **10% special events** - Some events flagged as special (excluded from calculations)

---

## Support

If you encounter issues:
1. Check browser console for errors (F12)
2. Verify migration was applied successfully
3. Check Supabase logs in dashboard
4. Ensure user has proper permissions (admin/operator role)
