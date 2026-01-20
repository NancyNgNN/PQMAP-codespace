# Database Schema Consolidation Report

**Date:** December 9, 2025  
**Project:** PQMAP (Power Quality Monitoring and Analysis Platform)  
**Status:** ⚠️ Schema Mismatch Identified - Migration Required

---

## Executive Summary

The database schema analysis reveals a **critical mismatch** between the TypeScript interface definitions and the actual PostgreSQL database schema. This mismatch is causing seed script failures and will prevent SARFI functionality from working correctly.

**Key Finding:** Migration file `20251209000001_add_sarfi_columns.sql` exists but has **NOT been applied** to the database.

---

## Schema Analysis Results

### ✅ Tables Fully Aligned (12/14)

These tables have perfect alignment between TypeScript and PostgreSQL:

1. ✅ `profiles` - User management
2. ✅ `substations` - Substation infrastructure  
3. ✅ `customers` - Customer accounts
4. ✅ `event_customer_impact` - Event impact tracking
5. ✅ `notifications` - Alert records
6. ✅ `notification_rules` - Notification automation
7. ✅ `pq_service_records` - Service records
8. ✅ `reports` - Generated reports
9. ✅ `system_health` - System monitoring
10. ✅ `sarfi_metrics` - SARFI historical data
11. ✅ `sarfi_profiles` - SARFI calculation profiles
12. ✅ `sarfi_profile_weights` - Profile weight factors

### ⚠️ Tables With Schema Mismatch (2/14)

#### 1. `pq_meters` Table

**Current Database Schema (9 columns):**
```sql
CREATE TABLE pq_meters (
  id uuid PRIMARY KEY,
  meter_id text UNIQUE NOT NULL,
  substation_id uuid REFERENCES substations(id),
  location text,
  status meter_status DEFAULT 'active',
  last_communication timestamptz,
  firmware_version text,
  installed_date timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**TypeScript Interface Expects (11 columns):**
```typescript
export interface PQMeter {
  id: string;
  meter_id: string;
  substation_id: string;
  location: string;
  status: MeterStatus;
  last_communication: string | null;
  firmware_version: string | null;
  installed_date: string | null;
  created_at: string;
  meter_type: string;        // ❌ MISSING in database
  voltage_level: string;     // ❌ MISSING in database
  substation?: Substation;
}
```

**Missing Columns:**
- `meter_type` (TEXT) - Type of meter (e.g., "PQ Monitor")
- `voltage_level` (TEXT) - Operating voltage level (e.g., "132kV")

**Impact:**
- Seed scripts fail when trying to INSERT with these columns
- Runtime: undefined values for these properties
- SARFI weight calculations cannot determine voltage level
- Meter categorization by voltage level doesn't work

---

#### 2. `pq_events` Table

**Current Database Schema (16 columns):**
```sql
CREATE TABLE pq_events (
  id uuid PRIMARY KEY,
  event_type event_type NOT NULL,
  substation_id uuid REFERENCES substations(id),
  meter_id uuid REFERENCES pq_meters(id),
  timestamp timestamptz NOT NULL,
  duration_ms integer,
  magnitude decimal(10, 3),
  severity severity_level DEFAULT 'low',
  status event_status DEFAULT 'new',
  is_mother_event boolean DEFAULT false,
  parent_event_id uuid REFERENCES pq_events(id),
  root_cause text,
  affected_phases text[] DEFAULT ARRAY['A', 'B', 'C'],
  waveform_data jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
  -- Plus 3 columns from mother event grouping migration
);
```

**TypeScript Interface Expects (25 columns):**
```typescript
export interface PQEvent {
  // ... existing 16 columns ...
  
