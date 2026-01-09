# Product Roadmap

**Document Purpose:** Capture planned features and future development initiatives  
**Last Updated:** January 7, 2026  
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

3. **Harmonic Events Table** (Jan 9) - `harmonic_events`
   - Separate table for harmonic-specific measurements
   - 12 parameters per event: THD, TEHD, TOHD, TDD for 3 current phases (I1, I2, I3)
   - 1:1 relationship with pq_events (event_type = 'harmonic')
   - Backfill script for existing harmonic events

4. **Customer Transformer Matching** (Dec 2025)
   - Circuit-customer relationship tracking
   - Auto customer impact via PostgreSQL trigger
   - H1/H2/H3 transformer code support

4. **Root Cause Analysis Restoration** (Dec 2025)
   - `cause` + `cause_detail` fields (replaced `root_cause`)
   - 7 major categories, 27 subcategories
   - Backfill script for existing events

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
1. **System Parameters Module** (Week 4)
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

2. **Advanced Export Options** (Week 4)
   - Export filtered data to Excel with formatting
   - PDF reports with charts
   - Scheduled email reports

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

### 2. Real-time Notifications
- **Purpose:** Alert users of critical PQ events
- **Key Features:**
  - Push notifications for critical events
  - Email alerts with configurable thresholds
  - SMS alerts for outages
  - Notification history log
- **Technical Approach:** Supabase Realtime + Edge Functions
- **Estimated Effort:** 2 weeks

### 3. Bulk Data Operations
- **Purpose:** Efficiently manage large datasets
- **Key Features:**
  - Bulk event classification (assign cause to multiple events)
  - Bulk meter updates (load type, region assignments)
  - Batch export (select multiple date ranges)
- **Dependencies:** None
- **Estimated Effort:** 2 weeks

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

---

**Next Review:** February 15, 2026  
**Owner:** Product Management Team  
**Related Documents:**
- [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) - Detailed feature specifications
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database evolution
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture
