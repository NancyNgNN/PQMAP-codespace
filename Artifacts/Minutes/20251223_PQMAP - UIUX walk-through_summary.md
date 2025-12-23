# PQMAP - UI/UX Walk-through Summary

**Date:** December 23, 2025  
**Duration:** 59 minutes 48 seconds  
**Attendees:** Development Team (Erxi Xu, Kam Tim Fung, Simon Yu), Operations Team (Krystal, Matthew)

---

## Key Decisions

### Event Management UI Layout
- **Card View vs. List View**: Current prototype shows card-based layout; team prefers traditional table format for higher information density
- **Data Display Priority**: Compact row-based list view preferred to show more events per screen (18+ events vs. current 6)
- **Event Grouping by Type**: Voltage dip and harmonic events should remain separate; group filtering by event category supported
- **Event Detail Consolidation**: Tab-based detail view with Overview, Customer Impact, Waveform, IDR, and Logging tabs approved

### Filter & Profile System
- **Filter Profile Feature**: Approved to implement user-specific saved filter configurations to avoid re-selecting criteria after page refresh
- **Default Profile**: System will support default profile per user; auto-load on page open
- **Profile Priority**: Defer to Phase 2 - focus on core functionality first; nice-to-have feature

### Dashboard vs. Report Philosophy
- **Dashboard Definition**: Frequently-viewed KPIs with no filter selection required; always visible metrics
- **Report Definition**: Criteria-based data retrieval with table/chart output and export capability
- **Custom Reporting Flexibility**: Cannot match Power BI flexibility; provide fixed report templates with export to Excel/CSV for advanced analysis in Power BI

### Meter Management
- **Meter States**: Three states confirmed - Active (normal), Active-Abnormal (receiving data but out of expected range), Inactive (no communication)
- **Volume**: ~600 PQMS meters + ~200 CPDS meters currently; will grow over time but manageable volume
- **IP Address Tracking**: Confirmed as required field; manual entry acceptable if PQMS vendor cannot provide via interface

---

## Pain Points Identified

| Pain Point | Current Impact | PQMAP Solution |
|------------|----------------|----------------|
| **Event correlation visibility** | Cannot see relationships between voltage dip and harmonic events in PQMS | Same timestamp allows manual investigation; AI-driven prediction deferred to future phase |
| **Meter health monitoring** | Rely on email alerts for inactive/abnormal meters | Dashboard widget showing active/abnormal/inactive meter counts with drill-down |
| **Report customization limits** | Power BI used for ad-hoc analysis; PQMAP cannot match flexibility | Provide data export to Power BI; implement common report templates in PQMAP |
| **IP address maintenance** | Manual entry in multiple systems; time-consuming and error-prone | Centralized meter management with IP address field |
| **PQ Service integration** | Separate PQSIS system; data not visible in PQ context | View-only dashboard in PQMAP; maintenance remains in PQSIS with data interface |

---

## Priority Action Items

### Immediate (This Week)
- Team to review prototype and provide detailed UI feedback via email/comments
- Krystal/Matthew to provide list of frequently-viewed columns from PQDA reports for card design optimization
- Matthew to provide Power BI dashboard samples to assess custom reporting requirements
- Team to confirm PQMS abnormal meter email format for dashboard logic design
- Team to provide CPDS customer and event data exports for data model validation

### Design Refinements (Before Next Workshop)
- Compress card layout to show more events per screen
- Customize card fields per event category (voltage dip vs. harmonic different columns)
- Evaluate filter panel display options: inline expansion vs. slide-out panel
- Research feasibility: Power BI direct integration vs. scheduled data export

### Next Workshop (Week of Dec 30)
- Detailed logic discussion with Woody (event grouping, false event detection, report calculations)
- Review common report requirements and prioritize implementation sequence
- Clarify PQ Service integration scope and user workflow

### User Research Needs
- Identify representative end users (district staff, SO staff) for feedback sessions
- Understand district staff device usage patterns (desktop vs. mobile/tablet)
- Confirm if district staff use waveform analysis (impacts UI complexity requirements)

---

## Technical Requirements Discussion

### Filter Profile Implementation
- **User-Level Profiles**: Each user can create/save multiple filter configurations
- **Profile Components**: Time range, event category, feeder/substation, meter selection, date range
- **Default Profile**: Auto-load designated default profile on page open
- **Profile Management**: Create, update, delete, set as default operations

