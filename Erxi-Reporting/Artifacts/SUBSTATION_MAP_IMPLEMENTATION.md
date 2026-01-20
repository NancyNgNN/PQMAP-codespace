# Substation Map View Implementation Summary

## Overview
The Substation Map View has been completely redesigned with a bubble chart visualization, Hong Kong map background, interactive filtering, and comprehensive export capabilities.

## Components Created/Updated

### 1. SubstationMap.tsx (Rewritten)
**Location:** `/workspaces/codespaces-react/src/components/Dashboard/SubstationMap.tsx`

**Key Features:**
- **Bubble Chart Visualization**
  - Red bubbles (20px radius): >10 incidents
  - Yellow bubbles (15px radius): 3-9 incidents
  - Green bubbles (10px radius): 1-2 incidents
  - Only counts mother events (is_mother_event=TRUE)
  - Excludes false events (false_event=FALSE)

- **Geographic Projection**
  - Hong Kong bounds: 22.15-22.58°N, 113.83-114.41°E
  - Map dimensions: 800x480 pixels
  - Linear interpolation for lat/lng to pixel conversion

- **Interactive Features**
  - Click bubble → selects substation and populates table
  - Hover bubble → shows tooltip with name, code, region, event count
  - Selected bubble highlighted with blue border

- **Export Functionality**
  - Export map as PNG image using html2canvas
  - Captures entire map with all bubbles and legend

- **Date Filtering**
  - Start/End date range filter
  - Affects both bubble display and table data
  - Filters stored in localStorage for persistence

- **Layout**
  - 60% map section (top)
  - 40% table section (bottom)
  - Replaces old SubstationMap + RootCauseChart grid

### 2. SubstationEventsTable.tsx (New)
**Location:** `/workspaces/codespaces-react/src/components/Dashboard/SubstationEventsTable.tsx`

**Key Features:**
- **Table Columns**
  - No: Sequence number (1, 2, 3...)
  - S/S: Substation code
  - Customer Name: Left blank (TBC)
  - PQ Service(s) Provided: Comma-separated service types from pq_service_records

- **Functionality**
  - Sortable by all columns (click header with arrow icon)
  - Pagination (10 items per page)
  - Shows only selected substation's events
  - Empty state until user clicks a bubble
  - Updates when filters change

- **Export Options**
  - Export as Excel (.xlsx)
  - Export as CSV (.csv)
  - Export as PDF (.pdf)
  - All exports include ALL filtered data (not just current page)

- **Data Flow**
  - Queries customers table via substation_id
  - Queries pq_service_records via customer_id
  - Joins service types into comma-separated list

### 3. MapConfigModal.tsx (New)
**Location:** `/workspaces/codespaces-react/src/components/Dashboard/MapConfigModal.tsx`

**Key Features:**
- **Date Range Filter**
  - Start Date input
  - End Date input
  - Similar styling to EventManagement date pickers

- **Profile Management**
  - Create new profile with name and description
  - Save current date range as profile
  - Load existing profile
  - Delete profile
  - Set default profile
  - System-wide (not user-specific)
  - Stored in localStorage as 'substationMapProfiles'

- **Actions**
  - Apply filters button
  - Clear filters button
  - Cancel button

### 4. Dashboard.tsx (Updated)
**Location:** `/workspaces/codespaces-react/src/components/Dashboard/Dashboard.tsx`

**Changes:**
- Removed RootCauseChart import
- Removed grid layout containing SubstationMap + RootCauseChart
- Replaced with single SubstationMap component
- SubstationMap now handles its own 60/40 layout internally
- Other components (StatsCards, SARFIChart, EventList) remain unchanged

### 5. database.ts (Updated)
**Location:** `/workspaces/codespaces-react/src/types/database.ts`

**New Interfaces:**
```typescript
export interface SubstationMapFilters {
  profileId: string;
  startDate: string;
  endDate: string;
}

export interface SubstationMapProfile {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubstationEventCount {
  substationId: string;
  substation: Substation;
  eventCount: number;
  services: string[];
}
```

## Implementation Details

