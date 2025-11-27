/*
  # PQMAP Database Schema - Power Quality Monitoring and Analysis Platform

  ## Overview
  This migration creates the complete database schema for the PQMAP system, including tables for:
  - User management and authentication
  - Substations and power grid infrastructure
  - Power quality meters and their status
  - PQ events (voltage dips, swells, harmonics, etc.)
  - Event analysis and root cause tracking
  - Customer impact tracking
  - Notifications and alerts
  - Service records and reports
  - System health monitoring

  ## New Tables

  ### 1. `profiles`
  User profile information linked to auth.users
  - `id` (uuid, pk) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `role` (text) - User role: admin, operator, viewer
  - `department` (text) - Department name
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `substations`
  Physical substation locations and details
  - `id` (uuid, pk) - Unique identifier
  - `name` (text) - Substation name
  - `code` (text, unique) - Substation code
  - `voltage_level` (text) - Voltage level (e.g., "132kV", "11kV")
  - `latitude` (decimal) - GPS latitude
  - `longitude` (decimal) - GPS longitude
  - `region` (text) - Geographic region
  - `status` (text) - operational, maintenance, offline
  - `created_at` (timestamptz)

  ### 3. `pq_meters`
  Power quality monitoring meters/devices
  - `id` (uuid, pk) - Unique identifier
  - `meter_id` (text, unique) - Meter serial number
  - `substation_id` (uuid, fk) - Associated substation
  - `location` (text) - Specific location within substation
  - `status` (text) - active, abnormal, inactive
  - `last_communication` (timestamptz) - Last successful communication
  - `firmware_version` (text)
  - `installed_date` (timestamptz)
  - `created_at` (timestamptz)

  ### 4. `pq_events`
  Power quality events (dips, swells, harmonics, etc.)
  - `id` (uuid, pk) - Unique identifier
  - `event_type` (text) - voltage_dip, voltage_swell, harmonic, interruption, etc.
  - `substation_id` (uuid, fk) - Affected substation
  - `meter_id` (uuid, fk) - Recording meter
  - `timestamp` (timestamptz) - Event occurrence time
  - `duration_ms` (integer) - Event duration in milliseconds
  - `magnitude` (decimal) - Event magnitude (voltage %, THD%, etc.)
  - `severity` (text) - critical, high, medium, low
  - `status` (text) - new, acknowledged, investigating, resolved, false
  - `is_mother_event` (boolean) - Whether this is a mother event
  - `parent_event_id` (uuid, fk) - Links to mother event if applicable
  - `root_cause` (text) - Identified root cause
  - `affected_phases` (text[]) - Array of affected phases (A, B, C, N)
  - `waveform_data` (jsonb) - Waveform data for visualization
  - `created_at` (timestamptz)
  - `resolved_at` (timestamptz)

  ### 5. `customers`
  Customer accounts and service points
  - `id` (uuid, pk) - Unique identifier
  - `account_number` (text, unique) - Customer account number
  - `name` (text) - Customer name
  - `address` (text) - Service address
  - `substation_id` (uuid, fk) - Serving substation
  - `transformer_id` (text) - Transformer reference
  - `contract_demand_kva` (decimal) - Contract demand
  - `customer_type` (text) - residential, commercial, industrial
  - `critical_customer` (boolean) - Whether customer is critical
  - `created_at` (timestamptz)

  ### 6. `event_customer_impact`
  Links events to affected customers
  - `id` (uuid, pk)
  - `event_id` (uuid, fk) - PQ event
  - `customer_id` (uuid, fk) - Affected customer
  - `impact_level` (text) - severe, moderate, minor
  - `estimated_downtime_min` (integer)
  - `created_at` (timestamptz)

  ### 7. `notifications`
  Alert and notification records
  - `id` (uuid, pk)
  - `event_id` (uuid, fk) - Related event
  - `recipient_email` (text) - Email address
  - `recipient_phone` (text) - SMS number
  - `notification_type` (text) - email, sms, both
  - `subject` (text) - Notification subject
  - `message` (text) - Notification content
  - `status` (text) - pending, sent, failed
  - `sent_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 8. `notification_rules`
  Configurable notification rules and thresholds
  - `id` (uuid, pk)
  - `name` (text) - Rule name
  - `event_type` (text) - Event type to monitor
  - `severity_threshold` (text) - Minimum severity to trigger
  - `recipients` (text[]) - Array of email addresses
  - `include_waveform` (boolean) - Attach waveform data
  - `typhoon_mode_enabled` (boolean) - Suppress during typhoons
  - `active` (boolean) - Rule is active
  - `created_at` (timestamptz)

  ### 9. `pq_service_records`
  Power quality service and consultation records
  - `id` (uuid, pk)
  - `customer_id` (uuid, fk)
  - `service_date` (date)
  - `service_type` (text) - site_survey, harmonic_analysis, consultation
  - `findings` (text) - Service findings
  - `recommendations` (text) - Recommendations provided
  - `benchmark_standard` (text) - ITIC, SEMI_F47, IEC61000, IEEE519
  - `engineer_id` (uuid, fk) - Performing engineer
  - `created_at` (timestamptz)

  ### 10. `reports`
  Generated reports and their metadata
  - `id` (uuid, pk)
  - `report_type` (text) - supply_reliability, annual_pq, meter_availability
  - `title` (text) - Report title
  - `period_start` (date) - Reporting period start
  - `period_end` (date) - Reporting period end
  - `generated_by` (uuid, fk) - User who generated report
  - `file_path` (text) - Path to generated file
  - `status` (text) - generating, completed, failed
  - `created_at` (timestamptz)

  ### 11. `system_health`
  System health monitoring and watchdog logs
  - `id` (uuid, pk)
  - `component` (text) - server, communication, integration, database
  - `status` (text) - healthy, degraded, down
  - `message` (text) - Status message
  - `metrics` (jsonb) - Additional metrics
  - `checked_at` (timestamptz)

  ### 12. `sarfi_metrics`
  SARFI (System Average RMS Variation Frequency Index) metrics
  - `id` (uuid, pk)
  - `substation_id` (uuid, fk)
  - `period_year` (integer)
  - `period_month` (integer)
  - `sarfi_70` (decimal) - SARFI-70 value
  - `sarfi_80` (decimal) - SARFI-80 value
  - `sarfi_90` (decimal) - SARFI-90 value
  - `total_events` (integer)
  - `created_at` (timestamptz)

  ## Security
  Row Level Security (RLS) is enabled on all tables with policies based on user roles:
  - Admins: Full access to all data
  - Operators: Read/write access to events, meters, and service records
  - Viewers: Read-only access to all tables
*/

