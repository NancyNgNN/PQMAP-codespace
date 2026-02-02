# PQMAP - Project Function Design Document

**Document Version:** 1.6  
**Last Updated:** January 12, 2026  
**Purpose:** Comprehensive functional design reference for continuous development

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Change History & Feature Updates](#change-history--feature-updates) 🆕
4. [Core Functional Modules](#core-functional-modules)
   - [1. Dashboard Module](#1-dashboard-module)
   - [2. Event Management Module](#2-event-management-module)
   - [3. Data Analytics Module](#3-data-analytics-module)
   - [4. Asset Management Module](#4-asset-management-module)
   - [5. Reporting Module](#5-reporting-module)
   - [6. Data Maintenance Module](#6-data-maintenance-module)
   - [7. System Health Module](#7-system-health-module)
5. [Data Models & Database Schema](#data-models--database-schema)
6. [Key Design Patterns](#key-design-patterns)
7. [Integration Points](#integration-points)
8. [Environment Configuration & Security](#environment-configuration--security)
9. [Development Guidelines](#development-guidelines)

---

## System Overview

### Mission Statement
PQMAP (Power Quality Monitoring and Analysis Platform) is a comprehensive web-based system designed to monitor, analyze, and report on power quality events across CLP's electrical grid infrastructure. The platform serves engineers, operators, and managers in tracking voltage dips, harmonics, and other power disturbances to ensure grid reliability and regulatory compliance.

### Target Users
- **Administrators**: Full system access, user management, configuration
- **Operators**: Event management, analysis, report generation
- **Viewers**: Read-only access to dashboards and reports

### Key Business Objectives
1. Real-time monitoring of power quality events across Hong Kong's grid
2. Compliance with international standards (EN50160, IEEE519, IEC61000)
3. Root cause analysis and predictive maintenance
4. Customer impact assessment and communication
5. Integration with existing CLP systems (PQMS, CPDIS, ADMS)

---

## Architecture & Tech Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS (utility-first approach)
- **Icons**: Lucide React
- **Build Tool**: Vite (fast dev server, optimized builds)
- **State Management**: React hooks (useState, useEffect, useContext)

### Backend & Database
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Authentication**: Supabase Auth with Row Level Security (RLS)
- **Storage**: Supabase Storage for reports and waveform data
- **API**: REST API via Supabase client library

### Key Libraries
- **Data Export**: XLSX (Excel), jsPDF (PDF), html2canvas (image export)
- **Date Handling**: Native JavaScript Date API
- **Validation**: TypeScript strict type checking

### Project Structure
```
src/
├── components/          # React components organized by feature
│   ├── Dashboard/       # Dashboard widgets and charts
│   ├── EventManagement/ # Event analysis and grouping
│   ├── AssetManagement.tsx
│   ├── DataAnalytics.tsx
│   ├── Reports.tsx
│   ├── Notifications.tsx
│   └── SystemHealth.tsx
├── contexts/            # React context providers
│   └── AuthContext.tsx  # Authentication state
├── lib/                 # Core libraries
│   └── supabase.ts      # Database client
├── services/            # Business logic and API calls
│   ├── sarfiService.ts
│   ├── mother-event-grouping.ts
│   └── exportService.ts
├── types/               # TypeScript interfaces
│   ├── database.ts      # Database schemas
│   └── eventTypes.ts    # Event-specific types
├── utils/               # Helper functions
│   ├── seedDatabase.ts
│   └── falseEventDetection.ts
└── App.tsx              # Main application component
```

---

## Change History & Feature Updates

### January 2026

#### Waveform Analysis Viewer in Technical Tab (Jan 28, 2026)
**Features Added:**
- **Interactive Waveform Visualization Component**
  - Purpose: Visual analysis of voltage waveform data captured during power quality events
  - Component: `WaveformViewer.tsx` (450+ lines) using Recharts library
  - Chart Library: Recharts for React-based interactive line charts with zoom and tooltip support
  - Location: Event Details → Technical Tab (below SARFI Analysis)

- **Multi-View Display Modes**
  - **Combined View**: All 3 voltage phases (V1/V2/V3) overlaid in single chart
    - Color scheme: Red (V1), Green (V2), Blue (V3)
    - Chart height: 400px with responsive container
    - Simultaneous phase comparison for voltage balance analysis
  - **Individual Phase Views**: Separate charts for each phase (V1, V2, V3)
    - Dedicated phase colors with matching grid backgrounds
    - Chart height: 250px per phase
    - Phase-specific Y-axis scaling for detailed analysis
  - **View Selector**: Toggle buttons (Combined | V1 | V2 | V3) in header

- **Interactive Features**
  - **Hover Tooltips**: Shows exact voltage values for all phases at cursor position
    - Displays timestamp with millisecond precision (HH:mm:ss.SSS format)
    - White background with 2px border, auto-positions near cursor
    - Full data accuracy (not downsampled)
  - **Mouse Wheel Zoom**: Zoom range 50% to 200% with dynamic resampling
    - 50% zoom: ~500 points (wider view)
    - 100% zoom: ~1000 points (default)
    - 200% zoom: ~2000 points (detailed view)
  - **Zoom Controls**: Zoom In/Out buttons, percentage display, Reset to 100% button
    - Integrated in purple-indigo gradient header
    - Disabled states at min/max zoom levels

- **Statistics Display**
  - Real-time calculation of Min/Max/RMS values for each phase
  - Color-coded phase indicators (circular dots matching phase colors)
  - Horizontal statistics bar with 3-column grid layout
  - Sample count information (total samples vs displayed points)

- **Performance Optimization**
  - **Downsampling Algorithm**: 3586 CSV rows → ~1000 display points (6x reduction)
  - useMemo for expensive calculations (parsing, statistics, downsampling)
  - Full data preserved in memory for tooltip accuracy
  - Dynamic sample rate adjusts with zoom level
  - Smooth 300ms chart animations
  - No dots on lines (better performance for high-density data)

- **Data Structure & Storage**
  - **CSV Format**: Timestamp, V1, V2, V3 (4 columns)
  - **Database Field**: Added `waveform_csv` TEXT field to `pq_events` table
  - **Example Row**: `2026-01-26 10:16:55.923,-131839.296875,297632.875,-163805.046875`
  - **Sample Data**: 3586 rows from BKP0227_20260126 101655_973.csv
  - **Storage Strategy**: CSV content stored directly in database (Option A for demo)

- **Demo Mode Implementation**
  - Currently loads sample CSV for all events (pending PQMS integration)
  - Async fetch from public folder: `/Artifacts/From Users/System Images/BKP0227_20260126 101655_973.csv`
  - Graceful fallback if CSV not found
  - Easy migration path to real PQMS data

- **Chart Configuration Details**
  - **X-Axis**: Timestamp with HH:mm:ss.SSS format, gray tick labels (11px font)
  - **Y-Axis**: Voltage in Volts (V), left-side label with rotation, gray tick labels
  - **CartesianGrid**: Dashed 3-3 pattern, light slate color (#e2e8f0)
  - **Line Styling**: strokeWidth 1.5-2, monotone curve type, no dots
  - **Legend**: Bottom position with 20px padding, line icons
  - **Margins**: top: 5, right: 30, left: 20, bottom: 5

- **Fallback UI**
  - Empty state when no waveform data available
  - Activity icon (gray, 12x12) with centered layout
  - Message: "No waveform data available"
  - Subtext: "Waveform capture data has not been recorded for this event"

- **Component Integration**
  - File: `src/components/EventManagement/EventDetails.tsx` modified
  - Replaced old `WaveformDisplay` with new `WaveformViewer`
  - Added `waveformCsvData` state variable
  - useEffect hook for async CSV loading per event
  - Props: `csvData: string | null`

- **TypeScript Type Updates**
  - File: `src/types/database.ts`
  - Added `waveform_csv: string | null` to PQEvent interface
  - Comment: "CSV data for waveform visualization (Timestamp,V1,V2,V3)"

**Technical Implementation:**
```typescript
// WaveformViewer.tsx structure
interface WaveformData {
  timestamp: string;
  v1: number;
  v2: number;
  v3: number;
}

interface WaveformViewerProps {
  csvData: string | null;
}

// Key functions:
- parsedData = useMemo(() => parseCSV(csvData), [csvData])
- displayData = useMemo(() => downsample(parsedData, zoomLevel), [parsedData, zoomLevel])
- stats = useMemo(() => calculateStats(parsedData), [parsedData])
- CustomTooltip component for hover display
- formatTimestamp(timestamp) for X-axis labels
- handleWheel(e) for mouse wheel zoom
```

**Future Enhancements:**
- Real CSV upload from PQMS system (replace demo data)
- Waveform capture trigger marking (orange dashed line at event start)
- Export waveform chart as PNG image (via html2canvas)
- Compare multiple waveforms (overlay mode)
- FFT analysis view (frequency domain)
- Event annotation markers on timeline

**Reference Materials:**
- Reference UI: `Artifacts/From Users/System Images/image.png` (PQMS waveform viewer design)
- Sample CSV: `Artifacts/From Users/System Images/BKP0227_20260126 101655_973.csv` (3586 rows)

---

#### Reporting & Meter Communication (Jan 23, 2026)
**Features Added:**
- Reporting page with Meter Communication summary + table, filters, sorting, and export (Excel/CSV)
- **Database support** for `meter_voltage_readings` and `voltage_profiles` (UUID FK to `pq_meters`)
- **Asset Management enhancement**: latest voltage/current reading panel sourced from database (mock fallback preserved)
- **Shared availability utilities** for consistent time-range and availability calculations

#### Reporting – PQ Summary UI Preview (Jan 30, 2026)
**Features Added:**
- New **Reporting** module entry (Navigation → Reporting)
- PQ Summary screen matching target UI (filters + event list)
- Clickable overlays for **Affected Customers**, **PQ Service Logs**, and **Event Details** (mock data)
- English calendar-style date picker (YYYY/MM/DD) for time range selection

#### Reporting – Benchmarking Tab Preview (Jan 30, 2026)
**Features Added:**
- Benchmarking tab with **PQ Standards** list (search + By Standard/By Parameter filters)
- Add/Edit Standard modal and Delete confirmation modal (in-memory preview)
- **Voltage Dip Benchmarking** flow: select standard + date range → “Get Benchmark Result” → chart + summary + detailed results table (mock data)

#### Reporting – Data Maintenance Tab Preview (Jan 30, 2026)
**Features Added:**
- Data Maintenance tab with sub-tabs: **Raw Data / Daily Data / Weekly Data**
- Left step panel:
  - Step 1 meter selection (Raw: searchable meter list; Daily/Weekly: voltage level selector placeholder)
  - Step 2 parameter selection (Voltage / Current / THD)
  - Step 3 time range selection with English calendar popovers (`YYYY/MM/DD`) + hour/minute inputs
  - Time range limits: Raw max **1 month**, Daily/Weekly max **1 year** (UI validation)
- Right results area:
  - Mock tables matching target layouts (Raw L1/L2/L3; Daily V1/2/3 max/min; Weekly L1/L2/L3)
  - **Export CSV** (disabled when empty) + Clear Results

#### Harmonic Events Table (Jan 9, 2026)
**Features Added:**
- **Separate Table for Harmonic Measurements**
  - Purpose: Store harmonic-specific parameters separate from main pq_events table
  - Table: `harmonic_events` with 1:1 relationship to pq_events
  - 12 Parameters per event:
    - Current THD (Total Harmonic Distortion) for 3 phases (I1, I2, I3)
    - Current TEHD (Total Even Harmonic Distortion) for 3 phases
    - Current TOHD (Total Odd Harmonic Distortion) for 3 phases
    - Current TDD (Total Demand Distortion) for 3 phases
  - IEEE 519 Compliant: 10-minute averaging periods
  - Phase Naming: I1/I2/I3 (I = current symbol)
  
- **Database Implementation**
  - Migration: `20260109000000_create_harmonic_events.sql`
  - Indexes: pqevent_id (FK), THD composite index
  - RLS Policies: Authenticated users (view), Operators/Admins (manage)
  - Constraints: UNIQUE(pqevent_id), CASCADE DELETE
  
- **Backfill Script**
  - File: `scripts/backfill-harmonic-events.sql`
  - Generates realistic values based on pq_events.magnitude
  - THD distribution: Base magnitude ± variation
  - TEHD/TOHD: 15%/85% split (even/odd harmonics)
  - TDD: ~90% of THD
  - Phase variations simulate real 3-phase systems
  
- **TypeScript Integration**
  - Interface: `HarmonicEvent` with all 12 parameters
  - Extended `PQEvent` with optional `harmonic_event` field
  - Proper type casting: `number | null`
  
- **Documentation**
  - Implementation Guide: `scripts/HARMONIC_EVENTS_IMPLEMENTATION.md`
  - Database Schema updated with harmonic_events details
  - Roadmap updated with future voltage THD enhancement

**Future Enhancement (Q3-Q4 2026):**
- Voltage Harmonic Measurements (V1/V2/V3 THD/TEHD/TOHD/TDD)
- Pending verification of PQMS/CPDIS voltage harmonic data availability

---

#### Enterprise Notification System Migration (Jan 14, 2026)
**Migration Timeline:** 5 days (Day 1-2: Backend, Day 3-5: Frontend UI)  
**Status:** ✅ Days 1-4 COMPLETED (Day 5 pending)

##### Day 1-2: Database Schema & Backend Services (Jan 13-14, 2026)
**Features Added:**
- **Database Schema (7 New Tables)**
  - `notification_channels` - Multi-channel delivery (Email/SMS/Teams)
  - `notification_templates` - Template-based messaging with variables
  - `notification_groups` - User grouping independent of UAM roles
  - `notification_group_members` - Member assignments with channel preferences
  - `notification_rules` - Complex rule engine with multi-condition logic
  - `notification_logs` - Comprehensive delivery tracking
  - `notification_system_config` - System-wide settings (typhoon mode, etc.)
  - Migration File: `supabase/migrations/20260113000000_create_notification_system.sql`

- **TypeScript Type Definitions**
  - File: `src/types/database.ts`
  - Added 7 notification interfaces matching database schema
  - Proper enum types for status, channel types, severity levels
  - Variable definition structure with required/default value support

- **Notification Service (800+ lines)**
  - File: `src/services/notificationService.ts`
  - **Template Management (9 functions):** CRUD with versioning, Draft → Approved workflow
  - **Channel Management (4 functions):** Channel config (SMTP, SMS, Teams), status management
  - **Group Management (8 functions):** Group CRUD, member management, per-member channel preferences
  - **Rule Management (6 functions):** Multi-condition rule builder, enable/disable toggles
  - **Variable Substitution Engine:** `substituteVariables(template, variables)` - replaces `{{variable}}` with values
  - **Rule Evaluation Engine:** `evaluateRule(event, rule)` - 9 operators, AND logic between conditions
  - **Demo Notification Sender:** Console logging for testing without real channels
  - **Logs & System Config (7 functions):** Log filtering, typhoon/maintenance mode toggles

- **User Permission Updates**
  - File: `src/services/userManagementService.ts`
  - New function: `canApproveNotificationTemplates(userRole)`
  - Admin/Owner: Can approve templates, Operator: Create drafts only, Viewer: Read-only

**⚠️ User Role Enum Mapping (Critical Reference):**
```typescript
// Database enum: user_role has values ('admin', 'operator', 'viewer')
// UAM System roles: 'system_admin', 'system_owner', 'manual_implementator', 'watcher'

// CORRECT MAPPING:
const roleMapping = {
  'system_admin': 'admin',              // Full system access, template approval
  'system_owner': 'admin',              // Full system access, template approval
  'manual_implementator': 'operator',   // Create/edit, no approval
  'watcher': 'viewer'                   // Read-only access
};

// ❌ WRONG: INSERT INTO profiles (role) VALUES ('system_admin');
// ✅ CORRECT: INSERT INTO profiles (role) VALUES ('admin');
```

**Database Constraint Notes:**
- **FK Constraint:** `profiles.id` → `auth.users.id` (ON DELETE CASCADE)
- **For Dummy Data:** Temporarily drop FK constraint if auth.users entries don't exist
- **Migration Pattern:** `ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;`
- **Production:** Always create auth.users entries first, then profiles

##### Day 3: Template Management UI (Jan 14, 2026)
**Features Added:**
- **TemplateList Component** (`src/components/Notifications/TemplateList.tsx`, 350+ lines)
  - Stats cards: Total, Approved, Draft, Archived counts
  - Search by name, code, or description, Filter by status
  - Action buttons: Approve (admin only), Edit, Archive

- **TemplateEditor Component** (`src/components/Notifications/TemplateEditor.tsx`, 600+ lines)
  - Basic info form, Variable manager (add/edit/delete with required flags)
  - Tab navigation (Email/SMS/Teams), Content editors with Insert variable buttons
  - SMS character counter (160/306/459 warnings), Preview toggle with real-time substitution
  - Versioning: Creates new version when editing approved templates

- **TemplateApprovalModal Component** (`src/components/Notifications/TemplateApprovalModal.tsx`, 280+ lines)
  - Template info, variables list, channel preview tabs, Approve/Reject/Cancel actions
  - Permissions: Only admins can approve

- **Navigation:** Added "Templates" menu item with FileCode icon

**User Workflows:**
1. Create: New → Fill info → Add variables → Enter content per channel → Save draft
2. Edit: Click Edit → Make changes → Save (versions if approved)
3. Approve: Admin clicks Approve → Reviews preview → Confirms approval
4. Archive: Click Archive → Confirm → Template hidden from rules

##### Day 4: Channel, Group & Rule Management UI (Jan 14, 2026)
**Features Added:**

- **ChannelManagement Component** (`src/components/Notifications/ChannelManagement.tsx`, 340+ lines)
  - Channel list with status badges (Enabled/Disabled/Maintenance)
  - Expandable configuration cards per channel
  - Email: SMTP server, port, SSL toggle, sender details
  - SMS: Provider (Twilio/AWS SNS), credentials, demo mode
  - Teams: Webhook URL, demo mode
  - Save updates config in real-time

- **GroupManagement + GroupList + GroupEditor**
  - **GroupList** (`GroupList.tsx`, 240+ lines): Stats cards, search, table with member counts, channel badges
  - **GroupEditor** (`GroupEditor.tsx`, 410+ lines): Basic info, member management with per-member channel toggles (Email/SMS/Teams)
  - User dropdown from profiles table, Add/Remove members, Validation: requires name + 1 member

- **RuleManagement + RuleList + RuleBuilder**
  - **RuleList** (`RuleList.tsx`, 290+ lines): Stats cards, filter tabs (All/Active/Inactive), table with conditions count
  - **RuleBuilder** (`RuleBuilder.tsx`, 550+ lines):
    - Condition builder with 9 field types (event_type, severity, magnitude, duration, customer_count, region, voltage_level, status, substation_code)
    - 9 operators (equals, not_equals, greater_than, less_than, greater_or_equal, less_or_equal, in, not_in, contains)
    - AND logic between conditions, Dynamic value inputs based on field type
    - Template selection (approved only), Channel + Group multi-select
    - PQ-specific: Typhoon mode, Mother event only, Include waveform checkboxes

**Component Integration Pattern:**
- Management container manages state → List displays data → Editor/Builder handles CRUD
- All use `notificationService.ts` for backend calls, Fully typed with TypeScript

##### Day 5: Notification Logs & Final Integration (Pending)
**Planned Features:**
- NotificationLogs UI component, System Config UI (typhoon mode toggle)
- Integration with event creation workflow, End-to-end testing

**Known Limitations:**
- Rejection workflow shows "coming soon" alert
- Rich text editor not implemented (plain textarea)
- No markdown preview rendering, No image upload support
- Template versioning UI not displayed (backend supports it)

---

#### Data Maintenance Module (Jan 7, 2026)
**Features Added:**
- **Weighting Factors Management**
  - Customer count tracking for SARFI weight calculations
  - Formula: `weight_factor = customer_count / SUM(all_customer_counts)`
  - Inline editing with auto-recalculation
  - CSV import/export with validation
  - Component: `WeightingFactors.tsx` (757 lines)
  - Database: Added `customer_count` column to `sarfi_profile_weights`

- **PQ Benchmarking Standard**
  - International standards management (IEC 61000-4-34, SEMI F47, ITIC)
  - Sortable threshold table (voltage %, duration s)
  - Inline editing with validation (0-100%, 0-1s, unique per standard)
  - CSV import/export with template download
  - Component: `PQBenchmarking.tsx` (860+ lines)
  - Service: `benchmarkingService.ts` (11 functions)
  - Database: 2 new tables with 14 seeded thresholds

**Navigation:** Added 2 menu items (Scale icon, Target icon) in Data Maintenance section

#### Meter Hierarchy Enhancements (Jan 6, 2026)
**Features Added:**
1. **Active to Enable Migration**
   - Purpose: Rename `active` field to `enable` to distinguish system enablement from operational status
   - Database: Migration `20260106000000_rename_active_to_enable.sql`
   - Field Semantics:
     - `enable` (boolean): System-level flag (default: true)
     - `status` (enum): Operational state ('active' | 'abnormal' | 'inactive')
   - KPI Calculation: Filter `enable = true` before counting by status
   - UI Updates: Enable filter, toggle button, checkbox in forms

2. **Tree View in Asset Management**
   - Added "Tree View" button to Meter Inventory header
   - Visualizes meter hierarchical relationships (SS400 → SS132 → SS011)
   - Shared TreeViewModal component between Asset Management and Meter Hierarchy
   - Button styled in purple to match MeterHierarchy design

3. **Column Header Updates**
   - Changed "Remarks" to "Location" in MeterHierarchy table
   - Matches actual data source (`meter.location`)

4. **Substation Dropdown Fix**
   - Fixed query filter from `active = true` to `status = 'operational'`
   - Loads operational substations correctly in Add/Edit Meter forms

5. **Area/Region Backfill**
   - Script: `backfill-meter-area-region.sql`
   - Updates NULL `area` values: YUE, LME, TSE, TPE, CPK
   - Updates NULL `region` values: WE, NR, CN
   - Random assignment for existing data (real data from actual assignments)

#### Meter Hierarchy Fix (Jan 9, 2026)
**Issue Fixed:** Incorrect transformer code hierarchy causing orphan meters in tree view

**Root Cause:**
- 380V meters appearing at root level due to missing SS011 codes
- 132kV meters incorrectly configured with SS400 (should only have SS132)

**Correct Hierarchy Structure:**
```
400kV → SS400 only (standalone, no children)
  
132kV → SS132 only (root of SS132 groups)
  ├── 11kV → SS132 + SS011 (child matched by SS132)
  │   └── 380V → SS011 only (grandchild matched by SS011)
```

**Transformer Code Rules:**
| Voltage Level | SS400 | SS132 | SS011 | Notes |
|---------------|-------|-------|-------|-------|
| 400kV | {area}400 | NULL | NULL | Standalone meters |
| 132kV | NULL | {area}132 | NULL | Root of hierarchy groups |
| 11kV | NULL | {area}132 | {area}011 | Grouped under 132kV by SS132 |
| 380V | NULL | NULL | {area}011 | Nested under 11kV by SS011 |

**Example:** CPK area
- 400kV: ss400='CPK400' (standalone)
- 132kV: ss132='CPK132' (root)
- 11kV: ss132='CPK132', ss011='CPK011' (child of CPK132)
- 380V: ss011='CPK011' (grandchild via CPK011)

**Database Changes:**
- Script: `scripts/backfill-meter-hierarchy.sql`
  - Extracts area from meter_id for missing values
  - Updates transformer codes based on voltage level
  - Creates backup table: `pq_meters_backup_hierarchy_20260109`

#### PQ Benchmarking RLS Policies (Jan 12, 2026)
**Issue:** PQ Benchmarking Standards page showing "count: 0" despite data existing in Supabase. Root cause: Row Level Security enabled but no policies defined for `pq_benchmark_standards` and `pq_benchmark_thresholds` tables.

**Solution:** Created comprehensive RLS policies for role-based access control

**Database Changes:**
- Migration: `supabase/migrations/20260112000002_add_pq_benchmark_rls_policies.sql`
- Policies Created:
  - **SELECT**: All authenticated users can view standards/thresholds
  - **INSERT/UPDATE**: Admins and operators can modify records
  - **DELETE**: Admin-only privilege
- User Roles: `admin`, `operator`, `viewer` (verified from database enum)
- Tables Affected: `pq_benchmark_standards`, `pq_benchmark_thresholds`

**TypeScript Fixes:**
- Fixed 11 compilation errors across 10 files due to schema changes
- Updated property access patterns: `event.circuit_id` → `event.meter?.circuit_id`
- Added meter joins to queries in EventDetails, EventTreeView, AssetManagement
- Cleaned up unused imports across PQServices, exportService, LoginPage

**Verification:**
- Console logging added to benchmarkingService.ts and PQBenchmarking.tsx
- Confirmed 3 standards visible: IEC 61000-4-34, SEMI F47, ITIC
- All CRUD operations working correctly with proper role-based permissions

#### Harmonic Events - 380V Meter Support (Jan 12, 2026)
**Issue:** Harmonic events table only supported 400kV/132kV/11kV meters with I1/I2/I3 current measurements. 380V meters require different measurement columns.

**Solution:** Extended `harmonic_events` table with voltage-level-specific columns

**Database Schema Extension:**
- Migration: `supabase/migrations/20260112000000_add_380v_harmonic_columns.sql`
- Added 30 new columns for 380V meters:
  - `description` (TEXT): Event description
  - `tdd_limit` (NUMERIC): TDD compliance limit
  - `non_compliance` (NUMERIC): Non-compliance percentage
  - Voltage: `voltage_va`, `voltage_vb`, `voltage_vc`
  - Current: `current_ia`, `current_ib`, `current_ic`, `il_max`
  - THD Voltage: `thd_voltage_a/b/c`
  - THD Odd Current: `thd_odd_current_a/b/c`
  - THD Even: `thd_even_a/b/c`
  - THD Current: `thd_current_a/b/c`
  - TDD Odd Current: `tdd_odd_current_a/b/c`
  - TDD Even Current: `tdd_even_current_a/b/c`
  - TDD Current: `tdd_current_a/b/c`

**Data Validation Constraint:**
- Trigger function: `validate_harmonic_columns()`
- Enforces voltage-level-specific column usage:
  - 380V meters: ONLY new 30 columns (not I1/I2/I3)
  - 400kV/132kV/11kV meters: ONLY I1/I2/I3 columns (not 380V fields)
- Queries `pq_meters.voltage_level` via `pq_events` join
- Raises exception if wrong columns populated

**TypeScript Interface:**
- File: `src/types/database.ts`
- Extended `HarmonicEvent` interface with 30 optional fields
- All new fields are nullable (`number | null` or `string | null`)

**Backfill Script Updates:**
- File: `scripts/backfill-harmonic-events.sql`
- Now handles both voltage level types:
  1. 400kV/132kV/11kV: INSERT with I1/I2/I3 columns
  2. 380V: INSERT with 30 new columns
- Generates realistic sample data:
  - 380V voltage: 380V ± 10V
  - Current: 100-300A typical range
  - THD values: 1-10% based on event magnitude
  - TDD limits: 8-10%

**UI Changes:**
- File: `src/components/EventManagement/EventDetails.tsx`
- Harmonic Information card now conditionally renders:
  - If `meter.voltage_level === '380V'`: Show 30 fields in 2-column grid with 9 groups
  - Else: Show original I1/I2/I3 display (4 groups)
- 380V Display Groups:
  1. Voltage (V) - Va, Vb, Vc
  2. Current (IL)(A) - Ia, Ib, Ic, IL Max
  3. THD (Voltage)(%) - Phase A/B/C
  4. THD odd (Current) - Phase A/B/C
  5. THD even - Phase A/B/C
  6. THD (Current)(%) - Phase A/B/C
  7. TDD Odd (Current) - Phase A/B/C
  8. TDD even (Current) - Phase A/B/C
  9. TDD (Current)(%) - Phase A/B/C
  10. Compliance - TDD Limit, Non-Compliance

**Data Flow:**
1. User views harmonic event in EventDetails
2. Query fetches `pq_events` → `pq_meters` (voltage_level) → `harmonic_events`
3. UI checks `currentEvent.meter.voltage_level`
4. Conditionally renders 380V fields OR I1/I2/I3 fields
5. All fields have null checks before calling `.toFixed()`
  - Verification queries included

- Script: `scripts/check-meter-hierarchy.sql`
  - Diagnostic queries for missing/incorrect codes
  - Hierarchy violation detection
  - Summary statistics

**Code Changes:**
- Service: `src/services/meterHierarchyService.ts`
  - Updated `checkMeterHierarchy()` validation rules
  - Changed tree building logic: group by SS132, not SS400
  - Added `hasIncompleteHierarchy` flag to `MeterTreeNode`
  - Orphan meters displayed in separate warning section

**UI Improvements:**
- Orphan section at bottom with ⚠️ warning icon
- Shows meters needing transformer codes
- Visual indicators for incomplete hierarchy
- Proper voltage level ordering within SS132 groups

**Validation:**
- Prevents circular references in transformer codes
- Enforces hierarchical requirements (e.g., SS011 requires SS132)
- Auto-population helper: `autoPopulateFromMeterName()`

**Documentation:**
- Guide: `scripts/METER_HIERARCHY_FIX_GUIDE.md`
- Includes 6-phase execution plan (30 minutes)
- Rollback procedure if needed
- Troubleshooting tips

---

### December 2025

#### Report Builder (Dec 2025 - Jan 2026)
**Features:**
- **Pivot Tables:** Interactive drag-and-drop interface powered by react-pivottable
- **10 Chart Types:** Table, Bar, Line, Pie, Scatter, Area, Heatmap, Box Plot, Stacked Bar, Stacked Area
- **20+ Aggregations:** Count, Sum, Average, Median, Min, Max, etc.
- **Calculated Fields:** Custom expressions (e.g., `Duration Hours = [duration_ms] / 3600000`)
- **Smart Filters:** 13 date presets, event type, severity, false events toggle
- **Auto-Refresh:** 1, 5, 15, 30, 60-minute intervals with manual refresh
- **Save & Share:** Save reports with name/description, share with specific users
- **Export:** Excel (XLSX) with formatting, PDF with headers
- **Database:** `saved_reports` table with RLS policies
- **Installation:** Automated setup scripts (Windows .bat, Mac/Linux .sh)
- **Dependencies:** react-pivottable, plotly.js, react-plotly.js, xlsx, jspdf, jspdf-autotable

#### Customer Transformer Matching (Dec 15, 2025)
- Auto customer impact generation via PostgreSQL trigger
- Substation-circuit-customer relationship mapping
- 25 real CLP substations (APA through CYS)
- Circuit format: H1/H2/H3 (transformer numbers)
- Severity mapping: critical→severe, high→moderate, medium/low→minor

#### Root Cause Analysis Restoration (Dec 11, 2025)
**Implementation Summary:**
- Restored Root Cause chart to Dashboard with independent filtering
- **Chart Features:**
  - Shows top 10 causes by event count
  - Includes all events (mother + child) but excludes false events
  - Horizontal bar chart with gradient colors
  - Percentage and count display per cause
  - Analysis summary showing most common cause

- **Filter Management:**
  - Date range picker (start/end date)
  - Profile system with create/load/delete/set default
  - Profiles stored in localStorage as `rootCauseProfiles`
  - Filter persistence: `rootCauseFilters` key

- **UI Components:**
  - `RootCauseChart.tsx` - Main chart with filtering
  - `RootCauseConfigModal.tsx` - Configuration modal
  - Export as PNG image via html2canvas
  - Settings icon button for config modal

- **Data Logic:**
  - Uses `cause` field (migrated from `root_cause`)
  - Filter: `false_event !== true AND timestamp IN range`
  - Sort: Descending by count, take top 10
  - Empty state when no events match filters

- **Layout:** Half-width (50/50 with InsightChart on xl screens, stacked on smaller)

#### Asset Management Event History (Dec 23, 2025)
- **Purpose:** View and filter all PQ events for a specific meter
- **Implementation:** Tabbed modal interface in Asset Management
  - Tab 1: Meter Information (existing)
  - Tab 2: Event History (new)
- **Features:**
  - 20 events per page with pagination
  - Compact filters (quick date, event type, status)
  - Summary statistics (total events, top 3 types)
  - Row highlighting on click
  - Performance index on `pq_events.meter_id`
- **UI Pattern:** STYLES_GUIDE.md Pattern 1 (compact design)
- **Database:** Migration `20251223000001_add_meter_id_index.sql`

#### Meter Availability Report (Dec 19, 2025)
- Communication monitoring dashboard
- Mock data generation (hourly records for 30 days)
- Time range presets: 24h, 7d, 30d, custom
- Availability calculation: (count / expected) * 100%
- Color-coded: ≥90% green, 50-89% orange, <50% red
- Sortable table with filters (site ID, status, region)

#### IDR Tab (Dec 12, 2025)
- Comprehensive Incident Data Record management
- 24+ fields including fault type, weather, responsible OC
- Responsive 2-column grid layout
- Integration with event management

---

### November 2025

#### SARFI Profiles & Weights
- Weight factor management for SARFI calculations
- Meter assignment to profiles
- Profile-based SARFI index computation
- Database: `sarfi_profiles`, `sarfi_profile_weights` tables

#### Mother Event Grouping
- Automatic grouping: 10-minute window, same substation
- Tree view display (mother events with children)
- Manual grouping/ungrouping capabilities
- Database: Added `is_mother_event`, `parent_event_id`, `grouping_type` columns

#### False Event Detection
- Configurable detection rules (5 types)
- Short duration spikes, duplicates, meter malfunction
- Detection analytics dashboard
- Database: Added `false_event` boolean column

---

## Core Functional Modules

### 1. Dashboard Module

**Purpose**: Centralized view of system health, recent events, and key metrics

#### Components
- **StatsCards**: Real-time statistics (total events, critical events, active substations)
- **SubstationMap**: Geographic bubble chart with Hong Kong map background
- **SARFIChart**: SARFI-70/80/90 trends with optional data table
- **RootCauseChart**: Bar chart showing top 10 event causes
- **InsightChart**: Voltage dip trends and substation analysis
- **SARFI70Monitor**: KPI monitoring with 3-year comparison
- **ReportBuilder**: Interactive pivot tables and custom reports (NEW - Dec 2025)
- **EventList**: Recent events with quick filters

#### Key Features
1. **Substation Map**
   - **Geographic Projection**: Linear interpolation for Hong Kong coordinates (22.15-22.58°N, 113.83-114.41°E)
   - **Bubble Visualization**: Circle size represents incident count (0 incidents = no bubble)
   - **Date Filtering**: Independent filter with profile management
   - **Export Function**: Single-click export of map image + data table (Excel/CSV/PDF)
   - **Layout**: 60/40 split (map on left, event table on right)
   
2. **SARFI Chart**
   - **Full-width Layout**: Independent dashboard component
   - **Metrics**: SARFI-70, SARFI-80, SARFI-90 monthly trends
   - **Data Table**: Toggle-controlled, appears below chart when enabled
   - **Profile Management**: Save voltage level and event filters
   - **Calculation**: Weighted averages by meter weight factors

3. **Root Cause Chart**
   - **Half-width Layout**: Side-by-side with InsightChart
   - **Data Source**: Uses `cause` field (migrated from `root_cause`)
   - **Filtering**: Independent date range, excludes false events
   - **Display**: Top 10 causes with horizontal bars and percentage
   - **Export**: PNG image export via html2canvas

4. **Insight Chart**
   - **Half-width Layout**: Companion to RootCauseChart
   - **Upper Chart**: Monthly voltage dip trends (3-year comparison)
   - **Lower Chart**: Substations with >10 voltage_dip events
   - **Color Scheme**: Yellow (2023), Blue (2024), Dark Blue (2025)
   - **Export**: PNG image export

5. **SARFI-70 KPI Monitoring**
   - **Full-width Layout**: Independent dashboard below EventList
   - **Line Chart**: Three overlapping lines (2023/2024/2025) on unified 12-month X-axis
   - **Y-axis**: Unified scale (0 to max across all years)
   - **Data Source**: Aggregates `sarfi_70` values from voltage_dip mother events by month
   - **Interactive**: Click any data point to view that month's events in table below
   - **Export Options**: 
     - PNG image (entire dashboard)
     - Excel (chart captured as image at top + selected month's event data table below)
   - **Table Features**:
     - Columns: Sequence, S/S, Voltage Level, Incident Timestamp, OC, SARFI-70
     - Sortable by any column (default: timestamp descending)
     - Pagination (10 events per page)
     - NULL sarfi_70 values display as 0.0000
   - **Purpose**: Show improvement/degradation trends, seasonal patterns (higher Jul-Dec)

#### Data Flow
```typescript
Dashboard.tsx
  ├─> loadDashboardData()
  │     ├─> Fetch pq_events (limit 5000, from 2023-01-01)
  │     ├─> Fetch substations
  │     └─> Fetch sarfi_metrics (last 12 months)
  ├─> StatsCards (events, substations)
  ├─> SubstationMap (substations, events)
  │     └─> MapConfigModal (filters, profiles)
  ├─> SARFIChart (sarfiMetrics)
  ├─> RootCauseChart (events) - Half width
  ├─> InsightChart (events) - Half width
  ├─> EventList (events, substations) - Full width
  └─> SARFI70Monitor (events, substations) - Full width
  │     ├─> SARFIConfigModal (filters, profiles)
  │     └─> SARFIDataTable (conditional)
  └─> RootCauseChart (events)
        └─> RootCauseConfigModal (filters, profiles)
```

#### Design Patterns
- **Independent Filters**: Each chart maintains its own filter state in localStorage
- **Profile Storage**: JSON objects stored with keys: `{componentName}Filters`, `{componentName}Profiles`
- **False Event Exclusion**: All analytics filter out events where `false_event = true`

---

### 2. Event Management Module

**Purpose**: Comprehensive event tracking, analysis, and mother event grouping

#### Sub-Modules
1. **Event Analysis Tab**
   - Tree view (mother events with children)
   - List view (flat event listing)
   - Advanced filtering with 15+ filter criteria
   - Multi-select mode for manual grouping
   - Export to Excel/CSV/PDF

2. **False Event Detection Tab**
   - Configurable detection rules
   - Pattern-based analysis
   - Bulk flagging and unflagging
   - Detection analytics and statistics

3. **Detection Analytics Tab**
   - False event statistics
   - Detection accuracy metrics
   - Rule effectiveness analysis

4. **IDR (Incident Data Record) Tab** ✨ NEW (Dec 12, 2025)
   - Comprehensive incident data management with 24+ fields
   - 5 grouped card sections: Basic Info, Location & Equipment, Fault Details, Cause Analysis, Environment & Operations
   - Edit/Save/Cancel workflow for data modification
   - Manual/Auto badge indicator (shows manual_create_idr status)
   - Voltage phase display with affected indicators (Phase A/B/C with V1/V2/V3 values)
   - Read-only fields: Timestamp, Region (from substation)
   - Integration with substation data for automatic region lookup
   - Responsive 2-column grid layout (1 column on mobile)

5. **Event Details Tabs** ✨ UPDATED (Jan 28, 2026)
   - **Overview Tab**: Structured 4-card layout (AC1-AC4)
     - AC1: Core Event Data (timestamp DD/MM/YYYY HH:mm:ss, voltage level, substation, transformer/ring number)
     - AC2: Magnitude & Duration (VL1/VL2/VL3 large displays, auto-formatted duration)
     - AC3: Binary Indicators (Min Volt <70%, False Alarm with checkmark/X icons)
     - AC4: Classification & Workflow (event type, severity badges, status mapping)
   - **Technical Tab**: Technical specifications + SARFI analysis + **Waveform Viewer** ⚡ NEW
     - Remaining voltage progress bar with color coding
     - SARFI indices (S10-S90) for voltage dip/swell events (hidden for harmonic)
     - **Interactive Waveform Visualization**:
       - Combined view: All 3 phases (Red V1, Green V2, Blue V3) in single chart
       - Individual views: Separate V1/V2/V3 charts with phase-specific colors
       - Mouse hover tooltips with exact voltage values at each timestamp
       - Mouse wheel zoom (50%-200%) with zoom controls and reset button
       - Statistics display: Min/Max/RMS values for each phase
       - Performance: Downsampling 3586 rows → ~1000 points for smooth rendering
       - CSV format: Timestamp, V1, V2, V3 (stored in `pq_events.waveform_csv`)
   - **Customer Impact Tab**: Impact summary cards + affected customers table
   - **PQ Services Tab**: Service records list (site surveys, consultations, etc.)
   - **Child Events Tab**: Nested child events if mother event (tree structure)
   - **Timeline Tab**: Event lifecycle timeline with status changes
   - **IDR Tab**: Comprehensive incident data record management

#### Key Features

##### Mother Event Grouping
**Logic**: Events occurring within 10 minutes at the same substation are grouped as related

```typescript
// Automatic Grouping Criteria
- Same substation_id
- Timestamp within 10 minutes of first event
- Same event_type (optional)
- Similar severity level (optional)

// Data Structure
{
  is_mother_event: true,      // First event in group
  parent_event_id: null,      // No parent
  is_child_event: false,
  grouping_type: 'automatic'  // or 'manual'
}

// Child Events
{
  is_mother_event: false,
  parent_event_id: '<mother_id>',
  is_child_event: true,
  grouping_type: 'automatic'
}
```

##### Advanced Filtering System
**Filter Profiles**: Saveable filter configurations with CRUD operations

**Filter Categories**:
1. **Temporal**: Start/end date, time range
2. **Event Type**: voltage_dip, voltage_swell, harmonic, interruption, transient, flicker
3. **Severity**: critical, high, medium, low
4. **Status**: new, acknowledged, investigating, resolved
5. **Location**: Voltage levels (400kV, 132kV, 11kV, 380V), circuit IDs, meter IDs
6. **Magnitude**: Duration range (ms), customer count, remaining voltage (%)
7. **Flags**: Show only mother events, show only unvalidated, hide false events

**Implementation**:
```typescript
interface EventFilter {
  startDate: string;
  endDate: string;
  eventTypes: EventType[];
  severityLevels: SeverityLevel[];
  statusOptions: EventStatus[];
  voltageLevels: string[];
  meterIds: string[];
  minDuration: number;
  maxDuration: number;
  minCustomers: number;
  maxCustomers: number;
  minRemainingVoltage: number;
  maxRemainingVoltage: number;
  circuitIds: string[];
  showOnlyUnvalidated: boolean;
  showOnlyMotherEvents: boolean;
  hideFalseEvents: boolean;
}
```

##### False Event Detection
**Purpose**: Identify and flag events that may be measurement anomalies or equipment issues

**Detection Rules**:
1. **Short Duration Spikes**: < 100ms with full voltage recovery
2. **Duplicate Events**: Same meter, similar timestamp and magnitude
3. **Meter Malfunction**: Abnormal meter status + unusual readings
4. **Weather Correlation**: Non-weather events during typhoon (low confidence)
5. **Magnitude Anomaly**: Remaining voltage > 95% for "dip" events

**Detection Process**:
```typescript
// Apply detection rules to events
const results = falseEventDetector.analyzeEvents(events, rules);

// Flag events in database
UPDATE pq_events 
SET false_event = true 
WHERE id IN (detected_event_ids);

// Store detection metadata
- reason: string (rule that triggered)
- confidence: 'high' | 'medium' | 'low'
- detected_at: timestamp
```

##### Event Export Function
**Formats**: Excel (.xlsx), CSV (.csv), PDF (.pdf)

**Export Data Structure**:
```typescript
{
  Event ID,
  Timestamp,
  Event Type,
  Substation,
  Circuit ID,
  Voltage Level,
  Severity,
  Status,
  Duration (ms),
  Magnitude (%),
  Remaining Voltage (%),
  Customer Count,
  Cause,
  Is Mother Event,
  Validated by ADMS,
  False Event,
  Notes
}
```

---

### 3. Data Analytics Module

**Purpose**: Comprehensive power quality analysis and compliance tracking

#### Key Features

##### Compliance Monitoring
1. **IEEE 519 Compliance**
   - Voltage THD limits by voltage level
   - Current THD limits by ISC/IL ratio
   - Individual harmonic magnitude limits
   - Compliance percentage tracking

2. **EN50160 Compliance**
   - Voltage magnitude (Un ± 10%)
   - Voltage dips (residual voltage and duration)
   - Voltage swells (< 15 minutes duration)
   - Flicker severity (Pst < 1.0, Plt < 0.65)
   - Harmonic distortion (THD < 8%)

3. **IEC61000 Standards**
   - Voltage quality indices
   - Immunity testing levels
   - Compatibility levels for harmonics

##### Analytics Dashboards
1. **Event Statistics**
   - Events by type (pie chart)
   - Events by severity (bar chart)
   - Hourly distribution (24-hour histogram)
   - Monthly trends (line chart)
   - Substation heatmap

2. **Power Quality Metrics**
   - SARFI indices (70, 80, 90)
   - Voltage dip frequency
   - Harmonic distortion levels
   - Interruption duration statistics
   - Customer impact metrics (total minutes lost)

3. **Substation Performance**
   - Event count by substation
   - Average event severity
   - MTBF (Mean Time Between Failures)
   - Customer impact ranking
   - Geographic distribution

---

### 4. Asset Management Module

**Purpose**: Monitor PQ meters and substations

#### Key Features

##### PQ Meter Management
- **Meter Status Tracking**: active, abnormal, inactive
- **Communication Monitoring**: Last communication timestamp
- **Firmware Tracking**: Version history and updates
- **Installation Records**: Installation date, location, substation
- **Maintenance Logs**: Service records and calibration

##### Meter Data Structure (Enhanced Dec 10, 2025)
```typescript
interface PQMeter {
  id: string;
  meter_id: string;        // Unique meter identifier (e.g., PQM-TPGS-01)
  substation_id: string;
  location: string;
  status: 'active' | 'abnormal' | 'inactive';
  last_communication: string | null;
  firmware_version: string | null;
  installed_date: string | null;
  meter_type: string;      // Brand/model
  voltage_level: string;
  
  // NEW: Meter Inventory Fields (Migration 20251210000001)
  site_id?: string;            // Site identifier
  circuit_id?: string;         // Circuit reference
  region?: string;             // Geographic region
  oc?: string;                 // Operating center
  brand?: string;              // Meter manufacturer
  model?: string;              // Meter model number
  nominal_voltage?: number;    // Nominal voltage rating
  ct_type?: string;            // Current transformer type
  asset_number?: string;       // Asset tracking number
  serial_number?: string;      // Serial number
  ip_address?: string;         // Network IP address
  framework_version?: string;  // Framework version
  active?: boolean;            // Active status flag
  
  substation?: Substation;
}
```

##### Meter Management UI (Enhanced)
- **12-Column Table Display**: Name, Site ID, Volt Level, Substation, Circuit, Location, OC, Brand, Model, Nominal, Active, Other
- **Compact Layout**: py-2 px-2 padding for efficient space usage
- **Active Status Icons**: ✓ (active) / ✗ (inactive) visual indicators
- **Column Sorting**: Click column headers to sort ascending/descending with visual indicators (ArrowUp/ArrowDown/ArrowUpDown icons)
- **Detail Modal**: "Other" column button opens modal with 4 grouped sections displaying all 23 meter fields
- **Modal Sections**: Basic Info, Location & Network, Equipment Specs, Asset Tracking
- **Export Functionality**: Excel/CSV export with all fields included

##### Substation Management
- **Geographic Information**: Latitude, longitude, region
- **Voltage Level**: 400kV, 132kV, 11kV, 380V
- **Status Monitoring**: operational, maintenance, offline
- **Associated Assets**: Linked meters and transformers
- **Event History**: All events at substation

##### Asset Health Monitoring
- **Communication Status**: Real-time connection status
- **Data Quality**: Completeness and accuracy metrics
- **Abnormality Detection**: Missing data, unusual patterns
- **Alert Generation**: Notifications for meter issues

##### Meter Availability Report ✨ NEW (Dec 19, 2025)

**Purpose**: Monitor meter communication performance and uptime trends

**Access**: "Availability Report" button above KPI cards (Active/Abnormal/Inactive meters)

**Mock Data Generation** (Placeholder for PQMS/CPDIS Integration):
- Generates hourly communication records for past 30 days
- Simulates realistic availability patterns:
  - **Active meters**: 95-100% availability (miss ~2-5% randomly)
  - **Abnormal meters**: 50-90% availability  
  - **Inactive meters**: 0-30% availability
- Data stored in component state during session
- Ready for replacement with actual PQMS/CPDIS data

**Time Range Configuration**:
- **Preset Options**: Last 24 Hours (default), Last 7 Days, Last 30 Days
- **Custom Range**: DateTime picker for specific start/end times
- Visual button selector with active state highlighting
- Only affects report modal (main KPI cards show current status)

**Availability Calculation**:
```typescript
// Count communications within time range
count = communications.filter(date => date >= startDate && date <= endDate).length

// Calculate expected count (1 per hour)
expectedCount = Math.floor((endDate - startDate) / (1000 * 60 * 60))

// Calculate availability percentage
availability = (count / expectedCount) * 100
```

**Report Modal Features**:

1. **Summary Statistics**:
   - Time Range display (formatted: DD/MM/YYYY HH:MM)
   - Total Meters count
   - Active Meters count (availability ≥90%)
   - Total Availability percentage (average across all meters)

2. **Filter Controls**:
   - Text search (Site ID, Meter ID)
   - Substation multi-select dropdown
   - Status filter (All/Active/Abnormal/Inactive)
   - Clear Filters button with active count badge

3. **Data Table** (7 columns, all sortable):
   - Site ID
   - Meter ID (primary identifier)
   - Substation (resolved from substation_id)
   - Status (color-coded badge: green/orange/red)
   - Count (communication records received)
   - Expected (calculated from time range)
   - Availability % (color-coded: ≥90% green, 50-89% orange, <50% red)

4. **Pagination**: 20 items per page with Previous/Next controls

5. **Empty State**: Helpful message when no data matches filters

**UI Design**:
- Full-width modal (max-w-7xl) with sticky header/footer
- Gradient header (blue-600 to indigo-600)
- Responsive layout with proper overflow handling
- Follows STYLES_GUIDE.md patterns for sorting and badges

**Integration Notes**:
- Replace `communicationData` state with API calls to PQMS/CPDIS
- Expected API: GET /meter-communications?meterId={id}&startDate={}&endDate={}
- Response format: Array of timestamp strings
- Maintain same calculation logic for consistency

---

### 5. Reporting Module

**Purpose**: Generate compliance and performance reports

#### Interactive Report Builder ✨ NEW (December 2025)

**Location**: Dashboard → Report Builder Widget

**Purpose**: Self-service analytics with drag-and-drop pivot tables and dynamic visualizations

**Key Features**:
1. **Pivot Table Interface**
   - Powered by react-pivottable with Plotly charts
   - Drag-and-drop field selection (rows, columns, values)
   - Real-time aggregation (sum, count, average, min, max)
   - Multiple chart types: bar, line, scatter, heatmap, pie

2. **Data Filtering**
   - Date range presets (today, last 7/30/90 days, this month/quarter/year, custom)
   - Event type filter (voltage_dip, voltage_swell, harmonic, etc.)
   - Severity filter (critical, high, medium, low)
   - False event exclusion toggle

3. **Calculated Fields**
   - Custom expressions using [Field Name] syntax
   - Examples:
     - `[duration_ms] / 1000` → duration in seconds
     - `[v1] + [v2] + [v3]` → total voltage
     - `[customer_count] * [duration_ms] / 60000` → customer-minutes
   - Field type selection: text, number, date
   - Live expression validation

4. **Save & Share**
   - Save reports with name and description
   - Share with specific users (search by name/email/department)
   - Optional notification message
   - View shared reports from other users

5. **Export Options**
   - Excel (.xlsx) - preserves pivot table structure
   - CSV (.csv) - flattened data
   - PDF (.pdf) - rendered chart and table

6. **Auto-Refresh**
   - Configurable refresh interval (30s, 1min, 5min, 15min, 30min, 1hr)
   - Disabled by default, enabled via toggle
   - Visual countdown timer when active

**Data Structure**:
```typescript
interface SavedReport {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: ReportConfig;  // JSON: filters, pivot config, calculated fields
  is_shared: boolean;
  shared_with: string[];  // User IDs
  created_at: string;
  updated_at: string;
}

interface ReportConfig {
  filters: {
    dateRange: DateFilterPreset | 'custom';
    startDate?: string;
    endDate?: string;
    eventTypes: EventType[];
    severityLevels: SeverityLevel[];
    excludeFalseEvents: boolean;
  };
  pivotConfig: {
    rows: string[];
    cols: string[];
    vals: string[];
    aggregatorName: string;  // "Count", "Sum", "Average", etc.
    rendererName: string;    // "Table", "Bar Chart", "Line Chart", etc.
  };
  calculatedFields: CalculatedField[];
  refreshInterval?: number;  // milliseconds
}
```

**Database Table**: `saved_reports` (migration: `20250101000000_create_saved_reports.sql`)

**Component Files**:
- `src/components/Dashboard/ReportBuilder/ReportBuilder.tsx` (main component)
- `src/components/Dashboard/ReportBuilder/CalculatedFieldEditor.tsx` (field editor modal)
- `src/components/Dashboard/ReportBuilder/ShareReportModal.tsx` (sharing UI)
- `src/types/report.ts` (type definitions)

**Integration**:
- Added to Dashboard as new widget type: `'report-builder'`

---

#### Reporting Tools ✨ UPDATED (January 2026)

**Location**: Navigation → Reports

**Purpose**: Centralized entry point for reporting tools and report configuration.

**Scope**:
- PQ Summary report filter configuration (11 event types)
- Advanced filters are shown only when Event Type = **Voltage** (Voltage Level, Incident Time, Region, Duration)

**Component File**:
- `src/components/Reports.tsx`

---

### 6. Data Maintenance Module

**Purpose**: Master data management for SARFI profiles and PQ benchmarking standards

#### Sub-Modules

##### 6.1 Weighting Factors (SARFI Profile Weights)

**Location**: Navigation → Data Maintenance → Weighting Factors

**Purpose**: Manage customer count and weight factors for SARFI calculations across PQ meter profiles

**Key Features**:
1. **Profile Management**
   - Select from existing SARFI profiles
   - View all meters in selected profile
   - Display meter details: ID, location, substation, circuit

2. **Customer Count Management**
   - Inline editing with Save/Cancel buttons
   - Add meter to profile with search functionality
   - Remove meter from profile
   - Customer count validation (integer >= 0)

3. **Auto-calculation**
   - Weight factor = customer_count / SUM(all_customer_counts)
   - Automatic recalculation on any customer count change
   - Real-time display of weight factor (5 decimal places)

4. **Import/Export**
   - **CSV Import**: meter_id, customer_count columns
   - **Template Download**: Pre-formatted CSV with instructions
   - **Excel Export**: Full profile data with metadata
   - **CSV Export**: Data-only format
   - Row-by-row validation with error reporting

**Data Structure**:
```typescript
interface SARFIProfileWeight {
  id: string;
  profile_id: string;
  meter_id: string;
  weight_factor: number;
  customer_count: number;  // NEW - Jan 2026
  created_at: string;
  updated_at: string;
}
```

**Business Logic**:
- Meter can only belong to one profile at a time
- Total of all weight factors in profile must equal 1.0
- Removing meter triggers recalculation for remaining meters
- Import validates meter_id exists before insertion

**Component**: `src/pages/DataMaintenance/WeightingFactors.tsx`  
**Service**: `src/services/sarfiService.ts`  
**Database**: `sarfi_profile_weights` table with `customer_count` column

---

##### 6.2 PQ Benchmarking Standard

**Location**: Navigation → Data Maintenance → PQ Standard

**Purpose**: Manage international PQ compliance benchmarking standards and their voltage/duration thresholds

**Key Features**:
1. **Standard Management**
   - Create/Edit/Delete benchmarking standards
   - Standard fields: name, description, is_active
   - Pre-seeded with IEC 61000-4-34, SEMI F47, ITIC

2. **Threshold Management**
   - Sortable table (click column headers to toggle asc/desc)
   - Default sort: Duration (s) ascending
   - Inline editing with Save/Cancel buttons
   - Add threshold modal with validation
   - Delete threshold with confirmation

3. **Data Validation**
   - Min. Voltage: 0-100% (3 decimal places)
   - Duration: 0-1 seconds (3 decimal places)
   - Unique constraint per standard (no duplicate voltage+duration pairs)
   - Numeric input validation with range checking

4. **Import/Export**
   - **CSV Import**: min_voltage, duration columns
   - **Template Download**: Standard-specific template with instructions
   - **Excel Export**: Full standard report with metadata
   - **CSV Export**: Threshold data only
   - Row-by-row validation with detailed error reporting

**Data Structure**:
```typescript
interface PQBenchmarkStandard {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface PQBenchmarkThreshold {
  id: string;
  standard_id: string;
  min_voltage: number;  // 0-100%
  duration: number;     // 0-1 seconds
  sort_order: number;
  created_at: string;
  updated_at: string;
}
```

**International Standards**:
1. **IEC 61000-4-34** (4 thresholds)
   - Voltage dip immunity testing for equipment
   - 100%/0.02s, 40%/0.2s, 70%/0.5s, 80%/1s

2. **SEMI F47** (5 thresholds)
   - Semiconductor manufacturing equipment
   - 50%/0.02s, 50%/0.2s, 70%/0.5s, 80%/1s, 87%/1s

3. **ITIC** (5 thresholds)
   - IT equipment voltage tolerance curve
   - 0%/0.02s, 70%/0.02s, 70%/0.5s, 80%/1s, 90%/1s

**Business Logic**:
- Cascade delete: Deleting standard removes all thresholds
- Validation: No duplicate voltage+duration pairs per standard
- Sorting: Manual reorder via sort_order field (deprecated - use table sorting)
- Active status: Can deactivate standards without deletion

**Component**: `src/pages/DataMaintenance/PQBenchmarking.tsx`  
**Service**: `src/services/benchmarkingService.ts`  
**Database**: `pq_benchmark_standards`, `pq_benchmark_thresholds` tables

**Use Cases**:
- Compliance evaluation of voltage dip events
- Standard comparison across different industries
- Threshold reference for event severity classification
- Customer-specific SLA definitions

---

### 7. System Health Module
- Imports react-pivottable, react-plotly.js, plotly.js
- Uses Supabase for report persistence
- RLS policies ensure users only see their own and shared reports

---

#### Standard Report Types

##### 1. Supply Reliability Report
**Data Included**:
- IDR (Incident Data Record) details
- Fault analysis by cause
- Equipment failure statistics
- Voltage level breakdown
- Regional performance
- Weather correlation
- Duration and customer impact

##### 2. Annual PQ Performance Report
**Compliance Standards**: Supply Rules, EN50160, IEEE519, IEC61000-2, Supply Code

**Content**:
- SARFI indices trends
- Voltage dip statistics
- Harmonic distortion summary
- Compliance rate by standard
- Year-over-year comparison
- Improvement recommendations

**Raw Data Download (UI in Reports Module)** ✨ NEW (Jan 2026)
- Location: Reporting Tools → Report Type → **Annual PQ Performance**
- 3-step filter workflow (aligned with PQMS raw data UI):
  1) Select one PQ meter (with voltage-level quick filter + search)
  2) Select parameter (dropdown)
  3) Set time range (max 1 month)
- Action: **Get Raw Data** downloads an Excel file with columns: `Name`, `Parameter`, `status`, `Timestamp`, `L1`, `L2`, `L3`
- Data source: `meter_voltage_readings` (currently supports Voltage/Current phase values)

##### 3. Meter Availability Report
**Metrics**:
- Communication uptime (%)
- Data completeness (%)
- Abnormal status duration
- Maintenance events
- Firmware status
- By substation and region

##### 4. Customer Impact Analysis
**Analysis**:
- Affected customer count
- Total downtime minutes (CMI - Customer Minutes Interrupted)
- Critical customer events
- Compensation calculations
- Outage frequency by customer type

##### 5. Harmonic Analysis Report
**Technical Data**:
- THD trends by location
- Individual harmonic magnitudes (h2-h40)
- IEEE519 compliance rate
- Source identification (industrial loads, VFDs)
- Mitigation recommendations

##### 6. Voltage Quality Report
**Event Summary**:
- Voltage dips (count, duration, magnitude)
- Voltage swells (count, duration)
- Interruptions (count, total duration)
- EN50160 compliance metrics
- Root cause distribution

#### Report Generation Process
```typescript
1. Select report type and parameters (date range, substations, etc.)
2. Query database for relevant events and metrics
3. Apply compliance calculations
4. Generate charts and tables
5. Render report in selected format (PDF/Excel/CSV/HTML)
6. Store report metadata in reports table
7. Provide download link or send via email
```

---

### 6. Notification System

**Purpose**: Alert stakeholders of critical events and system issues

#### Notification Types
1. **Event Notifications**: Power quality events exceeding thresholds
2. **Mother Event Alerts**: Only first event in group triggers notification
3. **System Alerts**: Meter communication loss, system downtime
4. **Compliance Alerts**: Standards violations (harmonic, voltage)
5. **Maintenance Reminders**: Scheduled maintenance due

#### Notification Rules
```typescript
interface NotificationRule {
  id: string;
  name: string;
  event_type: EventType | null;      // null = all types
  severity_threshold: SeverityLevel;  // minimum severity
  recipients: string[];               // emails/phones
  include_waveform: boolean;          // attach waveform image
  typhoon_mode_enabled: boolean;      // suppress during storms
  active: boolean;
}
```

#### Delivery Channels
1. **Email**: HTML formatted with event details and charts
2. **SMS**: Text message with event summary and link
3. **In-App**: Browser notifications for logged-in users
4. **API/XML**: Integration with external systems (DNOO, PIOCO)

#### Special Modes
- **Typhoon Mode**: Suppress non-critical alerts during severe weather
- **Maintenance Mode**: Suppress expected outage alerts
- **Late Event Suppression**: Don't alert on events > 24 hours old

---

### 7. PQ Services Module

**Purpose**: Track customer consultation and site survey services

#### Service Types
1. **Site Surveys**: On-site power quality assessments
2. **Harmonic Analysis**: Detailed harmonic distortion investigation
3. **Consultations**: Customer advisory services
4. **Equipment Testing**: Compatibility and immunity testing

#### Service Record Structure
```typescript
interface PQServiceRecord {
  id: string;
  customer_id: string | null;
  event_id: string | null;           // Optional link to pq_events
  idr_no?: string | null;            // PQSIS IDR number (primary key for Voltage Dip mapping)
  service_date: string;
  service_type: 'site_survey' | 'harmonic_analysis' | 'consultation';
  findings: string | null;           // Observations and measurements
  recommendations: string | null;    // Suggested improvements
  benchmark_standard: string | null; // ITIC, SEMI_F47, IEC61000, IEEE519
  engineer_id: string | null;
  created_at: string;
}
```

#### Key Features
- **Customer Linkage**: Associated with customer accounts
- **IDR Mapping (PQSIS → PQMAP)**: When `idr_no` is provided, map the service record to a PQMAP **Voltage Dip** event via `pq_events.idr_no` (non-voltage-dip services are shown as independent service entries)
- **Engineering Notes**: Detailed findings documentation
- **Benchmark Standards**: Reference standards for assessment
- **Recommendation Tracking**: Follow-up on suggested actions
- **Report Generation**: Service reports for customers

---

### 8. Data Maintenance Module ✨ NEW (Dec 15, 2025)

**Purpose**: Manage customer-transformer relationships for automatic customer impact generation

#### Components

##### Customer Transformer Matching
**Location**: Navigation → Data Maintenance → Customer Transformer Matching

**Purpose**: Define which customers are served by which substation transformers to enable automatic customer impact record generation when PQ events occur.

**Key Features**:
1. **Filter Section**
   - Filter by substation (dropdown)
   - Filter by circuit/transformer (H1, H2, H3)
   - Filter by customer (search by name or account)
   - Filter by status (active/inactive)

2. **Data Table**
   - Customer name and account number
   - Substation code and name
   - Circuit/Transformer ID (H1, H2, H3)
   - Active status with toggle
   - Actions: Edit, Delete
   - Pagination for large datasets

3. **Add/Edit Modal**
   - Customer selection (searchable dropdown)
   - Substation selection (searchable dropdown)
   - Circuit selection (dropdown shows available transformers for selected substation)
   - Active status checkbox
   - Validation: Prevents duplicate active mappings

4. **Bulk Operations**
   - Excel export of current filter
   - Bulk import via Excel (placeholder button)

5. **Mapping Statistics**
   - Total active mappings
   - Customers with mappings
   - Unmapped customers warning

#### Data Structure
```typescript
interface CustomerTransformerMatching {
  id: string;
  customer_id: string;
  substation_id: string;
  circuit_id: string;  // H1, H2, or H3
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  
  // Relations (loaded via Supabase join)
  customer?: {
    id: string;
    name: string;
    account_number: string;
    address: string;
  };
  substation?: {
    id: string;
    code: string;
    name: string;
    voltage_level: string;
  };
}
```

#### Circuit ID Format
**Real CLP Transformer Numbers**:
- `H1` - Primary transformer at substation
- `H2` - Secondary transformer (if exists)
- `H3` - Tertiary transformer (if exists)

**Distribution**: Each substation has 1-3 transformers (randomized in current data)

#### Automatic Customer Impact Generation

**Trigger**: PostgreSQL trigger on `pq_events` table fires AFTER INSERT

**Function**: `generate_customer_impacts_for_event(event_id UUID)`

**Logic**:
```sql
-- Find all active customers connected to event's substation + circuit
SELECT ctm.customer_id
FROM customer_transformer_matching ctm
WHERE ctm.substation_id = event.substation_id
  AND ctm.circuit_id = event.circuit_id
  AND ctm.active = true;

-- For each customer, create event_customer_impact record
INSERT INTO event_customer_impact (
  event_id,
  customer_id,
  impact_level,              -- Mapped from event severity
  estimated_downtime_min,    -- Calculated from duration_ms
  notification_sent
) VALUES (...);

-- Severity Mapping:
-- critical → severe
-- high → moderate
-- medium → minor
-- low → minor

-- Downtime Calculation:
-- estimated_downtime_min = ROUND(duration_ms / 60000.0, 2)
```

**Customer Impact Display**:
- **Yellow Card**: Shows `pq_events.customer_count` (estimate stored in event record)
- **Blue Card**: Shows count of actual `event_customer_impact` records
- **Customer Names**: Displayed in table below when impact records exist

**Important Note**: Historical events (created before trigger was added) require backfill:
```bash
# Run this script in Supabase SQL Editor
scripts/backfill_customer_impacts.sql
```

#### Service Layer
**File**: `src/services/customerTransformerService.ts`

**Methods**:
- `fetchCustomerTransformerMappings(filters)` - Get mappings with full joins
- `getCircuitsForSubstation(substationId)` - Get available H1/H2/H3 circuits
- `createCustomerTransformerMapping(input, userId)` - Create new mapping
- `updateCustomerTransformerMapping(input, userId)` - Update existing mapping
- `deleteCustomerTransformerMapping(id, userId)` - Soft delete (set active=false)
- `permanentlyDeleteMapping(id)` - Hard delete from database
- `getMappingStatistics()` - Get counts by substation

---

### 9. User Management Module ✨ NEW (Jan 5, 2026)

**Purpose**: Manage user access and role-based permissions for PQMAP system

**Location**: Data Maintenance → User Management (above Customer Transformer)

**UAM Integration**: User data is synchronized from organization's UAM (User Access Management) system. User accounts and role assignments are managed externally; PQMAP manages permissions for each role.

#### Sub-Modules

##### 1. Users Tab (Read-Only)
**Purpose**: View user list synchronized from UAM system

**Features**:
- **UAM Integration Badge**: Visual indicator showing data source is external
- **Search & Filter**: 
  - Text search: Name, User ID, Email, Description
  - Role filter: All Roles / System Admin / System Owner / Manual Implementator / Watcher
  - Department filter: All Departments / Digital Engineering / Power Systems / Technical Services-PSBG / Business Success
- **Table Columns**: User ID, Name, Role (color-coded badge), Department, Description, Email, Status (Active/Inactive)
- **Data Refresh**: Automatic synchronization with UAM system

**Data Structure**:
```typescript
interface UAMUser {
  id: string;
  user_id: string;              // UAM user identifier (e.g., SA001)
  name: string;                 // Full name
  description: string | null;   // Role description
  department: string;           // Department name
  role: SystemRole;             // system_admin | system_owner | manual_implementator | watcher
  email: string;
  active: boolean;              // Account status
  created_at: string;
  updated_at: string;
}
```

##### 2. Roles & Permissions Tab
**Purpose**: Configure permissions for each system role

**Features**:
1. **Role Cards**: Visual display of 4 system roles with permission summaries
2. **Permission Editor**: Interactive checkbox interface for CRUD permissions
3. **Permission Details Modal**: Complete permission breakdown by module
4. **Reset to Default**: Restore role permissions to system defaults
5. **Save Workflow**: Confirmation and success feedback

**System Roles**:
```typescript
type SystemRole = 'system_admin' | 'system_owner' | 'manual_implementator' | 'watcher';

// Role Definitions:
{
  system_admin: {
    name: 'System Admin',
    description: 'Super users to access all functions',
    color: 'text-red-600 bg-red-50 border-red-200',
    defaultPermissions: 'All modules: Create, Read, Update, Delete'
  },
  system_owner: {
    name: 'System Owner',
    description: 'Adopt same permission as System Admin first',
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    defaultPermissions: 'All modules: Create, Read, Update, Delete'
  },
  manual_implementator: {
    name: 'Manual Implementator',
    description: 'All functions except events deletion, managing users, and system settings',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    defaultPermissions: {
      'userManagement': ['Read'],
      'systemSettings': ['Read'],
      'events, assets, customerTransformer, services': ['Create', 'Read', 'Update'],
      'other modules': ['Create', 'Read', 'Update', 'Delete']
    }
  },
  watcher: {
    name: 'Watcher',
    description: 'View only for all functions',
    color: 'text-green-600 bg-green-50 border-green-200',
    defaultPermissions: 'All modules: Read only'
  }
}
```

**Permission Structure**:
```typescript
interface RolePermission {
  id: string;
  role: SystemRole;
  module: string;               // Module ID (e.g., 'dashboard', 'events', 'assets')
  permissions: PermissionAction[];  // ['create', 'read', 'update', 'delete']
  description: string | null;
  updated_at: string;
}

type PermissionAction = 'create' | 'read' | 'update' | 'delete';
```

**System Modules** (Current - Jan 2026):
```typescript
interface SystemModule {
  id: string;
  name: string;
  description: string;
  category: string;
}

// Categories:
// - Core: Dashboard, Event Management, Impact Analysis, Asset Management, Notifications
// - Analytics: Advanced analytics and reporting
// - Reporting: Report generation and viewing
// - Services: PQ Services management
// - Administration: System Health, User Management, System Settings
// - Data Maintenance: Customer Transformer, future data management modules
```

**Current Modules List**:
1. **Core**
   - Dashboard - System overview and statistics
   - Event Management - PQ events monitoring and management
   - Impact Analysis - Event impact and analytics
   - Asset Management - Meters, substations, and equipment
   - Notifications - Notification rules and history

2. **Reporting**
   - Reports - Report generation and viewing

3. **Services**
   - PQ Services - Power quality services management

4. **Administration**
   - System Health - System monitoring and health checks
   - User Management - User and role management
   - System Settings - System configuration and settings

5. **Data Maintenance**
   - Customer Transformer - Customer-transformer matching

#### Permission Management Workflow

**View Permissions**:
1. Click "View Details" button on role card
2. Modal displays complete permission matrix
3. Organized by category with color-coded actions:
   - Create: Green
   - Read: Blue
   - Update: Amber
   - Delete: Red
4. Icons show allowed (✓) or not allowed (−)

**Edit Permissions**:
1. Click "Edit Permissions" button on role card
2. Role card expands with checkbox interface
3. Modules grouped by category (Core, Analytics, Reporting, etc.)
4. Each module shows 4 checkboxes: Create, Read, Update, Delete
5. Toggle permissions by clicking checkboxes
6. "Save Changes" commits to storage
7. "Cancel" reverts changes

**Reset Permissions**:
1. Click "Reset to Default" button
2. Confirmation dialog prevents accidental reset
3. Restores role permissions to system defaults

#### Key Features

##### Permission Storage
- In-memory storage with mock functions (production: database table `role_permissions`)
- Automatic initialization with default permissions
- Modification tracking with `updated_at` timestamps

##### UI/UX Patterns
- Color-coded role badges for quick identification
- External system indicator for UAM integration
- Success notifications after permission changes
- Loading states during data fetch
- Error handling with retry functionality

##### Data Services
**Service File**: `src/services/userManagementService.ts`

**Key Functions**:
- `fetchUAMUsers()` - Get all users from UAM system
- `fetchRolePermissions(role)` - Get permissions for specific role
- `fetchAllRoles()` - Get all roles with permissions
- `updateRolePermission(role, moduleId, permissions)` - Update module permissions
- `resetRolePermissions(role)` - Reset to default permissions
- `getRoleInfo(role)` - Get role display information
- `getModuleById(moduleId)` - Get module details

##### Component Structure
```
src/components/
  ├─ UserManagement.tsx                    # Main component with tabs
  └─ UserManagement/
       ├─ UserListTab.tsx                  # Users table with search/filter
       ├─ RoleManagementTab.tsx            # Role cards and permission editor
       └─ PermissionDetailsModal.tsx       # Permission matrix modal
```

#### Adding New Modules to Permission System

⚠️ **IMPORTANT**: When adding new functional modules to PQMAP, you MUST update the permission system.

**Required Steps**:
1. **Add Module Definition** in `src/services/userManagementService.ts`:
   ```typescript
   // Update systemModules array
   export const systemModules: SystemModule[] = [
     // ... existing modules
     { 
       id: 'newModuleName',              // Unique ID (camelCase)
       name: 'New Module Display Name',  // User-facing name
       description: 'Brief description of module functionality',
       category: 'Core'                  // Core | Analytics | Reporting | Services | Administration | Data Maintenance
     }
   ];
   ```

2. **Default Permissions Auto-Generated**: The system automatically creates permissions for new modules when added to `systemModules` array. Default permissions are:
   - `system_admin`: Full CRUD access
   - `system_owner`: Full CRUD access
   - `manual_implementator`: Create, Read, Update (no Delete) - adjust if needed
   - `watcher`: Read only

3. **Customize Permissions** (if needed):
   Edit the `defaultRolePermissions` logic in `userManagementService.ts`:
   ```typescript
   manual_implementator: systemModules.map((module, index) => {
     // Add your module to restricted lists if needed
     const restrictedModules = ['userManagement', 'systemSettings', 'newModuleName'];
     const noDeleteModules = ['events', 'assets', 'customerTransformer', 'services', 'newModuleName'];
     
     // Custom permission logic here...
   })
   ```

4. **Update Navigation**: Add to `Navigation.tsx` if creating sidebar entry

5. **Document in PROJECT_FUNCTION_DESIGN.md**: Add module section following existing pattern

**Module Categories Guide**:
- **Core**: Essential system functions (dashboards, events, assets, notifications)
- **Analytics**: Advanced analysis and reporting features
- **Reporting**: Report generation and viewing
- **Services**: External services and integrations
- **Administration**: System configuration and management
- **Data Maintenance**: Data management and configuration tools

**Example: Adding "Data Import" Module**:
```typescript
// 1. Add to systemModules in userManagementService.ts
{ 
  id: 'dataImport',
  name: 'Data Import',
  description: 'Bulk data import and validation',
  category: 'Data Maintenance'
}

// 2. (Optional) Restrict for manual_implementator
const restrictedModules = ['userManagement', 'systemSettings', 'dataImport'];

// 3. Add navigation entry in Navigation.tsx
{ id: 'dataImport', icon: Upload, label: 'Data Import' }

// 4. Create component: src/components/DataImport.tsx

// 5. Add route in App.tsx
{currentView === 'dataImport' && <DataImport />}
```

#### Integration Notes
- **UAM Synchronization**: Placeholder for production UAM API integration
- **Mock Data**: 10 sample users with realistic departments and roles
- **Production API**: Replace `fetchUAMUsers()` with actual UAM REST/GraphQL endpoint
- **Permission Storage**: Currently in-memory; migrate to `role_permissions` table for production

---

### 10. SCADA Substation Management Module ✨ NEW (Jan 5, 2026)

**Purpose**: Manage SCADA substation master data with full CRUD operations and geographic validation

**Location**: Data Maintenance → SCADA (between User Management and Customer Transformer)

**Database**: `substations` table with Row Level Security (RLS) policies

#### Features

##### 1. Substation Master Data Table
**Columns Displayed**:
- **S/S Code**: Unique substation identifier (uppercase alphanumeric)
- **Substation Name**: Full descriptive name
- **Voltage Level**: Operating voltage (400kV, 132kV, 11kV, 380V, Others)
- **Latitude**: Geographic coordinate (22.15° to 22.58°N)
- **Longitude**: Geographic coordinate (113.83° to 114.41°E)
- **Region**: Service region (Hong Kong Island, Kowloon, New Territories East, New Territories West, Outlying Islands)
- **Status**: Operational / Maintenance / Offline (color-coded badges)
- **Last Updated By**: User who last modified the record
- **Last Updated**: Timestamp of last modification

**Actions**:
- **Edit**: Modify existing substation details (except code)
- **Delete**: Remove substation (with dependency checking)

##### 2. Multi-Dimensional Filtering
**Filter Options**:
- **Text Search**: Search by S/S Code or Substation Name (real-time)
- **Voltage Level**: Multi-select checkbox filter (400kV, 132kV, 11kV, 380V, Others)
- **Region**: Multi-select checkbox filter (all 5 regions)
- **Status**: Multi-select checkbox filter (Operational, Maintenance, Offline)

**Filter UI**:
- Active filter count badge on filter buttons
- "Select All" / "Clear All" quick actions for multi-select filters
- "Clear Filters" button to reset all filters at once
- Result count display: "Showing X of Y substations"

##### 3. Create/Edit Substation Form
**Modal-Based Form** with validation:

**Required Fields**:
- **S/S Code**: 
  - Must be uppercase alphanumeric with hyphens/underscores
  - Cannot be changed after creation (disabled in edit mode)
  - Duplicate code detection
  
- **Substation Name**: 
  - Free text, required
  - Descriptive name for easy identification

**Optional Fields with Validation**:
- **Voltage Level**: Dropdown selection (required)
- **Region**: Dropdown selection (required)
- **Latitude**: Number input with 6 decimal precision
  - Validation: Must be within Hong Kong bounds (22.15° to 22.58°N)
  - Error message for out-of-bounds coordinates
  
- **Longitude**: Number input with 6 decimal precision
  - Validation: Must be within Hong Kong bounds (113.83° to 114.41°E)
  - Error message for out-of-bounds coordinates

- **Status**: Radio button selection (Operational, Maintenance, Offline)
  - Default: Operational

**Validation Features**:
- Real-time field validation with error messages
- Geographic bounds checking for Hong Kong territory
- Duplicate code prevention
- Required field indicators
- Disabled save button while loading

**Info Box**: Geographic validation notice explaining HK boundary requirements

##### 4. Delete with Dependency Checking
**Smart Deletion**:
- Checks for linked PQ meters and events before deletion
- Shows dependency warning if relationships exist:
  ```
  Cannot delete substation "Central Substation":
  - Linked Meters: 15
  - Linked Events: 234
  
  Please remove these dependencies first.
  ```
- Only allows deletion when no dependencies exist
- Requires confirmation before final deletion

##### 5. Export Functionality
**Export Formats**:
- **Excel (.xlsx)**: Formatted spreadsheet with proper column widths
- **CSV (.csv)**: Comma-separated values with quoted fields
- **PDF (.pdf)**: Professional landscape report with header

**Export Content**:
- All 9 columns from the table
- Filtered data only (respects current filters)
- Filename format: `SCADA_Substations_YYYY-MM-DD.{ext}`
- PDF includes generation timestamp and record count

**PDF Features**:
- Landscape orientation for better table fit
- Blue gradient header styling
- Auto-sized columns for optimal spacing
- Page breaks handled automatically

#### Service Layer Functions

**`scadaService.ts`** provides:

```typescript
// Data fetching
fetchSubstations(filters?: SubstationFilters): Promise<Substation[]>
getVoltageLevels(): Promise<string[]>
getRegions(): Promise<string[]>

// CRUD operations
createSubstation(input: CreateSubstationInput, userId: string): Promise<Substation>
updateSubstation(input: UpdateSubstationInput, userId: string): Promise<Substation>
deleteSubstation(substationId: string): Promise<void>

// Validation & Dependencies
validateHKCoordinates(lat: number, lng: number): { valid: boolean; message?: string }
checkSubstationDependencies(substationId: string): Promise<{
  hasMeters: boolean;
  haEvents: boolean;
  meterCount: number;
  eventCount: number;
}>
getSubstationStatistics(): Promise<{
  total: number;
  operational: number;
  maintenance: number;
  offline: number;
}>
```

**Key Features**:
- **Geographic Validation**: `HK_BOUNDS` constant enforces Hong Kong territory limits
- **Duplicate Prevention**: Checks for existing codes before creation/update
- **Audit Tracking**: Automatically records `updated_by` and `updated_at`
- **Dependency Safety**: Prevents orphaned relationships with meters and events
- **Error Handling**: Descriptive error messages for all failure scenarios

#### Database Schema

**Table**: `substations`

```sql
CREATE TABLE substations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  voltage_level TEXT NOT NULL,
  latitude NUMERIC(10, 6) NOT NULL,
  longitude NUMERIC(10, 6) NOT NULL,
  region TEXT NOT NULL,
  status TEXT DEFAULT 'operational',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);
```

**Constraints**:
- `code` must be unique (enforced at database level)
- `latitude` and `longitude` numeric precision: 6 decimal places
- `updated_at` automatically updated via trigger
- `updated_by` foreign key to `profiles` table

**Indexes**:
- Primary key on `id`
- Unique index on `code`
- Index on `voltage_level` for filter performance
- Index on `region` for filter performance

#### Migration Scripts

**Migration**: `20260105000000_add_substation_audit_fields.sql`
- Adds `updated_at` (TIMESTAMPTZ) column
- Adds `updated_by` (UUID FK) column
- Creates trigger for automatic `updated_at` updates

**Backfill**: `backfill-substation-audit-fields.sql`
- Populates `updated_at` from `created_at` or NOW()
- Randomly assigns `updated_by` from existing users
- Includes verification query

#### Permission Configuration

**Module Name**: `scada`

**Permissions by Role**:
- **System Admin**: Full CRUD (Create, Read, Update, Delete)
- **System Owner**: Full CRUD
- **Manual Implementator**: CRU only (no Delete)
- **Watcher**: Read-only

**Configuration** in `userManagementService.ts`:
```typescript
systemModules.push({
  id: 'scada',
  name: 'SCADA',
  category: 'data-maintenance',
  description: 'Substation master data management'
});

noDeleteModules.push('scada'); // Manual Implementator cannot delete
```

#### UI Components

**Component Structure**:
```
/src/components/
├── SCADA.tsx                    # Main component with table and filters
└── SCADA/
    └── SubstationFormModal.tsx  # Create/Edit form modal
```

**Styling**:
- Gradient header with blue theme
- Color-coded status badges (green/yellow/red)
- Hover effects on table rows
- Loading spinners during async operations
- Modal overlay with backdrop blur

#### Best Practices Followed

1. **Type Safety**: Full TypeScript types for all data structures
2. **Error Handling**: Try-catch blocks with user-friendly messages
3. **Loading States**: Spinners during data fetching/saving
4. **Validation**: Client-side + server-side validation
5. **Accessibility**: Proper labels, titles, and keyboard navigation
6. **Performance**: Filtered data computed only when needed
7. **Consistency**: Follows existing PQMAP design patterns

#### Future Enhancements

- **Map View**: Interactive map showing substation locations
- **Import CSV**: Bulk upload substation data from CSV files
- **Change History**: Audit log showing all modifications over time
- **Advanced Search**: Search by coordinate ranges, multiple codes
- **Integration**: Link to GIS systems for real-time location updates

---

### 11. System Health Module

**Purpose**: Monitor system components and integrations

#### Monitored Components
1. **Server**: Web server response time, CPU, memory, disk usage
2. **Communication**: Meter connectivity, data transfer rates
3. **Database**: Query performance, connection pool, storage
4. **Integration**: External system connections (PQMS, CPDIS, ADMS)

#### Health Status
```typescript
interface SystemHealth {
  id: string;
  component: string;
  status: 'healthy' | 'degraded' | 'down';
  message: string | null;
  metrics: {
    response_time?: number;  // ms
    cpu_usage?: number;      // %
    memory_usage?: number;   // %
    disk_usage?: number;     // %
    error_rate?: number;     // %
    active_connections?: number;
  } | null;
  checked_at: string;
}
```

#### Integration Watchdog
**Phase 1 Systems** (Active):
- PQMS (Power Quality Monitoring System)
- CPDIS (Centralized Power Distribution Information System)
- UAM (User Access Management)
- WIS (Workforce Information System)

**Phase 2 Systems** (Planned):
- ADMS (Advanced Distribution Management System)
- GIS (Geographic Information System)
- ERP Enlight
- SMP (System Maintenance Platform)

**Watchdog Logic**:
```typescript
// Check for heartbeat files every 15 minutes
if (no_file_received_in_30_minutes) {
  alert_admins({
    system: 'PQMS',
    issue: 'No heartbeat received',
    last_contact: timestamp,
    severity: 'high'
  });
}
```

---

## Data Models & Database Schema

### Core Tables

#### 1. pq_events
**Purpose**: Central event storage

**Key Fields**:
```sql
- id (uuid, primary key)
- event_type (enum: voltage_dip, voltage_swell, harmonic, interruption, transient, flicker)
- substation_id (uuid, foreign key)
- meter_id (uuid, foreign key)
- timestamp (timestamptz)
- duration_ms (integer)
- magnitude (numeric) -- % of nominal
- severity (enum: critical, high, medium, low)
- status (enum: new, acknowledged, investigating, resolved)
- is_mother_event (boolean)
- parent_event_id (uuid, self-referential)
- is_child_event (boolean)
- grouping_type (enum: automatic, manual)
- grouped_at (timestamptz)
- voltage_level (text)
- circuit_id (text)
- customer_count (integer)
- remaining_voltage (numeric) -- %
- validated_by_adms (boolean)
- is_special_event (boolean) -- Planned outage
- false_event (boolean) -- Flagged as false positive
- cause (text) -- Root cause
- cause_group (text)
- affected_phases (text array)
- waveform_data (jsonb) -- Voltage/current waveforms
- v1, v2, v3 (numeric) -- Phase voltages
- sarfi_10 through sarfi_90 (numeric) -- SARFI indices
- oc (text) -- Operating center
- remarks (text)
- idr_no (text) -- Incident Data Record number
- address (text)
- equipment_type (text)
- outage_type (text)
- weather (text)
- total_cmi (numeric) -- Customer Minutes Interrupted
- fault_type (text) -- Type of fault (IDR field)
- weather_condition (text) -- Weather description (IDR field)
- responsible_oc (text) -- Responsible operating center (IDR field)
- manual_create_idr (boolean) -- Manual vs auto IDR flag
```

**Indexes**:
```sql
CREATE INDEX idx_pq_events_timestamp ON pq_events(timestamp DESC);
CREATE INDEX idx_pq_events_substation ON pq_events(substation_id);
CREATE INDEX idx_pq_events_mother ON pq_events(is_mother_event) WHERE is_mother_event = true;
CREATE INDEX idx_pq_events_parent ON pq_events(parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX idx_pq_events_false ON pq_events(false_event) WHERE false_event = true;
```

#### 2. substations
**Purpose**: Geographic and operational substation data

```sql
- id (uuid, primary key)
- name (text, unique)
- code (text, unique) -- e.g., TPGS, CLPS
- voltage_level (text)
- latitude (numeric)
- longitude (numeric)
- region (text) -- Hong Kong Island, Kowloon, New Territories
- status (enum: operational, maintenance, offline)
```

#### 3. pq_meters
**Purpose**: PQ monitoring equipment

```sql
- id (uuid, primary key)
- meter_id (text, unique) -- Physical meter ID
- substation_id (uuid, foreign key)
- location (text)
- status (enum: active, abnormal, inactive)
- last_communication (timestamptz)
- firmware_version (text)
- installed_date (date)
- meter_type (text)
- voltage_level (text)
```

#### 4. sarfi_metrics
**Purpose**: SARFI index calculations

```sql
- id (uuid, primary key)
- substation_id (uuid, foreign key)
- period_year (integer)
- period_month (integer)
- sarfi_70 (numeric) -- Sag below 70%
- sarfi_80 (numeric) -- Sag below 80%
- sarfi_90 (numeric) -- Sag below 90%
- total_events (integer)
```

#### 5. sarfi_profiles
**Purpose**: SARFI calculation configurations

```sql
- id (uuid, primary key)
- name (text)
- description (text)
- year (integer)
- is_active (boolean)
- created_by (uuid, foreign key)
```

#### 6. sarfi_profile_weights
**Purpose**: Meter weighting for SARFI calculations

```sql
- id (uuid, primary key)
- profile_id (uuid, foreign key)
- meter_id (uuid, foreign key)
- weight_factor (numeric) -- Multiplier for meter's contribution
- notes (text)
```

#### 7. filter_profiles
**Purpose**: Saved filter configurations for Event Management

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (text)
- description (text)
- filters (jsonb) -- EventFilter object
- is_default (boolean)
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### 8. saved_reports ✨ NEW (January 2025)
**Purpose**: User-created report configurations with pivot tables and calculated fields

```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- name (text, NOT NULL)
- description (text)
- config (jsonb, NOT NULL) -- ReportConfig object (filters, pivot settings, calculated fields)
- is_shared (boolean, DEFAULT false)
- shared_with (uuid[], DEFAULT '{}'::uuid[]) -- Array of user IDs with access
- created_at (timestamptz, DEFAULT now())
- updated_at (timestamptz, DEFAULT now())
```

**RLS Policies**:
- Users can view their own reports: `user_id = auth.uid()`
- Users can view reports shared with them: `auth.uid() = ANY(shared_with)`
- Users can insert/update/delete their own reports only
- Automatic `updated_at` timestamp via trigger

### Recent Database Enhancements

#### Summary of Recent Changes (Dec 2025)
1. ✅ **Root Cause Migration**: Consolidated root_cause → cause field
2. ✅ **Meter Inventory Schema**: Added 11 comprehensive tracking fields
3. ✅ **IDR Fields**: Added 4 incident data record fields to events
4. 🟡 **Event Reorganization**: Script ready for database size optimization

#### Detailed Migration History
**Migration**: `20251211000000_migrate_root_cause_to_cause.sql`

**Rationale**: Consolidated duplicate fields. The `root_cause` field was redundant with the more comprehensive `cause` field.

**Changes**:
```sql
-- Copy data
UPDATE pq_events 
SET cause = root_cause 
WHERE root_cause IS NOT NULL AND cause IS NULL;

-- Drop old column
ALTER TABLE pq_events DROP COLUMN root_cause;
```

**Follow-up Migration**: `20251211000001_populate_null_causes.sql`

**Purpose**: Backfill missing cause data with realistic values

```sql
-- Randomly assign one of 12 realistic causes
UPDATE pq_events
SET cause = (
  CASE floor(random() * 12)::int
    WHEN 0 THEN 'Equipment Failure'
    WHEN 1 THEN 'Lightning Strike'
    WHEN 2 THEN 'Overload'
    -- ... (12 total causes)
  END
)
WHERE cause IS NULL;
```

---

## Key Design Patterns

### 1. Component Independence Pattern
**Principle**: Each dashboard component maintains its own state and filters

**Implementation**:
```typescript
// Each component has independent filters
const [filters, setFilters] = useState<ComponentFilters>(() => {
  const saved = localStorage.getItem('componentFilters');
  return saved ? JSON.parse(saved) : defaultFilters;
});

// Persist on change
useEffect(() => {
  localStorage.setItem('componentFilters', JSON.stringify(filters));
}, [filters]);
```

**Benefits**:
- No unintended side effects between components
- Users can configure each view independently
- Easier debugging and testing
- Simpler state management

### 2. Profile Management Pattern
**Principle**: Reusable filter configurations stored in localStorage or database

**Structure**:
```typescript
interface ComponentProfile {
  id: string;
  name: string;
  description: string | null;
  [filter_fields]: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

**Storage Keys**:
- `{componentName}Filters`: Current active filters
- `{componentName}Profiles`: Array of saved profiles

**Examples**:
- `rootCauseFilters`, `rootCauseProfiles`
- `substationMapFilters`, `substationMapProfiles`
- `sarfi_filters` (database-backed)

### 3. False Event Exclusion Pattern
**Principle**: Analytics should exclude flagged false events by default

**Implementation**:
```typescript
const getFilteredEvents = (): PQEvent[] => {
  return events.filter(event => {
    // Always exclude false events
    if (event.false_event) return false;
    
    // Apply other filters
    // ...
    
    return true;
  });
};
```

**Applied In**:
- Dashboard charts (Root Cause, SARFI)
- Analytics dashboards
- Report generation
- Compliance calculations

### 4. Export Function Pattern
**Principle**: Consistent export functionality across components

**Standard Implementation**:
```typescript
const [showExportDropdown, setShowExportDropdown] = useState(false);
const [isExporting, setIsExporting] = useState(false);

// Icon-only button with tooltip
<button
  onClick={() => setShowExportDropdown(!showExportDropdown)}
  disabled={isExporting}
  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
  title="Export Data"
>
  <Download className="w-5 h-5" />
</button>

// Dropdown menu
{showExportDropdown && (
  <div className="dropdown-menu">
    <button onClick={() => handleExport('excel')}>
      Export to Excel
    </button>
    <button onClick={() => handleExport('csv')}>
      Export to CSV
    </button>
    <button onClick={() => handleExport('pdf')}>
      Export to PDF
    </button>
  </div>
)}
```

**Click-Outside Handler**:
```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (showExportDropdown && !target.closest('.export-dropdown-container')) {
      setShowExportDropdown(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showExportDropdown]);
```

### 5. Modal Configuration Pattern
**Principle**: Reusable modal for component settings

**Structure**:
```typescript
<ConfigModal
  isOpen={isConfigOpen}
  onClose={() => setIsConfigOpen(false)}
  filters={filters}
  onApply={handleApplyFilters}
  profiles={profiles}
/>
```

**Features**:
- Date range picker
- Profile management (CRUD)
- Set default profile
- Clear filters
- Apply/cancel actions

### 6. Mother Event Tree Pattern
**Principle**: Hierarchical display of related events

**Data Structure**:
```typescript
interface EventTreeNode {
  id: string;
  event: PQEvent;
  children: EventTreeNode[];
}

const buildEventTree = (events: PQEvent[]): EventTreeNode[] => {
  const nodeMap = new Map<string, EventTreeNode>();
  const roots: EventTreeNode[] = [];
  
  // Create nodes
  events.forEach(event => {
    nodeMap.set(event.id, { id: event.id, event, children: [] });
  });
  
  // Link parent-child
  events.forEach(event => {
    const node = nodeMap.get(event.id)!;
    if (event.parent_event_id) {
      const parent = nodeMap.get(event.parent_event_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });
  
  return roots;
};
```

---

## Integration Points

### External Systems (Phase 1)
1. **PQMS (Power Quality Monitoring System)**
   - **Data Flow**: Raw measurement data → PQMAP
   - **Format**: XML files with event details and waveforms
   - **Frequency**: Real-time (as events occur)

2. **CPDIS (Centralized Power Distribution Information System)**
   - **Data Flow**: Asset data, substation info → PQMAP
   - **Format**: Database sync or API
   - **Frequency**: Periodic (hourly/daily)

3. **UAM (User Access Management)**
   - **Data Flow**: User authentication, role assignments
   - **Format**: SSO/SAML or API
   - **Frequency**: Real-time (on login)

4. **WIS (Workforce Information System)**
   - **Data Flow**: Engineer assignments, maintenance schedules
   - **Format**: API or database view
   - **Frequency**: Daily sync

### External Systems (Phase 2 - Planned)
1. **ADMS (Advanced Distribution Management System)**
   - **Purpose**: Event validation, network topology
   - **Use Case**: Confirm events against network operations

2. **GIS (Geographic Information System)**
   - **Purpose**: Spatial analysis, map overlays
   - **Use Case**: Enhanced substation mapping

3. **ERP Enlight**
   - **Purpose**: Financial data, customer accounts
   - **Use Case**: Customer impact analysis

4. **SMP (System Maintenance Platform)**
   - **Purpose**: Maintenance records, asset lifecycle
   - **Use Case**: Correlate events with maintenance

### API Endpoints (Future Development)
```typescript
// Event ingestion
POST /api/events
{
  event_type, timestamp, magnitude, ...
}

// Event validation
PUT /api/events/{id}/validate
{
  validated_by_adms: true,
  validation_notes: "Confirmed by network ops"
}

// Report generation
POST /api/reports/generate
{
  report_type, start_date, end_date, substations[]
}

// Notification trigger
POST /api/notifications/send
{
  event_id, recipients[], include_waveform
}
```

---

## Environment Configuration & Security

### Overview
Proper environment configuration is critical for securing API keys, database credentials, and deployment settings across development, staging, and production environments.

### Environment Variables Setup

#### Local Development (.env)

**File Structure**:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Development-specific settings
VITE_API_URL=http://localhost:3000
VITE_DEBUG_MODE=true
```

**Security Rules**:
- ✅ **DO**: Use `.env` for local development only
- ✅ **DO**: Add `.env` to `.gitignore` (NEVER commit to version control)
- ✅ **DO**: Create `.env.example` with placeholder values (safe to commit)
- ✅ **DO**: Rotate keys immediately if accidentally exposed
- ❌ **DON'T**: Hardcode credentials in source code
- ❌ **DON'T**: Commit real API keys to GitHub
- ❌ **DON'T**: Share `.env` files via email or Slack

#### .gitignore Configuration

```bash
# Environment variables
.env
.env.local
.env.*.local
.env.production

# Keep example files
!.env.example
```

#### .env.example Template

Create this file for team members (safe to commit):
```bash
# Supabase Configuration
# Get these values from: Supabase Dashboard > Settings > API

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Instructions:
# 1. Copy this file: cp .env.example .env
# 2. Replace placeholder values with actual credentials
# 3. Never commit .env to version control
```

### Deployment Environments

#### GitHub Repository
- **DO NOT** commit `.env` files
- **DO** commit `.env.example` with documentation
- **DO** use GitHub Secrets for CI/CD workflows
- **DO** enable branch protection for `main` branch

#### Vercel Deployment

**Option A: Dashboard (Recommended)**
1. Navigate to: Project → **Settings** → **Environment Variables**
2. Add variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Select deployment environments:
   - ✅ Production
   - ✅ Preview (for pull requests)
   - ✅ Development

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Add environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production

# Pull environment variables for local development
vercel env pull
```

**Deployment Checklist**:
- [ ] Environment variables added to Vercel
- [ ] Build command configured: `npm run build`
- [ ] Output directory set: `dist`
- [ ] Node version specified: `18.x`
- [ ] Preview deployments enabled for PRs

#### Supabase Configuration

**Row Level Security (RLS)**

The `anon` key is designed to be public-facing (used in frontend), but you MUST enable RLS on all tables:

```sql
-- Enable RLS on all tables
ALTER TABLE pq_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pq_meters ENABLE ROW LEVEL SECURITY;
-- ... (all other tables)

-- Example: Allow authenticated users to read their organization's data
CREATE POLICY "Users can view own org data" ON pq_events
  FOR SELECT 
  USING (
    auth.jwt() ->> 'organization_id' = organization_id
  );

-- Allow authenticated users to insert events
CREATE POLICY "Authenticated users can insert" ON pq_events
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Admin-only updates
CREATE POLICY "Admins can update" ON pq_events
  FOR UPDATE 
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );
```

**Security Checklist**:
- [ ] RLS enabled on all public tables
- [ ] Policies restrict data access by user role
- [ ] Service role key NEVER exposed to frontend
- [ ] API rate limiting enabled in Supabase dashboard
- [ ] Database backups scheduled
- [ ] Audit logs enabled for sensitive tables

**Key Types**:
- **anon key**: Public-facing, limited permissions, enforced by RLS
- **service_role key**: Full admin access, ONLY use in backend/server functions

### Environment Variable Recovery

If credentials are accidentally exposed:

1. **Immediate Actions**:
   ```bash
   # 1. Remove from Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 2. Force push to GitHub
   git push origin --force --all
   ```

2. **Rotate Credentials**:
   - Go to Supabase Dashboard → Settings → API
   - Click "Reset" for anon key
   - Update all deployment environments
   - Update local `.env` files for all team members

3. **Audit Access**:
   - Check Supabase logs for suspicious activity
   - Review recent database operations
   - Monitor for unusual API usage patterns

### Setup Script for New Developers

Create `setup-env.sh` in project root:
```bash
#!/bin/bash
# Environment setup script for new developers

echo "🚀 Setting up PQMAP development environment..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env and add your Supabase credentials"
  echo "   Get them from: https://supabase.com/dashboard/project/[your-project]/settings/api"
else
  echo "✅ .env already exists"
fi

# Ensure .env is in .gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
  echo ".env" >> .gitignore
  echo "✅ Added .env to .gitignore"
else
  echo "✅ .env already in .gitignore"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Supabase credentials"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:5173"
```

Make executable:
```bash
chmod +x setup-env.sh
./setup-env.sh
```

### Best Practices Summary

**Development**:
- Use `.env` for local development only
- Never commit sensitive credentials
- Use `.env.example` for team documentation
- Rotate keys if exposed

**Deployment**:
- Use platform-specific secret management (Vercel Environment Variables, GitHub Secrets)
- Enable RLS on all database tables
- Monitor API usage and logs
- Set up alerts for suspicious activity

**Team Workflow**:
- New developers run `setup-env.sh`
- Credentials shared via secure channels (1Password, LastPass)
- Document environment variables in `.env.example`
- Regular security audits of access logs

---

## Development Guidelines

### Coding Standards

#### TypeScript
- **Strict Mode**: Always enabled (`"strict": true`)
- **Type Definitions**: Explicitly type all function parameters and return values
- **Interfaces Over Types**: Use `interface` for object shapes
- **Enums**: Use string enums for type-safe constants

**Example**:
```typescript
// ✅ Good
interface EventFilter {
  eventTypes: EventType[];
  severityLevels: SeverityLevel[];
}

export function filterEvents(
  events: PQEvent[],
  filters: EventFilter
): PQEvent[] {
  return events.filter(event => {
    // ...
  });
}

// ❌ Avoid
function filterEvents(events: any, filters: any): any {
  // ...
}
```

#### React Component Structure
```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { Icon } from 'lucide-react';
import { Type } from '../../types';

// 2. Interface definitions
interface ComponentProps {
  data: Type[];
  onAction: () => void;
}

// 3. Component
export default function Component({ data, onAction }: ComponentProps) {
  // 4. State
  const [state, setState] = useState<Type | null>(null);
  
  // 5. Effects
  useEffect(() => {
    // ...
  }, [dependencies]);
  
  // 6. Event handlers
  const handleAction = () => {
    // ...
  };
  
  // 7. Render logic
  const processedData = data.map(/* ... */);
  
  // 8. JSX
  return (
    <div className="container">
      {/* ... */}
    </div>
  );
}
```

#### Tailwind CSS
- **Utility Classes**: Use utility-first approach
- **Consistent Spacing**: Use Tailwind scale (p-4, m-6, gap-2)
- **Responsive**: Use responsive prefixes (md:, lg:, xl:)
- **Custom Classes**: Avoid custom CSS files when possible

**Common Patterns**:
```tsx
// Card container
<div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">

// Button primary
<button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">

// Button secondary
<button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">

// Icon button
<button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Action">
  <Icon className="w-5 h-5" />
</button>
```

### Database Query Patterns

#### Supabase Queries
```typescript
// Basic select
const { data, error } = await supabase
  .from('pq_events')
  .select('*')
  .order('timestamp', { ascending: false })
  .limit(100);

// With foreign key join
const { data, error } = await supabase
  .from('pq_events')
  .select(`
    *,
    substation:substations(name, voltage_level),
    meter:pq_meters(meter_id, status)
  `)
  .eq('substation_id', substationId);

// Complex filter
const { data, error } = await supabase
  .from('pq_events')
  .select('*')
  .gte('timestamp', startDate)
  .lte('timestamp', endDate)
  .in('event_type', ['voltage_dip', 'voltage_swell'])
  .eq('false_event', false);
```

### Performance Optimization

#### Component Optimization
```typescript
// Memoize expensive calculations
const aggregatedData = useMemo(() => {
  return events.reduce((acc, event) => {
    // ...
  }, {});
}, [events]);

// Avoid unnecessary re-renders
const MemoizedComponent = memo(Component, (prevProps, nextProps) => {
  return prevProps.data === nextProps.data;
});
```

#### Database Optimization
- **Indexes**: Add indexes on frequently queried columns
- **Pagination**: Use `.range(start, end)` for large datasets
- **Select Specific Columns**: Avoid `SELECT *` when possible
- **Batch Operations**: Use `.upsert()` for multiple records

### Testing Guidelines

#### Unit Testing
```typescript
// Test utility functions
describe('falseEventDetection', () => {
  it('should detect short duration spikes', () => {
    const event = createTestEvent({ duration_ms: 50 });
    const result = detectFalseEvent(event, rules);
    expect(result.isFalse).toBe(true);
    expect(result.reason).toBe('Short duration spike');
  });
});
```

#### Integration Testing
```typescript
// Test component interactions
describe('EventManagement', () => {
  it('should filter events by date range', async () => {
    const { getByLabelText, getAllByRole } = render(<EventManagement />);
    
    fireEvent.change(getByLabelText('Start Date'), { 
      target: { value: '2025-01-01' } 
    });
    
    await waitFor(() => {
      const events = getAllByRole('listitem');
      expect(events.length).toBeGreaterThan(0);
    });
  });
});
```

### Git Workflow

#### Branch Naming
- `feature/dashboard-root-cause-chart`
- `fix/sarfi-table-visibility-bug`
- `refactor/event-filter-optimization`
- `docs/update-function-design`

#### Commit Messages
```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: feat, fix, refactor, docs, test, chore

**Examples**:
```
feat(dashboard): add root cause analysis chart with independent filtering

fix(sarfi): hide data table by default, controlled by showDataTable flag

refactor(events): migrate root_cause field to cause field
- Create migration to copy data
- Update all components to use cause
- Remove root_cause from database schema

docs(artifacts): create comprehensive project function design document
```

---

## Future Development Roadmap

### Short Term (1-3 months)
1. **Enhanced Analytics**
   - Predictive event analysis using machine learning
   - Advanced pattern recognition for fault prediction
   - Customer segment analysis

2. **Mobile Responsiveness**
   - Optimize dashboard for tablet/mobile devices
   - Touch-friendly event tree navigation
   - Mobile-specific data visualizations

3. **Real-time Updates**
   - WebSocket integration for live event streaming
   - Real-time dashboard refresh
   - Live notification delivery

### Medium Term (3-6 months)
1. **Advanced Reporting**
   - Custom report builder with drag-and-drop
   - Automated report scheduling and distribution
   - Interactive reports with drill-down capabilities

2. **API Development**
   - RESTful API for external integrations
   - GraphQL endpoint for flexible querying
   - Webhook support for event notifications

3. **Machine Learning Integration**
   - False event detection model training
   - Root cause prediction
   - Equipment failure forecasting

### Long Term (6-12 months)
1. **Phase 2 System Integrations**
   - ADMS validation integration
   - GIS spatial analysis features
   - ERP customer data sync
   - SMP maintenance correlation

2. **Advanced Features**
   - Collaborative incident management
   - Workflow automation
   - Mobile app (iOS/Android)
   - Voice-activated queries (Alexa/Google)

3. **Scalability Improvements**
   - Microservices architecture
   - Distributed data processing
   - Time-series database for events
   - Real-time analytics engine

---

## Appendix

### A. Glossary of Terms

- **ADMS**: Advanced Distribution Management System
- **CPDIS**: Centralized Power Distribution Information System
- **CMI**: Customer Minutes Interrupted
- **EN50160**: European voltage characteristics standard
- **IDR**: Incident Data Record
- **IEEE519**: Harmonic control standard
- **IEC61000**: Electromagnetic compatibility standard
- **PQMS**: Power Quality Monitoring System
- **RLS**: Row Level Security (Supabase)
- **SARFI**: System Average RMS Variation Frequency Index
- **THD**: Total Harmonic Distortion
- **UAM**: User Access Management
- **VFD**: Variable Frequency Drive
- **WIS**: Weather Information System

### B. Contact Information

**Development Team**:
- Project Lead: [Contact Info]
- Backend Lead: [Contact Info]
- Frontend Lead: [Contact Info]
- DevOps: [Contact Info]

**Business Stakeholders**:
- Product Owner: [Contact Info]
- CLP Operations: [Contact Info]
- CLP Engineering: [Contact Info]

### C. Related Documents

**Active Documentation**:
- `DATABASE_SCHEMA.md`: Detailed database schema reference (regularly updated)
- `STYLES_GUIDE.md`: UI component patterns and styling guidelines
- `REQUIREMENTS_TRACEABILITY.md`: Requirements mapping to features
- `SARFI_ARCHITECTURE.md`: SARFI calculation detailed design
- `ROOT_CAUSE_RESTORATION.md`: Root cause chart implementation details
- `SUBSTATION_MAP_IMPLEMENTATION.md`: Map visualization technical guide
- `IDR_TAB_IMPLEMENTATION.md`: IDR tab implementation guide (Dec 12, 2025)
- `FILTER_PROFILES_MIGRATION.md`: Filter profile system documentation
- `EVENT_DETAILS_ENHANCEMENT_BRAINSTORM.md`: IDR tab design brainstorming
- `EVENT_DETAILS_UI_MOCKUPS.md`: UI design mockups

**Archived Documentation** (Historical Reference):
- `Archive/CLEANUP_ORPHANED_EVENTS_GUIDE.md`: Orphan cleanup (completed Dec 2025)
- `Archive/METER_SCHEMA_CONFLICT_ANALYSIS.md`: Pre-migration analysis (completed)
- `Archive/SMOKE_TEST_RESULTS.md`: Meter migration testing (completed)
- `Archive/SCHEMA_CONSOLIDATION_REPORT.md`: Schema mismatch analysis (resolved)
- `Archive/PROFILE_ERROR_FIX.md`: Filter profile bug fix (completed)

### D. Recent Updates Log

**Version 1.4 (December 29, 2025)**:
- Added Report Builder module documentation (interactive pivot tables)
- Added saved_reports database table schema
- Updated component list with ReportBuilder widget
- Documented calculated fields feature
- Added report sharing functionality
- Updated tech stack with react-pivottable and plotly.js

**Version 1.3 (December 19, 2025)**:
- Added Meter Availability Report documentation
- Updated Asset Management module with availability monitoring
- Documented mock data generation for PQMS/CPDIS integration
- Added time range configuration patterns

**Version 1.2 (December 15, 2025)**:
- Added Customer Transformer Matching module
- Documented automatic customer impact generation
- Updated circuit ID format (H1/H2/H3)
- Added 25 real CLP substations with production codes

**Version 1.1 (December 15, 2025)**:
- Added Event Database Reorganization script documentation
- Updated Meter Management with 11 new inventory fields
- Documented IDR tab implementation (4th tab in Event Details)
- Added comprehensive IDR field documentation
- Updated migration history with 3 recent migrations
- Reorganized related documents section (active vs archived)

**Version 1.0 (December 11, 2025)**:
- Initial comprehensive documentation
- Root cause migration documentation
- Mother event grouping details
- SARFI calculation architecture

---

**Document Prepared By**: AI Development Assistant  
**Current Version**: 1.4  
**Review Status**: Updated - December 29, 2025  
**Next Review Date**: As needed based on major feature additions

---

*This document serves as the comprehensive functional design reference for PQMAP development. All developers should refer to this document when implementing new features or modifying existing functionality. Keep this document updated as the system evolves.*
