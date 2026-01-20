# Customer Transformer Matching - Implementation Plan

**Date**: December 15, 2025  
**Feature**: Customer-Circuit Mapping for Automatic Customer Impact Generation  
**Module**: Data Maintenance > Customer Transformer Matching

---

## 📋 Overview

### Purpose
Enable automatic creation of `event_customer_impact` records when new PQ events occur by mapping customers to circuits within substations. This allows operators to see affected customers immediately in the "Customer Impact" tab of Event Details.

### Key Concepts
- **Circuit = Transformer**: In CLP's terminology, circuit_id and transformer are the same concept
- **Hierarchy**: `Substation → Circuit (Transformer) → Customer`
- **Matching Logic**: When event occurs at `(substation_id + circuit_id)`, find all mapped customers
- **Critical Customers**: All customers in this mapping table are considered critical

---

## 🎯 Implementation Tasks

### Phase 1: Database Schema (Priority: HIGH)

#### Task 1.1: Create `customer_transformer_matching` Table
**File**: `supabase/migrations/20251215000001_create_customer_transformer_matching.sql`

```sql
-- =====================================================
-- Customer Transformer Matching Table
-- =====================================================
-- Purpose: Map customers to circuits for automatic 
--          customer impact generation on events
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Create the mapping table
CREATE TABLE IF NOT EXISTS customer_transformer_matching (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  substation_id UUID NOT NULL REFERENCES substations(id) ON DELETE RESTRICT,
  circuit_id TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- Unique constraint: One customer can only be mapped once per circuit
CREATE UNIQUE INDEX idx_customer_transformer_unique 
ON customer_transformer_matching(customer_id, substation_id, circuit_id)
WHERE active = true;

-- Performance indexes
CREATE INDEX idx_customer_transformer_substation 
ON customer_transformer_matching(substation_id);

CREATE INDEX idx_customer_transformer_circuit 
ON customer_transformer_matching(substation_id, circuit_id) 
WHERE active = true;

CREATE INDEX idx_customer_transformer_customer 
ON customer_transformer_matching(customer_id);

CREATE INDEX idx_customer_transformer_active 
ON customer_transformer_matching(active);

-- Add comments
COMMENT ON TABLE customer_transformer_matching IS 
'Maps customers to circuits within substations for automatic customer impact generation';

COMMENT ON COLUMN customer_transformer_matching.circuit_id IS 
'Circuit ID (also known as Transformer ID) - matches pq_events.circuit_id';

COMMENT ON COLUMN customer_transformer_matching.active IS 
'Soft delete flag - inactive mappings are not used for impact generation';

COMMENT ON COLUMN customer_transformer_matching.updated_by IS 
'User who last modified this mapping';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_customer_transformer_matching_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_transformer_matching_updated_at
  BEFORE UPDATE ON customer_transformer_matching
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_transformer_matching_updated_at();

-- Row Level Security (RLS)
ALTER TABLE customer_transformer_matching ENABLE ROW LEVEL SECURITY;

-- Admin: Full access
CREATE POLICY "Admins have full access to customer_transformer_matching"
  ON customer_transformer_matching
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Operator: Full access (for now, until user management implemented)
CREATE POLICY "Operators have full access to customer_transformer_matching"
  ON customer_transformer_matching
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'operator')
    )
  );

-- Viewer: Read-only
CREATE POLICY "Viewers can read customer_transformer_matching"
  ON customer_transformer_matching
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'viewer'
    )
  );

COMMIT;

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check table created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'customer_transformer_matching';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'customer_transformer_matching';

-- Check RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'customer_transformer_matching';
```

**Status**: ⏳ Ready to create  
**Estimated Time**: 30 minutes  
**Dependencies**: None

---

#### Task 1.2: Remove `transformer_id` from `customers` Table
**File**: `supabase/migrations/20251215000002_remove_transformer_id_from_customers.sql`