-- Create enum types for better type safety
CREATE TYPE user_role AS ENUM ('admin', 'operator', 'viewer');
CREATE TYPE event_type AS ENUM ('voltage_dip', 'voltage_swell', 'harmonic', 'interruption', 'transient', 'flicker');
CREATE TYPE severity_level AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE event_status AS ENUM ('new', 'acknowledged', 'investigating', 'resolved', 'false');
CREATE TYPE meter_status AS ENUM ('active', 'abnormal', 'inactive');
CREATE TYPE substation_status AS ENUM ('operational', 'maintenance', 'offline');

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  department text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Substations table
CREATE TABLE IF NOT EXISTS substations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  voltage_level text NOT NULL,
  latitude decimal(10, 7),
  longitude decimal(10, 7),
  region text NOT NULL,
  status substation_status DEFAULT 'operational',
  created_at timestamptz DEFAULT now()
);

-- PQ Meters table
CREATE TABLE IF NOT EXISTS pq_meters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id text UNIQUE NOT NULL,
  substation_id uuid REFERENCES substations(id) ON DELETE CASCADE,
  location text,
  status meter_status DEFAULT 'active',
  last_communication timestamptz,
  firmware_version text,
  installed_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_number text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  substation_id uuid REFERENCES substations(id),
  transformer_id text,
  contract_demand_kva decimal(10, 2),
  customer_type text DEFAULT 'residential',
  critical_customer boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- PQ Events table
