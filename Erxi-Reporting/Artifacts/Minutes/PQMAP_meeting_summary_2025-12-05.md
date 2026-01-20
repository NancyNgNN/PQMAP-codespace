# PQMAP Design Discussion - Meeting Summary
**Date:** December 5, 2025  
**Duration:** ~2 hours  
**Attendees:** PSP/Engineering, IT Access/Operations, Architecture, and Vendor teams

---

## Key Decisions

### Architecture & Integration
- **PQMAP as Central Platform**: PQMAP will serve as single source of truth, consolidating data from PQMS and CPDS
- **Phased Integration Approach**: 
  - Phase 1: PQMAP receives data from PQMS/CPDS; existing ADMS feeds continue
  - Phase 2 (future): PQMAP will send processed data to ADMS
- **System Roles Clarified**: PQMS/CPDS remain as meter interface layers; PQMAP handles all analysis and reporting

### Data & Reporting
- **Unified Data Analysis**: Single interface for on-screen analysis across both systems (no more manual Excel merging)
- **Automated KPI Calculations**: System will calculate standard indices (EN50160, IEEE 2519) and custom KPIs with trend visualization
- **Dashboard + Flexible Reporting**: Both real-time dashboards and flexible report generation with Excel export

### Operations
- **Notification System**: Email notifications for PQ events, meter disconnects, and system anomalies with configurable thresholds
- **Meter Inventory Integration**: Centralized inventory combining customer and CLP meters with complete details
- **Customer Service Integration**: Link PQ events with service records for comprehensive case management

---

## Pain Points Identified

| Pain Point | Current Impact | PQMAP Solution |
|------------|----------------|----------------|
| **Manual data correlation** | Time-consuming to merge PQMS/CPDS data for same events | Single source of truth with unified interface |
| **Report generation** | Manual Excel work for charts and management reports | Automated dashboards + flexible reporting module |
| **Incomplete meter data** | Manual Excel tracking for missing information | Integrated meter inventory from both systems |
| **KPI calculations** | Manual per-incident calculation required | Automated index calculation with visualization |

---

## Priority Action Items

### Immediate (Next Workshops)
- Schedule 3-4 follow-up workshops at Hung Hom/Kai Tak office
- Provide QA environment access to vendor team for current system review
- Share existing report templates and requirements documentation

### Design Phase
- Design unified data analysis interface with PQMS/CPDS correlation
- Create interactive dashboard mockups with flexible date ranges
- Build notification admin interface with threshold configuration
- Design meter inventory page with transformer relationship data

### Integration Planning
- Define data ingestion interfaces for PQMS/CPDS
- Plan Phase 2 ADMS integration architecture
- Document event handling workflow and filtering rules
- Design CSV import for transformer relationships (interim solution)

---

## Historical Data & Analytics Requirements

**Key Capabilities Needed:**
- Access 3+ years historical data (PQDA integration)
- SARFI and impact index calculations with annual weighting factors
- Performance review reporting with year-over-year trends
- Geographical mapping showing event concentration by location
- Circuit and component failure pattern analysis

---

## Next Steps

1. **Official Project Start**: Mid-December 2025 (pending confirmation)
2. **Functional Design**: Complete workshop series to gather detailed requirements
3. **Technical Design**: Begin after functional design approval
4. **Collaboration Setup**: Share point access and document repository for vendor team

---

## Notes
- Workshop format using Miro collaborative board for requirements gathering
- Traditional Chinese content in transcript successfully processed
- All major stakeholder groups represented: Operations, Engineering, Architecture, IT
- Strong alignment on pain points and desired improvements