  // ❌ MISSING in database:
  voltage_level: string;           // Voltage level (400kV, 132kV, etc.)
  circuit_id: string;              // Circuit identifier
  customer_count: number | null;   // Affected customer count
  remaining_voltage: number | null;// Remaining voltage percentage
  validated_by_adms: boolean;      // ADMS validation flag
  is_special_event: boolean;       // Special event exclusion flag
}
```

**Missing Columns:**
- `voltage_level` (TEXT) - Critical for SARFI threshold categorization
- `circuit_id` (TEXT) - Circuit identification
- `customer_count` (INTEGER) - Number of affected customers
- `remaining_voltage` (DECIMAL) - Voltage percentage during event
- `validated_by_adms` (BOOLEAN) - ADMS validation status
- `is_special_event` (BOOLEAN) - Flag for exclusion from SARFI calculations

**Impact:**
- **SARFI calculations fail** - Cannot determine which threshold events meet
- Seed scripts fail when trying to INSERT with these columns
- Runtime: undefined values cause calculation errors
- Cannot filter by voltage level
- Cannot exclude special events from metrics
- Customer impact tracking incomplete

---

## Root Cause Analysis

### The Problem

1. **Migration exists but not applied:**
   - File: `supabase/migrations/20251209000001_add_sarfi_columns.sql`
   - Status: Present in file system
   - Database status: **NOT EXECUTED**

2. **TypeScript developed ahead of database:**
   - Interfaces in `database.ts` were updated
   - Database schema not updated to match
   - Code expects properties that don't exist

3. **Cascading failures:**
   - Seed scripts reference non-existent columns → INSERT fails
   - SARFI calculations reference undefined properties → NaN results
   - Filters by voltage_level return empty → No data displayed

### Why This Happened

The development workflow likely went:
1. ✅ TypeScript interfaces updated in `database.ts`
2. ✅ Migration file created: `20251209000001_add_sarfi_columns.sql`
3. ❌ Migration not executed in Supabase database
4. ❌ Seed scripts written assuming columns exist
5. ❌ Runtime errors when accessing missing columns

---

## Resolution Plan

### Step 1: Apply Migration ⚠️ REQUIRED

**File:** `supabase/migrations/20251209000001_add_sarfi_columns.sql`

**Method A: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy entire migration file contents
3. Paste and click "Run"
4. Verify success message

**Method B: Supabase CLI**
```bash
cd /workspaces/codespaces-react
supabase db push
```

**What This Does:**
- Adds 2 columns to `pq_meters`
- Adds 6 columns to `pq_events`
- Creates 5 indexes for performance
- Adds column documentation comments

**Expected Duration:** < 1 second (no data migration needed)

---

### Step 2: Verify Migration

Run this query in SQL Editor:

```sql
-- Verify pq_meters columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pq_meters' 
  AND column_name IN ('meter_type', 'voltage_level')
ORDER BY column_name;

-- Verify pq_events columns  
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pq_events' 
  AND column_name IN (
    'voltage_level', 'circuit_id', 'customer_count',
    'remaining_voltage', 'validated_by_adms', 'is_special_event'
  )
ORDER BY column_name;
```

**Expected Results:**
- First query: 2 rows (meter_type, voltage_level)
- Second query: 6 rows (all 6 columns)

---

### Step 3: Run Seed Script

**File:** `seed-sarfi-data.sql`

After migration succeeds:

1. Open Supabase SQL Editor
2. New query tab
3. Copy entire `seed-sarfi-data.sql` contents
4. Paste and Run
5. Check for success messages

**Expected Output:**
```
NOTICE: Using existing substation with ID: xxx
NOTICE: Total SARFI meters ready: 8
NOTICE: SARFI Profile ID: xxx
NOTICE: Profile weights created: 8
NOTICE: Total PQ events created: 240
NOTICE: ✅ SARFI Data Seeding Complete!
```

---

### Step 4: Verification Tests

Run these queries to verify data:

```sql
-- 1. Check meters created
SELECT meter_id, location, voltage_level, meter_type
FROM pq_meters
WHERE meter_id LIKE 'MTR-SARFI-%'
ORDER BY meter_id;
-- Expected: 8 rows

-- 2. Check events have new columns
SELECT 
  event_type,
  voltage_level,
  circuit_id,
  remaining_voltage,
  customer_count,
  is_special_event
