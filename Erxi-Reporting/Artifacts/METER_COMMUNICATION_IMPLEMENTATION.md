# Meter Communication - Availability Report Implementation

## Overview
Comprehensive availability reporting system that consolidates meter data availability and communication status with real-time insights from the Supabase database.

## Features Implemented

### 1. Input Field Panel
- **Meter Selection Options** (Radio buttons):
  - All (default)
  - By Meter
  - By Level
  - By Substation
  - Others
  
- **Date/Time Range Selector**:
  - From: Date + Hour (00-23)
  - To: Date + Hour (00-23)
  - Maximum range: 1 year
  - Validation included

- **Get Availability Report Button**:
  - Green gradient styling
  - Loading state with disabled UI
  - Triggers database query

### 2. Results Table Panel
- **Header Information**:
  - Device Selection type
  - From/To timestamps
  - Green gradient header matching design

- **Search & Filter Bar**:
  - Search box: Filters by SiteID and Name
  - "Show <100% Only" toggle button (orange when active)
  - Copy button: Copies visible data as CSV to clipboard
  - CSV button: Downloads filtered data

- **Data Table**:
  - **Columns**: SiteID, Name, Count, Availability (%)
  - **Sortable**: Click column headers to sort (↑ ↓ indicators)
  - **Color-coded Availability**:
    - 100%: Green with checkmark icon
    - 90-99%: Yellow
    - <90%: Red with alert icon
  - Sticky header for scrolling
  - Max height: 600px with scroll

- **Back Button**: Returns to input panel

### 3. Summary Statistics Panel (Left Side)
- **Always Visible**: Shows after report generation
- **Dynamic Updates**: Recalculates when filters applied
- **Statistics Displayed**:
  - From: Start date & time
  - To: End date & time
  - Total number of site
  - Expected count (hours in range)
  - Total Availability (%) in green

## Data Flow

### Database Integration
```typescript
// Fetch meters from pq_meters table
supabase.from('pq_meters')
  .select('id, meter_id, location, status, substation_id, voltage_level, last_communication')

// Count readings from meter_voltage_readings table
supabase.from('meter_voltage_readings')
  .select('*', { count: 'exact', head: true })
  .eq('meter_id', meter.meter_id)
  .gte('timestamp', startDateTime)
  .lte('timestamp', endDateTime)
```

### Availability Calculation
```
Expected Count = Hours in date range
  Example: 2 days = 48 hours

Actual Count = Number of readings in meter_voltage_readings table
  WHERE timestamp BETWEEN start AND end

Availability (%) = (Actual Count / Expected Count) × 100
```

## State Management

### State Variables (10 total)
```typescript
const [commSelectionType, setCommSelectionType] = useState<'all' | 'meter' | 'level' | 'substation' | 'others'>('all');
const [commDateRange, setCommDateRange] = useState({ 
  startDate: '2025-12-15', 
  startHour: '00',
  endDate: '2025-12-16', 
  endHour: '23' 
});
const [commReportData, setCommReportData] = useState<any[]>([]);
const [commShowReport, setCommShowReport] = useState(false);
const [commSearchQuery, setCommSearchQuery] = useState('');
const [commSortColumn, setCommSortColumn] = useState<string>('siteId');
const [commSortDirection, setCommSortDirection] = useState<'asc' | 'desc'>('asc');
const [commFilterLessThan100, setCommFilterLessThan100] = useState(false);
const [commLoading, setCommLoading] = useState(false);
```

### Handler Functions (7 total)
1. **handleGetAvailabilityReport()**: Fetches data from database, calculates availability
2. **handleCommSort(column)**: Toggles sort direction for selected column
3. **handleCommExportCSV()**: Exports filtered data to CSV file
4. **handleCommCopy()**: Copies filtered data as CSV to clipboard
5. **getFilteredCommData()**: Applies search, filter, and sort to data
6. **commSummaryStats()**: Calculates summary statistics for filtered data

## Technical Details

### Database Tables Used
- **pq_meters**: Main meter information
  - id (uuid)
  - meter_id (text)
  - location (text)
  - status (enum)
  - voltage_level (text)
  - last_communication (timestamptz)
  