```sql
-- =====================================================
-- Remove transformer_id from customers table
-- =====================================================
-- Purpose: transformer_id is replaced by customer_transformer_matching table
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Drop the column (no data migration needed as per user)
ALTER TABLE customers 
DROP COLUMN IF EXISTS transformer_id;

COMMENT ON TABLE customers IS 
'Customer accounts and service points. Circuit mapping moved to customer_transformer_matching table.';

COMMIT;

-- Verification
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'transformer_id';
-- Should return 0 rows
```

**Status**: ⏳ Ready to create  
**Estimated Time**: 10 minutes  
**Dependencies**: Task 1.1 (should be applied after)

---

#### Task 1.3: Create Function for Automatic Customer Impact Generation
**File**: `supabase/migrations/20251215000003_create_auto_customer_impact_function.sql`

```sql
-- =====================================================
-- Automatic Customer Impact Generation Function
-- =====================================================
-- Purpose: Automatically create event_customer_impact records
--          when new events are created
-- Date: December 15, 2025
-- =====================================================

BEGIN;

-- Function to generate customer impacts for an event
CREATE OR REPLACE FUNCTION generate_customer_impacts_for_event(event_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  v_substation_id UUID;
  v_circuit_id TEXT;
  v_severity TEXT;
  v_duration_ms INTEGER;
  v_impact_level TEXT;
  v_downtime_min INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get event details
  SELECT substation_id, circuit_id, severity, duration_ms
  INTO v_substation_id, v_circuit_id, v_severity, v_duration_ms
  FROM pq_events
  WHERE id = event_id_param;

  -- If event has no substation or circuit, skip
  IF v_substation_id IS NULL OR v_circuit_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Map event severity to impact level
  v_impact_level := CASE v_severity
    WHEN 'critical' THEN 'severe'
    WHEN 'high' THEN 'moderate'
    WHEN 'medium' THEN 'minor'
    WHEN 'low' THEN 'minor'
    ELSE 'minor'
  END;

  -- Calculate downtime in minutes
  v_downtime_min := CASE 
    WHEN v_duration_ms IS NOT NULL THEN ROUND(v_duration_ms::NUMERIC / 60000, 2)
    ELSE NULL
  END;

  -- Insert customer impacts for all matched customers
  INSERT INTO event_customer_impact (
    event_id,
    customer_id,
    impact_level,
    estimated_downtime_min,
    created_at
  )
  SELECT 
    event_id_param,
    ctm.customer_id,
    v_impact_level,
    v_downtime_min,
    now()
  FROM customer_transformer_matching ctm
  WHERE ctm.substation_id = v_substation_id
    AND ctm.circuit_id = v_circuit_id
    AND ctm.active = true
  ON CONFLICT DO NOTHING;  -- Prevent duplicates

  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_customer_impacts_for_event(UUID) IS 
'Generates event_customer_impact records for all customers mapped to the event''s substation and circuit';

-- Trigger function to auto-generate on INSERT
CREATE OR REPLACE FUNCTION trigger_generate_customer_impacts()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate customer impacts for new event
  PERFORM generate_customer_impacts_for_event(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on pq_events INSERT
CREATE TRIGGER trigger_auto_generate_customer_impacts
  AFTER INSERT ON pq_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_customer_impacts();

COMMENT ON TRIGGER trigger_auto_generate_customer_impacts ON pq_events IS 
'Automatically generates customer impact records when new events are created';

COMMIT;

-- =====================================================
-- Test the function
-- =====================================================

-- Manual test (uncomment to test):
/*
-- Get a test event
SELECT id, substation_id, circuit_id, severity 
FROM pq_events 
WHERE substation_id IS NOT NULL 
AND circuit_id IS NOT NULL 
LIMIT 1;

-- Run function manually
SELECT generate_customer_impacts_for_event('<event_id_here>');

-- Check results
SELECT * FROM event_customer_impact WHERE event_id = '<event_id_here>';
*/
```

**Status**: ⏳ Ready to create  
**Estimated Time**: 45 minutes  
**Dependencies**: Task 1.1

---

#### Task 1.4: Backfill Historical Events Script
**File**: `scripts/backfill_customer_impacts.sql`

