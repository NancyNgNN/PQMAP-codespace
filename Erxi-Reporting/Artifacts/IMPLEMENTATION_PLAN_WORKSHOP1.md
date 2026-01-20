# PQMAP Implementation Plan - Based on Workshop #1
**Date Created:** December 18, 2025  
**Based On:** Workshop #1 Meeting Minutes (Dec 18, 2025)

---

## Executive Summary

Based on Workshop #1, the following major changes are required to align PQMAP with business requirements. This plan prioritizes changes based on:
- **Critical Path**: Dependencies and blockers
- **Business Impact**: Typhoon-critical features vs. nice-to-have
- **Data Availability**: Requires samples from Woody before implementation

---

## 🔴 CRITICAL CHANGES REQUIRED

### 1. Event Management - Multi-Tab Detail View
**Current State:** Separate pages for Event Management, IDR Tab  
**Required State:** Single event detail view with multiple tabs

**Why Critical:** Central architectural decision affecting navigation and UX

**Components to Update:**
- `EventManagement.tsx` - Add event detail modal/page with tab navigation
- Create new tabs:
  - Main Info Tab (existing event data)
  - Waveform Tab (voltage dip visualization) - **NEW**
  - Customer Impact Tab (affected customers/transformers) - **NEW**
  - IDR Tab (move existing IDR content here)
  
**Implementation Steps:**
1. Create `EventDetailModal.tsx` component with tab navigation
2. Create `WaveformTab.tsx` for voltage dip visualization
3. Create `CustomerImpactTab.tsx` for customer/transformer data
4. Move IDR content from standalone page to `IDRTab.tsx`
5. Update EventManagement to open modal instead of navigation
6. Add back button / breadcrumb navigation

**Estimated Effort:** 2-3 days  
**Dependencies:** None  
**Data Needed:** Waveform data structure from PQMS

---

### 2. Event Grouping Logic Update
**Current State:** 10-minute grouping window  
**Required State:** 5-second grouping window

**Why Critical:** Core business logic mismatch

**Components to Update:**
- `src/services/mother-event-grouping.ts`
- Database migration for group_id field
- Event list UI to show grouped events

**Implementation Steps:**
1. Update grouping threshold from 600 seconds to 5 seconds
2. Add visual indicators for grouped events in EventList
3. Add manual group/ungroup buttons
4. Update database schema if needed

**Estimated Effort:** 1 day  
**Dependencies:** None

---

### 3. False Event Toggle & Handling
**Current State:** Mark as false, hide false events by default  
**Required State:** Toggle between normal and false event status, configurable filters

**Why Critical:** Key operational workflow

**Components to Update:**
- `EventManagement.tsx` - Add toggle button (not just mark as false)
- Filter panel - Add "Show False Events" toggle (default OFF)
- Add "Revert to Normal" action for false events

**Implementation Steps:**
1. Update "Mark False" button to "Toggle False Event Status"
2. Add visual indicator (badge/icon) for false events in list
3. Update filter logic to exclude false events by default
4. Add filter toggle to show/hide false events
5. Update export to respect false event filter

**Estimated Effort:** 1 day  
**Dependencies:** None

---

## 🟡 HIGH PRIORITY CHANGES

### 4. IDR Excel Upload Feature
**Current State:** Manual form input via UI  
**Required State:** Excel template upload + manual form as backup

**Why High Priority:** Primary data entry method until ADMS interface available

**Components to Create:**
- `IDRUploadModal.tsx` - Excel upload interface
- Upload validation logic
- Excel template generator for download

**Implementation Steps:**
1. Create Excel template with required IDR fields
2. Add "Upload IDR" button in IDR tab
3. Implement CSV/XLSX parsing with validation
4. Show upload results (success/failed records)
5. Link uploaded IDRs to events automatically if possible

**Estimated Effort:** 2 days  
**Dependencies:** ⏳ **Need IDR export format/sample from Woody**

---

### 5. Voltage Dip Benchmarking Report
**Current State:** Not implemented  
**Required State:** Scatter plot with IEC/SEMI/ITIC standards, all voltage levels

**Why High Priority:** Typhoon-critical report, currently only in PQDA

**Components to Create:**
- `VoltageDropBenchmarking.tsx` report component
- Chart component with color-coded zones (green=compliant, white=non-compliant)
- Standard selection dropdown (IEC 61000, SEMI F47, ITIC)
- Voltage level filter (380V, 11kV, 132kV, 400kV)
- Export chart + data table

**Implementation Steps:**
1. Research standards for zone boundaries
2. Create scatter plot visualization (voltage % vs. duration)
3. Implement color zones based on selected standard
4. Add clickable points to drill down to event details
5. Add export functionality

**Estimated Effort:** 3-4 days  
**Dependencies:** ⏳ **Need voltage dip samples and calculation specs from Woody**

---

### 6. Configurable False Event Detection Rules
**Current State:** Hardcoded detection logic  
**Required State:** Configurable parameters, enable/disable per rule

**Why High Priority:** Testing flexibility, no code changes for threshold adjustments

