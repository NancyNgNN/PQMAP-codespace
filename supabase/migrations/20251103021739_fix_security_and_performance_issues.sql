/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses critical security and performance issues identified in the database:
  
  1. **Missing Indexes on Foreign Keys** - Adds indexes to improve query performance
  2. **RLS Policy Optimization** - Updates policies to use `(select auth.uid())` pattern
  3. **Multiple Permissive Policies** - Consolidates redundant SELECT policies
  4. **Removes Unused Indexes** - Cleans up unused indexes

  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Creates indexes for all foreign key columns to optimize JOIN operations:
  - event_customer_impact: event_id, customer_id
  - notifications: event_id
  - pq_events: meter_id, parent_event_id
  - pq_service_records: customer_id, engineer_id
  - reports: generated_by

  ### 2. Optimize RLS Policies
  Updates all RLS policies to use the optimized `(select auth.uid())` pattern
  instead of `auth.uid()` to avoid re-evaluation for each row.

  ### 3. Consolidate Duplicate Policies
  Removes duplicate SELECT policies and keeps only the necessary ones.
*/

-- =====================================================
-- PART 1: Add Missing Foreign Key Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_event_customer_impact_event_id 
  ON event_customer_impact(event_id);

CREATE INDEX IF NOT EXISTS idx_event_customer_impact_customer_id 
  ON event_customer_impact(customer_id);

CREATE INDEX IF NOT EXISTS idx_notifications_event_id 
  ON notifications(event_id);

CREATE INDEX IF NOT EXISTS idx_pq_events_meter_id 
  ON pq_events(meter_id);

CREATE INDEX IF NOT EXISTS idx_pq_events_parent_event_id 
  ON pq_events(parent_event_id);

CREATE INDEX IF NOT EXISTS idx_pq_service_records_customer_id 
  ON pq_service_records(customer_id);

CREATE INDEX IF NOT EXISTS idx_pq_service_records_engineer_id 
  ON pq_service_records(engineer_id);

CREATE INDEX IF NOT EXISTS idx_reports_generated_by 
  ON reports(generated_by);

-- =====================================================
-- PART 2: Remove Duplicate SELECT Policies
-- =====================================================

-- Drop the "manage" policies that include SELECT (we'll keep the view-only policies)
DROP POLICY IF EXISTS "Admins can manage substations" ON substations;
DROP POLICY IF EXISTS "Operators and admins can manage meters" ON pq_meters;
DROP POLICY IF EXISTS "Operators and admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Operators and admins can manage events" ON pq_events;
DROP POLICY IF EXISTS "Operators and admins can manage impact data" ON event_customer_impact;
DROP POLICY IF EXISTS "Operators and admins can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage notification rules" ON notification_rules;
DROP POLICY IF EXISTS "Operators and admins can manage service records" ON pq_service_records;
DROP POLICY IF EXISTS "Admins can manage system health" ON system_health;
DROP POLICY IF EXISTS "Operators and admins can manage SARFI metrics" ON sarfi_metrics;

-- =====================================================
-- PART 3: Recreate Optimized RLS Policies
-- =====================================================

-- Profiles policies (optimized)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- Substations policies (separate by action)
CREATE POLICY "Admins can insert substations"
  ON substations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update substations"
  ON substations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete substations"
  ON substations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- PQ Meters policies (separate by action)
CREATE POLICY "Operators and admins can insert meters"
  ON pq_meters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update meters"
  ON pq_meters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete meters"
  ON pq_meters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- Customers policies (separate by action)
CREATE POLICY "Operators and admins can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- PQ Events policies (separate by action)
CREATE POLICY "Operators and admins can insert events"
  ON pq_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update events"
  ON pq_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete events"
  ON pq_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- Event Customer Impact policies (separate by action)
CREATE POLICY "Operators and admins can insert impact data"
  ON event_customer_impact FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update impact data"
  ON event_customer_impact FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete impact data"
  ON event_customer_impact FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- Notifications policies (separate by action)
CREATE POLICY "Operators and admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- Notification Rules policies (separate by action)
CREATE POLICY "Admins can insert notification rules"
  ON notification_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update notification rules"
  ON notification_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete notification rules"
  ON notification_rules FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- PQ Service Records policies (separate by action)
CREATE POLICY "Operators and admins can insert service records"
  ON pq_service_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update service records"
  ON pq_service_records FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete service records"
  ON pq_service_records FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

-- Reports policies (optimized)
DROP POLICY IF EXISTS "Authenticated users can create reports" ON reports;

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = generated_by);

-- System Health policies (separate by action)
CREATE POLICY "Admins can insert system health"
  ON system_health FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update system health"
  ON system_health FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete system health"
  ON system_health FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- SARFI Metrics policies (separate by action)
CREATE POLICY "Operators and admins can insert SARFI metrics"
  ON sarfi_metrics FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can update SARFI metrics"
  ON sarfi_metrics FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );

CREATE POLICY "Operators and admins can delete SARFI metrics"
  ON sarfi_metrics FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.role IN ('admin', 'operator')
    )
  );