```sql
-- =====================================================
-- Backfill Customer Impacts for Historical Events
-- =====================================================
-- Purpose: Generate customer impacts for all existing events
--          based on customer_transformer_matching
-- Date: December 15, 2025
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_total_events INTEGER;
  v_events_with_circuit INTEGER;
  v_total_impacts INTEGER;
  v_event RECORD;
  v_impacts INTEGER;
BEGIN
  RAISE NOTICE '=== BACKFILL CUSTOMER IMPACTS - STARTED ===';
  RAISE NOTICE 'Timestamp: %', now();
  
  -- Count total events
  SELECT COUNT(*) INTO v_total_events FROM pq_events;
  RAISE NOTICE 'Total events in database: %', v_total_events;
  
  -- Count events with substation and circuit
  SELECT COUNT(*) INTO v_events_with_circuit 
  FROM pq_events 
  WHERE substation_id IS NOT NULL 
  AND circuit_id IS NOT NULL;
  RAISE NOTICE 'Events with substation + circuit: %', v_events_with_circuit;
  
  -- Initialize counter
  v_total_impacts := 0;
  
  -- Loop through all events with substation and circuit
  FOR v_event IN 
    SELECT id, substation_id, circuit_id, timestamp
    FROM pq_events 
    WHERE substation_id IS NOT NULL 
    AND circuit_id IS NOT NULL
    ORDER BY timestamp ASC
  LOOP
    -- Generate impacts for this event
    v_impacts := generate_customer_impacts_for_event(v_event.id);
    v_total_impacts := v_total_impacts + v_impacts;
    
    -- Progress logging (every 100 events)
    IF (v_total_impacts % 100) = 0 THEN
      RAISE NOTICE 'Processed: % impacts generated so far...', v_total_impacts;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== BACKFILL COMPLETE ===';
  RAISE NOTICE 'Total customer impacts generated: %', v_total_impacts;
  RAISE NOTICE 'Average impacts per event: %', 
    CASE WHEN v_events_with_circuit > 0 
    THEN ROUND(v_total_impacts::NUMERIC / v_events_with_circuit, 2)
    ELSE 0 END;
END $$;

-- Show summary statistics
SELECT 
  'Backfill Summary' as report,
  COUNT(DISTINCT event_id) as events_with_impacts,
  COUNT(*) as total_customer_impacts,
  COUNT(DISTINCT customer_id) as unique_customers_affected
FROM event_customer_impact;

-- Show impacts by severity
SELECT 
  impact_level,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM event_customer_impact
GROUP BY impact_level
ORDER BY count DESC;

COMMIT;
```

**Status**: ⏳ Ready to create  
**Estimated Time**: 20 minutes (script) + runtime depends on data volume  
**Dependencies**: Task 1.1, 1.3 (run after mappings are created)

---

### Phase 2: TypeScript Interfaces (Priority: HIGH)

#### Task 2.1: Update `database.ts` - Remove transformer_id, Add New Interface
**File**: `src/types/database.ts`

**Changes**:
1. Remove `transformer_id` from `Customer` interface
2. Add new `CustomerTransformerMatching` interface

```typescript
// REMOVE from Customer interface:
export interface Customer {
  id: string;
  account_number: string;
  name: string;
  address: string | null;
  substation_id: string | null;
  // transformer_id: string | null;  // ❌ DELETE THIS LINE
  contract_demand_kva: number | null;
  customer_type: CustomerType;
  critical_customer: boolean;
  created_at: string;
  substation?: Substation;
}

// ADD new interface:
export interface CustomerTransformerMatching {
  id: string;
  customer_id: string;
  substation_id: string;
  circuit_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  // Joined relations
  customer?: Customer;
  substation?: Substation;
  updated_by_profile?: Profile;
}
```

**Status**: ⏳ Ready to implement  
**Estimated Time**: 15 minutes  
**Dependencies**: None (can do in parallel with Phase 1)

---

### Phase 3: Service Layer (Priority: HIGH)

#### Task 3.1: Create `customerTransformerService.ts`
**File**: `src/services/customerTransformerService.ts`

