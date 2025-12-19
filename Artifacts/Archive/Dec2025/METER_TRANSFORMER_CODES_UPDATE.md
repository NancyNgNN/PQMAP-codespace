# PQ Meters Transformer Code Enhancement

## Overview
Added Area and Transformer Code columns (SS400, SS132, SS011) to the PQ Meters table with automatic population based on substation and voltage level.

## Database Changes

### New Columns Added to `pq_meters` Table
1. **area** - `VARCHAR(10)` NOT NULL - Detail location code (e.g., CPK, TWE)
2. **ss400** - `VARCHAR(20)` - Transformer code for 400kV meters (e.g., APA400)
3. **ss132** - `VARCHAR(20)` - Transformer code for 132kV and 11kV meters (e.g., APA132)
4. **ss011** - `VARCHAR(20)` - Transformer code for 11kV meters (e.g., APA011)

### Auto-Population Logic
A database trigger automatically populates the SS codes when a meter is inserted or updated:

- **400kV meters**: `ss400 = substation.code + '400'` (e.g., "APA400")
- **132kV meters**: `ss132 = substation.code + '132'` (e.g., "APA132")
- **11kV meters**: 
  - `ss132 = substation.code + '132'` (e.g., "APA132")
  - `ss011 = substation.code + '011'` (e.g., "APA011")

## Migration Files

### 1. `20251217000000_add_meter_transformer_codes.sql`
- Adds the 4 new columns to pq_meters table
- Creates trigger function `auto_populate_ss_codes()`
- Creates trigger to auto-populate SS codes on INSERT/UPDATE
- Adds column comments for documentation

### 2. `20251217000001_backfill_ss_codes.sql`
- Populates SS codes for all existing meters based on their voltage level
- Displays statistics of meters updated
- Shows sample data after backfill

## Running the Migrations

```bash
# In Supabase SQL Editor, run in order:
1. supabase/migrations/20251217000000_add_meter_transformer_codes.sql
2. supabase/migrations/20251217000001_backfill_ss_codes.sql
```

Or if using Supabase CLI:
```bash
supabase db push
```

## Frontend Changes

### TypeScript Types (`src/types/database.ts`)
Updated `PQMeter` interface with new fields:
```typescript
area: string;
ss400?: string | null;
ss132?: string | null;
ss011?: string | null;
```

### Asset Management Component (`src/components/AssetManagement.tsx`)

#### Table Column Changes
**New Order:**
```
Meter ID | Site ID | Volt Level | Substation | Circuit | Area | Location | SS400 | SS132 | SS011 | Status | Actions
```

**Columns Moved to Detail Modal:**
- OC (now in "Location & Network" section)
- Brand (in "Equipment Specifications" section)
- Model (in "Equipment Specifications" section)
- Nominal Voltage (in "Equipment Specifications" section)

#### Table Display Logic
- **SS400 column**: Shows value only for 400kV meters, otherwise shows "-"
- **SS132 column**: Shows value only for 132kV and 11kV meters, otherwise shows "-"
- **SS011 column**: Shows value only for 11kV meters, otherwise shows "-"

#### Export Functionality
Excel/CSV exports now include:
- Area
- SS400
- SS132
- SS011
- All other existing fields (OC, Brand, Model, Nominal Voltage preserved)

#### Meter Detail Modal
Added to "Location & Network" section:
- **Area** field (always visible)
- **SS400** field (only visible if value exists)
- **SS132** field (only visible if value exists)
- **SS011** field (only visible if value exists)

## Testing Checklist

### Database
- [ ] Run migration 1: Verify columns added
- [ ] Run migration 2: Verify existing meters have SS codes populated
- [ ] Insert new 400kV meter: Verify ss400 is auto-populated
- [ ] Insert new 132kV meter: Verify ss132 is auto-populated
- [ ] Insert new 11kV meter: Verify both ss132 and ss011 are auto-populated
- [ ] Update meter voltage level: Verify SS codes update correctly

### Frontend
- [ ] Meter Inventory table shows new columns (Area, SS400, SS132, SS011)
- [ ] SS columns show values only for relevant voltage levels
- [ ] Status column displays colored badges correctly
- [ ] Click "View Details" - verify modal opens
- [ ] Modal shows Area and relevant SS codes in "Location & Network" section
- [ ] Modal shows OC, Brand, Model, Nominal Voltage in proper sections
- [ ] Export to Excel - verify all new columns included
- [ ] Export to CSV - verify all new columns included

## Example Data

### 400kV Meter Example
```
Meter ID: PQM-APA-001
Voltage Level: 400kV
Substation Code: APA
Area: CPK

Auto-populated:
- ss400: APA400
- ss132: NULL
- ss011: NULL
```

### 132kV Meter Example
```
Meter ID: PQM-BCH-002
Voltage Level: 132kV
Substation Code: BCH
Area: TWE

Auto-populated:
- ss400: NULL
- ss132: BCH132
- ss011: NULL
```

### 11kV Meter Example
```
Meter ID: PQM-CAN-003
Voltage Level: 11kV
Substation Code: CAN
Area: CHW

Auto-populated:
- ss400: NULL
- ss132: CAN132
- ss011: CAN011
```

## Notes

1. **Area field is required** - Must be populated when creating/updating meters (default is empty string)
2. **SS codes auto-populate** - No manual intervention needed when voltage_level and substation_id are set
3. **Trigger handles updates** - Changing voltage_level or substation_id will automatically recalculate SS codes
4. **Export preserves all data** - OC, Brand, Model, Nominal Voltage still exported despite being moved to detail modal

## Troubleshooting

### SS codes not populating?
1. Check if `voltage_level` is set correctly
2. Verify `substation_id` exists in substations table
3. Check if substation has a valid `code` field
4. Run backfill script again if needed

### Migration fails?
1. Ensure substations table exists with `code` column
2. Check if pq_meters table exists
3. Verify no conflicting column names
4. Check PostgreSQL version supports VARCHAR and triggers

### Frontend not showing new columns?
1. Clear browser cache
2. Restart development server
3. Check TypeScript compilation errors
4. Verify database has been migrated