### Bubble Calculation Logic
```typescript
const getFilteredEvents = (): PQEvent[] => {
  return events.filter(event => {
    // Only mother events
    if (!event.is_mother_event) return false;
    
    // Exclude false events
    if (event.false_event) return false;
    
    // Date range filter
    if (filters.startDate && new Date(event.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(event.timestamp) > new Date(filters.endDate)) return false;
    
    return true;
  });
};
```

### Geographic Projection
```typescript
const latLngToPixel = (lat: number, lng: number): { x: number; y: number } => {
  const x = ((lng - HK_BOUNDS.west) / (HK_BOUNDS.east - HK_BOUNDS.west)) * MAP_WIDTH;
  const y = ((HK_BOUNDS.north - lat) / (HK_BOUNDS.north - HK_BOUNDS.south)) * MAP_HEIGHT;
  return { x, y };
};
```

### Color and Size Determination
```typescript
let color = '#22c55e'; // Green for 1-2
let radius = 10;

if (eventCount > 10) {
  color = '#ef4444'; // Red for >10
  radius = 20;
} else if (eventCount >= 3 && eventCount <= 9) {
  color = '#eab308'; // Yellow for 3-9
  radius = 15;
}
```

## Required Manual Steps

### 1. Hong Kong Map Background Image
**⚠️ ACTION REQUIRED**

The component expects a Hong Kong map image at:
```
/workspaces/codespaces-react/public/hong-kong-map.png
```

**You need to:**
1. Save the Hong Kong map image you provided to this location
2. Ensure the file is named exactly `hong-kong-map.png`
3. The map will be displayed as a background at 800x480px

**Alternative if image not available:**
- The map will show a gray background (bg-slate-50)
- Bubbles will still render correctly on top
- You can add any Hong Kong map image later

## Testing Checklist

### Bubble Chart
- [ ] Bubbles render at correct geographic positions
- [ ] Bubble colors match event count (red >10, yellow 3-9, green 1-2)
- [ ] Bubble sizes match event count (20px, 15px, 10px radius)
- [ ] Only mother events are counted
- [ ] False events are excluded from counts

### Interactions
- [ ] Click bubble → selects substation and shows blue border
- [ ] Click bubble → populates table with events
- [ ] Hover bubble → shows tooltip with details
- [ ] Tooltip follows mouse cursor

### Filters
- [ ] Date filter affects bubble display
- [ ] Date filter affects table data
- [ ] Filters persist in localStorage
- [ ] Config modal opens on settings icon click
- [ ] Apply button updates visualization

### Profiles
- [ ] Create new profile saves date range
- [ ] Load profile applies saved dates
- [ ] Delete profile removes from list
- [ ] Set default marks profile
- [ ] Profiles persist across sessions

### Table
- [ ] Table shows "Select a substation" when none selected
- [ ] Table populates when bubble clicked
- [ ] Sorting works for all columns
- [ ] Pagination works correctly
- [ ] Shows correct event count

### Export
- [ ] Map export captures full map with bubbles
- [ ] Map export includes legend
- [ ] Table export to Excel works
- [ ] Table export to CSV works
- [ ] Table export to PDF works
- [ ] Exports include all filtered data (not just current page)

## Usage Flow

1. **View Map**: User sees Hong Kong map with colored bubbles representing substations
2. **Hover**: User hovers over bubble to see substation details
3. **Click**: User clicks bubble to select substation
4. **View Table**: Table below map shows events for selected substation
5. **Filter**: User clicks settings icon to open date filter
6. **Save Profile**: User saves common date ranges as profiles
7. **Export Map**: User exports map visualization as PNG
8. **Export Table**: User exports event data as Excel/CSV/PDF

## Build Status
✅ **Build Successful** - No TypeScript or compilation errors

## Next Steps
1. **Add Hong Kong map image** to `/workspaces/codespaces-react/public/hong-kong-map.png`
2. **Test the implementation** using the checklist above
3. **Adjust coordinates** if bubbles don't align perfectly with map geography
4. **Customize styling** if needed (colors, sizes, spacing)
5. **Add more features** as requirements evolve

## Notes
- Profiles are stored in localStorage (not database) for simplicity
- Table shows all customers' services for a substation (not per event)
- Customer Name column intentionally left blank per requirements
- Export functionality reuses existing libraries (xlsx, jspdf, html2canvas)
- Geographic projection uses simple linear interpolation (suitable for Hong Kong's small area)
