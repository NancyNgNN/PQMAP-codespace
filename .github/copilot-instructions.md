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

## Architecture Overview

### Service Layer Pattern (Critical)
All database operations MUST go through service files in `src/services/`. Never call Supabase directly from components.

```typescript
// ✅ CORRECT - Use service layer
import { sarfiService } from '../services/sarfiService';
const profiles = await sarfiService.fetchSARFIProfiles();

// ❌ WRONG - Don't query from components
const { data } = await supabase.from('sarfi_profiles').select('*');
```

**Service Structure:**
- `src/services/sarfiService.ts` - SARFI calculations and profiles
- `src/services/meterHierarchyService.ts` - Meter CRUD operations
- `src/services/notificationService.ts` - Enterprise notification system (800+ lines)
- `src/services/exportService.ts` - CSV/Excel/PDF exports with 44-column format
- All services follow async/await pattern with error throwing

### Database Role System (⚠️ CRITICAL)
**Database enum has ONLY 3 values:** `'admin' | 'operator' | 'viewer'`  
**UAM system uses different roles** that must be mapped:

```typescript
// ❌ NEVER insert UAM roles directly - causes enum constraint errors
INSERT INTO profiles (role) VALUES ('system_admin'); // ERROR!

// ✅ ALWAYS map to database enum
UAM 'system_admin' → DB 'admin'
UAM 'manual_implementator' → DB 'operator'
UAM 'watcher' → DB 'viewer'
```

See [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) lines 162-200 for full mapping.

---

## Key Development Patterns

### RefreshKey Pattern (Required for CRUD UIs)
When building components with Create/Update/Delete operations, implement this pattern for automatic data refresh:

```typescript
// Parent component
const [refreshKey, setRefreshKey] = useState(0);

const handleSaved = () => {
  setRefreshKey(prev => prev + 1);  // Trigger child reload
};

<ChildList refreshKey={refreshKey} />

// Child component
interface Props { refreshKey?: number; }

useEffect(() => {
  if (refreshKey !== undefined && refreshKey > 0) {
    loadData();  // Reload on refreshKey change
  }
}, [refreshKey]);
```

**Used in:** GroupList, RuleList, TemplateList. See [STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md) lines 3334-3650 for complete pattern.

### Export Pattern (Excel with Chart + Table)
Standard export format combines visualizations with data:

```typescript
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// 1. Capture chart image (rows 1-20 reserved for future embedding)
// 2. Add metadata header (rows 1-7)
// 3. Add data table starting at row 20
// 4. Set column widths via ws['!cols']
```

**44-Column CSV Format:** All event exports MUST match `Mother Event List.csv` structure (motherEvent, falseEvent, timestamp, siteId, name, voltLevel, ss, circuit, region, oc, duration, v1-v3, customerCount, s10-s90, eventId, groupId, remarks, idrNo, etc.). See [exportService.ts](../src/services/exportService.ts).

### Import Pattern (4 Required Components)
Every import feature needs:
1. Import button with dropdown (Import CSV + Download Template)
2. Template download function with example data and comments
3. Validation function checking required fields and constraints
4. Import results modal showing success/failed counts with errors

See [STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md) lines 100-500 for complete implementation.

---

## Commands & Workflows

### Development
```bash
npm run dev           # Start dev server (Vite)
npm run build         # Production build
npm run typecheck     # TypeScript validation (run before commits)
npm run lint:fix      # Auto-fix ESLint issues
```

### Docker (Alternative)
```bash
docker-compose up     # Starts frontend:5173 + backend:8000
```

### Database Migrations
- Located in `supabase/migrations/`
- Apply via Supabase dashboard or CLI
- **Check migration log in [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md)** before creating new migrations (32+ applied, avoid duplicates)
- Always update DATABASE_SCHEMA.md after applying migrations

---

## Critical Files & References

### 📚 Core Documentation (5 Documents)

The project uses a streamlined documentation structure (see [DOCUMENTATION_RESTRUCTURING.md](../Artifacts/DOCUMENTATION_RESTRUCTURING.md)):

1. **[PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md)** - Complete functional specifications
   - All modules and features documented (2700+ lines)
   - Change History section (Jan 2026: Notification System, Data Maintenance)
   - Acceptance criteria and workflows

2. **[DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md)** - Complete database reference
   - 17 tables with full column documentation
   - Migration history log (32+ migrations)
   - RLS policies and indexes
   - ⚠️ **Lines 162-200:** Critical user role enum mapping

3. **[ARCHITECTURE.md](../Artifacts/ARCHITECTURE.md)** - Technical architecture
   - System overview and tech stack
   - Component architecture patterns
   - Integration points (PQMS, SCADA, Power BI)
   - Development workflow (GitHub Issues, branching)

