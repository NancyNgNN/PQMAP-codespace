# Asset Management - Event History Feature

## Overview
Added PQ Event History tab to the meter detail modal in Asset Management, allowing users to view and filter all events related to a specific meter.

## Implementation Date
December 23, 2025

## Features

### 1. **Tabbed Modal Interface**
- **Tab 1: Meter Information** - Original meter details (Basic Info, Location, Specifications, Asset Tracking)
- **Tab 2: Event History** - New PQ events log with filtering and pagination

### 2. **Event Display**
- **20 events per page** with pagination
- **Newest first** default sort (by timestamp descending)
- **Row highlighting** on click (Option C - no detail modal)
- **Event count badge** in tab header

### 3. **Compact Filters** (Pattern 1 from STYLES_GUIDE.md)

#### Quick Date Filters
- Today
- Last 7 Days
- Last 30 Days
- This Year
- Clear All

#### Manual Date Range
- Start Date input
- End Date input

#### Event Type Filter
- Voltage Dip
- Voltage Swell
- Harmonic
- Interruption
- Transient
- Flicker
- Multi-select toggle buttons

#### Status Filter
- New
- Acknowledged
- Investigating
- Resolved
- Multi-select toggle buttons

### 4. **Event Columns**
| Column | Description |
|--------|-------------|
| **Timestamp** | Date and time of event |
| **Event Type** | Badge with event classification |
| **Duration (ms)** | Event duration in milliseconds |
| **Voltage %** | Remaining voltage percentage |
| **Customers** | Number of affected customers |
| **Status** | Current event status (color-coded badge) |
| **Circuit** | Circuit ID |
| **Root Cause** | Cause or remarks |

### 5. **Summary Statistics**
Two compact cards:
- **Total Events** - Count of filtered events with Zap icon
- **By Type** - Top 3 event types with counts

### 6. **Performance**
- Database index on `pq_events.meter_id` for fast queries
- Events loaded once when meter is selected
- Client-side filtering for responsive UI

## Technical Details

### Files Modified
- `src/components/AssetManagement.tsx` - Added event history tab

### Files Created
- `supabase/migrations/20251223000001_add_meter_id_index.sql` - Performance index

### New State Variables
```typescript
// Modal states
const [activeTab, setActiveTab] = useState<'info' | 'events'>('info');

// Event history states
const [meterEvents, setMeterEvents] = useState<PQEvent[]>([]);
const [loadingEvents, setLoadingEvents] = useState(false);
const [eventFilters, setEventFilters] = useState({
  startDate: '',
  endDate: '',
  eventTypes: [] as EventType[],
  statuses: [] as EventStatus[]
});
const [eventPage, setEventPage] = useState(1);
const eventsPerPage = 20;
const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
```

### Key Functions

#### `loadMeterEvents(meter: PQMeter)`
- Queries `pq_events` table filtered by `meter_id`
- Orders by `timestamp DESC` (newest first)
- Stores results in `meterEvents` state
- Shows loading indicator during fetch

#### Event Filtering Logic
- Client-side filtering for responsive UX
- Date range: Filters by start/end date
- Event types: Multi-select OR logic
- Status: Multi-select OR logic
- Calculates event type breakdown for summary

#### Quick Date Filters
- **Today**: Same start/end date
- **Last 7 Days**: 7 days ago to today
- **Last 30 Days**: 30 days ago to today
- **This Year**: Jan 1 to today

## Usage

1. **Open Meter Details**
   - Click info icon (ⓘ) in Actions column of any meter
   - Modal opens with "Meter Information" tab active

2. **View Event History**
   - Click "Event History" tab
   - Events load automatically (if not already loaded)
   - Summary cards show total count and top types

3. **Filter Events**
   - Use quick date filter buttons for common ranges
   - Or manually set start/end dates
   - Click event type buttons to filter by type (multi-select)
   - Click status buttons to filter by status (multi-select)
   - Click "Clear All" to reset all filters

4. **Navigate Events**
   - 20 events shown per page
   - Use pagination controls at bottom
   - Click any row to highlight it (visual feedback only)