### Event Display Optimization
- **List View Priority**: Focus on compact table layout showing 15-18 events per viewport
- **Customizable Columns**: Allow users to select which columns to display (similar to metering system approach)
- **Event Category Filtering**: Quick filters for voltage dip, harmonic, interruption, etc.
- **Sorting/Search**: Standard table sorting and search functionality across all visible columns

### Dashboard Requirements
- **Meter Health Dashboard**:
  - Active meter count
  - Abnormal meter list (receiving data but out of range)
  - Inactive meter list (no communication)
  - Replace email-based monitoring with visual dashboard
  
- **Event Summary Dashboard**:
  - Event counts by category (voltage dip, harmonic, interruption)
  - Event counts by substation/region with bubble map visualization
  - Root cause analysis summary (based on available data)

### Report Export Strategy
- **Excel Export**: Include both chart (as image) and underlying data table
- **CSV Export**: Data table only (no charts)
- **Advanced Option**: Research embedding editable charts in Excel using same dataset (lower priority)
- **Power BI Integration**: Provide data export format compatible with Power BI import (either scheduled export or API integration - to be determined)

### Meter Management Requirements
- **Required Fields**: Meter ID, location, IP address, communication protocol
- **Optional Fields**: Additional metadata from PQMS if available
- **Manual Entry**: Support manual IP address entry if PQMS vendor cannot provide
- **Status Monitoring**: Track communication health and data quality separately

