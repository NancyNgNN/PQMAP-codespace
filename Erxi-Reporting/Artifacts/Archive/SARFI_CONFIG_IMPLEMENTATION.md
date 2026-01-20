# SARFI Configuration Feature

## Overview

This feature adds a comprehensive configuration system for SARFI (System Average RMS Variation Frequency Index) dashboard, allowing users to:

1. **Select calculation profiles** with different weighting factors
2. **Filter by voltage level** (400kV, 132kV, 11kV, 380V, Others)
3. **Exclude special events** (typhoon mode, maintenance mode)
4. **Choose data type** (Magnitude or Duration - Duration coming soon)
5. **Toggle data table** to view detailed meter-level incident counts

## Features Implemented

### 1. Database Schema

**Tables Created:**
- `sarfi_profiles` - Stores SARFI calculation profiles by year
- `sarfi_profile_weights` - Stores meter-specific weighting factors for each profile

**Migration File:** `/supabase/migrations/20251209000000_create_sarfi_profiles.sql`

### 2. TypeScript Types

**New Interfaces Added to `src/types/database.ts`:**
- `SARFIProfile` - Profile metadata
- `SARFIProfileWeight` - Meter weighting factors
- `SARFIDataPoint` - Meter-level SARFI data
- `SARFIFilters` - Configuration filter state

### 3. UI Components

#### SARFIConfigModal
**File:** `src/components/Dashboard/SARFIConfigModal.tsx`

Modal dialog for configuring SARFI dashboard filters:
- Profile dropdown (selects year-based calculation profile)
- Voltage level filter
- Toggle switches for special event exclusion
- Data type selection (Magnitude/Duration)
- Show/hide data table toggle

**Features:**
- Saves preferences to localStorage
- Apply/Cancel buttons
- Disabled state for "Duration" (coming soon)

#### SARFIDataTable
**File:** `src/components/Dashboard/SARFIDataTable.tsx`

Displays detailed meter-level SARFI data:
- Columns: Meter No., Location, SARFI-10 through SARFI-90, Weight Factor
- Shows incident counts for each SARFI index
- Footer row with totals and averages
- Responsive table with sticky header

#### Updated SARFIChart
**File:** `src/components/Dashboard/SARFIChart.tsx`

Enhanced SARFI chart component:
- Settings button in upper right corner
- Integration with configuration modal
- Conditional rendering of data table
- Filter state management with localStorage persistence

### 4. Profile Management

**File:** `src/components/Settings/SARFIProfileManagement.tsx`

Admin interface for managing SARFI profiles:
- Create/edit/delete profiles
- View and edit weighting factors per meter
- Inline editing of weight values
- Profile activation status

**Features:**
- Split-pane interface (profiles list + weights editor)
- Batch weight updates
- Profile year validation

### 5. Service Layer

**File:** `src/services/sarfiService.ts`

API functions for SARFI operations:

**Profile Management:**
- `fetchSARFIProfiles()` - Get all profiles
- `fetchActiveProfile(year)` - Get active profile for year
- `createSARFIProfile()` - Create new profile
- `updateSARFIProfile()` - Update existing profile
- `deleteSARFIProfile()` - Delete profile (cascades to weights)

**Weight Management:**
- `fetchProfileWeights()` - Get weights for profile
- `upsertProfileWeight()` - Create or update weight
- `batchUpdateWeights()` - Update multiple weights
- `deleteProfileWeight()` - Remove weight

**Data Retrieval:**
- `fetchFilteredSARFIData(filters)` - Get filtered SARFI data
- `calculateWeightedSARFI(data)` - Calculate weighted SARFI indices

### 6. Seed Script

**File:** `scripts/seed-sarfi-profiles.js`

Creates sample data for testing:
- Profiles for 2023, 2024, 2025
- Randomized weighting factors (0.5 - 5.0 range)
- Variations by year to simulate real-world changes
- Auto-generates weights for all existing meters

## Installation & Setup

### 1. Run Database Migration

```bash
# Apply the migration to create tables
# This should happen automatically when Supabase syncs migrations
# Or manually through Supabase dashboard SQL editor
```

### 2. Seed Sample Data

```bash
# Install dependencies if needed
npm install

# Run the seed script
node scripts/seed-sarfi-profiles.js
```

Expected output:
```
🌱 Starting SARFI profiles seeding...
✅ Found 50 meters
✅ Created profile: 2023 Standard Profile
✅ Created profile: 2024 Standard Profile
✅ Created profile: 2025 Standard Profile (Active)
```

### 3. Verify Installation

1. Start the application: `npm run dev`
2. Navigate to the dashboard with SARFI chart
3. Look for the settings icon (⚙️) in the upper right corner
4. Click to open configuration modal
5. Select a profile and apply filters

## Usage

### End User Workflow

1. **View SARFI Dashboard**
   - Navigate to main dashboard
   - Locate SARFI Metrics Trend chart

2. **Open Configuration**
   - Click settings button (⚙️) in upper right
   - Configuration modal opens

3. **Select Filters**
   - **Profile**: Choose calculation year (2023/2024/2025)
   - **Voltage Level**: Filter by voltage (400kV, 132kV, 11kV, 380V, Others, or All)
   - **Exclude Special Events**: Toggle to remove typhoon/maintenance events
   - **Data Type**: Select Magnitude (Duration coming soon)
   - **Show Data Table**: Toggle to display detailed meter data

4. **Apply Changes**
   - Click "Apply Filters" button
   - Dashboard updates with filtered data
   - Data table appears below chart (if enabled)

5. **View Data Table**
   - Scroll down to see meter-level breakdown
   - Review incident counts per SARFI index
   - Check weighting factors for each meter

