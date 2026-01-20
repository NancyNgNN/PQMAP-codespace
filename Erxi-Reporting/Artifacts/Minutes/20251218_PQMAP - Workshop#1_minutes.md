# PQMAP - Workshop #1 Summary

**Date:** December 18, 2025  
**Duration:** 1 hour 4 minutes  
**Attendees:** Development Team (Erxi Xu, Kam Tim Fung, Matthew Hok Pun Kung, Ruby), Operations Team (Woody)

---

## Key Decisions

### Event Management Architecture
- **Event as Central Component**: Event list will be the primary interface with filter, search, and export capabilities (CSV/PDF)
- **Event Detail Consolidation**: All event-related information (waveforms, customer impacts, IDR) will be displayed in single view using tabs instead of separate pages
- **False Event Handling**: PQMAP will receive all events from PQMS including false events, with ability to toggle between normal and false event status
- **Event Grouping Logic**: System will automatically group events within 15 seconds at same location; manual group/ungroup functionality will be provided

### Data Integration Strategy
- **IDR Data Source**: Short-term manual input via Excel upload due to missing ADMS interface; plan to implement automated import when interface becomes available
- **CIPDS 380V Events**: Will use same grouping logic as 11kV/132kV events; separate handling for standalone 380V events under consideration
- **Notification System**: Implement from PQMS false event logic but with additional validation layer before sending notifications

### System Logic Migration
- **PQMS Logic Replication**: Migrate existing PQMS false event detection rules to PQMAP while keeping rule parameters configurable
- **Rule Configuration**: Enable/disable individual rules for testing; parameters (voltage %, duration seconds) adjustable via system settings
- **Permission-Based Features**: Notification and false event handling features accessible only to admin/specific user groups in Phase 1

### Reporting Philosophy
- **Report vs Dashboard Separation**: Dashboards show frequently-used KPIs; reports require criteria selection and data export
- **Priority Reports**: Focus on critical reports needed during typhoon events; deprioritize low-frequency reports
- **Data Processing**: Prefer implementing calculations in PQMAP over receiving pre-processed results from PQDA where feasible

---

## Pain Points Identified

| Pain Point | Current Impact | PQMAP Solution |
|------------|----------------|----------------|
| **Manual IDR Entry** | All IDR data manually entered after ADMS interface discontinued | Excel upload feature; automated interface when available |
| **PQDA Dependency** | Will be discontinued; reports currently only in PQDA | Migrate voltage dip benchmarking and other reports to PQMAP |
| **Report Maintenance Effort** | Manual Excel assembly for performance reports | Automated report generation with export functionality |
| **380V Event Handling** | Unclear grouping logic for distribution-level events | Study and define specific logic based on actual event data samples |
| **Communication Monitoring** | Need to track meter data availability and communication health | Implement communication availability dashboard/report |

---

## Priority Action Items

### Immediate (Next 1-2 Weeks)
- Woody to provide IDR export format/samples from ADMS for interface design
- Woody to provide voltage dip event samples with voltage%, duration, transformer mapping for benchmarking logic study
- Woody to provide 380V event samples to determine grouping logic requirements
- Woody to provide harmonic calculation specifications and CPDS report samples
- Team to review and comment on Excel requirements document
- Woody to mark report priorities (critical vs. non-critical during typhoon events)

### Design Phase (January 2025)
- Schedule follow-up workshop with Krystal and team (week of Dec 23) for UI/layout review
- Schedule technical workshop with Woody (after Dec 24) for detailed requirements and logic clarification
- Break down Excel requirements into detailed user stories for development (mid-January)
- Define dashboard KPIs vs. report criteria clearly
- Study feasibility of implementing voltage dip benchmarking calculations in PQMAP

