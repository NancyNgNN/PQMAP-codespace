# Harmonic Events Implementation Guide

**Created:** January 9, 2026  
**Purpose:** Implementation guide for harmonic_events table and data migration

---

## Overview

The `harmonic_events` table stores detailed harmonic distortion measurements for power quality events. This separates harmonic-specific parameters from the main `pq_events` table, providing:

- **12 harmonic parameters** per event (THD, TEHD, TOHD, TDD for 3 current phases)
- **1:1 relationship** with pq_events where event_type = 'harmonic'
- **IEEE 519 compliance** with 10-minute averaging periods
- **Performance optimization** with dedicated indexes

---

## Files Created

### 1. Database Migration
**File:** `supabase/migrations/20260109000000_create_harmonic_events.sql`

Creates:
- `harmonic_events` table with 12 measurement columns
- Indexes for performance (pqevent_id, THD values)
- RLS policies (authenticated users view, operators/admins manage)
- Foreign key constraint to pq_events with CASCADE delete
- Unique constraint ensuring 1:1 relationship

### 2. Backfill Script
**File:** `scripts/backfill-harmonic-events.sql`

Populates harmonic_events for existing harmonic events with:
- Realistic THD values based on pq_events.magnitude
- Even/Odd harmonic distribution (15% even, 85% odd)
- TDD values slightly lower than THD
- Phase-to-phase variation simulating real 3-phase systems

### 3. TypeScript Interface
**File:** `src/types/database.ts`

Added:
- `HarmonicEvent` interface with all 12 parameters
- Optional `harmonic_event` field in `PQEvent` interface

### 4. Documentation Updates
**Files:** 
- `Artifacts/DATABASE_SCHEMA.md` - Table schema and relationship details
- `Artifacts/ROADMAP.md` - Completed feature + future voltage THD note

---

## Implementation Steps

### Step 1: Apply Migration

In Supabase SQL Editor, run:

```sql
-- File: supabase/migrations/20260109000000_create_harmonic_events.sql
```

This will:
- ✅ Create harmonic_events table
- ✅ Add indexes
- ✅ Enable RLS policies
- ✅ Display verification results

**Expected Output:**
```
harmonic_events table created successfully | column_count: 13
```

### Step 2: Run Backfill Script

In Supabase SQL Editor, run:

```sql
-- File: scripts/backfill-harmonic-events.sql
```

This will:
- ✅ Count existing harmonic events
- ✅ Generate harmonic_events records with realistic values
- ✅ Display sample records
- ✅ Show statistics (average THD values)

**Expected Output:**
```
✅ Backfill complete!
All harmonic events now have corresponding harmonic_events records
```

### Step 3: Verify Installation

Run verification queries:

```sql
-- Check record count match
SELECT 
  (SELECT COUNT(*) FROM pq_events WHERE event_type = 'harmonic') as harmonic_events_in_pq,
  (SELECT COUNT(*) FROM harmonic_events) as records_in_harmonic_table;

-- View sample data
SELECT 
  pe.timestamp,
  pe.magnitude as pq_magnitude,
  he.I1_THD_10m,
  he.I2_THD_10m,
  he.I3_THD_10m
FROM pq_events pe
JOIN harmonic_events he ON pe.id = he.pqevent_id
WHERE pe.event_type = 'harmonic'
ORDER BY pe.timestamp DESC
LIMIT 5;
```

### Step 4: Update Frontend Code (Optional)

To fetch harmonic details with events:

```typescript
// In your event query service
const { data: events } = await supabase
  .from('pq_events')
  .select(`
    *,
    substation:substations(*),
    meter:pq_meters(*),
    harmonic_event:harmonic_events(*)
  `)
  .eq('event_type', 'harmonic');

// Access harmonic data
events?.forEach(event => {
  if (event.harmonic_event) {
    console.log('Phase 1 THD:', event.harmonic_event.I1_THD_10m);
    console.log('Phase 2 THD:', event.harmonic_event.I2_THD_10m);
    console.log('Phase 3 THD:', event.harmonic_event.I3_THD_10m);
  }
});
```

---

## Data Structure