4. **[ROADMAP.md](../Artifacts/ROADMAP.md)** - Feature roadmap
   - In Progress (Q1 2026)
   - Short/Medium/Long-term plans
   - Power BI integration options
   - Deferred features tracking

5. **[STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md)** - UI/UX design guidelines
   - RefreshKey pattern (lines 3334-3650)
   - Export/Import patterns (lines 100-500)
   - Button/Dropdown standards
   - TailwindCSS conventions

### 🔐 Supporting Documentation (Critical for Database Work)

**⚠️ READ THESE BEFORE ANY DATABASE MODIFICATIONS:**

1. **[ROLE_SYSTEM_CLARIFICATION.md](../Artifacts/ROLE_SYSTEM_CLARIFICATION.md)** - CRITICAL
   - Explains database `user_role` enum vs UAM TypeScript roles
   - Prevents SQL constraint errors
   - Required reading for all database work

2. **[ROLE_ERROR_RESOLUTION.md](../Artifacts/Archive/ROLE_ERROR_RESOLUTION.md)**
   - Detailed role error fixes (10 fixes documented)
   - Migration troubleshooting guide

3. **[QUICK_FIX_SUMMARY.md](../Artifacts/Archive/QUICK_FIX_SUMMARY.md)**
   - Quick reference card for role errors
   - Fast re-run instructions

### 📦 Archive Folder

**Location:** `Artifacts/Archive/`  
**Contents:** 27+ completed implementation guides and historical documentation

**Notable Archived Documents:**
- [NOTIFICATION_SYSTEM_MIGRATION_PLAN.md](../Artifacts/Archive/NOTIFICATION_SYSTEM_MIGRATION_PLAN.md) - Completed Jan 14, 2026
- [SARFI_ARCHITECTURE.md](../Artifacts/Archive/SARFI_ARCHITECTURE.md) - Technical SARFI details
- [REPORT_BUILDER_IMPLEMENTATION.md](../Artifacts/Archive/REPORT_BUILDER_IMPLEMENTATION.md) - Report Builder setup
- [CUSTOMER_TRANSFORMER_MATCHING_IMPLEMENTATION.md](../Artifacts/Archive/CUSTOMER_TRANSFORMER_MATCHING_IMPLEMENTATION.md)
- **Power BI guides:** PHASE_2_*.md files with step-by-step SSO integration

### 🔑 Key Code Locations

**Service Layer:**
- **Notification System:** `src/services/notificationService.ts` (800+ lines)
  - Template engine with variable substitution
  - Multi-channel delivery (Email/SMS/Teams)
  - Rule evaluation engine (9 operators, multi-condition logic)
- **SARFI Calculations:** `src/services/sarfiService.ts` (weight factors, profiles)
- **Mother Event Grouping:** `src/services/mother-event-grouping.ts`
- **Export Service:** `src/services/exportService.ts` (44-column CSV format)
- **Benchmarking:** `src/services/benchmarkingService.ts` (IEC/SEMI/ITIC standards)

**UI Components:**
- **Notifications:** `src/components/Notifications/` (14 components)
  - TemplateManagement, ChannelManagement, GroupManagement
  - RuleBuilder, NotificationLogs, SystemConfig
- **Dashboard:** `src/components/Dashboard/` (SARFI charts, maps, report builder)
- **Data Maintenance:** `src/pages/DataMaintenance/` (WeightingFactors, PQBenchmarking)

**Scripts & Utilities:**
- **Demo Data:** `scripts/` folder (generators for mother events, harmonic events)
- **Scripts Index:** [scripts/README.md](../scripts/README.md) + [SCRIPTS_INDEX.md](../scripts/SCRIPTS_INDEX.md)

---

## Project-Specific Conventions

### Component Structure (Standard Order)
```typescript
// 1. Imports (React → Third-party → Local)
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { sarfiService } from '../services/sarfiService';

// 2. Interface definitions
interface Props { ... }

// 3. Component export
export default function Component({ props }: Props) {
  // 4. State declarations
  const [data, setData] = useState([]);
  
  // 5. Effects (initial load, subscriptions)
  useEffect(() => { ... }, []);
  
  // 6. Event handlers
  const handleAction = async () => { ... };
  
  // 7. Render helpers
  const processedData = data.map(...);
  
  // 8. JSX return
  return <div>...</div>;
}
```

### Naming Conventions
- **Files:** PascalCase for components (`EventList.tsx`), camelCase for services (`sarfiService.ts`)
- **Tables:** snake_case (`pq_events`, `notification_templates`)
- **Service methods:** Prefixes - `fetch*` (read), `create*`, `update*`, `delete*`
- **Boolean columns:** Use positive names (`false_event` not `not_false_event`)

### TailwindCSS Standards
- **Gradients:** `from-blue-600 to-indigo-600` for primary buttons
- **Cards:** `bg-white border border-slate-200 rounded-lg shadow-lg`
- **Hover effects:** `hover:shadow-xl transition-all duration-200`
- **Text hierarchy:** `text-slate-900` (heading), `text-slate-700` (body), `text-slate-500` (muted)