### PQ Service Module
- **Integration Approach**: PQSIS remains system of record for service case creation/maintenance
- **PQMAP Role**: View-only dashboard showing service statistics and customer service history
- **Data Interface**: Scheduled data sync from PQSIS to PQMAP (owned by Tim's team)
- **Dashboard Widgets**: 
  - Monthly service count
  - Service type breakdown (on-site visit, education, voltage dip history provision, etc.)
  - Customer service history list
  - Link to PQSIS for case details (similar to PQDA approach)

---

## UI/UX Feedback Summary

### What's Working Well
- **Modern Visual Design**: Team appreciates cleaner, more modern interface compared to legacy systems
- **Consolidated Event View**: Tab-based approach to show all event-related information in one place is approved
- **Filter Profile Concept**: Welcomed as time-saver for repetitive filter operations
- **Export Functionality**: Excel/CSV export on all reports aligns with current workflow needs

### What Needs Improvement
- **Information Density**: Current card layout shows too few events per screen; need more compact presentation
- **Column Visibility**: Not all frequently-viewed fields are visible in default card layout
- **Filter Panel UX**: Need to evaluate whether inline expansion or slide-out panel works better
- **Custom Report Flexibility**: Acknowledge PQMAP cannot match Power BI; ensure good export path exists

### Design Considerations for Next Iteration
1. **Compact List View**: Make default view; offer card view as optional toggle
2. **Customizable Columns**: Allow users to select 10-30 columns from available fields
3. **Event Category Differentiation**: Show different column sets for voltage dip vs. harmonic events
4. **Filter Position**: Consider moving profile selector to more prominent position; defer advanced profile management to Phase 2
5. **Mobile/Tablet Support**: Clarify if district staff use mobile devices (impacts responsive design priority)

---

## Next Steps

1. **This Week**: Team to review prototype independently and provide detailed UI feedback
2. **By Dec 27**: Collect sample reports/dashboards from Power BI and PQDA for requirements analysis
3. **Week of Dec 30**: Detailed logic workshop with Woody (event grouping, false event rules, report calculations)
4. **By Jan 3**: Development team to update UI mockups based on feedback and present refined design
5. **Ongoing**: Continue CPDS data sample collection for integration testing

---

## Function Design Updates

### Event Management Module - UI Refinements

#### List View Optimization
- **Default Layout**: Compact table view showing 15-18 events per viewport
- **Column Configuration**:
  - Event ID, Timestamp, Category, Magnitude (%), Duration (s), Location, Affected Customers, Status
  - User-selectable columns (allow showing/hiding columns based on preference)
  - Different default column sets for voltage dip vs. harmonic events
  
- **Card View (Optional Toggle)**:
  - Compress card height to show 3 events per row
  - Display only most critical fields (6-8 fields max per card)
  - Quick action buttons (View Details, Mark False, Export)

#### Event Detail View - Tab Structure
**Confirmed Tabs**:
1. **Overview Tab**: Event metadata, key metrics, status, false event flag, mother-child relationship indicator
2. **Customer Impact Tab**: Affected customers and transformer list with export capability
3. **Waveform Tab**: Voltage dip waveform visualization
4. **IDR Tab**: Interruption Detail Records (manual upload or future ADMS interface)
5. **Logging Tab**: Audit trail showing all updates/status changes with user and timestamp

**New Requirement**: Mother-child event relationship display
- Visual indicator in list view for events with relationships
- Ability to manually link related events (e.g., voltage dip → harmonic correlation)
- Cross-reference tab showing related events by same meter or timeframe

#### Filter Profile System
**User Interface**:
- Profile dropdown selector in header (persistent across all pages)
- Quick "Save Current Filters" button
- Profile management dialog: Create, Edit, Delete, Set as Default
- Default profile auto-loads on login

**Profile Settings**:
- Event category selection
- Date range (relative: last 7 days, last month, etc. OR absolute dates)
- Location/feeder/substation selection
- Meter selection
- Status filters (include false events, exclude false events, only false events)

**Implementation Priority**: Defer to Phase 2 based on development capacity

---

### Dashboard Module - New Requirements

#### Meter Health Dashboard
**Widgets**:
- **Summary Cards**: Total meters, Active count, Abnormal count, Inactive count
- **Abnormal Meter List**: Table showing meter ID, location, issue description, duration
  - Sort by issue severity
  - Click to view meter detail page
  - Export to Excel capability
  
- **Inactive Meter List**: Table showing meter ID, location, last communication timestamp
  - Auto-highlight meters inactive > 24 hours
  - Export to Excel capability

**Data Source**: 
- PQMS communication log (10-minute interval data availability tracking)
- Abnormal state detection based on voltage range thresholds (to be confirmed with Woody)
- Replace current email-based monitoring workflow

#### Event Summary Dashboard
**Widgets**:
- Event count by category (bar chart): Voltage dip, Harmonic, Interruption, Swell
- Event count by substation/region (bubble map or bar chart)
- Root cause analysis summary (if data available from investigations)
- Recent critical events list (configurable threshold)

**Filter Options**: Time range selector (today, last 7 days, last 30 days, custom range)

---

### Reporting Module - Export Strategy

#### Standard Report Features
**Every Report Includes**:
- Filter/criteria selection panel (with profile support)
- Chart/visualization output
- Data table below chart
- Export buttons: Excel (chart + table), CSV (table only)

**Excel Export Format**:
- Sheet 1: Chart as embedded image + key parameters used
- Sheet 2: Raw data table
- Alternative (if feasible): Embedded Excel chart with data connection for user editing

**CSV Export Format**:
- Raw data table only
- UTF-8 encoding with BOM for proper Chinese character display

#### Power BI Integration Options
**Option 1 - Scheduled Export (Recommended for Phase 1)**:
- PQMAP generates data export files on schedule (daily/weekly)
- Export location: shared network drive or cloud storage
- Power BI imports from file location
- Pros: Simpler implementation, lower coupling
- Cons: Not real-time, requires file management

**Option 2 - API Integration (Future Enhancement)**:
- PQMAP exposes REST API for data queries
- Power BI connects directly to PQMAP API
- Pros: Real-time data, more flexible
- Cons: Higher development effort, requires API authentication/security

**Option 3 - Manual Export (Fallback)**:
- Users export data from PQMAP to Excel/CSV
- Manually import to Power BI for advanced analysis
- Pros: Zero additional development
- Cons: Manual process, not scalable

**Decision**: Implement Option 3 immediately, evaluate Option 1 or 2 based on user demand and development capacity

---

### Meter Management Module - Field Requirements

#### Meter Entity - Confirmed Fields
**Required Fields**:
- Meter ID (unique identifier)
- Location (substation/feeder)
- IP Address (manual entry supported)
- Communication Protocol (from PQMS if available)
- Status (Active/Abnormal/Inactive)

**Optional Fields** (if available from PQMS):
- Serial Number
- Installation Date
- Manufacturer
- Model
- Firmware Version
- Sampling Rate

#### Meter Status Logic
**Active (Normal)**:
- Receiving 10-minute interval data on schedule (144 records/day expected)
- Data values within expected ranges (voltage, current thresholds TBD)

**Active (Abnormal)**:
- Receiving data on schedule BUT values outside expected ranges
- Examples: Constant zero readings, voltage consistently at 300V when expecting 11kV
- Threshold ranges to be confirmed with Woody

**Inactive**:
- No communication/data received for defined period (TBD: 1 hour? 24 hours?)
- PQMS interface down or meter hardware failure

#### Meter Management Operations
- **Manual Entry**: Add new meter with all required fields
- **Bulk Import**: Excel template upload for multiple meters
- **Edit**: Update meter metadata (location, IP address, etc.)
- **Status Override**: Manually mark meter as under maintenance (exclude from health monitoring)
- **Export**: Download meter list with current status

---

### PQ Service Module - Integration Approach

#### Confirmed Architecture
**PQSIS (Service Investigation System)**:
- Remains authoritative system for service case management
- Service team continues using PQSIS for case creation, updates, closure
- Owned and maintained by separate team (Tim's team)

**PQMAP Role**:
- View-only dashboard consuming data from PQSIS via interface
- No case creation/editing in PQMAP
- Purpose: Provide visibility of PQ service activities in context of PQ event data

#### Dashboard Widgets
1. **Service Statistics Card**:
   - Total services this month/year
   - Service type breakdown (pie chart or bar chart)
   - Top customers by service count
   
2. **Customer Service History**:
   - Left panel: Customer list with service count
   - Right panel: Service history for selected customer (date, type, description)
   - Link to PQSIS for full case details (opens in new tab)

3. **Service Timeline** (optional):
   - Gantt chart showing service case duration
   - Filter by service type, customer, date range

#### Data Interface Specification
**Interface Type**: Scheduled data sync (Tim's team to implement)
**Sync Frequency**: Daily or near-real-time (TBD based on PQSIS capabilities)
**Data Elements**:
- Service Case ID
- Customer ID/Name
- Service Type (on-site visit, education, voltage dip history, equipment testing, etc.)
- Service Date
- Service Description/Notes
- Status (Open/In Progress/Closed)
- Assigned Engineer
- Related PQ Event ID (if applicable)

**PQMAP Database**:
- Create read-only copy of PQSIS service data
- Support filtering, sorting, export operations
- No write operations back to PQSIS

---

### Custom Reporting - Requirements Gathering

#### Action Items for Next Meeting
1. **Krystal/Matthew to provide**:
   - Screenshots or export samples from current Power BI dashboards
   - List of most frequently used reports and their purpose
   - Examples of ad-hoc analysis scenarios that require Power BI flexibility

2. **Development team to assess**:
   - Which Power BI reports can be replicated as fixed templates in PQMAP
   - Which reports require Power BI flexibility (recommend export path)
   - Feasibility of "pivot table-like" functionality within PQMAP (likely out of scope)

#### Common Report Templates (Preliminary)
Based on discussion, likely candidates for fixed templates:
- Voltage dip event summary by substation/month
- Harmonic analysis by voltage level
- Meter communication availability report
- Event root cause analysis summary
- False event detection performance metrics

**Approach**: Implement 5-10 most common reports as fixed templates with configurable parameters; provide data export for everything else

---

### Outstanding Questions

| Question | Owner | Needed By |
|----------|-------|-----------|
| Abnormal meter threshold specifications (voltage ranges, acceptable deviation) | Woody | Next workshop |
| PQMS email format for abnormal/inactive meter alerts | Krystal/Matthew | This week |
| CPDS customer data export (format, available fields) | Matthew | This week |
| CPDS event data export (format, event types included) | Matthew | This week |
| Power BI dashboard samples and common report requirements | Krystal | Before next workshop |
| District staff device usage patterns (desktop vs. mobile) | Krystal | Next workshop |
| Expected user count growth trajectory (affects system capacity planning) | Woody | Next workshop |
| PQSIS data interface specification and sync frequency | Tim | Next workshop |
| Preferred filter panel UI pattern (inline expansion vs. slide-out panel) | Team feedback | This week |

---

## Notes

- Workshop format: Casual prototype walk-through; not formal sign-off session
- Prototype is live and accessible for team review at provided URL
- Focus of this session: UI/UX feedback only; detailed logic discussion deferred to next workshop with Woody
- Team expressed appreciation for modern design aesthetic compared to legacy systems
- Acknowledged that Power BI cannot be fully replicated; export strategy is acceptable compromise
- PQ Service integration scope clarified: view-only dashboard, no case management in PQMAP
- Meter count (~800 total) is manageable; filter performance not a concern at this scale
- User base clarification: ~100+ accounts but typically 10-15 concurrent users during normal operations; increases during typhoon events
- Next workshop timing challenging due to holiday period; team to coordinate after December 24