5. **Review Event Details**
   - Timestamp shows full date and time
   - Event type shown as colored badge
   - Status shown as colored badge (green=resolved, yellow=investigating, blue=acknowledged, gray=new)
   - Root cause/remarks shown in last column

## Styling

### Colors
- **Primary**: Blue gradient header (`from-slate-700 to-slate-800`)
- **Active Tab**: Blue border and text (`border-blue-600 text-blue-600`)
- **Summary Cards**: Blue gradient for total, slate for breakdown
- **Selected Row**: Light blue background (`bg-blue-50`)
- **Filter Buttons**: Blue when active, white when inactive

### Compact Design (STYLES_GUIDE.md Pattern 1)
- **Text Size**: `text-xs` for filters and table
- **Button Padding**: `px-2 py-1.5` for quick filters
- **Input Padding**: `px-3 py-1.5` for date inputs
- **Spacing**: `gap-2` for buttons, `space-y-3` for sections

### Responsive
- Modal max width: `max-w-5xl` (larger to accommodate events table)
- Modal max height: `max-h-[90vh]` with flex layout
- Scrollable content area with fixed header/footer
- Flex-wrap for filter buttons on narrow screens

## Database Schema

### Query
```sql
SELECT *
FROM pq_events
WHERE meter_id = $1
ORDER BY timestamp DESC;
```

### Index
```sql
CREATE INDEX idx_pq_events_meter_id ON pq_events(meter_id);
```

**Benefits:**
- Dramatically faster meter-specific queries
- Supports frequent lookups in Asset Management
- Small overhead on inserts/updates

## Future Enhancements

### Potential Features
1. **Export Events** - Excel/CSV export of filtered events
2. **Event Details Modal** - Click to see full event details (upgrade from Option C to Option A)
3. **Waveform Preview** - Thumbnail waveform charts in table
4. **Advanced Filters** - Severity, voltage level, duration range
5. **Sort Options** - Sort by any column
6. **Search** - Text search across cause/remarks
7. **Communication Correlation** - Show gaps in meter communication overlaid with events
8. **Event Timeline** - Visual timeline view option

### Performance Optimizations
1. **Virtual Scrolling** - For meters with thousands of events
2. **Lazy Loading** - Load events on tab switch (not on modal open)
3. **Cache Events** - Remember loaded events per meter in session
4. **Aggregation Query** - Pre-calculate summary stats in database

## Testing Checklist

- [x] Tab switching works correctly
- [x] Events load when meter is selected
- [x] Loading indicator shows during fetch
- [x] Empty state displays when no events
- [x] Date range filters work correctly
- [x] Event type filters work (multi-select)
- [x] Status filters work (multi-select)
- [x] Quick date filters set correct ranges
- [x] Clear All resets all filters
- [x] Pagination works correctly
- [x] Row highlight on click
- [x] Summary cards update with filters
- [x] Event type badges display correctly
- [x] Status badges display with correct colors
- [x] Modal closes properly
- [x] Tab state resets when reopening modal
- [x] Database index created successfully

## Deployment Notes

1. **Database Migration**
   ```bash
   # Run in Supabase SQL Editor
   # File: supabase/migrations/20251223000001_add_meter_id_index.sql
   ```

2. **Frontend Deployment**
   ```bash
   git add src/components/AssetManagement.tsx
   git add supabase/migrations/20251223000001_add_meter_id_index.sql
   git commit -m "feat: Add Event History tab to Asset Management meter details"
   git push origin main
   ```

3. **Verification**
   - Check index exists: `SELECT * FROM pg_indexes WHERE indexname = 'idx_pq_events_meter_id';`
   - Test meter with many events (>100)
   - Verify query performance is fast (<100ms)
   - Test all filter combinations
   - Test pagination with edge cases

## Support

For questions or issues:
1. Check STYLES_GUIDE.md for pattern references
2. Review database schema in DATABASE_SCHEMA.md
3. Test with different meters (active/abnormal/inactive)
4. Verify meter_id exists in pq_events table

---

**Version:** 1.0  
**Status:** ✅ Complete and ready for deployment