### harmonic_events Table

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | uuid | Primary key | `h1a2r3m4-o5n6-7890-icab-cd1234567890` |
| `pqevent_id` | uuid | FK to pq_events (UNIQUE) | `e1f2a3b4-c5d6-7890-efab-cd1234567890` |
| `I1_THD_10m` | numeric | Phase 1 Total Harmonic Distortion (%) | `5.67` |
| `I1_TEHD_10m` | numeric | Phase 1 Even Harmonics (%) | `0.85` |
| `I1_TOHD_10m` | numeric | Phase 1 Odd Harmonics (%) | `4.82` |
| `I1_TDD_10m` | numeric | Phase 1 Demand Distortion (%) | `5.10` |
| `I2_THD_10m` | numeric | Phase 2 Total Harmonic Distortion (%) | `5.89` |
| `I2_TEHD_10m` | numeric | Phase 2 Even Harmonics (%) | `0.94` |
| `I2_TOHD_10m` | numeric | Phase 2 Odd Harmonics (%) | `4.95` |
| `I2_TDD_10m` | numeric | Phase 2 Demand Distortion (%) | `5.18` |
| `I3_THD_10m` | numeric | Phase 3 Total Harmonic Distortion (%) | `5.45` |
| `I3_TEHD_10m` | numeric | Phase 3 Even Harmonics (%) | `0.76` |
| `I3_TOHD_10m` | numeric | Phase 3 Odd Harmonics (%) | `4.69` |
| `I3_TDD_10m` | numeric | Phase 3 Demand Distortion (%) | `4.96` |

### Parameter Definitions

- **THD (Total Harmonic Distortion)**: Root-mean-square (RMS) of all harmonic components relative to fundamental
- **TEHD (Total Even Harmonic Distortion)**: RMS of even harmonics (2nd, 4th, 6th, etc.)
- **TOHD (Total Odd Harmonic Distortion)**: RMS of odd harmonics (3rd, 5th, 7th, etc.)
- **TDD (Total Demand Distortion)**: THD normalized to maximum demand current (IEEE 519)
- **10m**: 10-minute averaging period per IEEE 519-2014 standard
- **I1/I2/I3**: Current phases (I = symbol for current in electrical engineering)

### Typical Values

| Harmonic Type | Typical Range | IEEE 519 Limit* |
|---------------|---------------|-----------------|
| THD | 2-15% | 5% (< 69kV) |
| TEHD | 0.3-2% | - |
| TOHD | 2-13% | - |
| TDD | 2-12% | 5% (< 69kV) |

*Limits vary by voltage level and system short-circuit ratio

---

## Future Enhancements

### Voltage Harmonics (Q3-Q4 2026)

Potential addition if data becomes available:

```sql
ALTER TABLE harmonic_events ADD COLUMN
  -- Phase 1 Voltage Harmonics
  V1_THD_10m numeric,
  V1_TEHD_10m numeric,
  V1_TOHD_10m numeric,
  V1_TDD_10m numeric,
  -- Phase 2 Voltage Harmonics
  V2_THD_10m numeric,
  V2_TEHD_10m numeric,
  V2_TOHD_10m numeric,
  V2_TDD_10m numeric,
  -- Phase 3 Voltage Harmonics
  V3_THD_10m numeric,
  V3_TEHD_10m numeric,
  V3_TOHD_10m numeric,
  V3_TDD_10m numeric;
```

**Dependencies:** 
- Verify PQMS/CPDIS captures voltage harmonic data
- Update TypeScript interfaces
- Create backfill script for voltage measurements

---

## Troubleshooting

### Issue: Migration fails with "relation already exists"

**Solution:** Table already created. Skip to Step 2 (backfill).

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'harmonic_events'
);
```

### Issue: Backfill inserts 0 records

**Cause:** No harmonic events in pq_events table

**Solution:** Verify harmonic events exist:

```sql
SELECT COUNT(*) FROM pq_events WHERE event_type = 'harmonic';
```

### Issue: Foreign key constraint violation

**Cause:** pqevent_id doesn't exist in pq_events

**Solution:** Check for orphaned records:

```sql
SELECT he.id, he.pqevent_id
FROM harmonic_events he
LEFT JOIN pq_events pe ON he.pqevent_id = pe.id
WHERE pe.id IS NULL;
```

---

## Performance Considerations

### Indexes

Two indexes optimize queries:

1. **idx_harmonic_events_pqevent_id**: Fast lookups when joining with pq_events
2. **idx_harmonic_events_thd_values**: Composite index for THD filtering/sorting

### Query Optimization

```sql
-- ✅ GOOD: Use index on pqevent_id
SELECT * FROM harmonic_events WHERE pqevent_id = 'uuid-here';

-- ✅ GOOD: Use THD composite index
SELECT * FROM harmonic_events 
WHERE I1_THD_10m > 5 AND I2_THD_10m > 5 AND I3_THD_10m > 5;

-- ❌ AVOID: Full table scan
SELECT * FROM harmonic_events WHERE I1_TEHD_10m > 1;
```

---

## Questions?

Contact the development team or refer to:
- **Database Schema:** `Artifacts/DATABASE_SCHEMA.md`
- **Roadmap:** `Artifacts/ROADMAP.md`
- **Migration File:** `supabase/migrations/20260109000000_create_harmonic_events.sql`