- **meter_voltage_readings**: Hourly readings
  - id (bigserial)
  - meter_id (text)
  - timestamp (timestamptz)
  - v1, v2, v3, i1, i2, i3 (numeric)

### Performance Optimizations
- **Parallel Queries**: Uses Promise.all() for multiple meter queries
- **Count-only Queries**: Uses { count: 'exact', head: true } to avoid fetching data
- **Indexed Queries**: Leverages database indexes on meter_id and timestamp
- **Client-side Filtering**: Search and sort happen in browser for speed

### Error Handling
- Try-catch blocks around database queries
- User-friendly error alerts
- Loading states during data fetch
- Validation for date range (max 1 year)

## UI/UX Design

### Color Scheme
- **Green Theme**: Primary color for availability reporting
  - Gradient: from-green-600 to-emerald-600
  - Buttons, headers, success indicators
  
- **Availability Colors**:
  - Green (#16a34a): 100% availability
  - Yellow (#ca8a04): 90-99% availability
  - Red (#dc2626): <90% availability

### Layout
- **Two-panel Design**:
  - Left: Fixed-width (256px) summary panel
  - Right: Flexible input/results panel
  
- **Responsive**: Adapts to screen size
- **Consistent**: Matches PQMAP design system

### Icons
- CheckCircle: 100% availability
- AlertCircle: <100% availability, filter button
- Search: Search input
- Copy: Copy button
- Download: CSV export
- Wifi: Tab icon

## Usage Instructions

### Generating a Report
1. Navigate to **Reporting > Meter Communication**
2. Select device type (default: All)
3. Set date range:
   - From: Date + Hour
   - To: Date + Hour
4. Click **Get Availability Report**
5. Wait for data to load
6. View results in table

### Filtering Results
- **Search**: Type SiteID or meter name in search box
- **<100% Filter**: Click button to show only problematic meters
- **Sort**: Click column headers to sort ascending/descending

### Exporting Data
- **CSV Export**: Click CSV button to download file
- **Copy**: Click Copy button to copy to clipboard

### Navigating
- **Back to Input**: Click button to return to input panel
- Summary stats remain visible throughout

## Validation Rules
1. Date range cannot exceed 1 year
2. End date/time must be after start date/time
3. Hours must be 00-23
4. Database connection required

## Error Messages
- "Date range cannot exceed 1 year" - when range > 365 days
- "Failed to fetch availability report. Please try again." - on database error

## Future Enhancements
1. **By Meter Selection**: Dropdown to select specific meters
2. **By Level Selection**: Filter by voltage level (400KV, 132KV, etc.)
3. **By Substation Selection**: Filter by substation
4. **Pagination**: For large result sets (>1000 meters)
5. **Export to PDF**: Generate PDF report with charts
6. **Scheduled Reports**: Automatic report generation
7. **Email Alerts**: Notify when availability drops below threshold
8. **Trend Analysis**: Show availability trends over time
9. **Comparison Mode**: Compare different time periods
10. **Real-time Updates**: Auto-refresh data every X minutes

## Testing Checklist
- [x] Radio button selection works
- [x] Date/time inputs validate correctly
- [x] 1-year max range enforced
- [x] Get Availability Report fetches real data
- [x] Availability calculation correct
- [x] Search filters by SiteID and Name
- [x] <100% filter button works
- [x] Column sorting works (all columns)
- [x] CSV export includes filtered data only
- [x] Copy to clipboard works
- [x] Summary stats update dynamically
- [x] Color coding correct (green/yellow/red)
- [x] Icons display properly
- [x] Back button returns to input
- [x] Loading state shows during fetch
- [x] No TypeScript errors

## Status
✅ **COMPLETE** - Meter Communication tab fully implemented with real-time database integration and comprehensive availability reporting

## Files Modified
- **src/components/Reports.tsx** (2150+ lines)
  - Added 10 state variables
  - Added 7 handler functions
  - Implemented full UI with input panel and results table
  - Integrated Supabase database queries
  - Added dynamic summary statistics

## Dependencies
- Supabase client (`src/lib/supabase.ts`)
- Lucide React icons (AlertCircle, CheckCircle)
- Existing PQMAP design system