**Components to Create:**
- `FalseEventRuleConfig.tsx` - Admin settings page
- Database table for rule definitions
- Rule engine service

**Implementation Steps:**
1. Create `false_event_rules` table with parameters
2. Move hardcoded thresholds to database
3. Create admin UI for rule management
4. Add enable/disable toggle per rule
5. Add permission check (admin-only access)
6. Update detection logic to read from database

**Estimated Effort:** 2-3 days  
**Dependencies:** None (can start immediately)

---

### 7. Communication Availability Monitoring
**Current State:** Not implemented  
**Required State:** Dashboard widget + detailed report

**Why High Priority:** Operational need to track meter health

**Components to Create:**
- `MeterHealthDashboard.tsx` widget for Dashboard
- `CommunicationAvailabilityReport.tsx` detailed report
- Data completeness calculation logic (expect 144 records/day per meter)

**Implementation Steps:**
1. Design data availability calculation (10-min intervals = 144/day)
2. Create dashboard widget showing:
   - Total active meters
   - Meters with communication issues
   - Data completeness % (last 24h)
3. Create detailed report with:
   - Meter-level breakdown
   - Missing data periods visualization
   - Time-based analysis (daily/weekly/monthly)
4. Add export functionality

**Estimated Effort:** 2-3 days  
**Dependencies:** ⏳ **Need PQMS 10-min data format from Woody**

---

## 🟢 MEDIUM PRIORITY CHANGES

### 8. Waveform Visualization
**Current State:** Not implemented  
**Required State:** Line chart showing voltage dip waveform in Event Detail

**Components to Create:**
- `WaveformChart.tsx` - Voltage waveform visualization
- Waveform data fetching service

**Implementation Steps:**
1. Confirm waveform data structure from PQMS
2. Create line chart component (voltage vs. time)
3. Add zoom/pan capabilities
4. Show voltage threshold lines
5. Add export waveform as image

**Estimated Effort:** 2 days  
**Dependencies:** ⏳ **Need waveform data structure from PQMS**

---

### 9. Customer Impact with Transformer Mapping
**Current State:** Basic customer-transformer matching table  
**Required State:** Display in Event Detail Customer Impact tab

**Components to Update:**
- Move customer impact display to `CustomerImpactTab.tsx`
- Show affected customers per event
- Link to transformer mapping
- Show impact severity

**Implementation Steps:**
1. Query affected customers based on event location
2. Display customer list with transformer info
3. Calculate impact metrics (customer-minutes interrupted)
4. Add export functionality

**Estimated Effort:** 1-2 days  
**Dependencies:** Transformer mapping data (already exists)

---

### 10. 380V Event Handling Study
**Current State:** Uses same 11kV/132kV grouping logic  
**Required State:** Distinct handling for standalone vs. cascading 380V events

**Why Medium Priority:** Requires data analysis first, then implementation

**Implementation Steps:**
1. ⏳ **Wait for 380V event samples from Woody**
2. Analyze patterns: standalone vs. cascading from higher voltage
3. Define grouping logic requirements
4. Implement separate handling if needed
5. Update event grouping service

**Estimated Effort:** 2-3 days  
**Dependencies:** ⏳ **Need 380V event samples from Woody**

---

### 11. Harmonic Analysis Report
**Current State:** Not implemented  
**Required State:** THD, flicker analysis with voltage-level-specific calculations

**Components to Create:**
- `HarmonicAnalysisReport.tsx`
- Calculation engine based on specs

**Implementation Steps:**
1. ⏳ **Wait for harmonic calculation specs from Woody**
2. Implement calculation formulas per voltage level
3. Create visualization (bar charts, trend lines)
4. Add export functionality

**Estimated Effort:** 2-3 days  
**Dependencies:** ⏳ **Need harmonic calculation specs and CPDS report samples from Woody**

---

## 🔵 LOWER PRIORITY / FUTURE PHASE

### 12. Notification System Enhancements
**Current State:** Basic notification placeholder  
**Required State:** Layered validation (PQMS + PQMAP rules), throttling

**Defer Reason:** Admin-only in Phase 1, not typhoon-critical

**Estimated Effort:** 3-4 days  
**Priority:** Phase 2

---

### 13. PQ Service Logging
**Current State:** Basic service tracking  
**Required State:** Link to events, customer view, 10+ years historical data migration

**Defer Reason:** Low frequency usage, not critical

**Estimated Effort:** 2-3 days  
**Priority:** Phase 2

---

### 14. Automated Report Scheduling
**Current State:** Manual report generation  
**Required State:** Scheduled reports with email distribution

**Defer Reason:** Nice-to-have, not core functionality

**Estimated Effort:** 2-3 days  
**Priority:** Phase 2

---

### 15. Overcurrent Monitoring
**Current State:** Not implemented  
**Required State:** Data model prepared, no UI

**Defer Reason:** Meters support it but PQMS doesn't handle yet

**Estimated Effort:** 1 day (data model only)  
**Priority:** Future phase

---

## 📊 Implementation Roadmap

