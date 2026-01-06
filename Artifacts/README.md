# Artifacts Folder - Document Index

**Last Updated:** January 5, 2026

---

## 📚 Active Documentation (16 Documents)

### Core Reference Documents

1. **DATABASE_SCHEMA.md** ⭐
   - Complete database schema reference
   - Migration history and status
   - Table definitions with all columns
   - Status: Regularly updated

2. **PROJECT_FUNCTION_DESIGN.md** ⭐
   - Comprehensive functional design document
   - Architecture and tech stack
   - Module descriptions and workflows
   - **Version: 1.5 (Updated Jan 5, 2026)**
   - **NEW: SCADA Substation Management Module**
   - **NEW: User Management Module**

3. **SETUP_GUIDE.md**
   - Installation and setup instructions
   - Environment configuration
   - Development workflow

4. **STYLES_GUIDE.md** ⭐
   - UI patterns and design standards
   - Component styling guidelines
   - **NEW: Adding New Features checklist (Section 11)**

### Requirements & Planning

5. **REQUIREMENTS_GAP_ANALYSIS_2025.md**
   - Requirements analysis
   - Gap identification
   - Priority tracking

6. **REQUIREMENTS_TRACEABILITY.md**
   - Requirements mapping to features
   - Implementation tracking
   - Validation status

7. **IMPLEMENTATION_PLAN.md**
   - Development roadmap
   - Feature priorities
   - Timeline estimates

### Feature-Specific Documentation

8. **IDR_TAB_IMPLEMENTATION.md**
   - Incident Data Record tab implementation guide
   - Field mapping reference
   - Usage instructions

9. **CUSTOMER_TRANSFORMER_MATCHING_IMPLEMENTATION.md**
   - Customer-Transformer matching module
   - CSV import/export workflows
   - Validation rules

10. **METER_MAP_IMPLEMENTATION.md**
    - Meter geographic visualization
    - Map integration details
    - Performance optimization

11. **SUBSTATION_MAP_IMPLEMENTATION.md**
    - Substation geographic bubble chart
    - Hong Kong map integration
    - Interactive features

12. **REPORT_BUILDER_IMPLEMENTATION.md**
    - Interactive pivot table reports
    - Calculated fields and filtering
    - Save/share functionality

13. **SARFI_ARCHITECTURE.md**
    - SARFI calculation methodology
    - Data aggregation patterns
    - KPI monitoring design

14. **ASSET_MANAGEMENT_EVENT_HISTORY.md**
    - Event history tracking
    - Timeline visualization
    - Asset-event relationships

### Integration Documentation

15. **POWER_BI_INTEGRATION_QA.md**
    - Power BI integration Q&A
    - Data export formats
    - Embedding guidelines

16. **GITHUB_REQUIREMENTS_MANAGEMENT.md**
    - Requirements tracking workflow
    - Jira automation setup
    - Traceability matrix

---

## 📦 Phase 2 Documents (Legacy - For Reference)

**Status:** 🗄️ Historical reference from Power BI integration planning phase

These documents are kept for historical context but may not reflect current implementation:

- **PHASE_2_README.md** - Phase 2 overview (legacy)
- **PHASE_2_QUICK_START.md** - Quick start guide (legacy)
- **PHASE_2_ROADMAP.md** - Development roadmap (legacy)
- **PHASE_2_POWER_BI_STEP_BY_STEP.md** - Power BI setup guide (legacy)

**Note:** Most Phase 2 functionality has been integrated into the main application. Refer to POWER_BI_INTEGRATION_QA.md for current integration details.

---

## 🗄️ Archive Folder

Contains historical documentation and deprecated guides. Organized by date/topic:

- **Dec2025/** - December 2025 fixes and updates
  - Schema fixes
  - Profile error resolutions
  - Meter transformer code updates
  - Event grouping guides

**Retention Policy:** Archive documents are kept for 12 months, then reviewed for deletion

---

## � Recent Updates

### January 5, 2026 - Major Documentation Refresh ✨
- ✅ Added **User Management Module** documentation (Section 9)
- ✅ Added **SCADA Substation Management Module** documentation (Section 10)
- ✅ Updated PROJECT_FUNCTION_DESIGN.md to v1.5
- ✅ Created [SCRIPTS_INDEX.md](../scripts/SCRIPTS_INDEX.md) for scripts reference
- ✅ Organized Phase 2 documents as legacy reference
- ✅ Enhanced navigation and maintenance guidelines

**See:** [DOCUMENTATION_UPDATE_JAN2026.md](DOCUMENTATION_UPDATE_JAN2026.md) for full details

---

## �📊 Documentation Statistics

- **Active Core Documents:** 4
- **Requirements/Planning:** 3
- **Feature-Specific:** 9
- **Integration Guides:** 2
- **Legacy/Reference:** 4
- **Total Active:** 18 documents
- **Last Major Update:** January 5, 2026 (SCADA + User Management modules)

---

## 🔍 Finding Information

### By Topic

**Getting Started:**
- SETUP_GUIDE.md
- README.md (this file)

**Development:**
- PROJECT_FUNCTION_DESIGN.md (comprehensive reference)
- STYLES_GUIDE.md (UI patterns)
- DATABASE_SCHEMA.md (data structures)

**Features:**
- Search by feature name in document titles
- Check feature-specific implementation guides
- Refer to PROJECT_FUNCTION_DESIGN.md for module details

**Troubleshooting:**
- Archive/Dec2025/ folder for recent fixes
- MIGRATION_FIX_GUIDE.md (in /scripts)
- Database diagnostic scripts (in /scripts)

---

## ✅ Documentation Maintenance

### Update Schedule

- **Weekly:** Feature implementation docs (as features are built)
- **Monthly:** PROJECT_FUNCTION_DESIGN.md, DATABASE_SCHEMA.md
- **Quarterly:** Full documentation review and cleanup
- **Per Release:** REQUIREMENTS_TRACEABILITY.md, version updates

### Contributing

When adding new documentation:
1. Use clear, descriptive filenames
2. Add creation date and version
3. Update this README.md index
4. Link related documents
5. Follow existing formatting patterns

When updating existing docs:
1. Update "Last Updated" date
2. Add version number if major change
3. Document breaking changes clearly
4. Archive superseded versions if needed

---

## 📞 Quick Links

- **Main App:** [/src/App.tsx](../src/App.tsx)
- **Database Client:** [/src/lib/supabase.ts](../src/lib/supabase.ts)
- **Type Definitions:** [/src/types/database.ts](../src/types/database.ts)
- **Services:** [/src/services/](../src/services/)
- **Scripts:** [/scripts/](../scripts/)

---

**Last Reviewed:** January 5, 2026  
**Next Review:** April 2026  
**Maintained By:** PQMAP Development Team
   - Created: December 12, 2025

8. **EVENT_DETAILS_ENHANCEMENT_BRAINSTORM.md**
   - IDR tab design brainstorming
   - Feature requirements
   - UI/UX considerations

9. **EVENT_DETAILS_UI_MOCKUPS.md**
   - UI design mockups
   - Component layouts
   - User interaction flows

10. **FILTER_PROFILES_MIGRATION.md**
    - Filter profile system documentation
    - Migration instructions
    - Multi-device sync implementation

### Architecture & Design

11. **SARFI_ARCHITECTURE.md**
    - SARFI calculation detailed design
    - Weight factor system
    - Profile management

12. **ROOT_CAUSE_RESTORATION.md**
    - Root cause chart implementation
    - Data aggregation logic
    - Export functionality

13. **SUBSTATION_MAP_IMPLEMENTATION.md**
    - Geographic visualization guide
    - Bubble chart implementation
    - Hong Kong map projection

14. **STYLES_GUIDE.md**
    - UI component patterns
    - Tailwind CSS conventions
    - Design system guidelines

---

## 📦 Archived Documentation

### Archive/Dec2025/ (5 Documents)

**Archive Date:** December 15, 2025  
**Reason:** Completed tasks and resolved issues

1. **CLEANUP_ORPHANED_EVENTS_GUIDE.md**
   - Status: ✅ Completed - 0 orphans found
   
2. **METER_SCHEMA_CONFLICT_ANALYSIS.md**
   - Status: ✅ Migration applied successfully
   
3. **SMOKE_TEST_RESULTS.md**
   - Status: ✅ All tests passed
   
4. **SCHEMA_CONSOLIDATION_REPORT.md**
   - Status: ✅ Schema issues resolved
   
5. **PROFILE_ERROR_FIX.md**
   - Status: ✅ Bug fixed in code

**See:** `Archive/Dec2025/README.md` for detailed archive information

### Archive/ (Historical Documents)

Earlier archived documents from previous development cycles:
- DEMO_GUIDE.md
- DEV_STATUS.md
- EVENT_MANAGEMENT_STATUS.md
- FIX_SCHEMA_ERROR.md
- MOTHER_EVENT_GROUPING_QUESTIONS.md
- PRIORITY_4_COMPLETION.md
- PROJECT_UPDATE_SUMMARY.md
- QUICK_FIX.md
- SARFI_CONFIG_IMPLEMENTATION.md
- SARFI_DEPLOYMENT_CHECKLIST.md
- SARFI_IMPLEMENTATION_SUMMARY.md
- SARFI_INVESTIGATION_SUMMARY.md
- SARFI_QUICK_START.md
- SARFI_SETUP_GUIDE.md
- SARFI_TABLE_TROUBLESHOOTING.md
- SECURITY_FIXES.md

---

## 📂 Subdirectories

### Documents/
- CPDIS_Summary.md
- PQMAP_Requirement_20251107.csv
- PQMAP_User_Survey.md

### From Users/
- System Images/
  - Meter Inventory.csv
  - Mother Event List.csv

### Minutes/
- Meeting minutes and summaries
- Design discussion notes

---

## 📝 Document Maintenance Guidelines

### When to Archive
Archive documents when:
- ✅ Task/migration is completed and verified
- ✅ Bug is fixed and merged to main
- ✅ Analysis is complete and decisions implemented
- ✅ Test results are final and no longer needed

### When to Keep Active
Keep documents active when:
- 📌 Content is referenced frequently
- 📌 Document provides ongoing guidance
- 📌 Information is needed for future development
- 📌 Document is part of core reference set

### Update Frequency
- **DATABASE_SCHEMA.md**: After each migration
- **PROJECT_FUNCTION_DESIGN.md**: After major features
- **Feature Docs**: When implementation changes
- **Archive Index**: When archiving documents

---

## 🔍 Quick Reference

**Need database info?** → DATABASE_SCHEMA.md  
**Need architecture overview?** → PROJECT_FUNCTION_DESIGN.md  
**Need setup instructions?** → SETUP_GUIDE.md  
**Need feature details?** → See feature-specific docs  
**Need requirements?** → REQUIREMENTS_TRACEABILITY.md  
**Looking for old docs?** → Check Archive/ folders

---

**Last Cleanup:** December 15, 2025  
**Next Review:** As needed when major features completed  
**Maintained By:** Development Team