### Administrator Workflow

1. **Access Profile Management**
   - Navigate to Settings → SARFI Profile Management

2. **Create New Profile**
   - Click + button in profiles list
   - Enter: Name, Year, Description
   - Click Save

3. **Configure Weighting Factors**
   - Select a profile from the list
   - View meters in right panel
   - Click edit icon (✏️) next to weight value
   - Enter new weight factor
   - Press Enter or click outside to save

4. **Manage Profiles**
   - Delete unwanted profiles (🗑️ button)
   - View active/inactive status
   - Only one profile per year can be active

## Data Model

### SARFI Profile
```typescript
{
  id: string;
  name: string;              // "2025 Standard Profile"
  description: string;       // Optional description
  year: number;              // 2025
  is_active: boolean;        // Only one active per year
  created_by: string;        // User ID
  created_at: string;
  updated_at: string;
}
```

### Profile Weight
```typescript
{
  id: string;
  profile_id: string;        // References sarfi_profiles
  meter_id: string;          // References pq_meters
  weight_factor: number;     // 0.5 - 5.0 (typical range)
  notes: string;             // Optional notes
  created_at: string;
  updated_at: string;
}
```

### SARFI Data Point
```typescript
{
  meter_id: string;
  meter_no: string;          // Display ID
  location: string;          // Meter location
  sarfi_10: number;          // Incident count (≤90% voltage)
  sarfi_30: number;          // Incident count (≤70% voltage)
  sarfi_50: number;          // Incident count (≤50% voltage)
  sarfi_70: number;          // Incident count (≤30% voltage)
  sarfi_80: number;          // Incident count (≤20% voltage)
  sarfi_90: number;          // Incident count (≤10% voltage)
  weight_factor: number;     // Applied weight
}
```

## Calculation Logic

### SARFI Index Calculation

SARFI indices measure the average number of voltage dips per customer based on remaining voltage thresholds:

- **SARFI-10**: Events with ≤90% remaining voltage
- **SARFI-30**: Events with ≤70% remaining voltage
- **SARFI-50**: Events with ≤50% remaining voltage
- **SARFI-70**: Events with ≤30% remaining voltage
- **SARFI-80**: Events with ≤20% remaining voltage
- **SARFI-90**: Events with ≤10% remaining voltage

### Weighting Formula

```javascript
Weighted SARFI = Σ(incidents_per_meter × weight_factor) / Σ(weight_factors)
```

**Weight Factor** typically represents:
- Number of customers served by transformer
- Regional importance factor
- Criticality multiplier for industrial customers

### Example Calculation

```
Meter A: 5 SARFI-70 incidents, weight = 2.0
Meter B: 3 SARFI-70 incidents, weight = 1.5
Meter C: 8 SARFI-70 incidents, weight = 3.0

Weighted SARFI-70 = (5×2.0 + 3×1.5 + 8×3.0) / (2.0 + 1.5 + 3.0)
                  = (10 + 4.5 + 24) / 6.5
                  = 38.5 / 6.5
                  = 5.92 incidents per weighted customer
```

## Filter Behavior

### Voltage Level Filter
- **All**: Shows data from all voltage levels
- **400kV, 132kV, 11kV, 380V**: Filters to specific transmission/distribution levels
- **Others**: Catches meters with non-standard voltage levels

### Exclude Special Events
When enabled, removes events that occurred during:
- Typhoon mode periods
- Scheduled maintenance windows
- Manually flagged special circumstances

This provides cleaner data for normal operating conditions analysis.

### Profile Selection
Different profiles allow:
- Year-over-year comparisons
- Testing different weighting scenarios
- Regional vs. system-wide calculations
- Historical data analysis

## File Structure

```
src/
├── components/
│   ├── Dashboard/
│   │   ├── SARFIChart.tsx              # Main chart with config button
│   │   ├── SARFIConfigModal.tsx        # Configuration modal
│   │   └── SARFIDataTable.tsx          # Meter-level data table
│   └── Settings/
│       └── SARFIProfileManagement.tsx  # Admin profile management
├── services/
│   └── sarfiService.ts                 # API/business logic
└── types/
    └── database.ts                      # TypeScript interfaces

scripts/
└── seed-sarfi-profiles.js              # Sample data seeding

supabase/
└── migrations/
    └── 20251209000000_create_sarfi_profiles.sql  # Database schema
```

## Future Enhancements

### Duration Data Type
Currently, only "Magnitude" view is implemented. Future "Duration" view could show:
- Events grouped by duration ranges
- Time-domain analysis
- Duration-weighted SARFI calculations

### Advanced Features
- **Bulk import/export**: CSV upload for weight factors
- **Profile templates**: Pre-configured regional templates
- **Comparison mode**: Side-by-side profile comparison
- **Historical trends**: Year-over-year SARFI changes
- **Automated suggestions**: ML-based weight factor recommendations
- **Audit log**: Track weight factor changes over time

## Troubleshooting

### Configuration modal not opening
- Check browser console for errors
- Verify profiles exist in database
- Ensure user has proper permissions

### Data table shows "No data"
- Verify profile has weights configured
- Check if events exist for selected filters
- Confirm voltage level filter isn't too restrictive

### Weight factors not saving
- Check user role (must be admin/operator)
- Verify database connection
- Check RLS policies in Supabase

### Profiles not loading
- Run migration to create tables
- Seed sample data with script
- Check Supabase connection status

## Support

For issues or questions:
1. Check this README first
2. Review database migration status
3. Check browser console for errors
4. Verify Supabase permissions (RLS policies)
5. Contact development team

## License

Part of the PQMAP (Power Quality Monitoring and Analysis Platform) project.