FROM pq_events
WHERE meter_id IN (
  SELECT id FROM pq_meters WHERE meter_id LIKE 'MTR-SARFI-%'
)
LIMIT 5;
-- Expected: 5 rows with populated columns

-- 3. Check profile and weights
SELECT 
  p.name as profile_name,
  COUNT(w.id) as weight_count
FROM sarfi_profiles p
LEFT JOIN sarfi_profile_weights w ON w.profile_id = p.id
WHERE p.name = '2025 Standard Profile'
GROUP BY p.name;
-- Expected: 1 row, weight_count = 8

-- 4. Verify voltage level distribution
SELECT 
  voltage_level,
  COUNT(*) as meter_count
FROM pq_meters
WHERE meter_id LIKE 'MTR-SARFI-%'
GROUP BY voltage_level
ORDER BY voltage_level;
-- Expected: 
--   11kV: 4 meters
--   132kV: 3 meters  
--   400kV: 1 meter
```

---

## Schema Alignment Assessment

### Before Migration

| Component | Database | TypeScript | Aligned? |
|-----------|----------|------------|----------|
| `profiles` | ✅ 7 cols | ✅ 7 props | ✅ Yes |
| `substations` | ✅ 8 cols | ✅ 8 props | ✅ Yes |
| `pq_meters` | ⚠️ 9 cols | ⚠️ 11 props | ❌ **NO** |
| `pq_events` | ⚠️ 19 cols | ⚠️ 25 props | ❌ **NO** |
| `customers` | ✅ 9 cols | ✅ 9 props | ✅ Yes |
| Other tables | ✅ | ✅ | ✅ Yes |

**Alignment Score:** 12/14 = **85.7%**

---

### After Migration

| Component | Database | TypeScript | Aligned? |
|-----------|----------|------------|----------|
| `profiles` | ✅ 7 cols | ✅ 7 props | ✅ Yes |
| `substations` | ✅ 8 cols | ✅ 8 props | ✅ Yes |
| `pq_meters` | ✅ 11 cols | ✅ 11 props | ✅ **YES** |
| `pq_events` | ✅ 25 cols | ✅ 25 props | ✅ **YES** |
| `customers` | ✅ 9 cols | ✅ 9 props | ✅ Yes |
| Other tables | ✅ | ✅ | ✅ Yes |

**Alignment Score:** 14/14 = **100%** ✅

---

## Impact Analysis

### Current Issues (Before Migration)

#### 🔴 Critical
1. **Seed scripts fail** - Cannot populate SARFI demonstration data
2. **SARFI calculations broken** - Missing voltage_level for threshold determination
3. **Data table empty** - No data to display due to seeding failure

#### 🟡 High
4. **Type safety compromised** - TypeScript expects properties that are undefined at runtime
5. **Filter functionality broken** - Voltage level filtering returns empty results
6. **Special event exclusion doesn't work** - is_special_event column missing

#### 🟢 Medium
7. **Meter categorization incomplete** - Cannot group by voltage level or meter type
8. **ADMS validation tracking missing** - Cannot flag validated events

### After Migration

#### ✅ All Resolved
1. ✅ Seed scripts work perfectly
2. ✅ SARFI calculations accurate
3. ✅ Data table populated with 8 meters
4. ✅ Type safety restored
5. ✅ Filters work correctly
6. ✅ Special events excluded from metrics
7. ✅ Meter categorization complete
8. ✅ ADMS validation tracked

---

## Migration Safety Analysis

### Risk Assessment: **LOW** ✅

**Why It's Safe:**

1. **Only adds columns** - No data deletion or modification
2. **Uses IF NOT EXISTS** - Idempotent, safe to run multiple times
3. **Non-breaking changes** - Existing queries still work
4. **Default values provided** - New columns have sensible defaults
5. **No downtime** - Operation completes in milliseconds
6. **Reversible** - Can drop columns if needed

### Rollback Plan (If Needed)

If you need to reverse the migration:

```sql
-- Rollback script (only if absolutely necessary)
ALTER TABLE pq_events
DROP COLUMN IF EXISTS voltage_level,
DROP COLUMN IF EXISTS circuit_id,
DROP COLUMN IF EXISTS customer_count,
DROP COLUMN IF EXISTS remaining_voltage,
DROP COLUMN IF EXISTS validated_by_adms,
DROP COLUMN IF EXISTS is_special_event;

