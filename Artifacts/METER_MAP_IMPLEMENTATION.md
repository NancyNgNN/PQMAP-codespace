# Meter Map Implementation

**Version:** 1.0  
**Date:** December 29, 2025  
**Status:** Complete

## Overview

Meter Map is a dashboard widget that provides geographic visualization of PQ meters on a Hong Kong map, with color-coded dots representing different load types. The feature includes comprehensive filtering, profile management, and navigation to detailed meter information.

## Features

### 1. Load Type System

**Database Setup:**
- New `load_types` lookup table with 7 predefined types
- `load_type` column added to `pq_meters` table
- CHECK constraint ensures only valid load types
- Database index for performance

**Load Types:**
| Code | Name | Color | Description |
|------|------|-------|-------------|
| DC | Data Centre | #9333EA (Purple) | Data center loads |
| EV | Electric Vehicle | #06B6D4 (Cyan) | EV charging stations |
| RE-PV | Renewable Energy - PV | #22C55E (Green) | Solar PV systems |
| RES-HRB | Residential - Harbor | #EF4444 (Red) | Residential harbor area |
| RES-NOC | Residential - Non-Core | #3B82F6 (Blue) | Residential non-core area |
| RES | Residential | #F59E0B (Amber) | General residential |
| others | Others | #EAB308 (Yellow) | Other load types |

### 2. Load Type Management

**Location:** System Health > Load Type Management

**Features:**
- CRUD operations for load types
- Color picker with hex input
- Active/inactive status toggle
- Validation for code uniqueness
- Real-time preview of colors

**Access:** Admin role only

### 3. Meter Map Visualization

**Location:** Dashboard > Meter Map (Row 2, Full Width)

**Map Features:**
- Hong Kong geographic map from SubstationMap
- Color-coded dots for meters by load type
- Fixed dot size (8x8 pixels)
- Hover tooltip showing:
  - Meter ID
  - Site ID
  - Load Type
  - Voltage Level
  - Substation Name
  - Status (Active/Inactive)
- Click navigation to Asset Management with auto-open meter details

**Export:**
- Export map as PNG image (via html2canvas)
- 2x scale for high quality
- Filename: `Meter_Map_YYYY-MM-DD.png`

### 4. Filter Configuration

**UI Pattern:** Dashboard Config Modal (matches SubstationMap)

**Filter Categories:**
1. **Search Text** - Meter ID or Site ID
2. **Load Types** - Multi-select checkboxes with color indicators
3. **Voltage Levels** - Multi-select checkboxes (132kV, 33kV, 11kV, 380V)
4. **Substations** - Scrollable list with checkboxes

**Filter Layout:**
- Profile management at top
- Search input
- 2-column grid for Load Types and Voltage Levels
- Scrollable substation list (max-height: 12rem)

**Profile Management:**
- Save current filters as named profile
- Load saved profiles from dropdown
- Edit profile name and filters
- Delete profiles with confirmation
- Stored in localStorage: `meterMapProfiles`

**Persistence:**
- Filters stored in localStorage: `meterMapFilters`
- Survives browser refresh
- Per-component storage

### 5. Navigation Flow

**Meter Map → Asset Management:**
1. User clicks meter dot on map
2. App.tsx receives meterId via `onNavigateToMeter` callback
3. App switches to 'assets' view
4. AssetManagement receives `selectedMeterId` prop
5. useEffect hook auto-opens meter detail modal
6. Modal loads meter events and displays details
7. `onClearSelectedMeter()` called after opening

**State Management:**
- `selectedMeterId` in App.tsx
- Props threading: Dashboard → MeterMap → App → AssetManagement
- No react-router required

## Technical Implementation

### Files Created

1. **scripts/add-load-type-to-pq-meters.sql**
   - Creates load_types lookup table
   - Adds load_type column to pq_meters
   - Inserts 7 default load types
   - Creates index on load_type