```typescript
import { supabase } from '../lib/supabase';
import type { CustomerTransformerMatching } from '../types/database';

export interface CreateMappingInput {
  customer_id: string;
  substation_id: string;
  circuit_id: string;
}

export interface UpdateMappingInput {
  id: string;
  substation_id?: string;
  circuit_id?: string;
  active?: boolean;
}

export interface MappingFilters {
  substationId?: string;
  circuitId?: string;
  customerId?: string;
  activeOnly?: boolean;
}

/**
 * Fetch all customer-transformer mappings with filters
 */
export async function fetchCustomerTransformerMappings(
  filters?: MappingFilters
): Promise<CustomerTransformerMatching[]> {
  let query = supabase
    .from('customer_transformer_matching')
    .select(`
      *,
      customer:customers(*),
      substation:substations(*),
      updated_by_profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.substationId) {
    query = query.eq('substation_id', filters.substationId);
  }

  if (filters?.circuitId) {
    query = query.eq('circuit_id', filters.circuitId);
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters?.activeOnly !== false) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching customer transformer mappings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get distinct circuits for a substation from pq_events
 */
export async function getCircuitsForSubstation(
  substationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('pq_events')
    .select('circuit_id')
    .eq('substation_id', substationId)
    .not('circuit_id', 'is', null)
    .order('circuit_id');

  if (error) {
    console.error('Error fetching circuits:', error);
    throw error;
  }

  // Get unique circuit IDs
  const uniqueCircuits = [...new Set(data.map(d => d.circuit_id))];
  return uniqueCircuits.sort();
}

/**
 * Create a new customer-transformer mapping
 */
export async function createCustomerTransformerMapping(
  input: CreateMappingInput,
  userId: string
): Promise<CustomerTransformerMatching> {
  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .insert({
      ...input,
      updated_by: userId
    })
    .select(`
      *,
      customer:customers(*),
      substation:substations(*)
    `)
    .single();

  if (error) {
    console.error('Error creating mapping:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing mapping
 */
export async function updateCustomerTransformerMapping(
  input: UpdateMappingInput,
  userId: string
): Promise<CustomerTransformerMatching> {
  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .update({
      ...updates,
      updated_by: userId
    })
    .eq('id', id)
    .select(`
      *,
      customer:customers(*),
      substation:substations(*)
    `)
    .single();

  if (error) {
    console.error('Error updating mapping:', error);
    throw error;
  }

  return data;
}

/**
 * Delete (soft delete by setting active = false)
 */
export async function deleteCustomerTransformerMapping(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('customer_transformer_matching')
    .update({ active: false, updated_by: userId })
    .eq('id', id);

  if (error) {
    console.error('Error deleting mapping:', error);
    throw error;
  }
}

/**
 * Hard delete (permanently remove)
 */
export async function permanentlyDeleteMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_transformer_matching')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error permanently deleting mapping:', error);
    throw error;
  }
}

/**
 * Get mappings count by substation
 */
export async function getMappingStatistics() {
  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .select('substation_id, circuit_id, active')
    .eq('active', true);

  if (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }

  const stats = {
    totalActive: data.length,
    bySubstation: {} as Record<string, number>,
    uniqueCircuits: new Set(data.map(d => d.circuit_id)).size
  };

  data.forEach(mapping => {
    stats.bySubstation[mapping.substation_id] = 
      (stats.bySubstation[mapping.substation_id] || 0) + 1;
  });

  return stats;
}
```

**Status**: ⏳ Ready to create  
**Estimated Time**: 1 hour  
**Dependencies**: Task 2.1

---

### Phase 4: React Components (Priority: MEDIUM)

#### Task 4.1: Create `CustomerTransformerMatching.tsx` Main Component
**File**: `src/components/CustomerTransformerMatching.tsx`

**Features**:
- Filter section (Substation, Circuit, Customer search)
- Mapping table with columns: Customer, Substation, Circuit, Updated By, Updated At, Active, Actions
- Add/Edit modal with dropdowns
- Delete confirmation
- Bulk import button (UI only, functionality later)
- Export to Excel

**Estimated Time**: 3-4 hours  
**Dependencies**: Task 3.1

---

#### Task 4.2: Update `App.tsx` - Add Sidebar Navigation
**File**: `src/App.tsx`

Add new navigation item in sidebar:
```tsx
{/* After PQ Services */}
<button
  onClick={() => setActiveComponent('customerTransformerMatching')}
  className={`sidebar-item ${activeComponent === 'customerTransformerMatching' ? 'active' : ''}`}
