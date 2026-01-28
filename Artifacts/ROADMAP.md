# Product Roadmap

**Document Purpose:** Capture planned features and future development initiatives  
**Last Updated:** January 27, 2026  
**Status:** In Progress

---

## Table of Contents
1. [Roadmap Overview](#roadmap-overview)
2. [In Progress (Q1 2026)](#in-progress-q1-2026)
3. [Short-term (Q2 2026)](#short-term-q2-2026)
4. [Medium-term (Q3-Q4 2026)](#medium-term-q3-q4-2026)
5. [Long-term (2027+)](#long-term-2027)
6. [Power BI Integration (Optional)](#power-bi-integration-optional)
7. [Deferred / Under Evaluation](#deferred--under-evaluation)

---

## Roadmap Overview

### Development Priorities
1. **Core Functionality** (Q1 2026): Complete data maintenance features
2. **User Experience** (Q2 2026): Advanced filtering, multi-device sync
3. **Analytics** (Q3-Q4 2026): Predictive analytics, AI-powered insights
4. **Enterprise Integration** (2027+): Power BI SSO, REST API, microservices

### Key Metrics
- **Current Database:** 17 tables, 32 applied migrations
- **User Base:** 100 internal users (admin/operator/viewer roles)
- **Event Volume:** ~20,000 PQ events per year
- **Refresh Rate:** 15-minute data updates

---

## In Progress (Q1 2026)

### ✅ Completed (January 2026)
1. **Weighting Factors** (Jan 7) - `sarfi_profile_weights.customer_count`
   - Auto-calculate SARFI weights based on customer distribution
   - Manual override with audit trail
   - Real-time weight calculation display

2. **PQ Benchmarking Standard** (Jan 7) - `pq_benchmark_standards`, `pq_benchmark_thresholds`
   - IEC/SEMI/ITIC international standards
   - 14 voltage thresholds per standard
   - CSV import/export for compliance tables
   - RLS policies for role-based access (Jan 12)

3. **Harmonic Events Table** (Jan 9) - `harmonic_events`
   - Separate table for harmonic-specific measurements
   - 12 parameters per event: THD, TEHD, TOHD, TDD for 3 current phases (I1, I2, I3)
   - 1:1 relationship with pq_events (event_type = 'harmonic')
   - Backfill script for existing harmonic events

4. **Customer Transformer Matching** (Dec 2025)
   - Circuit-customer relationship tracking
   - Auto customer impact via PostgreSQL trigger
   - H1/H2/H3 transformer code support

5. **Root Cause Analysis Restoration** (Dec 2025)
   - `cause` + `cause_detail` fields (replaced `root_cause`)
   - 7 major categories, 27 subcategories
   - Backfill script for existing events

### ✅ Completed (Q1 2026)
1. **Enterprise Notification System Migration** ⭐ (Jan 13-14, 2026)
   - **Status:** Days 1-4 COMPLETED, Day 5 pending
   - **Purpose:** Transform basic notifications into enterprise-grade notification center
   - **Completed Features:**
     - ✅ Day 1-2: Database migration (7 new tables) + backend services (notificationService.ts, 800+ lines)
     - ✅ Day 3: Template Management UI (TemplateList, TemplateEditor, TemplateApprovalModal)
     - ✅ Day 4: Channel/Group/Rule Management UI (6 components, 2000+ lines total)
   - **Database Changes:**
     - Removed: `notifications`, `notification_rules` (old tables)
     - Added: `notification_channels`, `notification_templates`, `notification_groups`, 
              `notification_group_members`, `notification_rules` (new), `notification_logs`, 
              `notification_system_config`
   - **Key Capabilities:**
     - Template engine with variable substitution ({{event_id}}, {{severity}}, etc.)
     - Multi-channel delivery (Email/SMS/Teams) with per-channel configuration
     - Complex rule builder (9 field types, 9 operators, AND logic between conditions)
     - Notification groups with per-member channel preferences (independent from UAM roles)
     - Draft → Approved workflow (operators create, admins approve)
     - PQ-specific features: Typhoon mode, Mother event only, Include waveform
   - **Components Created:**
     - Templates: TemplateList (350 lines), TemplateEditor (600 lines), TemplateApprovalModal (280 lines)
     - Channels: ChannelManagement (340 lines) with SMTP/SMS/Teams config
     - Groups: GroupList (240 lines), GroupEditor (410 lines) with member assignment
     - Rules: RuleList (290 lines), RuleBuilder (550 lines) with condition builder
   - **Pending:** Day 5 - Notification Logs UI, System Config UI, Integration with event workflow, End-to-end testing
   - **Related Documents:** 
     - [NOTIFICATION_SYSTEM_MIGRATION_PLAN.md](NOTIFICATION_SYSTEM_MIGRATION_PLAN.md)
     - [DAY2_COMPLETION_GUIDE.md](DAY2_COMPLETION_GUIDE.md)
     - [DAY3_COMPLETION_SUMMARY.md](DAY3_COMPLETION_SUMMARY.md)

### 🔄 In Development (January 2026)
1. **Filter Profiles** (Week 2-3) - `filter_profiles` table
   - **Purpose:** Save user filter configurations across devices
   - **Status:** Migration created (`20251210000000_create_filter_profiles.sql`) but NOT applied
   - **Scope:** 
     - Save filter state (date range, severity, meters, substations)
     - Sync across mobile/desktop
     - Quick filter templates (e.g., "Last 7 Days Critical Events")
   - **Blocking Issues:** None, ready to apply

2. **Meter Availability Module** (Week 3-4)
   - **Purpose:** Track meter online/offline status with timeline visualization
   - **Status:** Database migration applied, UI development ongoing
   - **Scope:**
     - `meter_availability` table with hourly resolution
     - Timeline chart showing availability periods
     - Availability percentage calculation
     - Integration with SCADA system
   - **Components:**
     - Backend: `meterAvailabilityService.ts`
     - Frontend: `MeterAvailabilityPage.tsx`

### 🎯 Planned (Q1 2026)
1. **Notification System Day 5 Completion** ⭐ **PRIORITY** (Week 3)
   - **Purpose:** Complete final UI components and integration
   - **Scope:**
     - NotificationLogs component with filtering (by rule, event, channel, status, date range)
     - System Configuration UI (typhoon mode toggle, global settings)
     - Integration with event creation workflow (auto-trigger notifications)
     - End-to-end testing (create rule → trigger event → verify notification)
   - **Estimated Effort:** 2 days

2. **User Profile Seeding** ✅ **COMPLETED** (Jan 14, 2026)
   - **Purpose:** Populate profiles table with dummy users for notification group demonstration
   - **Status:** Migration created and ready to apply
   - **Scope:**
     - 10 dummy users: 3 admins, 4 operators, 3 viewers
     - Migration: `supabase/migrations/20260114000001_seed_dummy_users.sql`
     - **Critical Fix:** Correctly maps UAM roles to database enum values
       - UAM: system_admin/system_owner → Database: 'admin'
       - UAM: manual_implementator → Database: 'operator'
       - UAM: watcher → Database: 'viewer'
     - Temporarily drops FK constraint to auth.users for demo purposes
   - **Documentation:** `scripts/DATABASE_USER_ROLES_REFERENCE.md` (prevents future enum errors)

3. **System Parameters Module** (Week 4)
   - **Purpose:** Centralized configuration for system-wide settings
   - **Status:** UI placeholder created, functionality to be implemented
   - **Scope:**
     - Notification thresholds and alert rules configuration
     - Event detection parameters (sensitivity levels, detection algorithms)
     - Data retention policies and archival settings
     - System integration configurations (SCADA, ADMS)
     - User preference defaults (date formats, units, themes)
     - Global operational parameters
   - **Technical Approach:**
     - Create `system_parameters` table with key-value pairs
     - Role-based access control (admin-only modifications)
     - Audit trail for parameter changes
     - Real-time parameter updates via Supabase subscriptions
   - **Components:**
     - Parameter categories (Notifications, Detection, Retention, Integration)
     - Parameter editor with validation
     - Change history viewer
   - **Estimated Effort:** 2 weeks

4. **Advanced Export Options** (Week 4)
   - Export filtered data to Excel with formatting
   - PDF reports with charts
   - Scheduled email reports

5. **Event Management Module Restructure** (Week 4)
   - **Purpose:** Restructure event management to focus on voltage dip/swell events
   - **Key Changes:**
     - Event Management module shows only voltage_dip and voltage_swell events
     - Other PQ event types (harmonic, interruption, transient) moved to AssetManagement.tsx
     - Users select specific PQ meter in AssetManagement to view related events
   - **UI Updates:**
     - EventManagement.tsx: Filter to show only voltage dip/swell
     - AssetManagement.tsx: Add event viewing capability for selected meter
   - **Estimated Effort:** 1 week

6. **Advanced Filter Button in Event Management** ✅ **COMPLETED** (Jan 28, 2026)
   - **Purpose:** Add comprehensive filtering for voltage dip/swell events
   - **Completed Features:**
     - ✅ "Advanced Filter" button next to "Reset All" in EventManagement module
     - ✅ Comprehensive filter modal with VL1/VL2/VL3 voltage range inputs
     - ✅ Substation multi-select dropdown with checkbox list
     - ✅ Transformer number multi-select (H1, H2, H3 from customer_transformer_matching)
     - ✅ IDR No. text input with partial match search
     - ✅ Ring Number text input for circuit ring filtering
     - ✅ Date range inputs in modal
     - ✅ Apply + Clear All buttons
     - ✅ Integration with existing filter profiles system (saveable)
   - **UI Components:**
     - AdvancedFilterModal component (380+ lines) with scrollable content
     - Integrated with EventManagement.tsx filter logic
     - Gradient blue header matching PQMAP design system
   - **Implementation Notes:**
     - V1/V2/V3 filters use min/max range inputs for remaining voltage %
     - Transformer filtering ready (requires backend join implementation)
     - Ring number filtering ready (requires ring_number field in pq_meters table)
     - IDR partial match implemented using existing idr_no field
   - **Estimated Effort:** 3 days → **Actual: 1 day**

7. **Special IDR Upload Feature** (Week 4-5)
   - **Purpose:** Automated mapping of IDR records to PQ events using timestamp and substation
   - **Key Features:**
     - Excel upload with multiple IDR records
     - Automatic mapping using timestamp ± tolerance (e.g., ±5 minutes) and substation
     - Mapping results table for user confirmation before import
     - Handle timestamp differences between ADMS (IDR) and PQMS/CPDIS (PQ events)
     - Manual override: Remove IDR from event_detail, manually add IDR from database
   - **Technical Implementation:**
     - IDR upload modal with Excel parsing
     - Fuzzy matching algorithm for timestamp/substation correlation
     - Preview table showing matched/unmatched records
     - Database updates with audit trail
   - **UI Components:**
     - IDRUploadModal with file upload and mapping preview
     - Event detail page with IDR management (add/remove)
   - **Estimated Effort:** 1 week

8. **Erxi-Reporting Merge Plan** (Jan 20) ⭐ **NEW**
  - **Purpose:** Safely migrate reporting features from #Erxi-Reporting into the main PQMAP application
  - **Current Status:** Phase 4 completed (Jan 23)
  - **Known Conflicts (from initial review):**
    - **New reporting tables:** Erxi-Reporting adds `voltage_profiles` + `meter_voltage_readings` (migration `20251229000000_create_voltage_profiles.sql`) not present in main
    - **Report UI divergence:** Erxi-Reporting replaces Reports page with a 4,000-line, multi-tab UI (PQ Summary, Benchmarking, Profiles, Data Maintenance, Meter Communication)
    - **Overlap with existing modules:**
      - Benchmarking overlaps with existing `pq_benchmark_standards`/`pq_benchmark_thresholds`
      - Meter Communication overlaps with Meter Availability module
    - **Mock-heavy implementation:** Many report tabs use mock datasets and placeholders (service logs, affected customers, benchmarking scatter, verification data)
    - **Report Builder gap:** Erxi-Reporting lacks the interactive Report Builder widget and saved report flow (`saved_reports` table)
  - **Merge Approach:**
      - **Phase 1 — Inventory + Scaffolding (1 day)**
        - Diff `src/components`, `src/services`, `src/types`, and `supabase/migrations` between main and #Erxi-Reporting
        - Decide which Erxi tabs are truly unique (candidate list) vs. duplicates of existing PQMAP modules
        - Add minimal scaffolding in main app for the target reporting pages (routes/navigation/permission entry) without changing production data paths
        - Define acceptance criteria per chosen tab (data source, filters, export outputs)
        - **Test/Checkpoint:**
          - App builds and runs; navigation loads the new scaffolding page(s)
          - Permissions enforce access via `userManagementService`
          - No database migration required yet; no regressions to existing Report Builder

      - **Phase 2 — Database Decision + Ingestion Spike (1 day)**
        - Make an explicit go/no-go decision on adopting `meter_voltage_readings` + `voltage_profiles`
        - If adopted: port the migration into main app (including RLS policies) and document the intended ingestion strategy (batch backfill, scheduled job, upstream feed)
        - Source AssetManagement realtime readings from `meter_voltage_readings` (keep mock fallback until ingestion is live)
        - Implement a thin service layer in main app that can read the new tables (no UI dependence on mock data)
        - **Test/Checkpoint:**
          - Migration applies cleanly in a dev environment
          - Basic read queries work under expected roles (viewer/operator/admin) per RLS
          - Service functions return data and handle empty-state gracefully

      - **Phase 3 — Migrate 1–2 High-Value Tabs End-to-End (2–3 days)**
        - Cherry-pick only the selected, unique tab logic from #Erxi-Reporting (start with the most data-backed tab, e.g., Meter Communication)
        - Refactor the monolithic Erxi `Reports.tsx` into smaller components aligned with PQMAP patterns (modal/layout/export/dropdowns)
        - Replace mock datasets with real Supabase queries or existing services in main app
        - Keep the existing Report Builder as-is (do not downgrade `saved_reports` workflows)
        - **Test/Checkpoint:**
          - Each migrated tab loads real data (or clearly-defined empty state)
          - Filters and export (CSV/Excel/PDF if applicable) work and match expected columns
          - TypeScript check passes; basic smoke test around Reports + Report Builder

      - **Phase 4 — Expand, QA, and De-duplication (1–2 days)**
        - Migrate remaining agreed tabs (or explicitly drop them if redundant)
        - Consolidate overlaps with existing modules (Benchmarking / Meter Availability) instead of duplicating logic
        - Run regression checks focused on reporting, exports, and permissions
        - Archive/remove #Erxi-Reporting after approval, and update documentation to reflect the new reporting architecture
        - **Test/Checkpoint:**
          - Full reporting area passes regression (Report Builder save/share + new tabs)
          - No duplicated navigation/modules; permissions remain consistent
          - Documentation updated; merge is ready for stakeholder sign-off

    - **Remaining Items:** Deferred by request (server-side aggregation, profiles CRUD, ingestion spec)
    - **Estimated Effort:** 5–7 working days (4 phases, testable checkpoints)

9. **Dashboard Enhancements Phase 1** (Week 5-6) ⭐ **NEW** (Jan 27)
   - **Purpose:** Enhance existing dashboard components with new analysis capabilities and data visualization options
   - **Scope:**
     - **9.1 AffectedCustomerChart Tab System**
       - Add tab selector in upper left corner
       - Tab 1: Voltage Dip Events per Customer (existing functionality)
       - Tab 2: PQ Services Provided to Customers (new)
       - Show sum of PQ services from `pq_service_records` table
       - Maintain same TreeMap visualization style for consistency
     
     - **9.2 RootCauseChart Logic Update**
       - Add new "Cause" column populated by regional staff
       - Fallback hierarchy: Use regional staff "Cause" first, if empty use IDR "Cause"
       - Database update: Add `cause_regional` column to `pq_events` table
       - Update chart calculation to implement prioritization logic
     
     - **9.3 AffectedEquipmentChart (NEW)**
       - New dashboard component for equipment failure analysis
       - Data source: IDR → EquipmentCategory field
       - Visualization: Bar chart showing equipment types vs voltage dip count
       - Integration: Add to Dashboard.tsx layout
     
     - **9.4 InsightChart Year Comparison**
       - Upper chart: Add configuration modal to select 3+ years for comparison
       - Allow custom year selection (not limited to current-2, current-1, current)
       - Dynamic legend generation based on selected years
     
     - **9.5 InsightChart Fragile Circuit Analysis**
       - Lower chart: Replace substation analysis with circuit analysis
       - Data source: IDR → Circuit field
       - Parse circuit code from brackets: "(ST10) Yuen Long - Au Tau" → "ST10"
       - Aggregate voltage dips by circuit code
       - Show circuits with > 10 voltage dip events
     
     - **9.6 SARFI70Monitor Display Mode Toggle**
       - Add toggle button: "Single" vs "Accumulative"
       - Single mode: Show monthly SARFI-70 scores (current behavior)
       - Accumulative mode: Show cumulative sum (Jan=1.1, Feb=1.1+0.9=2.0, Mar=2.0+0.8=2.8)
       - Save preference to localStorage
   
   - **Technical Implementation:**
     - Add `idr_circuit`, `idr_equipment_category` columns to `idr_records` table
     - Create `AffectedEquipmentChart.tsx` component (300+ lines)
     - Update `AffectedCustomerChart.tsx` with tab system (150 lines)
     - Update `RootCauseChart.tsx` with fallback logic (50 lines)
     - Update `InsightChart.tsx` with year selector and circuit parsing (200 lines)
     - Update `SARFI70Monitor.tsx` with accumulative mode (100 lines)
   
   - **Database Changes:**
     ```sql
     ALTER TABLE pq_events ADD COLUMN cause_regional text;
     ALTER TABLE idr_records ADD COLUMN circuit text;
     ALTER TABLE idr_records ADD COLUMN equipment_category text;
     ```
   
   - **UI Components:**
     - InsightYearConfigModal (for year selection)
     - Tab system in AffectedCustomerChart
     - Mode toggle button in SARFI70Monitor
   
   - **Estimated Effort:** 2 weeks

---

## Short-term (Q2 2026)

### 1. Mobile Optimization
- **Purpose:** Responsive design for iPad/mobile field work
- **Key Features:**
  - Touch-optimized event detail cards
  - Offline mode with local caching
  - GPS-based meter location on map
- **Dependencies:** Filter Profiles (for cross-device sync)
- **Estimated Effort:** 3 weeks

### 2. User Notification Preferences ⭐ **NEW**
- **Purpose:** Users inherit notification settings from UAM roles with override capability
- **Key Features:**
  - User-level notification preferences (channel selection, quiet hours)
  - Role-based default preferences (auto-inherit from UAM role)
  - Event type subscription (subscribe to specific event types only)
  - Severity threshold (only notify for medium+ severity)
  - Quiet hours configuration (no notifications during specified times)
- **Database Schema:**
  ```sql
  CREATE TABLE user_notification_preferences (
    user_id uuid PRIMARY KEY REFERENCES profiles(id),
    inherit_from_role boolean DEFAULT true,
    preferred_channels text[] DEFAULT ARRAY['email'],
    quiet_hours jsonb DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00"}',
    event_types text[] DEFAULT ARRAY[]::text[],
    severity_threshold text DEFAULT 'medium'
  );
  ```
- **UI Components:**
  - User profile page → Notification Preferences section
  - Preference editor with channel checkboxes
  - Quiet hours time picker
  - Event type multi-select
- **Business Logic:** Check user preferences before sending notification
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 1 week

### 3. Bulk Data Operations
- **Purpose:** Efficiently manage large datasets
- **Key Features:**
  - Bulk event classification (assign cause to multiple events)
  - Bulk meter updates (load type, region assignments)
  - BatDynamic Notification Groups ⭐ **NEW**
- **Purpose:** Auto-populate notification groups based on criteria
- **Key Features:**
  - Dynamic group membership (auto-update based on rules)
  - Criteria builder (filter users by region, role, department)
  - Example: "All operators in Hong Kong region"
  - Scheduled refresh (daily cron job to update membership)
  - Mixed groups (static members + dynamic criteria)
- **Database Schema:**
  - Add `group_rules` field to `notification_groups`:
    ```jsonb
    {
    5 "criteria": [
        {"field": "profile.region", "operator": "equals", "value": "HK"},
        {"field": "profile.role", "operator": "in", "value": ["operator", "admin"]}
      ]
    }
    ```
- **UI Components:**
  - Group builder with criteria editor
  - Preview membership before saving
  - Manual override (add/remove specific users)
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 2 weeks

### 2. Notification Analytics Dashboard ⭐ **NEW**
- **6urpose:** Comprehensive analytics for notification system performance
- **Key Features:**
  - Send rate trends (notifications per day/week/month)
  - Delivery success rate by channel (Email/SMS/Teams)
  - Top triggered rules (most active rules)
  - Most common failure reasons
  - User engagement metrics (if email tracking added)
  - Group statistics (members per group, notification volume)
- **Visualizations:**
  - Line chart: Notification volume over time
  - 7ie chart: Notifications by channel
  - Bar chart: Success vs Failed by channel
  - Table: Top 10 most triggered rules
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 1 week

### 3. Advanced Template Features ⭐ **NEW**
- **Purpose:** Enhance template system with versioning and conditional logic
- **Key Features:**
  - **Template Versioning:** Track version history, rollback to previous versions
  - **A/B Testing:** Test two template versions, measure engagement
  - **Conditional Content:** Show/hide sections based on variables
    ```html
    {{#if customer_count > 50}}
    8 <p style="color: red;">⚠️ High customer impact!</p>
    {{/if}}
    
    {{#each customers}}
      <li>{{name}} - {{impact_level}}</li>
    {{/each}}
    ```
  - **Template Library:** Import templates from shared library/marketplace
  - **Rich Text Editor:** WYSIWYG editor for email body (replace plain textarea)
  - **Template Preview:** Live preview with sample data
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 3 weeks

### 4. ch export (select multiple date ranges)
- **Dependencies:** None
- **Estimated Effort:** 2 weeks
Real Notification Integrations ⭐ **NEW**
- **Purpose:** Replace demo mode with actual email/SMS/Teams sending
- **Key Features:**
  - **Email Integration:** SendGrid or AWS SES
    - SMTP configuration with API key
    - Email tracking (open rate, click rate)
    - Bounce handling
    - Unsubscribe management
  - **SMS Integration:** Twilio or AWS SNS
    - Phone number validation
    - Delivery receipts
    - Cost tracking per message
  - **Microsoft Teams Integration:** Microsoft Graph API
    - Authenticated Teams app
    5 Send direct messages to users
    - Post to Team channels
    - Actionable message cards (buttons, forms)
- **Requirements:**
  - SendGrid API key (or AWS SES credentials)
  - Twilio account (or AWS SNS)
  - Microsoft Teams app registration (Azure AD)
  - Budget for SMS costs (~$0.01-0.05 per message)
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 2 weeks

### 2. Notification Scheduling ⭐ **NEW**
- **Purpose:** Schedule notifications for future delivery
- **6ey Features:**
  - Schedule notifications for specific date/time
  - Recurring schedules (daily, weekly, monthly reports)
  - Calendar view of scheduled notifications
  - Edit/cancel scheduled notifications
  - Timezone support
- **Database Schema:**
  ```sql
  CREATE TABLE scheduled_notifications (
    id uuid PRIMARY KEY,
    rule_id uuid REFERENCES notification_rules(id),
    scheduled_for timestamptz NOT NULL,
    recurrence_pattern jsonb,  -- {"type": "daily", "interval": 1}
    recipient_groups uuid[],
    status text DEFAULT 'pending',
    created_at timestamptz DEFAULT now()
  );
  ```
- **Technical Approach:** Supabase pg_cron or Edge Function with scheduled trigger
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 1 week

### 3. Notification Rate Limiting & Digest ⭐ **NEW**
- **Purpose:** Prevent notification spam and batch notifications
- **Key Features:**
  - **Rate Limiting:** Max X notifications per user per hour
  - **Cooldown Period:** Min time between same notification types
  - **Digest Mode:** Batch multiple notifications into single email
    - Example: "Daily Digest - 20 Events: 15 voltage dips, 3 interruptions, 2 harmonic"
  - **Smart Batching:** Group related events automatically
  - **Configurable per Group:** Different limits for different groups
- **Implementation:**
  - Check `notification_logs` for recent sends to same recipient
  - If rate limit exceeded, suppress with reason
  - Cron job to send daily/hourly digests
- **Dependencies:** Enterprise Notification System (Q1 2026)
- **Estimated Effort:** 2 weeks

### 4. 
### 4. Enhanced Dashboard Widgets
- **Purpose:** Customizable dashboard for at-a-glance insights
- **Key Features:**
  - Drag-and-drop widget layout
  - Widget library (SARFI trends, top offenders, availability)
  - Personal dashboard templates
  - Save/share dashboard configurations
- **Technical Approach:** Extend existing `dashboard_layouts` table
- **Estimated Effort:** 3 weeks

---

## Medium-term (Q3-Q4 2026)

### 1. Voltage Harmonic Measurements
- **Purpose:** Extend harmonic analysis with voltage THD measurements
- **Status:** Under evaluation - data source availability TBD
- **Scope:**
  - Add voltage harmonic columns to `harmonic_events` table
  - V1_THD_10m, V1_TEHD_10m, V1_TOHD_10m, V1_TDD_10m
  - V2_THD_10m, V2_TEHD_10m, V2_TOHD_10m, V2_TDD_10m
  - V3_THD_10m, V3_TEHD_10m, V3_TOHD_10m, V3_TDD_10m
  - Requires verification that PQ meters capture voltage harmonic data
- **Dependencies:** Data availability from PQMS/CPDIS system
- **Estimated Effort:** 1 week (if data available)

### 2. Predictive Analytics
- **Purpose:** Forecast equipment failures and PQ trends
- **Key Features:**
  - Predict transformer failures based on event patterns
  - Seasonal trend analysis (compare 2024 vs 2025)
  - Anomaly detection (unusual event patterns)
  - Risk scoring for substations/meters
- **Technical Approach:**
  - Python microservice with scikit-learn
  - Time-series forecasting (ARIMA/Prophet)
  - Integration via Supabase Edge Functions
- **Dependencies:** Historical data (minimum 2 years)
- **Estimated Effort:** 6 weeks

### 2. Advanced GIS Features
- **Purpose:** Enhanced spatial analysis and visualization
- **Key Features:**
  - Heat maps (event density by geographic area)
  - Draw custom regions on map (not limited to predefined areas)
  - Routing for field technicians (optimized service routes)
  - Distance-based correlation (events within 2km radius)
- **Technical Approach:** Upgrade to Mapbox GL JS or Leaflet with custom plugins
- **Estimated Effort:** 4 weeks

### 3. Integration with ADMS/SCADA
- **Purpose:** Real-time data sync with operational systems
- **Key Features:**
  - Real-time event ingestion from SCADA
  - Bi-directional meter status updates
  - Substation topology sync
  - Outage correlation with switching operations
- **Technical Approach:**
  - REST API endpoints for ADMS integration
  - Kafka/RabbitMQ for event streaming
  - Data mapping layer (ADMS schema → PQMAP schema)
- **Dependencies:** ADMS vendor API documentation
- **Estimated Effort:** 8 weeks

### 4. Audit Trail Enhancements
- **Purpose:** Comprehensive change tracking for compliance
- **Key Features:**
  - Event modification history (who changed what, when)
  - User activity log (login, export, filter actions)
  - Data access audit (who viewed sensitive events)
  - Compliance reports (FDA 21 CFR Part 11 style)
- **Technical Approach:** 
  - `audit_logs` table with JSONB payload
  - PostgreSQL triggers for auto-logging
- **Estimated Effort:** 3 weeks

---

## Long-term (2027+)

### 1. AI-Powered Root Cause Analysis
- **Purpose:** Automatically suggest event causes using machine learning
- **Key Features:**
  - Train ML model on historical classified events
  - Auto-suggest cause based on event characteristics
  - Confidence scoring (e.g., "80% likely Weather-related")
  - Continuous learning from user corrections
- **Technical Approach:**
  - TensorFlow/PyTorch model
  - Features: duration, voltage sag depth, time of day, weather data
  - Deployment: Supabase Edge Function or dedicated ML service
- **Dependencies:** Large dataset of classified events (10,000+)
- **Estimated Effort:** 10 weeks

### 2. Multi-tenant Support
- **Purpose:** Support multiple utility companies in single instance
- **Key Features:**
  - Tenant isolation (data, users, configurations)
  - Tenant-specific branding (logo, colors)
  - Cross-tenant reporting (for parent company)
  - Tenant-level billing/usage tracking
- **Technical Approach:**
  - Row-level security (RLS) with tenant_id
  - Tenant configuration table
  - Middleware for tenant context
- **Estimated Effort:** 8 weeks

### 3. REST API for Third-party Integration
- **Purpose:** Allow external systems to query/push data
- **Key Features:**
  - RESTful endpoints (GET /events, POST /meters)
  - API key authentication
  - Rate limiting
  - Webhook support (notify external systems of new events)
  - OpenAPI/Swagger documentation
- **Technical Approach:**
  - Supabase PostgREST (already available)
  - Custom middleware for rate limiting
  - API gateway (Kong/Tyk)
- **Estimated Effort:** 4 weeks

---

## Power BI Integration (Optional)

### Overview
**Status:** Under Evaluation  
**Decision Date:** March 2026  
**Business Driver:** Advanced analytics for executive reporting

### Phase 2A: Quick Test (2-3 hours)
**Purpose:** Evaluate Power BI embedding feasibility

1. **Export PQMAP Data** (30 min)
   - CSV export from Report Builder
   - Tables: pq_events, pq_meters, substations, customer_transformer_matching

2. **Create Power BI Report** (1 hour)
   - Connect to CSV data
   - Create sample dashboards (SARFI trends, top offenders)
   - Test interactivity (filters, drill-through)

3. **Publish to Power BI Service** (15 min)
   - Publish from Power BI Desktop
   - Get embed URL from portal

4. **Test Iframe Embedding** (30 min)
| 2026-01-14 | Q1 2026 Planned | **Added Enterprise Notification System Migration (5-day plan)** | System |
| 2026-01-14 | Q2 2026 | **Added User Notification Preferences feature** | System |
| 2026-01-14 | Q3-Q4 2026 | **Added Dynamic Groups, Notification Analytics, Advanced Templates** | System |
| 2026-01-14 | 2027+ | **Added Real Integrations, Scheduling, Rate Limiting, Digest features** | System |
   ```typescript
   // Quick test in Dashboard.tsx
   case 'powerbi-test':
     return (
       <iframe
         src="https://app.powerbi.com/reportEmbed?..."
         width="100%" height="600px"
       />
     );
   ```

5. **Evaluate Results** (15 min)
   - Decision criteria:
     - ✅ If embedding works → Proceed to Phase 2B
     - ❌ If issues arise → Continue with Report Builder only

### Phase 2B: Full SSO Integration (10-15 hours)
**Prerequisites:**
- Azure AD admin access
- Power BI Pro licenses for all users (100 users)
- Decision approval from Phase 2A

**Week 2: Azure AD Setup** (2 hours)
1. Register app in Azure Portal
2. Configure API permissions (Power BI Service API)
3. Get admin consent
4. Save credentials (tenant ID, client ID, client secret)

**Week 3: SSO Implementation** (5 hours)
1. Install packages: `npm install @azure/msal-react @azure/msal-browser @microsoft/powerbi-client-react`
2. Create `PowerBIAuthContext.tsx` for Azure AD authentication
3. Build `PowerBIEmbed` component
4. Test authentication flow (login → get token → embed report)

**Week 4: User Testing** (3 hours)
1. Test with 5 pilot users
2. Verify SSO (single login for PQMAP + Power BI)
3. Test report interactivity
4. Collect feedback

### Phase 2C: Data Automation (Optional - 5 hours)
**Purpose:** Auto-refresh Power BI data every 15 minutes

1. **Create Service Principal** (1 hour)
   - Register app in Azure AD
   - Grant Power BI API permissions

2. **Build Push Service** (2 hours)
   - Supabase Edge Function to push data to Power BI
   - Aggregate pq_events → daily summaries
   - Push to Power BI dataset via REST API

3. **Schedule with pg_cron** (15 min)
   ```sql
   SELECT cron.schedule('push-powerbi', '*/15 * * * *', 
     $$ SELECT net.http_post(...) $$
   );
   ```

4. **Monitor and Validate** (2 hours)
   - Test data freshness
   - Monitor API call logs
   - Validate aggregations

### Feature Comparison

| Feature | Report Builder (Current) | Power BI Basic (2A) | Power BI + SSO (2B+2C) |
|---------|-------------------------|---------------------|------------------------|
| Pivot Tables | ✅ | ❌ | ❌ |
| Drag & Drop | ✅ | ✅ | ✅ |
| Charts | 10 types | All types | All types |
| Filters | ✅ | ✅ | ✅ |
| Calculated Fields | ✅ | ✅ | ✅ |
| Export | Excel/PDF | Excel/PDF | Excel/PDF |
| Share | ✅ | ✅ | ✅ |
| SSO | ✅ (Supabase) | ❌ (Separate login) | ✅ (Azure AD) |
| Auto-refresh | ✅ | ❌ (Manual) | ✅ (15-min) |
| Complex BI | ❌ | ✅ | ✅ |
| Setup Time | 1 hour | 2-3 hours | 10-15 hours |
| Best For | 80% of users | Testing | Enterprise analytics |

### Decision Criteria
**Proceed with Phase 2B+2C if:**
- ✅ Phase 2A embedding test successful
- ✅ Users require advanced analytics (forecasting, R/Python visuals)
- ✅ Azure AD admin access available
- ✅ 10-15 hour development time acceptable

**Stay with Report Builder if:**
- ❌ Phase 2A embedding test fails
- ❌ Current Report Builder meets 80% of needs
- ❌ SSO complexity not justified
- ❌ No Azure AD admin access

### Technical Considerations

**Approach 1: Pull (Power BI → Supabase)**
- Power BI connects directly to Supabase PostgreSQL
- Requires on-premise data gateway (if cloud-to-cloud not allowed)
- Refresh limited by Power BI schedule

**Approach 2: Push (Supabase → Power BI)** ⭐ **RECOMMENDED**
- Supabase Edge Function pushes aggregated data to Power BI
- Full control over refresh frequency (15-min)
- Pre-aggregate 20,000 events → daily summaries (reduces data volume)
- Better performance

**Licensing:**
- **Power BI Pro:** $10/user/month (100 users = $1,000/month)
- **Power BI Premium:** $20/user/month (advanced features)
- **Embedded:** $4,995/month (unlimited users, but overkill for 100 users)

---

## Deferred / Under Evaluation

### 1. Custom Alerting Engine
- **Reason for Deferral:** Supabase Realtime sufficient for now
- **Re-evaluation Date:** Q3 2026
- **Scope:** Complex alert rules (e.g., "3 events within 10 minutes")

### 2. Time-series Database Migration
- **Reason for Deferral:** PostgreSQL performance acceptable for current volume
- **Re-evaluation Date:** When event volume exceeds 100,000/year
- **Scope:** Migrate to TimescaleDB or InfluxDB

### 3. Blockchain Audit Trail
- **Reason for Deferral:** Not required for compliance
- **Re-evaluation Date:** If regulatory requirements change
- **Scope:** Immutable audit log with blockchain verification

### 4. Natural Language Query
- **Reason for Deferral:** Report Builder provides sufficient filtering
- **Re-evaluation Date:** Q1 2027
- **Scope:** "Show me all critical events last month in Kowloon"

---

## Change History

| Date | Section | Change | Author |
|------|---------|--------|--------|
| 2026-01-07 | All | Initial ROADMAP.md creation, consolidated from PHASE_2_ROADMAP.md | System |
| 2026-01-07 | In Progress | Added Weighting Factors, PQ Benchmarking (completed) | System |
| 2026-01-07 | Power BI | Consolidated QA document, added decision criteria | System |
| 2026-01-08 | Q1 2026 Planned | Added System Parameters module with placeholder UI | System |
| 2026-01-19 | Q1 2026 Planned | Added Event Management restructure, Advanced Filter button, and Special IDR Upload features after requirement workshop | System |
| 2026-01-23 | Q1 2026 Planned | Updated Erxi-Reporting Merge Plan to Phase 4 completed and deferred remaining items | System |
| 2026-01-27 | Q1 2026 Planned | **Added Dashboard Enhancements Phase 1** - AffectedCustomerChart tabs, RootCauseChart fallback logic, AffectedEquipmentChart (new), InsightChart year comparison & circuit analysis, SARFI70Monitor accumulative mode | System |

---

**Next Review:** February 15, 2026  
**Owner:** Product Management Team  
**Related Documents:**
- [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) - Detailed feature specifications
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database evolution
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