2. **scripts/backfill-meter-load-types.sql**
   - Weighted random distribution for existing meters
   - 40% RES-HRB, 40% RES-NOC
   - 20% split among DC, EV, RE-PV, RES, others (4% each)
   - Verification query included

3. **src/components/Settings/LoadTypeManagement.tsx**
   - CRUD interface for load types
   - Color picker integration
   - Active/inactive toggle
   - Table display with inline editing

4. **src/components/Dashboard/MeterMap.tsx**
   - Main map visualization component
   - Hong Kong map with meter dots
   - Filter state management
   - Export functionality
   - Navigation handler

5. **src/components/Dashboard/MeterMapConfigModal.tsx**
   - Comprehensive filter modal
   - Profile management (save/load/edit/delete)
   - 2-column grid layout
   - Scrollable substation list
   - Nested profile save modal (z-index hierarchy)

### Files Modified

1. **src/types/database.ts**
   - Added `LoadType` union type
   - Updated `PQMeter` interface with `load_type?: LoadType`

2. **src/types/dashboard.ts**
   - Added 'meter-map' to WidgetId
   - Added meter-map to WIDGET_CATALOG
   - Updated DEFAULT_LAYOUTS for all roles

3. **src/components/Dashboard/Dashboard.tsx**
   - Added 'meter-map' case in renderWidget()
   - Passes onNavigateToMeter callback

4. **src/App.tsx**
   - Added selectedMeterId state
   - Added handleNavigateToMeter function
   - Passes props to Dashboard and AssetManagement

5. **src/components/AssetManagement.tsx**
   - Accepts selectedMeterId prop
   - useEffect auto-opens meter detail modal
   - Calls onClearSelectedMeter after opening

6. **src/components/SystemHealth.tsx**
   - Integrated LoadTypeManagement component
   - Tab navigation for load type management

7. **Artifacts/STYLES_GUIDE.md**
   - Added "Dashboard Config Modal Pattern" section
   - Documents modal structure, profile management
   - Code examples and best practices
   - Z-index hierarchy guidelines

## Database Schema

### load_types Table

```sql
CREATE TABLE load_types (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,  -- Hex color code
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### pq_meters.load_type Column

```sql
ALTER TABLE pq_meters 
ADD COLUMN load_type TEXT REFERENCES load_types(code);

ALTER TABLE pq_meters
ADD CONSTRAINT valid_load_type 
CHECK (load_type IN ('DC', 'EV', 'others', 'RE-PV', 'RES', 'RES-HRB', 'RES-NOC'));