CREATE TABLE IF NOT EXISTS pq_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type event_type NOT NULL,
  substation_id uuid REFERENCES substations(id),
  meter_id uuid REFERENCES pq_meters(id),
  timestamp timestamptz NOT NULL,
  duration_ms integer,
  magnitude decimal(10, 3),
  severity severity_level DEFAULT 'low',
  status event_status DEFAULT 'new',
  is_mother_event boolean DEFAULT false,
  parent_event_id uuid REFERENCES pq_events(id),
  root_cause text,
  affected_phases text[] DEFAULT ARRAY['A', 'B', 'C'],
  waveform_data jsonb,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Event Customer Impact table
CREATE TABLE IF NOT EXISTS event_customer_impact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES pq_events(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  impact_level text DEFAULT 'minor',
  estimated_downtime_min integer,
  created_at timestamptz DEFAULT now()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES pq_events(id),
  recipient_email text,
  recipient_phone text,
  notification_type text DEFAULT 'email',
  subject text,
  message text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notification Rules table
CREATE TABLE IF NOT EXISTS notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type event_type,
  severity_threshold severity_level DEFAULT 'medium',
  recipients text[] NOT NULL,
  include_waveform boolean DEFAULT false,
  typhoon_mode_enabled boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- PQ Service Records table
CREATE TABLE IF NOT EXISTS pq_service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  service_date date NOT NULL,
  service_type text NOT NULL,
  findings text,
  recommendations text,
  benchmark_standard text,
  engineer_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  title text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  generated_by uuid REFERENCES profiles(id),
  file_path text,
  status text DEFAULT 'generating',
  created_at timestamptz DEFAULT now()
);

-- System Health table
CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL,
  message text,
  metrics jsonb,
  checked_at timestamptz DEFAULT now()
);

-- SARFI Metrics table
CREATE TABLE IF NOT EXISTS sarfi_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  substation_id uuid REFERENCES substations(id),
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  sarfi_70 decimal(10, 2),
  sarfi_80 decimal(10, 2),
  sarfi_90 decimal(10, 2),
  total_events integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(substation_id, period_year, period_month)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pq_events_timestamp ON pq_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pq_events_substation ON pq_events(substation_id);
CREATE INDEX IF NOT EXISTS idx_pq_events_status ON pq_events(status);
CREATE INDEX IF NOT EXISTS idx_pq_events_severity ON pq_events(severity);
CREATE INDEX IF NOT EXISTS idx_pq_meters_substation ON pq_meters(substation_id);
CREATE INDEX IF NOT EXISTS idx_customers_substation ON customers(substation_id);
CREATE INDEX IF NOT EXISTS idx_sarfi_metrics_period ON sarfi_metrics(period_year, period_month);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE substations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pq_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pq_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_customer_impact ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pq_service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarfi_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for substations (all authenticated users can read)
CREATE POLICY "Authenticated users can view substations"
  ON substations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage substations"
  ON substations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for pq_meters
CREATE POLICY "Authenticated users can view meters"
  ON pq_meters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage meters"
  ON pq_meters FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage customers"
  ON customers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for pq_events
CREATE POLICY "Authenticated users can view events"
  ON pq_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage events"
  ON pq_events FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for event_customer_impact
CREATE POLICY "Authenticated users can view impact data"
  ON event_customer_impact FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage impact data"
  ON event_customer_impact FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for notifications
CREATE POLICY "Authenticated users can view notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for notification_rules
CREATE POLICY "Authenticated users can view notification rules"
  ON notification_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage notification rules"
  ON notification_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for pq_service_records
CREATE POLICY "Authenticated users can view service records"
  ON pq_service_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage service records"
  ON pq_service_records FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );

-- RLS Policies for reports
CREATE POLICY "Authenticated users can view reports"
  ON reports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = generated_by);

-- RLS Policies for system_health
CREATE POLICY "Authenticated users can view system health"
  ON system_health FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage system health"
  ON system_health FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS Policies for sarfi_metrics
CREATE POLICY "Authenticated users can view SARFI metrics"
  ON sarfi_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators and admins can manage SARFI metrics"
  ON sarfi_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'operator')
    )
  );