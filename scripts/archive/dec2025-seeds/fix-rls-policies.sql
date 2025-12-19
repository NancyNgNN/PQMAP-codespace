-- Temporary fix for development - Allow all authenticated users to manage data
-- Run this in your Supabase SQL Editor

-- Drop the restrictive policies temporarily
DROP POLICY IF EXISTS "Admins can manage substations" ON substations;
DROP POLICY IF EXISTS "Operators and admins can manage meters" ON pq_meters;
DROP POLICY IF EXISTS "Operators and admins can manage customers" ON customers;
DROP POLICY IF EXISTS "Operators and admins can manage events" ON pq_events;
DROP POLICY IF EXISTS "Operators and admins can manage impact data" ON event_customer_impact;
DROP POLICY IF EXISTS "Operators and admins can manage notifications" ON notifications;
DROP POLICY IF EXISTS "Operators and admins can manage service records" ON pq_service_records;
DROP POLICY IF EXISTS "Admins can manage notification rules" ON notification_rules;
DROP POLICY IF EXISTS "Admins can manage system health" ON system_health;
DROP POLICY IF EXISTS "Operators and admins can manage SARFI metrics" ON sarfi_metrics;

-- Create more permissive policies for development
CREATE POLICY "Authenticated users can manage substations"
  ON substations FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage meters"
  ON pq_meters FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage events"
  ON pq_events FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage impact data"
  ON event_customer_impact FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage notification rules"
  ON notification_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage service records"
  ON pq_service_records FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage system health"
  ON system_health FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage SARFI metrics"
  ON sarfi_metrics FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);