CREATE INDEX idx_pq_meters_load_type ON pq_meters(load_type);
```

## Filter Logic

### TypeScript Type Safety

**Issue:** Optional fields can be undefined, causing TypeScript errors in `.includes()` checks.

**Solution:** Check for undefined before filtering:

```typescript
const getFilteredMeters = (): PQMeter[] => {
  return meters.filter(meter => {
    // Load type filter
    if (filters.loadTypes.length > 0) {
      if (!meter.load_type || !filters.loadTypes.includes(meter.load_type as LoadType)) {
        return false;
      }
    }

    // Voltage level filter
    if (filters.voltageLevels.length > 0) {
      if (!meter.voltage_level || !filters.voltageLevels.includes(meter.voltage_level)) {
        return false;
      }
    }

    // Substation filter
    if (filters.substations.length > 0 && !filters.substations.includes(meter.substation_id)) {
      return false;
    }

    // Text search
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const matchesMeterId = meter.meter_id?.toLowerCase().includes(searchLower);
      const matchesSiteId = meter.site_id?.toLowerCase().includes(searchLower);
      if (!matchesMeterId && !matchesSiteId) return false;
    }

    return true;
  });
};
```

### Unique Value Extraction

**Issue:** `.filter(Boolean)` returns `(T | undefined)[]` which doesn't match `T[]`.

**Solution:** Use type predicate:

```typescript
const uniqueVoltageLevels = Array.from(
  new Set(meters.map(m => m.voltage_level).filter((v): v is string => Boolean(v)))
).sort();
```

## UI/UX Standards

### Dashboard Config Modal Pattern

**When to Use:**
- Dashboard widgets with 3+ filter types
- Need for profile/preset functionality
- Complex filtering with search + multiple checkboxes
- Save/load filter configurations

**Key Design Elements:**
1. **Settings2 Icon** - Opens config modal (not inline filter)
2. **Fixed Header** - Title and close button
3. **Scrollable Content** - Profile, search, filter checkboxes
4. **Fixed Footer** - Clear All | Cancel | Apply buttons
5. **Z-Index Hierarchy** - Main modal (50), nested modal (60)
6. **Grid Layout** - 2 columns for checkbox groups
7. **Profile Dropdown** - At top with Save button
8. **Edit/Delete Actions** - Show when profile selected

**localStorage Keys:**
- Filters: `{componentName}Filters`
- Profiles: `{componentName}Profiles`

**Example:** `meterMapFilters`, `meterMapProfiles`

### Color Coding

Meters are color-coded by load type for easy identification:
- Purple: Data Centers (DC)
- Cyan: EV Charging (EV)
- Green: Solar PV (RE-PV)
- Red: Residential Harbor (RES-HRB)
- Blue: Residential Non-Core (RES-NOC)
- Amber: General Residential (RES)
- Yellow: Others

## Usage Instructions

### Setup

1. **Run Database Migration:**
   ```bash
   psql -h <host> -U <user> -d <database> -f scripts/add-load-type-to-pq-meters.sql
   ```

2. **Backfill Existing Meters:**
   ```bash
   psql -h <host> -U <user> -d <database> -f scripts/backfill-meter-load-types.sql
   ```

3. **Verify Setup:**
   - Navigate to Dashboard
   - Check Meter Map widget is visible in row 2
   - Map should show colored dots for meters with load types

### Managing Load Types

1. Navigate to System Health
2. Click "Load Type Management" tab
3. Create new load types or edit existing ones
4. Set colors using hex color picker
5. Toggle active/inactive status

### Using Meter Map

1. **View Meters:**
   - Open Dashboard
   - Meter Map shows all meters with load types
   - Hover over dots to see meter details

2. **Filter Meters:**
   - Click Settings2 icon (top-right of widget)
   - Configure filters in modal
   - Select load types, voltage levels, substations
   - Use search for specific meters
   - Click Apply to update map

3. **Save Filter Profiles:**
   - Configure desired filters
   - Click "Save" button next to profile dropdown
   - Enter profile name
   - Profile saved for future use

4. **Load Filter Profiles:**
   - Click profile dropdown
   - Select saved profile
   - Filters automatically applied
   - Edit or Delete options available

5. **Export Map:**
   - Click Download icon
   - Select "Export Map as Image"
   - PNG file downloads with current date

6. **Navigate to Meter Details:**
   - Click any meter dot on map
   - Automatically switches to Asset Management
   - Meter detail modal opens with event history

## Role Access

| Role | View Map | Filter | Export | Manage Load Types |
|------|----------|--------|--------|-------------------|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Operator | ✅ | ✅ | ✅ | ❌ |
| Viewer | ✅ | ✅ | ✅ | ❌ |

## Data Population

### Weighted Distribution

The backfill script uses weighted random distribution:

```sql
UPDATE pq_meters
SET load_type = CASE
  WHEN random() < 0.40 THEN 'RES-HRB'   -- 40%
  WHEN random() < 0.80 THEN 'RES-NOC'   -- 40%
  WHEN random() < 0.84 THEN 'DC'        -- 4%
  WHEN random() < 0.88 THEN 'EV'        -- 4%
  WHEN random() < 0.92 THEN 'RE-PV'     -- 4%
  WHEN random() < 0.96 THEN 'RES'       -- 4%
  ELSE 'others'                          -- 4%