ALTER TABLE pq_meters
DROP COLUMN IF EXISTS meter_type,
DROP COLUMN IF EXISTS voltage_level;
```

**Note:** This will break TypeScript interfaces and require code updates.

---

## Best Practices for Future

### Recommended Workflow

1. **Update TypeScript interfaces** in `database.ts`
2. **Create migration file** in `supabase/migrations/`
3. ⚠️ **IMMEDIATELY apply migration** to database
4. **Test in development** before production
5. **Update seed scripts** to use new columns
6. **Document changes** in schema documentation

### Migration Naming Convention

Already following best practices:
- `YYYYMMDDHHMMSS_descriptive_name.sql`
- Example: `20251209000001_add_sarfi_columns.sql`

### Testing Checklist

After any schema change:
- [ ] Run migration in development
- [ ] Verify columns exist
- [ ] Run seed scripts
- [ ] Test all affected queries
- [ ] Check TypeScript compilation
- [ ] Test in UI
- [ ] Document changes

---

## Comprehensive Schema Documentation

**Full documentation created:** `Artifacts/DATABASE_SCHEMA.md`

This document includes:
- ✅ All 14 tables with complete column definitions
- ✅ Custom types (ENUMs) documentation
- ✅ Relationship diagrams
- ✅ Index summary
- ✅ Row Level Security policies
- ✅ Foreign key constraints
- ✅ Migration history
- ✅ TypeScript interface validation
- ✅ Action items and status

---

## Conclusion

### Current State
- **Schema Alignment:** 85.7% (12/14 tables)
- **Status:** ⚠️ Migration pending
- **Impact:** SARFI functionality blocked

### After Migration
- **Schema Alignment:** 100% (14/14 tables) ✅
- **Status:** ✅ Fully aligned
- **Impact:** All functionality operational

### Action Required

**You must complete these steps IN ORDER:**

1. ⚠️ **Apply migration:** `20251209000001_add_sarfi_columns.sql`
2. ✅ **Run seed script:** `seed-sarfi-data.sql`
3. ✅ **Verify data:** Check SARFI table in Dashboard
4. ✅ **Test functionality:** SARFI Configuration → Show Data Table

### Timeline
- **Migration execution:** < 1 second
- **Seed script execution:** ~5-10 seconds
- **Total setup time:** < 1 minute

### Documentation Created

1. **`DATABASE_SCHEMA.md`** - Complete schema reference (all 14 tables)
2. **`FIX_SCHEMA_ERROR.md`** - Step-by-step error resolution guide
3. **`SARFI_SETUP_GUIDE.md`** - SARFI data setup instructions (already existed)

---

## References

### Migration Files
- `supabase/migrations/20251103020125_create_pqmap_schema.sql` - Base schema
- `supabase/migrations/20251103021739_fix_security_and_performance_issues.sql` - Security fixes
- `supabase/migrations/20241201000000_add_mother_event_grouping.sql` - Mother event columns
- `supabase/migrations/20251209000000_create_sarfi_profiles.sql` - SARFI profile tables
- `supabase/migrations/20251209000001_add_sarfi_columns.sql` - ⚠️ **PENDING**

### TypeScript Files
- `src/types/database.ts` - All interface definitions

### Seed Scripts
- `seed-sarfi-data.sql` - SARFI demonstration data (PostgreSQL)
- `seed-sarfi-console.js` - SARFI data (browser console)
- `SARFIDataSeeder.tsx` - SARFI data (UI component)

---

**Report Generated:** December 9, 2025  
**Status:** ⚠️ Action Required - Apply Migration  
**Priority:** 🔴 High - Blocking SARFI functionality