### Week 1-2 (Dec 18 - Dec 31, 2025)
**Focus:** Critical architectural changes that don't require data samples

✅ **Completed:**
- Collapsible sidebar implementation

🎯 **To Do:**
1. Event Detail Multi-Tab View (2-3 days) - **START IMMEDIATELY**
2. Event Grouping Logic Update (1 day)
3. False Event Toggle & Filter (1 day)
4. Configurable False Event Rules (2-3 days)

**Deliverable:** Event Management with new architecture

---

### Week 3-4 (Jan 1 - Jan 14, 2026)
**Focus:** High-priority features (depends on data samples from Woody)

⏳ **Waiting for Data:**
- IDR export format
- Voltage dip event samples
- PQMS 10-min data format

🎯 **To Do:**
1. IDR Excel Upload (2 days) - When IDR format received
2. Communication Availability Monitoring (2-3 days) - When data format received
3. Waveform Visualization (2 days) - When waveform structure received
4. Customer Impact Tab Integration (1-2 days)

**Deliverable:** Complete Event Detail with all tabs, Upload functionality

---

### Week 5-6 (Jan 15 - Jan 28, 2026)
**Focus:** Reporting features

⏳ **Waiting for Data:**
- Voltage dip calculation specs
- 380V event samples
- Harmonic calculation specs

🎯 **To Do:**
1. Voltage Dip Benchmarking Report (3-4 days)
2. 380V Event Handling Study & Implementation (2-3 days)
3. Harmonic Analysis Report (2-3 days)

**Deliverable:** Typhoon-critical reports operational

---

### Week 7+ (Feb 2026+)
**Focus:** Medium/lower priority features

🎯 **To Do:**
1. Notification System Enhancements
2. PQ Service Logging improvements
3. Report scheduling automation
4. Performance optimization for peak loads

**Deliverable:** Full-featured system ready for production

---

## 📋 Data & Specification Tracking

### Required Before Implementation

| Item | For Component | Priority | Received? | ETA |
|------|---------------|----------|-----------|-----|
| IDR Export Format | IDR Upload | HIGH | ❌ | TBD |
| Voltage Dip Event Samples | Benchmarking Report | HIGH | ❌ | TBD |
| 380V Event Samples | Event Grouping | MEDIUM | ❌ | TBD |
| Harmonic Calculation Specs | Harmonic Report | MEDIUM | ❌ | TBD |
| PQMS 10-Min Data Format | Comm Monitoring | HIGH | ❌ | TBD |
| Waveform Data Structure | Waveform Tab | MEDIUM | ❌ | TBD |
| CPDS Report Samples | Harmonic Report | MEDIUM | ❌ | TBD |
| INU Report Samples | INU Reports | LOW | ❌ | TBD |

**Action:** Follow up with Woody after Dec 24 technical workshop

---

## 🚨 Immediate Actions (This Week)

### Development Team
1. ✅ Review this implementation plan
2. 🔄 **START:** Event Detail Multi-Tab View implementation
3. 🔄 **START:** Update event grouping logic to 5 seconds
4. 🔄 **START:** Implement false event toggle and filter
5. Prepare questions for Woody's technical workshop (after Dec 24)

### Operations Team (Woody)
1. Provide data samples (IDR, voltage dip, 380V events, harmonics)
2. Provide calculation specifications
3. Prioritize reports (mark critical vs. non-critical)
4. Review Excel requirements document

### Design Team (Krystal)
1. Review event detail multi-tab layout (week of Dec 23)
2. Provide UI mockups for new components
3. Validate collapsible sidebar design

---

## 🎯 Success Criteria

### Phase 1 Complete When:
- ✅ Event detail shows all tabs (Main, Waveform, Customer Impact, IDR)
- ✅ Event grouping uses 5-second threshold
- ✅ False events excluded by default, toggle available
- ✅ IDR can be uploaded via Excel
- ✅ Voltage dip benchmarking report operational
- ✅ Communication availability monitoring in place
- ✅ Configurable false event detection rules

### Ready for Typhoon Season When:
- ✅ All typhoon-critical reports functional
- ✅ System performance validated under peak load
- ✅ Notification system tested and validated
- ✅ Data export capabilities verified

---

## 📝 Notes

- **UI/Layout Review:** Week of Dec 23 (Woody on leave)
- **Technical Workshop:** After Dec 24 with Woody for detailed requirements
- **Sprint Planning:** Mid-January when Wilson returns
- **Development Approach:** Prototype → User Stories → Sprint Execution
- **Code Sharing:** Via VS Code/GitHub for team review

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data samples delayed | Implementation blocked | Start with architectural changes first |
| ADMS interface unavailable | IDR manual entry required | Excel upload as primary method |
| Performance issues during typhoons | System slow/unavailable | Load testing, report priority queue |
| 380V logic unclear | Incorrect grouping | Analyze samples thoroughly before implementing |
| PQDA discontinuation | Loss of reports | Migrate critical reports to PQMAP by Q1 2026 |

---

**Next Update:** After technical workshop with Woody (post-Dec 24)