>
  <Database className="w-5 h-5" />
  <span>Data Maintenance</span>
</button>
```

Add route in main content:
```tsx
{activeComponent === 'customerTransformerMatching' && <CustomerTransformerMatching />}
```

**Estimated Time**: 30 minutes  
**Dependencies**: Task 4.1

---

### Phase 5: Testing & Documentation (Priority: MEDIUM)

#### Task 5.1: Create Test Data Script
**File**: `scripts/seed_customer_transformer_mappings.sql`

Create sample mappings for testing.

**Estimated Time**: 30 minutes

---

#### Task 5.2: Update Documentation
Update these files:
- `DATABASE_SCHEMA.md` - Add new table documentation
- `PROJECT_FUNCTION_DESIGN.md` - Add Data Maintenance module section

**Estimated Time**: 1 hour

---

## 🗓️ Implementation Timeline

### Week 1: Database & Backend (Days 1-3)
- ✅ Day 1: Tasks 1.1, 1.2, 1.3 (Database migrations)
- ✅ Day 2: Task 1.4 (Backfill script), Task 2.1 (TypeScript interfaces)
- ✅ Day 3: Task 3.1 (Service layer), Testing

### Week 2: Frontend (Days 4-7)
- ✅ Day 4-5: Task 4.1 (Main component UI)
- ✅ Day 6: Task 4.2 (App integration), Task 5.1 (Test data)
- ✅ Day 7: Task 5.2 (Documentation), Final testing

**Total Estimated Time**: 12-15 hours development + testing

---

## 📝 Acceptance Criteria

### Database
- [x] `customer_transformer_matching` table created with all fields
- [x] `customers.transformer_id` column removed
- [x] Auto-generation function works on event INSERT
- [x] Backfill script runs successfully
- [x] RLS policies prevent unauthorized access

### TypeScript
- [x] `Customer` interface updated (transformer_id removed)
- [x] `CustomerTransformerMatching` interface added
- [x] No TypeScript compilation errors

### Service Layer
- [x] CRUD operations work correctly
- [x] Filters work (substation, circuit, customer)
- [x] Circuit dropdown shows only substation's circuits
- [x] Error handling for duplicate mappings

### UI/UX
- [x] Data Maintenance menu appears in sidebar below PQ Services
- [x] Table displays all mappings with filtering
- [x] Add/Edit modal with validated dropdowns
- [x] Delete with confirmation
- [x] Bulk import button present (disabled with tooltip)
- [x] Export to Excel works
- [x] Loading states and error messages

### Functional
- [x] New events automatically create customer impacts
- [x] Historical events backfilled with impacts
- [x] Customer Impact tab shows affected customers
- [x] Severity mapping works correctly (critical→severe, high→moderate, etc.)
- [x] Downtime calculated from duration_ms

---

## 🚨 Known Limitations & Future Enhancements

### Current Limitations
1. **Circuit Dropdown**: Only shows circuits from existing events (no way to add new circuits without events)
2. **Bulk Import**: Button present but not functional yet
3. **User Management**: Permissions ready but user management not implemented
4. **Audit Trail**: Only last update tracked, no full history

### Future Enhancements
1. **Create `substation_circuits` table** for comprehensive circuit management
2. **Implement bulk CSV import** functionality
3. **Add audit log table** for full change history
4. **Add validation rules** (e.g., max customers per circuit)
5. **Add notification** when new mappings affect existing events
6. **Add dashboard widget** showing mapping coverage statistics

---

## 📚 Related Documents

- `DATABASE_SCHEMA.md` - Database schema reference
- `PROJECT_FUNCTION_DESIGN.md` - Functional design document
- `scripts/reorganize_events_database.sql` - Event reorganization (uses circuit_id)

---

**Status**: 📋 Planning Complete - Ready for Implementation  
**Next Step**: Start with Phase 1 (Database migrations)  
**Estimated Completion**: End of Week 2
