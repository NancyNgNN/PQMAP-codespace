# Database Updates - December 22, 2025

## Summary of Changes

### 1. ✅ Transformer Code Fields Usage Analysis
**Status:** The transformer code fields (`area`, `ss400`, `ss132`, `ss011`) **ARE actively being used** in the application.

**Usage found in:**
- `src/components/AssetManagement.tsx` - Main usage location
  - Table columns with sorting functionality
  - Excel export generation
  - Meter detail view panel display
  - Conditional display based on voltage level

**Recommendation:** These fields should be retained and not removed.

---

### 2. ✅ Added site_id and region to PQEvent

#### TypeScript Interface Updates
- **File:** `src/types/database.ts`
- **Changes:** Added `site_id` and `region` to `PQEvent` interface
  ```typescript
  site_id: string | null;
  region: string | null;
  ```

#### Database Migration
- **File:** `supabase/migrations/20251222000000_add_site_id_region_to_events.sql`
- **Changes:**
  - Added `site_id` VARCHAR(50) column to `pq_events` table
  - Added `region` VARCHAR(100) column to `pq_events` table
  - Created indexes for performance: `idx_pq_events_site_id`, `idx_pq_events_region`
  - Added column documentation comments

#### Backfill Script
- **File:** `scripts/backfill-site-id-region.sql`
- **Purpose:** Populate existing events with site_id and region from pq_meters table
- **Logic:** 
  ```sql
  UPDATE pq_events e
  SET site_id = m.site_id, region = m.region
  FROM pq_meters m
  WHERE e.meter_id = m.meter_id AND e.meter_id IS NOT NULL;
  ```
- **Includes:** Statistics reporting and verification queries

#### UI Updates
- **File:** `src/components/EventManagement/EventDetails.tsx`
- **Changes:** Added site_id and region display in Location card of Overview tab
  - Site ID displays when available
  - Region displays when available
  - Styled consistently with existing location information

---

### 3. ✅ Column Reordering Documentation

#### Reordering Guide
- **File:** `supabase/migrations/20251222000001_column_reordering_guide.sql`

#### Three Approaches Provided:

**Option 1: View Current Order**
- SQL queries to inspect current column order in both tables

**Option 2: Create Ordered Views (RECOMMENDED)**
- Creates `pq_meters_ordered` and `pq_events_ordered` views
- Columns arranged to match TypeScript interface order
- **Benefits:**
  - No data migration risk
  - No downtime required
  - Visual organization for database tools (pgAdmin, DBeaver, etc.)
  - Original tables remain safe and unchanged
  - Application code unaffected (uses named columns)

**Option 3: Full Table Rebuild (DANGEROUS)**
- Commented out for safety
- Only for extreme cases requiring physical column reordering
- Requires downtime and careful execution
- High risk operation

#### Recommendation
Use **Option 2** (Ordered Views) for human-friendly database management while keeping the actual tables unchanged for safety.

---

## Implementation Checklist

- [x] Analyzed transformer code field usage
- [x] Updated PQEvent TypeScript interface with site_id and region
- [x] Created database migration for new columns
- [x] Created backfill script with verification
- [x] Updated EventDetails.tsx UI to display new fields
- [x] Created comprehensive column reordering documentation
- [x] Provided safe view-based approach for column organization

---

## Next Steps

### To Apply These Changes:

1. **Run the migration to add columns:**
   ```bash
   # Apply via Supabase CLI or run in Supabase SQL Editor
   supabase/migrations/20251222000000_add_site_id_region_to_events.sql
   ```

2. **Backfill existing data:**
   ```bash
   # Run in Supabase SQL Editor
   scripts/backfill-site-id-region.sql
   ```

3. **Create ordered views (optional, for human management):**
   ```bash
   # Run in Supabase SQL Editor
   supabase/migrations/20251222000001_column_reordering_guide.sql
   ```

4. **Test the application:**
   - Verify site_id and region appear in EventDetails
   - Check that existing functionality remains intact
   - Verify transformer code fields still work in AssetManagement

---

## Files Modified/Created

### Modified:
1. `src/types/database.ts` - Added site_id and region to PQEvent interface
2. `src/components/EventManagement/EventDetails.tsx` - Added UI display for new fields

### Created:
1. `supabase/migrations/20251222000000_add_site_id_region_to_events.sql`
2. `scripts/backfill-site-id-region.sql`
3. `supabase/migrations/20251222000001_column_reordering_guide.sql`

---

## Notes

- **Column Order:** PostgreSQL column order is logical, not physical. The application uses named columns, so physical order doesn't affect functionality—only visual organization in database tools.
- **Transformer Codes:** Actively used in AssetManagement component for display, sorting, and export.
- **Backward Compatibility:** All changes maintain backward compatibility with existing code.
