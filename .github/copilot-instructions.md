# PQMAP AI Coding Agent Instructions

**Project:** Power Quality Monitoring and Analysis Platform for CLP  
**Stack:** React 18 + TypeScript + Vite + Supabase (PostgreSQL) + TailwindCSS

---
## Prompt Instruction
Rules to follow when generating code for this project:
- Always adhere to the architecture patterns defined in ARCHITECTURE.md
- Always follow the database role system as per ROLE_SYSTEM_CLARIFICATION.md
- Always follow the data structure and migration patterns in DATABASE_SCHEMA.md
- Always implement UI patterns as per STYLES_GUIDE.md
- Always update the documentation in Artifacts/ when adding features or making changes
- When handling the prompt, always ask questions if anything is unclear before implement
- Always inform first before removing functions ot data field to prevent undesired system logic changed.
---

## Critical Files & References

### 📚 Core Documentation (5 Documents)

The project uses a streamlined documentation structure (see [DOCUMENTATION_RESTRUCTURING.md](../Artifacts/DOCUMENTATION_RESTRUCTURING.md)):

1. **[PROJECT_FUNCTION_DESIGN.md] - Complete functional specifications
   - All modules and features documented (2700+ lines)
   - Change History section (Jan 2026: Notification System, Data Maintenance)
   - Acceptance criteria and workflows

2. **[DATABASE_SCHEMA.md] - Complete database reference
   - 17 tables with full column documentation
   - Migration history log (32+ migrations)
   - RLS policies and indexes
   - ⚠️ **Lines 162-200:** Critical user role enum mapping

3. **[ARCHITECTURE.md]- Technical architecture
   - System overview and tech stack
   - Component architecture patterns
   - Integration points (PQMS, SCADA, Power BI)
   - Development workflow (GitHub Issues, branching)

4. **[ROADMAP.md] - Feature roadmap
   - In Progress (Q1 2026)
   - Short/Medium/Long-term plans
   - Power BI integration options
   - Deferred features tracking

5. **[STYLES_GUIDE.md] - UI/UX design guidelines
   - RefreshKey pattern (lines 3334-3650)
   - Export/Import patterns (lines 100-500)
   - Button/Dropdown standards
   - TailwindCSS conventions