---

## Common Pitfalls

1. **Infinite useEffect loops:** Add `profilesFetched` flag when fetching data that updates state used in dependencies. See [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) line 997.

2. **Mother Event creation without false_event:** When seeding demo data, ALWAYS set `false_event: false` or triggers won't create customer impacts. See [scripts/README.md](../scripts/README.md).

3. **Missing RLS policies:** All new tables need policies for admin/operator/viewer roles. Copy pattern from existing tables in migrations.

4. **Export without substation map:** ExportService requires `substationsMap` parameter - don't pass empty Map or region/address will be missing.

5. **Forgetting refreshKey increment:** After successful create/update/delete, ALWAYS call `setRefreshKey(prev => prev + 1)` or lists won't update.

---

## Integration Points

- **PQMS (Legacy):** CSV export format must match 44-column structure
- **SCADA:** Future integration via `scadaService.ts` (stub exists)
- **Power BI:** Optional SSO integration planned (see [ROADMAP.md](../Artifacts/ROADMAP.md))
- **GitHub Issues:** Auto-syncs to PROJECT_FUNCTION_DESIGN.md via [requirements-sync.yml](../Jira_automation/requirements-sync.yml)

---

## Environment Setup

**Required vars in `.env`:**
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**Row Level Security:** All tables use RLS. Standard anon key only allows reads. For seeding, use service role key (NOT committed).

---

## 🧭 Quick Navigation Guide

### By Development Task

**Building a new feature?**
1. Check [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md) for similar features
2. Review [STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md) for UI patterns
3. Use [ARCHITECTURE.md](../Artifacts/ARCHITECTURE.md) for service layer setup

**Adding database tables?**
1. ⚠️ **FIRST:** Read [ROLE_SYSTEM_CLARIFICATION.md](../Artifacts/ROLE_SYSTEM_CLARIFICATION.md)
2. Check [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) migration log
3. Copy RLS policies from similar tables
4. Update DATABASE_SCHEMA.md after applying migration

**Fixing bugs?**
1. Search [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) for schema issues
2. Check Archive/ for historical implementation details
3. Review [ARCHITECTURE.md](../Artifacts/ARCHITECTURE.md) for patterns

**Planning features?**
1. Check [ROADMAP.md](../Artifacts/ROADMAP.md) for conflicts/dependencies
2. Review [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md) for existing similar features
3. Update PROJECT_FUNCTION_DESIGN.md when complete

### By Role

**Developers:**
- Start: [ARCHITECTURE.md](../Artifacts/ARCHITECTURE.md) + [STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md)
- Reference: [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md) for specs
- Database: [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) + ROLE_SYSTEM_CLARIFICATION.md

**Product Managers:**
- Start: [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md)
- Planning: [ROADMAP.md](../Artifacts/ROADMAP.md)
- History: PROJECT_FUNCTION_DESIGN.md (Change History section)

**DBAs:**
- ⚠️ **CRITICAL:** [ROLE_SYSTEM_CLARIFICATION.md](../Artifacts/ROLE_SYSTEM_CLARIFICATION.md)
- Schema: [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md)
- Architecture: [ARCHITECTURE.md](../Artifacts/ARCHITECTURE.md) (RLS policies, indexes)

**QA Testers:**
- Test Specs: [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md)
- UI Behavior: [STYLES_GUIDE.md](../Artifacts/STYLES_GUIDE.md)

---

## 📝 Documentation Maintenance

### When Adding Features

**Required updates (in order):**
1. Implement code + database migration
2. Update [PROJECT_FUNCTION_DESIGN.md](../Artifacts/PROJECT_FUNCTION_DESIGN.md) (module section + change history)
3. Update [DATABASE_SCHEMA.md](../Artifacts/DATABASE_SCHEMA.md) (migration log)
4. Update [ROADMAP.md](../Artifacts/ROADMAP.md) (move to completed)
5. Archive implementation guides after 3 months

**Example Change History Entry:**
```markdown
### January 2026

#### Feature Name (Jan 15, 2026)
**Features Added:**
- Feature 1 with description
- Feature 2 with technical details

**Database Changes:**
- Migration: `20260115000000_feature_name.sql`
- Tables affected: table1, table2

**Components:**
- `src/components/FeatureName.tsx`
- `src/services/featureService.ts`
```

### Update Schedule
- **Per Sprint (2 weeks):** Update Change History when features completed
- **After Migration:** Update DATABASE_SCHEMA.md migration log
- **Monthly:** Update ROADMAP.md feature statuses
- **Quarterly:** Review ARCHITECTURE.md for tech stack changes

---

**Questions?** Check [Artifacts/README.md](../Artifacts/README.md) for document index or search codebase for similar patterns before implementing new features.