END
WHERE load_type IS NULL;
```

**Expected Distribution:**
- RES-HRB: ~40%
- RES-NOC: ~40%
- DC: ~4%
- EV: ~4%
- RE-PV: ~4%
- RES: ~4%
- others: ~4%

### Manual Updates

Load types can be updated manually via Asset Management:
1. Click meter dot or navigate to Asset Management
2. Open meter detail modal
3. Edit load_type field
4. Save changes

## Future Enhancements

### Planned Features

1. **Heat Map Mode:**
   - Toggle between dot view and heat map
   - Density visualization for meter concentration

2. **Clustering:**
   - Group nearby meters at zoom levels
   - Show cluster count
   - Expand on click

3. **Advanced Analytics:**
   - Load type distribution charts
   - Substation capacity by load type
   - Voltage level breakdown

4. **Real-Time Updates:**
   - WebSocket connection for live meter status
   - Animated status changes
   - Alert notifications on map

5. **Custom Load Types:**
   - User-defined load type creation
   - Import load types from CSV
   - Load type templates

6. **Map Interactions:**
   - Zoom/pan controls
   - Measure distance tool
   - Area selection for bulk operations

### API Extensions

```typescript
// Future API for bulk load type updates
interface BulkLoadTypeUpdate {
  meterIds: string[];
  loadType: LoadType;
  reason?: string;
}

// Future API for load type analytics
interface LoadTypeStats {
  loadType: LoadType;
  count: number;
  percentage: number;
  avgEvents: number;
  avgDuration: number;
}
```

## Troubleshooting

### Meters Not Showing on Map

**Symptom:** Map is blank or shows fewer meters than expected.

**Solutions:**
1. Check filters - Clear all filters to see all meters
2. Verify meters have substation_id set
3. Check substations have valid lat/lng coordinates
4. Ensure load_type is set (run backfill script if needed)

### Config Modal Not Opening

**Symptom:** Clicking Settings2 icon does nothing.

**Solutions:**
1. Check browser console for errors
2. Verify MeterMapConfigModal import
3. Check z-index conflicts with other modals
4. Clear localStorage and refresh

### Navigation Not Working

**Symptom:** Clicking meter dot doesn't open details.

**Solutions:**
1. Verify onNavigateToMeter prop is passed
2. Check App.tsx has handleNavigateToMeter function
3. Verify selectedMeterId prop reaches AssetManagement
4. Check useEffect in AssetManagement triggers

### TypeScript Errors

**Symptom:** Build fails with type errors.

**Solutions:**
1. Run `npm run type-check` to see all errors
2. Verify LoadType is imported from types/database
3. Check optional field handling (use `?.` or type guards)
4. Update @types packages if needed

### Filter Not Persisting

**Symptom:** Filters reset after refresh.

**Solutions:**
1. Check localStorage is enabled in browser
2. Verify localStorage keys match (meterMapFilters)
3. Clear localStorage if corrupted: `localStorage.clear()`
4. Check JSON parse errors in browser console

## References

- [STYLES_GUIDE.md](./STYLES_GUIDE.md) - Dashboard Config Modal Pattern
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Complete schema reference
- [SUBSTATION_MAP_IMPLEMENTATION.md](./SUBSTATION_MAP_IMPLEMENTATION.md) - Similar implementation
- [PROJECT_FUNCTION_DESIGN.md](./PROJECT_FUNCTION_DESIGN.md) - System architecture

## Change Log

### v1.0 (December 29, 2025)
- Initial implementation
- Load type system with 7 types
- Meter Map visualization
- Config modal with profile management
- Navigation to Asset Management
- Export as PNG image
- Filter persistence
- Weighted backfill script
- Documentation in STYLES_GUIDE.md

---

**Document Owner:** Development Team  
**Last Reviewed:** December 29, 2025  
**Next Review:** January 29, 2026