### Planning Items
- Determine if PQMAP should pull 10-minute interval data from PQMS vs. PQDA
- Design communication availability monitoring approach (dashboard vs. report vs. both)
- Clarify overcurrent monitoring feature scope (future phase - meters support but PQMS doesn't handle yet)
- Review duplicate/overlapping reports for consolidation opportunities

---

## Technical Requirements Discussion

### Voltage Dip Benchmarking
- Three international standards: IEC 61000, SEMI F47, ITIC
- Requires plotting voltage dip magnitude vs. duration with color-coded zones (green=compliant, white=non-compliant)
- Currently available in PQDA; needs migration to PQMAP with support for all voltage levels (not just 380V)
- Calculation formulas may differ by voltage level; requires specification documentation

### Event Grouping Logic
- **Time Threshold**: 5 seconds between events at same location
- **Location-Based**: Must occur at same feeder/location
- **380V Special Case**: Standalone 380V events vs. cascading from 11kV/132kV events needs distinct handling
- **Configurable Parameters**: Duration and voltage thresholds for false event detection should be adjustable

### Meter Management
- **Data Availability**: Monitor 10-minute interval data completeness (144 records/day expected)
- **Communication Health**: Track communication status separately from data availability  
- **Dashboard vs. Report**: Dashboard for quick health check (active meters, problem meters); report for detailed analysis
- **Data Format**: PQMS sends data packages every 10 minutes; need to confirm if PQDA can export same format

### PQ Service Logging
- Track PQ investigation services provided to customers (on-site visits, education, voltage dip history provision)
- Link services to related PQ events for impact analysis
- Support customer-level view to show all services provided to specific customers
- Historical data: 10+ years of service records need migration

---

## Next Steps

1. **Immediate**: Woody to provide data samples and specifications for IDR, voltage dip, 380V events, harmonic calculations (by next meeting)
2. **Week of Dec 23**: UI/layout review workshop with Krystal and design team (Woody on leave)
3. **After Dec 24**: Technical requirements workshop with Woody for detailed logic discussion (event grouping, false event rules, report specifications)
4. **Mid-January**: Begin converting Excel requirements into detailed user stories for sprint planning
5. **Technical Design**: Await project start confirmation and technical design schedule from PM (Wilson returns Dec 24)

---

## Function Design Updates

### Event Management Module

#### Features Added/Updated
- **Event List View**
  - Filter panel with multiple criteria (category, date range, feeder, etc.)
  - Search functionality
  - Export to CSV/PDF
  - Default view excludes false events; toggle filter to view false events
  
- **Event Detail View (Multi-Tab Layout)**
  - **Main Tab**: Event metadata (category, timestamp, location, magnitude, duration)
  - **Waveform Tab**: Voltage dip waveform visualization
  - **Customer Impact Tab**: List of affected customers and transformers
  - **IDR Tab**: Interruption Detail Records with upload capability
  - **Actions**: Mark as false event / revert to normal event

- **Event Grouping**
  - Automatic grouping: Events within 5 seconds at same location
  - Manual operations: Create group, add to group, ungroup
  - Group visualization in event list

#### Data Model Changes
- **Event Entity**
  - Add `is_false_event` boolean flag
  - Add `group_id` for event grouping
  - Add `event_category` (voltage dip, swell, interruption, etc.)
  - Add `notification_sent` flag
  
- **IDR Entity (New)**
  - IDR number
  - Related event_id
  - Cause/root cause
  - Duration
  - Affected customers
  - Source: Manual upload or future ADMS interface

- **Event-Customer Relationship**
  - Many-to-many relationship
  - Include transformer mapping
  - Track customer impact severity

#### UI/UX Changes
- Consolidate all event-related information in single page with tabs (avoid navigation between pages)
- Event list supports quick filtering and sorting
- Visual indicators for grouped events, false events
- Export functionality available at both list and detail levels

---

### Notification System Module

#### Features Added/Updated
- **False Event Detection Rules**
  - Migrate PQMS rule logic (duration thresholds, voltage % thresholds)
  - Configurable rule parameters via system settings
  - Individual rule enable/disable for testing
  - Admin-only access in Phase 1

- **Notification Flow**
  - Receive events from PQMS (including false events flagged by PQMS)
  - Apply additional validation rules in PQMAP before notification
  - Send email notifications only after passing both PQMS and PQMAP validation

#### Data Model Changes
- **Notification Rules Table**
  - Rule name
  - Rule type (duration threshold, voltage threshold, etc.)
  - Parameters (configurable values)
  - Enabled/disabled status
  
- **Notification Log**
  - Event_id
  - Notification timestamp
  - Recipients
  - Rule results (which rules triggered/blocked notification)

---

### Reporting Module

#### Features Added/Updated

**High Priority Reports (Typhoon-Critical)**
- **PQ Event Summary Report**: Aggregated event statistics by time period, location, type
- **Voltage Dip Benchmarking Report**: Scatter plot with IEC/SEMI/ITIC standards comparison
  - Support all voltage levels (380V, 11kV, 132kV, 400kV)
  - Color-coded zones (compliant/non-compliant)
  - Clickable points to drill down to event details
  - Export chart and underlying data table

**Medium Priority Reports**
- **Communication Availability Report**: Meter data completeness (10-min interval) and communication health
  - Time-based analysis (daily/weekly/monthly)
  - Meter-level details showing missing data periods
  - Percentage calculations for data/communication availability
  
- **Harmonic Analysis Report**: THD, flicker analysis across voltage levels
  - Requires specification for calculation formulas
  - Different factors/standards per voltage level

**Lower Priority Reports (To Be Specified)**
- Data maintenance reports (voltage, flicker, harmonics - 10-min intervals)
- INU performance reports (manual Excel assembly currently)
- PQ service reports (by customer, by event)

#### Data Model Changes
- **Report Definition Table**
  - Report name, category
  - Default parameters
  - User permissions
  - Priority level (for resource management during peak times)

- **Report Schedule Table** (Future)
  - Automated report generation schedule
  - Email distribution lists

---

### Dashboard Module

#### Features Added/Updated
- **KPI Dashboard**: Real-time metrics (event counts by severity, recent events, notification status)
- **Meter Health Dashboard**: Active meters count, problem meters list, data availability quick view
- **System Monitor Dashboard**: False event detection activity, notification queue status

#### UI/UX Changes
- Separate dashboard from reports (no criteria selection needed)
- Frequently-viewed metrics always visible
- Quick links to detailed reports from dashboard widgets

---

### Data Integration Requirements

#### PQMS Interface
- **Event Data**: Real-time event feed including false event flags
- **10-Minute Interval Data**: Voltage, current, power quality parameters
- **Export Format**: Need to confirm if PQMS can provide same format as current PQDA exports

#### ADMS Interface (Future)
- **IDR Data**: Automated import of interruption detail records (currently unavailable)
- **Expected Volume**: 20-30 records/month normal; higher during typhoons

#### CPDS Interface
- **380V Event Data**: Distribution-level voltage dip events
- **Data Format**: Similar to PQMS events but different field names/structure
- **Grouping Challenge**: Determine if 380V events cascade from higher voltage levels or are independent

#### PQDA Migration
- **Historical Data**: Voltage dip historical records for benchmarking reports
- **Report Templates**: Migrate report formatting and calculation logic

---

### System Configuration Module

#### Features Added/Updated
- **False Event Rule Configuration**
  - Parameter adjustment interface (voltage %, duration seconds)
  - Rule testing mode
  - Rule priority/sequence management
  
- **Notification Configuration**
  - Email recipient management by user group
  - Notification templates
  - Throttling rules (prevent notification spam during typhoons)

- **Meter Management**
  - Meter registration and metadata
  - Transformer mapping
  - Customer assignment
  - Communication monitoring settings

---

### New Requirements Identified

1. **Excel Upload Functionality**: Support IDR data import via Excel template until ADMS interface available
2. **Configurable Detection Rules**: All false event detection thresholds must be configurable without code changes
3. **Permission-Based Feature Access**: Notification system and false event management restricted to admin users in Phase 1
4. **Historical Data Migration**: 10+ years of PQ service records need import from legacy system
5. **Multi-Standard Support**: Voltage dip benchmarking must support IEC 61000, SEMI F47, ITIC with configurable profiles
6. **380V Event Handling**: Dedicated logic study required based on actual CPDS event data samples
7. **Performance Optimization**: Report generation must handle peak loads during typhoon events without degrading system performance
8. **Overcurrent Monitoring (Future)**: Meters support overcurrent monitoring; prepare data model but no UI implementation in Phase 1

---

### Data/Specification Needs for Prototype Development

| Item | Purpose | Provider | Status |
|------|---------|----------|--------|
| IDR Export Format | Design upload interface | Woody | Pending |
| Voltage Dip Event Samples | Validate benchmarking logic | Woody | Pending |
| 380V Event Samples | Define grouping logic | Woody | Pending |
| Harmonic Calculation Specs | Implement calculation formulas | Woody | Pending |
| INU Performance Report Samples | Design report format | Woody/Matthew | Pending |
| CPDS Report Examples | Understand data structure | Woody | Pending |
| PQMS 10-Min Data Format | Design data import | Woody | Pending |
| Communication Monitoring Spec | Clarify calculation logic | Woody | Pending |

---

## Notes

- Meeting conducted as first technical workshop to review functional requirements
- Prototype development using VS Code with plan to share code for team review
- Some reports from PQDA may be deprioritized or consolidated to reduce redundancy
- Technical design phase expected to start mid-January 2025 after PM returns from leave
- UI/layout review scheduled for next week (Woody on leave)
- Detailed logic and requirements workshop scheduled after December 24
- Development approach: Excel requirements → User stories → Sprint planning (mid-January)
- Team expressed confidence that prototype approach aligns well with final requirements
