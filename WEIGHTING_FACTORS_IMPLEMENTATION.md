# Weighting Factors Implementation Summary

**Date:** January 7, 2026
**Feature:** SARFI Weighting Factors Management

---

## ✅ Implementation Complete

All components for the Weighting Factors feature have been successfully implemented.

### Files Created/Modified

#### 1. **Database Migration** ⭐ NEW
- **File:** `supabase/migrations/20260107000000_add_customer_count_to_weights.sql`
- **Changes:** 
  - Added `customer_count INTEGER DEFAULT 0 NOT NULL` column to `sarfi_profile_weights` table
  - Added index for performance: `idx_sarfi_profile_weights_customer_count`
  - Added column comment for documentation

#### 2. **TypeScript Interfaces** ✏️ UPDATED
- **File:** `src/types/database.ts`
- **Changes:**
  - Added `customer_count: number` to `SARFIProfileWeight` interface
  - Added `customer_count: number` to `SARFIDataPoint` interface

#### 3. **Service Layer** ✏️ UPDATED
- **File:** `src/services/sarfiService.ts`
- **New Functions:**
  ```typescript
  updateCustomerCount(weightId, customerCount)
  batchUpdateCustomerCounts(profileId, updates)
  recalculateWeightFactors(profileId)
  addMeterToProfile(profileId, meterId, customerCount, notes?)
  importWeightFactorsCSV(profileId, csvData)
  ```
- **Auto-Calculation Logic:**
  - Formula: `weight_factor = customer_count / SUM(all_customer_counts)`
  - Triggers automatically after any customer count update

#### 4. **Main Component** ⭐ NEW
- **File:** `src/pages/DataMaintenance/WeightingFactors.tsx`
- **Features:**
  - Profile selector (shows all SARFI Profiles)
  - Data table with inline editing
  - Import/Export functionality (Excel & CSV)
  - Add/Remove meters from profile
  - Auto-recalculation of weight factors
  - Import results modal with detailed error reporting

#### 5. **Routing** ✏️ UPDATED
- **File:** `src/App.tsx`
- **Changes:**
  - Imported `WeightingFactors` component
  - Added route: `currentView === 'weightingFactors'`

#### 6. **Navigation** ✏️ UPDATED
- **File:** `src/components/Navigation.tsx`
- **Changes:**
  - Added `Scale` icon import from lucide-react
  - Added menu item under Data Maintenance section:
    ```typescript
    { id: 'weightingFactors', icon: Scale, label: 'Weighting Factors' }
    ```

---

## 🎯 Feature Capabilities

### 1. **Profile Management**
- Select any SARFI profile from dropdown
- View linked profile details (name, year, total meters, total customers)

### 2. **Data Table**
| Column | Type | Description |
|--------|------|-------------|
| Meter No. | Display | From `pq_meters.meter_id` |
| Location | Display | From `pq_meters.location` |
| Customer Count | Editable | Integer, inline editing with Save/Cancel |
| Weight Factor (%) | Calculated | Auto-calculated, displayed as percentage |
| Actions | Buttons | Edit, Delete |

### 3. **CRUD Operations**
- ✏️ **Edit:** Inline editing of customer count with Save/Cancel buttons
- ➕ **Add Meter:** Modal with search, meter selection, and customer count input
- 🗑️ **Delete:** Remove meter from profile with confirmation
- 🔄 **Auto-Recalculate:** Weight factors update automatically after any change

### 4. **Import Functionality** (Following STYLES_GUIDE.md)
- **Import Button:** Blue-Indigo gradient with Upload icon
- **CSV Format:**
  ```csv
  # Weight Factor Import Template
  # Profile: 2025 Standard Profile
  # Instructions: Update customer_count values
  meter_id,customer_count
  PQM-APA-01,5000
  PQM-BKK-02,3200
  ```
- **Validation:**
  - Meter must exist in system
  - Customer count must be non-negative integer
  - Detailed error reporting by row
