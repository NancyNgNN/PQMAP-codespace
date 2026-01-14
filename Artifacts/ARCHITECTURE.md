# System Architecture & Technical Design

**Document Purpose:** Technical architecture, integration patterns, and development practices  
**Last Updated:** January 7, 2026  
**Status:** Living Document

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Database Architecture](#database-architecture)
4. [SARFI System Architecture](#sarfi-system-architecture)
5. [Integration Points](#integration-points)
6. [Security Architecture](#security-architecture)
7. [Error Handling & Logging](#error-handling--logging)
8. [Development Workflow](#development-workflow)
9. [Deployment & DevOps](#deployment--devops)
10. [Performance Optimization](#performance-optimization)

---

## System Overview

### Technology Stack

```
┌────────────────────────────────────────────────────────┐
│                    PQMAP Application                   │
├────────────────────────────────────────────────────────┤
│  Frontend:  React 18.3.1 + Vite 5.4.11               │
│  Styling:   TailwindCSS 3.4.1                        │
│  State:     React Context API                        │
│  Maps:      Mapbox GL JS / Leaflet                   │
│  Charts:    Recharts 2.10.0                          │
│  Tables:    AG Grid 33.3.2                           │
├────────────────────────────────────────────────────────┤
│  Backend:   Supabase (PostgreSQL 15.x)                │
│  Auth:      Supabase Auth + Row Level Security       │
│  API:       Supabase PostgREST                       │
│  Storage:   Supabase Storage (attachments)           │
│  Realtime:  Supabase Realtime (WebSockets)           │
├────────────────────────────────────────────────────────┤
│  DevOps:    Docker + Docker Compose                  │
│  CI/CD:     GitHub Actions                           │
│  Hosting:   Vercel (Frontend), Supabase Cloud        │
│  VCS:       Git + GitHub                             │
└────────────────────────────────────────────────────────┘
```

### System Context Diagram

```
                     ┌─────────────────┐
                     │   PQMS System   │
                     │ (Legacy Data)   │
                     └────────┬────────┘
                              │ CSV Export
                              ▼
┌──────────────┐      ┌──────────────────┐      ┌─────────────┐
│   Operator   │◄────►│   PQMAP Web App  │◄────►│  ADMS/SCADA │
│  (Browser)   │      │  (React + Supab) │      │  (Future)   │
└──────────────┘      └──────────┬───────┘      └─────────────┘
                              │
                     ┌────────┴────────┐
                     │   Power BI      │
                     │  (Optional)     │
                     └─────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**
   - `src/pages/` - UI components (presentation layer)
   - `src/services/` - Business logic + API calls (service layer)
   - `src/utils/` - Shared utilities (helper functions)

2. **Component Reusability**
   - Shared components in `src/components/`
   - Custom hooks for state management
   - Props-based configuration

3. **Security First**
   - Row-level security (RLS) on all tables
   - Role-based access control (admin/operator/viewer)
   - Prepared statements (SQL injection prevention)

4. **Performance**
   - Lazy loading for large datasets
   - Pagination (50 rows per page)
   - Memoization for expensive calculations
   - Indexed database columns

---

## Component Architecture

### Frontend Structure

```
src/
├── pages/                    # Feature modules (one per menu item)
│   ├── Dashboard.tsx         # Main application shell
│   ├── EventList.tsx         # PQ event management
│   ├── MeterMap.tsx          # Geographic visualization
│   ├── SubstationMap.tsx     # Substation overview
│   ├── DataMaintenance/      # New modular structure
│   │   ├── WeightingFactors.tsx
│   │   ├── PQBenchmarking.tsx
│   │   └── index.ts
│   └── ReportBuilder.tsx     # Pivot tables + charts
│
├── components/               # Shared UI components
│   ├── EventCard.tsx         # Event detail card
│   ├── FilterPanel.tsx       # Common filter UI
│   ├── MapLegend.tsx         # Map legend component
│   └── CustomerTransformerMatching.tsx
│
├── services/                 # Business logic layer
│   ├── eventService.ts       # PQ event operations
│   ├── meterService.ts       # Meter CRUD
│   ├── sarfiService.ts       # SARFI calculations (enhanced)
│   ├── benchmarkingService.ts # PQ benchmarking (new, 332 lines)
│   └── supabaseClient.ts     # Supabase initialization
│
├── utils/                    # Shared utilities
│   ├── dateUtils.ts          # Date formatting
│   ├── exportUtils.ts        # CSV/Excel export
│   └── constants.ts          # App constants
│
└── types/                    # TypeScript definitions
    ├── database.types.ts     # Supabase auto-generated
    └── custom.types.ts       # Custom types
```

### Service Layer Pattern

All services follow this pattern:

```typescript
// Example: meterService.ts
import { supabase } from './supabaseClient';

export const meterService = {
  // List with filters
  async getMeters(filters?: { region?: string; site_id?: string }) {
    let query = supabase.from('pq_meters').select('*');
    if (filters?.region) query = query.eq('region', filters.region);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Get single
  async getMeterById(id: string) {
    const { data, error } = await supabase
      .from('pq_meters')
      .select('*')
      .eq('meter_id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Create
  async createMeter(meter: InsertMeter) {
    const { data, error } = await supabase
      .from('pq_meters')
      .insert(meter)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Update
  async updateMeter(id: string, updates: Partial<Meter>) {
    const { data, error } = await supabase
      .from('pq_meters')
      .update(updates)
      .eq('meter_id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Delete
  async deleteMeter(id: string) {
    const { error } = await supabase
      .from('pq_meters')
      .delete()
      .eq('meter_id', id);
    if (error) throw error;
  }
};
```

### State Management Strategy

**Current:** React Context API
```typescript
// Example: AuthContext
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Subscribe to auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
```

**Future (Q3 2026):** Consider Redux Toolkit for complex state
- Reason: As app grows beyond 20 pages, Context re-renders become expensive
- Migration path: Start with Redux for new modules, migrate incrementally

---

## Database Architecture

### Entity Relationship Diagram (Simplified)

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   pq_meters     │       │    pq_events     │       │   substations   │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ meter_id (PK)   │◄──────│ meter_id (FK)    │       │ substation_code │
│ site_id         │       │ event_id (PK)    │──────►│ name            │
│ region          │       │ substation_code  │       │ voltage_level   │
│ load_type       │       │ start_time       │       │ latitude        │
│ enable (bool)   │       │ severity         │       │ longitude       │
└─────────────────┘       │ cause            │       └─────────────────┘
        │                 │ mother_event_id  │
        │                 │ false_event      │
        │                 └──────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌──────────────────────┐  ┌─────────────────────┐
│ sarfi_profile_weights│  │ customer_impacts    │
├──────────────────────┤  ├─────────────────────┤
│ profile_id (FK)      │  │ event_id (FK)       │
│ meter_id (FK)        │  │ customer_count      │
│ customer_count (new) │  │ created_at          │
│ weight (calculated)  │  └─────────────────────┘
└──────────────────────┘
```

### Database Constraints & Indexes

**Key Indexes (for performance):**
1. `pq_events.meter_id` - Most queries filter by meter
2. `pq_events.start_time` - Date range queries
3. `pq_events.substation_code` - Substation filtering
4. `pq_events.mother_event_id` - Grouping queries
5. `customer_transformer_matching.circuit_id` - Customer impact lookup

**Foreign Key Constraints:**
- `pq_events.meter_id` → `pq_meters.meter_id` (ON DELETE CASCADE)
- `customer_impacts.event_id` → `pq_events.event_id` (ON DELETE CASCADE)
- `sarfi_profile_weights.meter_id` → `pq_meters.meter_id` (ON DELETE CASCADE)

**Check Constraints:**
- `pq_events.severity` IN ('Critical', 'Warning', 'Information')
- `pq_meters.voltage_level` > 0
- `sarfi_profile_weights.customer_count` >= 0

### Row-Level Security (RLS) Policies

```sql
-- Example: pq_events table
-- Admin: Full access
CREATE POLICY "Admin full access" ON pq_events
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Operator: Read + update (no delete)
CREATE POLICY "Operator read/update" ON pq_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'operator')
  );

CREATE POLICY "Operator update" ON pq_events
  FOR UPDATE USING (
    auth.jwt() ->> 'role' IN ('admin', 'operator')
  );

-- Viewer: Read only
CREATE POLICY "Viewer read" ON pq_events
  FOR SELECT USING (
    auth.jwt() ->> 'role' IN ('admin', 'operator', 'viewer')
  );
```

### Migration Strategy

**Naming Convention:** `YYYYMMDD_HHMMSS_description.sql`

**Example:**
```sql
-- 20260107000000_add_customer_count_to_weights.sql
BEGIN;

-- Add column
ALTER TABLE sarfi_profile_weights 
  ADD COLUMN customer_count INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN sarfi_profile_weights.customer_count 
  IS 'Number of customers served by this meter for SARFI weight calculation';

-- Update existing rows (backfill)
UPDATE sarfi_profile_weights w
SET customer_count = (
  SELECT COUNT(DISTINCT c.customer_id)
  FROM customer_transformer_matching ctm
  JOIN customers c ON c.site_id = ctm.site_id
  WHERE ctm.circuit_id = w.meter_id
);

COMMIT;
```

**Rollback Plan:** Every migration should have a rollback script
```sql
-- rollback_20260107000000.sql
BEGIN;
ALTER TABLE sarfi_profile_weights DROP COLUMN customer_count;
COMMIT;
```

---

## SARFI System Architecture

### Overview

The SARFI (System Average RMS Variation Frequency Index) system provides configurable power quality monitoring with profile-based weighting and flexible filtering.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE LAYER                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    SARFI Dashboard                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  SARFIChart.tsx                               [⚙️ Config]│  │  │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │  │
│  │  │  │  Chart: SARFI-70, SARFI-80, SARFI-90 Trends     │  │  │  │
│  │  │  │  - Monthly aggregation                           │  │  │  │
│  │  │  │  - Weighted by profile factors                   │  │  │  │
│  │  │  └──────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  SARFIDataTable.tsx (Optional)                         │  │  │
│  │  │  ┌──────────┬──────────┬─────┬─────┬────┬────────────┐│  │  │
│  │  │  │ Meter No │ Location │ S70 │ S80 │... │ Weight     ││  │  │
│  │  │  ├──────────┼──────────┼─────┼─────┼────┼────────────┤│  │  │
│  │  │  │ PQM-001  │ TST      │  5  │  3  │... │  2.5000    ││  │  │
│  │  │  │ PQM-002  │ CWB      │  8  │  4  │... │  1.8500    ││  │  │
│  │  │  └──────────┴──────────┴─────┴─────┴────┴────────────┘│  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SARFIConfigModal.tsx (Overlay)                              │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  Filters:                                               │  │  │
│  │  │  • Profile: [2023 ▼] [2024 ▼] [2025 ✓]                │  │  │
│  │  │  • Voltage Level: [11kV ▼]                             │  │  │
│  │  │  • Exclude Special Events: [✓]                         │  │  │
│  │  │  • Data Type: [Magnitude] [Duration]                   │  │  │
│  │  │  • Show Data Table: [✓]                                │  │  │
│  │  │                                                          │  │  │
│  │  │  [Cancel]  [Apply Filters]                             │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SARFIProfileManagement.tsx (Admin Only)                     │  │
│  │  ┌─────────────────┐  ┌──────────────────────────────────┐  │  │
│  │  │ Profiles        │  │ Weighting Factors                 │  │  │
│  │  │ ┌─────────────┐ │  │ ┌──────────┬────────┬──────────┐ │  │  │
│  │  │ │ 2023 [✏️][🗑️] │ │  │ │ Meter    │ Weight │ Actions │ │  │  │
│  │  │ │ 2024 [✏️][🗑️] │ │  │ ├──────────┼────────┼──────────┤ │  │  │
│  │  │ │ 2025 ✓[✏️][🗑️]│ │  │ │ PQM-001  │ 2.5000 │   [✏️]   │ │  │  │
│  │  │ └─────────────┘ │  │ │ PQM-002  │ 1.8500 │   [✏️]   │ │  │  │
│  │  │ [+]             │  │ └──────────┴────────┴──────────┘ │  │  │
│  │  └─────────────────┘  └──────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          SERVICE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  sarfiService.ts                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Profile Management:                                          │  │
│  │  • fetchSARFIProfiles()      → Get all profiles              │  │
│  │  • fetchActiveProfile(year)   → Get active profile           │  │
│  │  • createSARFIProfile()       → Create new profile           │  │
│  │  • updateSARFIProfile()       → Modify profile               │  │
│  │  • deleteSARFIProfile()       → Remove profile               │  │
│  │                                                                │  │
│  │  Weight Management:                                            │  │
│  │  • fetchProfileWeights()      → Get weights for profile      │  │
│  │  • upsertProfileWeight()      → Add/update weight            │  │
│  │  • batchUpdateWeights()       → Update multiple weights      │  │
│  │  • deleteProfileWeight()      → Remove weight                │  │
│  │                                                                │  │
│  │  Data Retrieval:                                              │  │
│  │  • fetchFilteredSARFIData()   → Get filtered SARFI data      │  │
│  │  • calculateWeightedSARFI()   → Calculate weighted indices   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                    ↕
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  sarfi_profiles                                             │    │
│  │  ┌────┬─────────────┬──────┬──────────┬───────────┬─────┐ │    │
│  │  │ id │ name        │ year │ is_active│ created_at│ ... │ │    │
│  │  ├────┼─────────────┼──────┼──────────┼───────────┼─────┤ │    │
│  │  │ 1  │ 2023 Std    │ 2023 │  false   │ ...       │ ... │ │    │
│  │  │ 2  │ 2024 Std    │ 2024 │  false   │ ...       │ ... │ │    │
│  │  │ 3  │ 2025 Std    │ 2025 │  true    │ ...       │ ... │ │    │
│  │  └────┴─────────────┴──────┴──────────┴───────────┴─────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
│                             ↓ (1:N)                                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  sarfi_profile_weights                                      │    │
│  │  ┌────┬────────────┬──────────┬───────────────┬─────────┐  │    │
│  │  │ id │ profile_id │ meter_id │ weight_factor │ notes   │  │    │
│  │  ├────┼────────────┼──────────┼───────────────┼─────────┤  │    │
│  │  │ 1  │     3      │  PQM-001 │    2.5000     │ Auto    │  │    │
│  │  │ 2  │     3      │  PQM-002 │    1.8500     │ Auto    │  │    │
│  │  │ 3  │     3      │  PQM-003 │    3.2000     │ Auto    │  │    │
│  │  └────┴────────────┴──────────┴───────────────┴─────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Relationships:                                                      │
│  • sarfi_profiles → sarfi_profile_weights (1:N)                     │
│  • sarfi_profile_weights → pq_meters (N:1)                          │
│  • Cascade delete: Deleting profile removes all weights             │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Filter Application

```
User Action                Service Layer              Database
────────────              ─────────────              ────────

[Click ⚙️]
    │
    ├─→ Open Modal
    │       │
    │       ├─→ Load Profiles    → fetchSARFIProfiles()  → SELECT * FROM sarfi_profiles
    │       │                                                         ↓
    │       │                      ← Return profiles[]  ← [2023, 2024, 2025]
    │       │
    │   [Select Profile: 2025]
    │   [Select Voltage: 11kV]
    │   [Toggle: Exclude Special]
    │   [Toggle: Show Table]
    │       │
    │   [Click Apply]
    │       │
    │       ├─→ Save to localStorage (sarfi_filters)
    │       │
    │       ├─→ fetchFilteredSARFIData()  → Complex Query:
    │       │                                 • JOIN pq_events + meters
    │       │                                 • Filter by voltage_level = '11kV'
    │       │                                 • Filter is_special_event = false
    │       │                                 • Group by meter_id
    │       │                                         ↓
    │       │        ← Return events[]     ← [Raw event data]
    │       │
    │       ├─→ fetchProfileWeights()     → SELECT * FROM sarfi_profile_weights
    │       │                                 WHERE profile_id = '2025'
    │       │                                         ↓
    │       │        ← Return weights[]    ← [meter_id, weight_factor]
    │       │
    │       ├─→ Process data locally:
    │       │   • Group events by meter
    │       │   • Calculate SARFI indices
    │       │   • Apply weight factors
    │       │
    │   [Update Chart]
    │   [Show Data Table]
    │
[View Updated Dashboard]
```

### State Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Component State                           │
├─────────────────────────────────────────────────────────────┤
│  SARFIChart                                                  │
│  ├─ filters: SARFIFilters          (from localStorage)      │
│  ├─ isConfigOpen: boolean          (modal visibility)       │
│  └─ tableData: SARFIDataPoint[]    (computed from filters)  │
│                                                               │
│  SARFIConfigModal                                            │
│  ├─ localFilters: SARFIFilters     (temp state)             │
│  └─ profiles: SARFIProfile[]       (loaded on mount)        │
│                                                               │
│  SARFIProfileManagement                                      │
│  ├─ profiles: SARFIProfile[]       (all profiles)           │
│  ├─ selectedProfile: SARFIProfile  (for weight editing)     │
│  ├─ weights: SARFIProfileWeight[]  (for selected)           │
│  └─ loading: boolean               (async operations)       │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
└── Dashboard
    └── SARFIChart
        └── SARFIConfigModal

Settings
└── SARFIProfileManagement
    ├── Profile List Panel
    └── Weighting Factors Panel
```

**Key Features:**
- Clean separation: UI → Service → Database
- Profile-based configuration with annual snapshots
- Weight factors support customer count calculations (Jan 2026 enhancement)
- Client-side filtering for responsive UX
- localStorage persistence for user preferences

---

## Integration Points

### 1. PQMS (Legacy System)

**Direction:** PQMS → PQMAP (one-way)  
**Method:** CSV Export + Manual Import  
**Frequency:** Monthly (historical data backfill)

**Data Mapping:**
```
PQMS Field              → PQMAP Field
─────────────────────────────────────────
EVENT_ID                → event_id
METER_NUMBER            → meter_id
EVENT_START_TIME        → start_time
EVENT_END_TIME          → end_time
VOLTAGE_SAG_DEPTH       → min_voltage
DURATION_MS             → duration_ms
SEVERITY_LEVEL          → severity
ROOT_CAUSE_CODE         → cause (mapped via lookup)
```

**Import Process:**
1. Export CSV from PQMS
2. Upload via PQMAP UI (Data Maintenance → Import)
3. Validation checks (duplicate event_id, invalid meter_id)
4. Bulk insert via Supabase `upsert()`

### 2. ADMS/SCADA (Future - Q3 2026)

**Direction:** Bidirectional  
**Method:** REST API + Kafka/RabbitMQ (event streaming)  
**Frequency:** Real-time (15-second intervals)

**API Endpoints (Planned):**
```
POST /api/v1/events          # ADMS pushes new event
GET  /api/v1/meters/:id      # ADMS queries meter status
PUT  /api/v1/meters/:id      # ADMS updates meter availability
POST /api/v1/webhooks        # ADMS registers webhook for alerts
```

**Authentication:** API key + IP whitelist

**Data Sync Flow:**
```
SCADA System
     │
     │ (1) Event detected
     ▼
 Kafka Topic: pqmap.events.raw
     │
     │ (2) Event enrichment
     ▼
 PQMAP Edge Function
     │
     │ (3) Validation + deduplication
     ▼
 Supabase pq_events table
     │
     │ (4) Realtime notification
     ▼
 PQMAP Frontend (WebSocket)
```

### 3. Power BI (Optional - See ROADMAP.md)

**Direction:** PQMAP → Power BI (one-way)  
**Method:** Push API (Supabase Edge Function → Power BI REST API)  
**Frequency:** Every 15 minutes

**Data Flow:**
```
Supabase pg_cron (every 15 min)
     │
     ▼
Edge Function: aggregate_pq_data()
     │ (Aggregate 20,000 events → daily summaries)
     ▼
Power BI Push API
     │ POST https://api.powerbi.com/v1.0/myorg/datasets/{id}/rows
     ▼
Power BI Dataset (refreshed)
     │
     ▼
Power BI Report (embedded in PQMAP)
```

---

## Security Architecture

### Authentication Flow

```
User (Browser)
     │
     │ (1) Login with email/password
     ▼
Supabase Auth
     │
     │ (2) Verify credentials
     ▼
JWT Token (expires in 1 hour)
     │
     │ (3) Store in localStorage
     ▼
Frontend App
     │
     │ (4) Include in all API requests
     │     Authorization: Bearer <token>
     ▼
Supabase PostgREST
     │
     │ (5) Verify token + check RLS policies
     ▼
PostgreSQL Database
```

### Authorization Model

**User Roles:**
1. **Admin** - Full CRUD access to all tables
2. **Operator** - Read + Update (no delete) on events/meters
3. **Viewer** - Read-only access

**⚠️ CRITICAL: Database User Role Enum**

The database uses a specific enum type for user roles. **Always use these exact values in SQL:**

```sql
-- Database enum definition
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
```

**UAM to Database Role Mapping:**
| UAM Role (Frontend) | Database Role (SQL) | Permissions |
|---------------------|---------------------|-------------|
| `system_admin` | `admin` | Full access, approve templates, manage users |
| `system_owner` | `admin` | Full access, approve templates, manage users |
| `manual_implementator` | `operator` | Create/edit data, draft templates, no approval |
| `watcher` | `viewer` | Read-only access |

**Common Error:**
```sql
-- ❌ WRONG - Causes "invalid input value for enum user_role" error
INSERT INTO profiles (role) VALUES ('system_admin');

-- ✅ CORRECT - Use database enum value
INSERT INTO profiles (role) VALUES ('admin');
```

**TypeScript Helper Function:**
```typescript
// Use this when syncing roles from UAM to database
function mapUamRoleToDbRole(uamRole: string): 'admin' | 'operator' | 'viewer' {
  const mapping = {
    'system_admin': 'admin',
    'system_owner': 'admin',
    'manual_implementator': 'operator',
    'watcher': 'viewer'
  };
  return mapping[uamRole] || 'viewer';
}
```

**References:**
- Full documentation: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md#1-profiles)
- Migration example: `supabase/migrations/20260114000001_seed_dummy_users.sql`
- Service layer: `src/services/userManagementService.ts`

**Permission Matrix:**

| Action | Admin | Operator | Viewer |
|--------|-------|----------|--------|
| View events | ✅ | ✅ | ✅ |
| Edit events | ✅ | ✅ | ❌ |
| Delete events | ✅ | ❌ | ❌ |
| Import data | ✅ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| Approve templates | ✅ | ❌ | ❌ |
| Edit SARFI profiles | ✅ | ✅ | ❌ |
| View reports | ✅ | ✅ | ✅ |

### Data Security

**Encryption:**
- ✅ **In Transit:** TLS 1.3 (all API calls)
- ✅ **At Rest:** AES-256 (Supabase managed)
- ✅ **Passwords:** bcrypt (Supabase Auth)

**Audit Trail:**
- All `updated_by` fields track user who made change
- `updated_at` timestamp for every modification
- Future: Audit log table (see ROADMAP.md Q3 2026)

**SQL Injection Prevention:**
- ✅ All queries use Supabase prepared statements
- ✅ No raw SQL from user input
- ✅ Parameterized queries via `.eq()`, `.in()`, etc.

---

## Error Handling & Logging

### Frontend Error Handling

```typescript
// Standard pattern for API calls
async function loadEvents() {
  try {
    const events = await eventService.getEvents({ severity: 'Critical' });
    setEvents(events);
  } catch (error) {
    console.error('Failed to load events:', error);
    
    // User-friendly message
    toast.error('Unable to load events. Please try again.');
    
    // Optional: Log to monitoring service
    logError('EventList.loadEvents', error, { userId: user?.id });
  }
}
```

### Backend Error Handling (Supabase Edge Functions)

```typescript
// Edge Function: aggregate_pq_data
Deno.serve(async (req) => {
  try {
    const { data, error } = await supabase
      .from('pq_events')
      .select('*')
      .gte('start_time', oneHourAgo);

    if (error) throw error;

    // Process data...
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Aggregation failed:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Logging Strategy

**Current:** Console logs + Supabase logs  
**Future (Q4 2026):** Structured logging with Sentry/LogRocket

**Log Levels:**
- `DEBUG` - Development only (verbose)
- `INFO` - Normal operation (e.g., "User logged in")
- `WARN` - Recoverable errors (e.g., "Retry attempt 2/3")
- `ERROR` - Unrecoverable errors (e.g., "Database connection failed")

---

## Development Workflow

### GitHub Requirements Management

**Overview:**
- Use GitHub Issues instead of Jira
- User Stories + Tasks tracked in GitHub Projects
- Automation syncs issues to [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md)

### Creating Requirements

**1. User Story Template**
```markdown
Story ID: US-050
User Story: As a power quality engineer, I want to export SARFI reports to PDF, so that I can share with management

Acceptance Criteria:
- [ ] PDF includes SARFI70 values for all meters
- [ ] PDF includes date range and filter criteria
- [ ] PDF is formatted with company logo
- [ ] Export completes within 5 seconds for 100 meters

Priority: High
Story Points: 5
```

**2. Task Template**
```markdown
Task ID: TASK-150
Description: Implement PDF generation using react-pdf

Parent Story: #50
Component: Frontend
Estimated Hours: 3

Files to Modify:
- src/utils/pdfExport.ts (create)
- src/pages/ReportBuilder.tsx (add export button)
```

### Labels System

**Type Labels:**
- `story` - User stories (automatically added to PROJECT_FUNCTION_DESIGN.md)
- `task` - Development tasks
- `bug` - Bug fixes
- `enhancement` - Feature improvements

**Priority Labels:**
- `priority: critical` - Must fix immediately
- `priority: high` - Important for current sprint
- `priority: medium` - Normal priority
- `priority: low` - Nice to have

**Component Labels:**
- `component: frontend` - React/UI changes
- `component: backend` - API/server changes
- `component: database` - Schema/data changes
- `component: documentation` - Docs only

### Branching Strategy

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/US-050-pdf-export
  │     ├── feature/TASK-150-pdf-generation
  │     ├── bugfix/event-duplicate-filter
  │     └── hotfix/critical-login-issue
```

**Branch Naming:**
- `feature/<issue-id>-<short-description>` - New features
- `bugfix/<issue-id>-<short-description>` - Bug fixes
- `hotfix/<issue-id>-<short-description>` - Critical fixes
- `refactor/<description>` - Code refactoring

### Commit Message Format

```
type(scope): subject

Body (optional)

Closes #123
```

**Examples:**
```
feat(sarfi): add customer count to weighting factors

- Add customer_count column to sarfi_profile_weights
- Implement auto-calculation from customer_transformer_matching
- Update WeightingFactors.tsx UI

Closes #45

────────────────────────────────────────

fix(events): prevent duplicate mother events

Check for existing mother_event_id before grouping

Closes #67
```

### Code Review Checklist

**Before Creating PR:**
- [ ] All tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code formatted (`npm run format`)
- [ ] No console.logs in production code
- [ ] Updated [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) if new feature
- [ ] Created migration file if database changes

**Reviewer Checks:**
- [ ] Code follows project conventions
- [ ] No security vulnerabilities (hardcoded secrets, SQL injection)
- [ ] Error handling present
- [ ] Performance considerations (pagination, indexes)
- [ ] User-facing changes tested in browser

---

## Deployment & DevOps

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/your-org/pqmap.git
cd pqmap

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with Supabase credentials

# 4. Start dev server
npm run dev
# Opens http://localhost:5173
```

### Docker Deployment

```bash
# Build Docker image
docker build -t pqmap:latest .

# Run with Docker Compose
docker-compose up -d

# Includes:
# - Frontend (React app on port 3000)
# - Nginx reverse proxy
# - PostgreSQL (local dev only, use Supabase in production)
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Type check
        run: npm run type-check
      
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Database Migrations in Production

```bash
# Apply new migration
npx supabase db push

# Rollback migration (manual)
psql -h db.supabase.co -U postgres -d pqmap -f rollback_20260107000000.sql
```

---

## Performance Optimization

### Frontend Optimization

**1. Code Splitting (Lazy Loading)**
```typescript
// Instead of:
import EventList from './pages/EventList';

// Use:
const EventList = lazy(() => import('./pages/EventList'));
```

**2. Memoization**
```typescript
// Expensive calculation
const sarfiValue = useMemo(() => {
  return calculateSARFI70(events, weights);
}, [events, weights]);

// Prevent re-renders
const EventCard = memo(({ event }) => {
  return <div>{event.meter_id}</div>;
});
```

**3. Pagination**
```typescript
// Fetch 50 rows at a time
const { data, error } = await supabase
  .from('pq_events')
  .select('*')
  .range(startIndex, endIndex)
  .order('start_time', { ascending: false });
```

### Database Optimization

**1. Query Performance**
```sql
-- Bad: Full table scan
SELECT * FROM pq_events WHERE DATE(start_time) = '2026-01-01';

-- Good: Uses index on start_time
SELECT * FROM pq_events 
WHERE start_time >= '2026-01-01' 
  AND start_time < '2026-01-02';
```

**2. Materialized Views (Future)**
```sql
-- Pre-aggregate SARFI calculations (refresh hourly)
CREATE MATERIALIZED VIEW sarfi_daily_summary AS
SELECT 
  DATE(start_time) as event_date,
  meter_id,
  COUNT(*) as event_count,
  AVG(duration_ms) as avg_duration
FROM pq_events
GROUP BY DATE(start_time), meter_id;

-- Refresh via cron
REFRESH MATERIALIZED VIEW sarfi_daily_summary;
```

**3. Connection Pooling**
- Supabase uses PgBouncer (session pooling)
- Max 100 concurrent connections
- Connection timeout: 30 seconds

---

## Change History

| Date | Section | Change | Author |
|------|---------|--------|--------|
| 2026-01-12 | Database | Added RLS policies for pq_benchmark tables | System |
| 2026-01-07 | All | Initial ARCHITECTURE.md creation | System |
| 2026-01-07 | Component | Added benchmarkingService.ts (332 lines) | System |
| 2026-01-07 | Database | Updated migration strategy, added RLS examples | System |
| 2026-01-07 | Development | Consolidated GitHub workflow from GITHUB_REQUIREMENTS_MANAGEMENT.md | System |

---

**Next Review:** February 15, 2026  
**Owner:** Technical Lead  
**Related Documents:**
- [PROJECT_FUNCTION_DESIGN.md](PROJECT_FUNCTION_DESIGN.md) - Functional specifications
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) - Database schema reference
- [ROADMAP.md](ROADMAP.md) - Feature roadmap
- [STYLES_GUIDE.md](STYLES_GUIDE.md) - UI/UX guidelines