- **Import Results Modal:**
  - Success/Failed counts
  - Error details with row numbers
  - Auto-recalculation notification

### 5. **Export Functionality** (Following STYLES_GUIDE.md)
- **Export to Excel:**
  - Header section with profile details
  - Data table with all meters
  - Totals row
  - Formatted columns with proper widths
- **Export to CSV:**
  - Comment headers with metadata
  - Clean CSV format
  - Percentage formatting for weight factors

### 6. **Auto-Calculation Logic**
```typescript
// Triggered automatically when:
- User edits customer count (inline or modal)
- User imports CSV with customer counts
- User adds new meter to profile

// Formula:
weight_factor = customer_count / SUM(all_customer_counts_in_profile)

// Example:
Meter A: 5000 customers → 50% weight (5000/10000)
Meter B: 3000 customers → 30% weight (3000/10000)
Meter C: 2000 customers → 20% weight (2000/10000)
Total: 10000 customers → 100% weight
```

---

## 📍 Navigation Path

**Sidebar → Data Maintenance → Weighting Factors**

Position: Below "Customer Transformer" in the Data Maintenance section

---

## 🔗 Integration with SARFI Chart

The weight factors managed in this feature are used by `SARFIChart.tsx`:

1. **Profile Selection:** SARFIChart uses `sarfi_profiles` to let users select a profile
2. **Weight Loading:** Fetches `sarfi_profile_weights` for the selected profile
3. **Calculation:** Uses `weight_factor` to calculate weighted SARFI metrics
4. **Display:** Shows `customer_count` in the data table when "Show Data Table" is enabled

---

## ⚠️ Important Notes

### Database Migration
The migration file has been created but needs to be run on your Supabase database:

**Option 1: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260107000000_add_customer_count_to_weights.sql`
3. Execute the SQL

**Option 2: Direct Database Access**
```bash
psql $DATABASE_URL -f supabase/migrations/20260107000000_add_customer_count_to_weights.sql
```

### Data Initialization
After running the migration:
1. All existing `sarfi_profile_weights` records will have `customer_count = 0`
2. You need to populate customer counts by:
   - Manually editing each meter in the UI
   - Importing a CSV file with customer counts
   - Running a SQL script to populate from source data

### Customer Count Source
As discussed, customer counts should represent the **total customers** served by each meter, not just the critical customers in the `customer_transformer_matching` table. This data may need to be:
- Imported from external systems
- Manually maintained based on business knowledge
- Calculated from GIS/mapping systems

---

## 🧪 Testing Checklist

- [ ] Run database migration
- [ ] Navigate to Weighting Factors page
- [ ] Select a SARFI profile
- [ ] Add a meter with customer count
- [ ] Verify weight factor auto-calculation
- [ ] Edit a customer count inline
- [ ] Verify weights recalculate
- [ ] Import CSV file
- [ ] Verify import results modal
- [ ] Export to Excel
- [ ] Export to CSV
- [ ] Delete a meter from profile
- [ ] Check SARFIChart displays updated weights

---

## 📚 Related Files

**Documentation:**
- `/workspaces/codespaces-react/Artifacts/STYLES_GUIDE.md` - UI patterns followed
- `/workspaces/codespaces-react/Artifacts/DATABASE_SCHEMA.md` - Database schema reference

**Core Files:**
- `/workspaces/codespaces-react/src/pages/DataMaintenance/WeightingFactors.tsx` - Main component
- `/workspaces/codespaces-react/src/services/sarfiService.ts` - Service functions
- `/workspaces/codespaces-react/src/types/database.ts` - TypeScript interfaces
- `/workspaces/codespaces-react/src/components/Dashboard/SARFIChart.tsx` - Consumer of weights

---

**Implementation Status:** ✅ COMPLETE
**Ready for Testing:** YES (after database migration)
**Documentation:** Complete in STYLES_GUIDE.md patterns
