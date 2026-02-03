-- ============================================================================
-- NOTIFICATION SYSTEM MIGRATION
-- ============================================================================
-- Date: January 14, 2026
-- Purpose: Migrate from basic notification system to enterprise notification center
-- 
-- Changes:
-- 1. DROP old tables: notifications, notification_rules
-- 2. CREATE 7 new tables: channels, templates, groups, group_members, rules, logs, config
-- 3. Add indexes for performance
-- 4. Apply Row-Level Security (RLS) policies
-- 5. Seed initial data (3 channels, 2 templates, 4 groups)
--
-- Estimated execution time: 10-15 seconds
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP OLD TABLES
-- ============================================================================

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_rules CASCADE;

-- ============================================================================
-- STEP 2: CREATE NEW TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: notification_channels
-- Purpose: Store available communication channels (Email, SMS, Teams)
-- ----------------------------------------------------------------------------
CREATE TABLE notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('email', 'teams', 'webhook')),
  description text,
  status text DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled', 'maintenance')),
  priority integer DEFAULT 1,
  
  -- Channel Configuration (JSON)
  config jsonb DEFAULT '{}',
  
  -- Retry & Rate Limiting
  retry_config jsonb DEFAULT '{"max_retries": 3, "retry_interval": 300, "backoff_policy": "exponential"}',
  rate_limit jsonb DEFAULT '{"requests_per_second": 100, "burst_capacity": 200}',
  
  -- Availability Settings
  availability jsonb DEFAULT '{"workdays": [1,2,3,4,5], "work_hours": ["00:00-23:59"]}',
  
  -- Monitoring Metrics
  monitoring jsonb DEFAULT '{"availability": 100, "success_rate": 100, "avg_latency": 0}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX idx_notification_channels_type ON notification_channels(type);
CREATE INDEX idx_notification_channels_status ON notification_channels(status);

COMMENT ON TABLE notification_channels IS 'Available communication channels for notifications';
COMMENT ON COLUMN notification_channels.config IS 'Channel-specific configuration (SMTP, API keys, etc.)';
COMMENT ON COLUMN notification_channels.retry_config IS 'Retry strategy for failed deliveries';
COMMENT ON COLUMN notification_channels.monitoring IS 'Real-time channel health metrics';

-- ----------------------------------------------------------------------------
-- Table 2: notification_templates
-- Purpose: Message templates with variable substitution
-- ----------------------------------------------------------------------------
CREATE TABLE notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  
  -- Template Content (by channel)
  email_subject text,
  email_body text,
  teams_body text,
  
  -- Variables Definition (JSON array)
  variables jsonb DEFAULT '[]',
  
  -- Approval Workflow
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  
  -- Metadata
  version integer DEFAULT 1,
  applicable_channels text[] DEFAULT ARRAY['email', 'teams'],
  tags text[] DEFAULT ARRAY[]::text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz
);

CREATE INDEX idx_notification_templates_status ON notification_templates(status);
CREATE INDEX idx_notification_templates_code ON notification_templates(code);

COMMENT ON TABLE notification_templates IS 'Message templates with variable substitution and approval workflow';
COMMENT ON COLUMN notification_templates.variables IS 'Array of variable definitions with dataType, required, description';
COMMENT ON COLUMN notification_templates.status IS 'draft: Pending approval, approved: Active, archived: Deprecated';

-- ----------------------------------------------------------------------------
-- Table 3: notification_groups
-- Purpose: Groups of users for targeted messaging
-- ----------------------------------------------------------------------------
CREATE TABLE notification_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  group_type text DEFAULT 'custom' CHECK (group_type IN ('custom', 'dynamic')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX idx_notification_groups_status ON notification_groups(status);

COMMENT ON TABLE notification_groups IS 'Notification groups independent from UAM roles';
COMMENT ON COLUMN notification_groups.group_type IS 'custom: Manual assignment, dynamic: Auto-populated (future)';

-- ----------------------------------------------------------------------------
-- Table 4: notification_group_members
-- Purpose: Many-to-many relationship between users and groups
-- ----------------------------------------------------------------------------
CREATE TABLE notification_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES notification_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Contact preferences (overrides)
  email text,
  phone text,
  preferred_channels text[] DEFAULT ARRAY['email'],
  
  added_at timestamptz DEFAULT now(),
  added_by uuid REFERENCES profiles(id),
  
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_notification_group_members_group ON notification_group_members(group_id);
CREATE INDEX idx_notification_group_members_user ON notification_group_members(user_id);

COMMENT ON TABLE notification_group_members IS 'User assignments to notification groups';
COMMENT ON COLUMN notification_group_members.email IS 'Override email if different from profile';

-- ----------------------------------------------------------------------------
-- Table 5: notification_rules
-- Purpose: Complex rule engine with multi-condition logic
-- ----------------------------------------------------------------------------
CREATE TABLE notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  
  -- Rule Conditions (JSON array of conditions)
  conditions jsonb DEFAULT '[]',
  
  -- Template & Channels
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  channels text[] DEFAULT ARRAY['email'],
  
  -- Recipients
  notification_groups uuid[] DEFAULT ARRAY[]::uuid[],
  additional_recipients jsonb DEFAULT '[]',
  
  -- PQ-Specific Features
  typhoon_mode_enabled boolean DEFAULT false,
  mother_event_only boolean DEFAULT true,
  include_waveform boolean DEFAULT false,
  
  -- Rule Settings
  priority integer DEFAULT 1,
  active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

CREATE INDEX idx_notification_rules_active ON notification_rules(active);
CREATE INDEX idx_notification_rules_template ON notification_rules(template_id);

COMMENT ON TABLE notification_rules IS 'Notification rules with multi-condition logic';
COMMENT ON COLUMN notification_rules.conditions IS 'Array of conditions: [{"field": "severity", "operator": "equals", "value": "critical"}]';
COMMENT ON COLUMN notification_rules.notification_groups IS 'Array of notification_groups.id UUIDs';
COMMENT ON COLUMN notification_rules.typhoon_mode_enabled IS 'Suppress during typhoon mode';
COMMENT ON COLUMN notification_rules.mother_event_only IS 'Only trigger on first event in group';

-- ----------------------------------------------------------------------------
-- Table 6: notification_logs
-- Purpose: Comprehensive log of all sent notifications
-- ----------------------------------------------------------------------------
CREATE TABLE notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Information
  rule_id uuid REFERENCES notification_rules(id) ON DELETE SET NULL,
  event_id uuid REFERENCES pq_events(id) ON DELETE SET NULL,
  template_id uuid REFERENCES notification_templates(id) ON DELETE SET NULL,
  
  -- Recipient Details
  recipient_type text CHECK (recipient_type IN ('user', 'group', 'adhoc')),
  recipient_id uuid,
  recipient_email text,
  recipient_phone text,
  
  -- Channel & Content
  channel text NOT NULL,
  subject text,
  message text,
  
  -- Delivery Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'suppressed')),
  sent_at timestamptz,
  failed_reason text,
  
  -- Metadata
  triggered_by jsonb,
  suppression_reason text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_logs_event ON notification_logs(event_id);
CREATE INDEX idx_notification_logs_rule ON notification_logs(rule_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);

COMMENT ON TABLE notification_logs IS 'Delivery log for all notifications';
COMMENT ON COLUMN notification_logs.status IS 'pending: Queued, sent: Delivered, failed: Error, suppressed: Blocked';
COMMENT ON COLUMN notification_logs.triggered_by IS 'Rule conditions that matched';

-- ----------------------------------------------------------------------------
-- Table 7: notification_system_config
-- Purpose: Global notification system configuration
-- ----------------------------------------------------------------------------
CREATE TABLE notification_system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Operational Modes
  typhoon_mode boolean DEFAULT false,
  maintenance_mode boolean DEFAULT false,
  
  -- Mode Schedules
  typhoon_mode_until timestamptz,
  maintenance_mode_until timestamptz,
  
  -- Global Settings
  default_channels text[] DEFAULT ARRAY['email'],
  max_notifications_per_event integer DEFAULT 100,
  notification_cooldown_minutes integer DEFAULT 5,
  
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

COMMENT ON TABLE notification_system_config IS 'Global notification system settings (singleton)';
COMMENT ON COLUMN notification_system_config.typhoon_mode IS 'When true, suppress non-critical notifications';
COMMENT ON COLUMN notification_system_config.notification_cooldown_minutes IS 'Min time between same notifications';

-- ============================================================================
-- STEP 3: SEED INITIAL DATA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Seed: notification_channels (3 channels)
-- ----------------------------------------------------------------------------
INSERT INTO notification_channels (name, type, description, config, status) VALUES
(
  'Email',
  'email',
  'Primary email notification channel',
  '{"smtp_server": "smtp.clp.com", "port": 587, "use_ssl": true, "from_email": "noreply@clp.com", "from_name": "PQMAP System", "demo_mode": true}',
  'enabled'
),
(
  'Microsoft Teams',
  'teams',
  'Microsoft Teams webhook integration (demo)',
  '{"webhook_url": "", "demo_mode": true, "mention_on_critical": false}',
  'enabled'
);

-- ----------------------------------------------------------------------------
-- Seed: notification_templates (2 templates)
-- ----------------------------------------------------------------------------
INSERT INTO notification_templates (
  name, 
  code, 
  description, 
  email_subject, 
  email_body, 
  teams_body, 
  variables, 
  status, 
  applicable_channels,
  approved_by,
  approved_at
) VALUES
(
  'Critical PQ Event Alert',
  'PQ_EVENT_CRITICAL',
  'Notification for critical power quality events',
  'CRITICAL: {{event_type}} at {{substation_name}}',
  '<html><body><h2 style="color: #d32f2f;">🚨 Critical Power Quality Event</h2><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Event Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{event_type}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{severity}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{substation_name}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{event_timestamp}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Magnitude:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{magnitude}}%</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{duration}}ms</td></tr></table><p style="margin-top: 20px;"><a href="{{event_link}}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Event Details</a></p></body></html>',
  '🚨 **CRITICAL PQ Event**\n\n**Event:** {{event_type}}\n**Severity:** {{severity}}\n**Location:** {{substation_name}}\n**Time:** {{event_timestamp}}\n**Magnitude:** {{magnitude}}%\n**Duration:** {{duration}}ms\n\n[View Event Details]({{event_link}})',
  '[
    {"name": "event_type", "dataType": "string", "required": true, "description": "Type of PQ event", "example": "voltage_dip"},
    {"name": "severity", "dataType": "string", "required": true, "description": "Event severity level", "example": "critical"},
    {"name": "substation_name", "dataType": "string", "required": true, "description": "Substation name", "example": "APA Substation"},
    {"name": "event_timestamp", "dataType": "datetime", "required": true, "description": "Event occurrence time", "example": "2026-01-14 14:30:25"},
    {"name": "magnitude", "dataType": "number", "required": true, "description": "Voltage magnitude (%)", "example": 75},
    {"name": "duration", "dataType": "number", "required": true, "description": "Event duration (ms)", "example": 150},
    {"name": "event_link", "dataType": "string", "required": true, "description": "Link to event details", "example": "https://pqmap.clp.com/events/123"}
  ]',
  'approved',
  ARRAY['email', 'teams'],
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  now()
),
(
  'Voltage Dip with Customer Impact',
  'VOLTAGE_DIP_CUSTOMER_IMPACT',
  'Voltage dip event affecting multiple customers',
  'Voltage Dip Alert: {{customer_count}} Customers Affected at {{substation_name}}',
  '<html><body><h2 style="color: #f57c00;">⚠️ Voltage Dip Event</h2><p style="font-size: 16px;">A voltage dip event has been detected with customer impact.</p><table style="width: 100%; border-collapse: collapse; margin-top: 20px;"><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Location:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{substation_name}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{event_timestamp}}</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Magnitude:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{magnitude}}%</td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{duration}}ms</td></tr><tr style="background-color: #fff3e0;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Affected Customers:</strong></td><td style="padding: 8px; border: 1px solid #ddd;"><strong>{{customer_count}}</strong></td></tr><tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Est. Downtime:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">{{downtime_min}} minutes</td></tr></table><p style="margin-top: 20px;"><a href="{{event_link}}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">View Full Report</a></p></body></html>',
  '⚠️ **Voltage Dip Event**\n\n**Location:** {{substation_name}}\n**Time:** {{event_timestamp}}\n**Customers Affected:** {{customer_count}}\n**Magnitude:** {{magnitude}}%\n**Duration:** {{duration}}ms\n**Downtime:** ~{{downtime_min}} min',
  '[
    {"name": "substation_name", "dataType": "string", "required": true, "description": "Substation name", "example": "TSW Substation"},
    {"name": "event_timestamp", "dataType": "datetime", "required": true, "description": "Event time", "example": "2026-01-14 10:15:00"},
    {"name": "magnitude", "dataType": "number", "required": true, "description": "Voltage magnitude (%)", "example": 82},
    {"name": "duration", "dataType": "number", "required": true, "description": "Event duration (ms)", "example": 200},
    {"name": "customer_count", "dataType": "number", "required": true, "description": "Number of affected customers", "example": 65},
    {"name": "downtime_min", "dataType": "number", "required": false, "description": "Estimated downtime in minutes", "example": 5},
    {"name": "event_link", "dataType": "string", "required": true, "description": "Link to event details", "example": "https://pqmap.clp.com/events/456"}
  ]',
  'approved',
  ARRAY['email', 'teams'],
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  now()
);

-- ----------------------------------------------------------------------------
-- Seed: notification_groups (4 groups)
-- ----------------------------------------------------------------------------
INSERT INTO notification_groups (name, description, group_type, status) VALUES
('Emergency Response Team', 'Critical event first responders - 24/7 monitoring', 'custom', 'active'),
('Maintenance Crew', 'Scheduled maintenance and routine work notifications', 'custom', 'active'),
('Management', 'Executive summary reports and high-level alerts', 'custom', 'active'),
('Operations Team', 'Day-to-day operational alerts and event monitoring', 'custom', 'active');

-- ----------------------------------------------------------------------------
-- Seed: notification_rules (2 sample rules)
-- ----------------------------------------------------------------------------
INSERT INTO notification_rules (
  name, 
  description, 
  conditions, 
  template_id, 
  channels, 
  notification_groups, 
  typhoon_mode_enabled, 
  mother_event_only, 
  include_waveform,
  priority,
  active
) VALUES
(
  'Critical Events with Low Voltage',
  'Notify emergency team for critical severity events with magnitude below 80%',
  '[
    {"field": "severity", "operator": "equals", "value": "critical"},
    {"field": "magnitude", "operator": "less_than", "value": 80}
  ]',
  (SELECT id FROM notification_templates WHERE code = 'PQ_EVENT_CRITICAL' LIMIT 1),
  ARRAY['email', 'teams'],
  ARRAY[(SELECT id FROM notification_groups WHERE name = 'Emergency Response Team' LIMIT 1)],
  false,
  true,
  true,
  1,
  true
),
(
  'Voltage Dips Affecting 50+ Customers',
  'Alert management when voltage dips affect many customers',
  '[
    {"field": "event_type", "operator": "equals", "value": "voltage_dip"},
    {"field": "customer_count", "operator": "greater_or_equal", "value": 50}
  ]',
  (SELECT id FROM notification_templates WHERE code = 'VOLTAGE_DIP_CUSTOMER_IMPACT' LIMIT 1),
  ARRAY['email', 'teams'],
  ARRAY[(SELECT id FROM notification_groups WHERE name = 'Management' LIMIT 1)],
  true,
  true,
  false,
  2,
  true
);

-- ----------------------------------------------------------------------------
-- Seed: notification_system_config (singleton)
-- ----------------------------------------------------------------------------
INSERT INTO notification_system_config (
  id,
  typhoon_mode,
  maintenance_mode,
  default_channels,
  max_notifications_per_event,
  notification_cooldown_minutes
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  false,
  false,
  ARRAY['email'],
  100,
  5
);

-- ============================================================================
-- STEP 4: ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS: notification_channels
-- ----------------------------------------------------------------------------
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view channels" 
  ON notification_channels 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage channels" 
  ON notification_channels 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: notification_templates
-- ----------------------------------------------------------------------------
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view approved templates" 
  ON notification_templates 
  FOR SELECT 
  TO authenticated
  USING (status = 'approved' OR created_by = auth.uid());

CREATE POLICY "Operators can create templates" 
  ON notification_templates 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "Creators can update own draft templates" 
  ON notification_templates 
  FOR UPDATE 
  TO authenticated
  USING (created_by = auth.uid() AND status = 'draft')
  WITH CHECK (created_by = auth.uid() AND status = 'draft');

CREATE POLICY "Admins can approve templates" 
  ON notification_templates 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: notification_groups
-- ----------------------------------------------------------------------------
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view groups" 
  ON notification_groups 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage groups" 
  ON notification_groups 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: notification_group_members
-- ----------------------------------------------------------------------------
ALTER TABLE notification_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view group members" 
  ON notification_group_members 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage group members" 
  ON notification_group_members 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: notification_rules
-- ----------------------------------------------------------------------------
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view rules" 
  ON notification_rules 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage rules" 
  ON notification_rules 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: notification_logs
-- ----------------------------------------------------------------------------
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" 
  ON notification_logs 
  FOR SELECT 
  TO authenticated
  USING (
    recipient_id = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert logs" 
  ON notification_logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- RLS: notification_system_config
-- ----------------------------------------------------------------------------
ALTER TABLE notification_system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view system config" 
  ON notification_system_config 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can update system config" 
  ON notification_system_config 
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- STEP 5: TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ============================================================================

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_notification_channels_updated_at
  BEFORE UPDATE ON notification_channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_groups_updated_at
  BEFORE UPDATE ON notification_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON notification_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_system_config_updated_at
  BEFORE UPDATE ON notification_system_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify)
-- ============================================================================

-- Check table counts
-- SELECT 
--   (SELECT COUNT(*) FROM notification_channels) AS channels,
--   (SELECT COUNT(*) FROM notification_templates) AS templates,
--   (SELECT COUNT(*) FROM notification_groups) AS groups,
--   (SELECT COUNT(*) FROM notification_rules) AS rules;

-- Expected: channels=3, templates=2, groups=4, rules=2

-- View seeded templates
-- SELECT name, code, status, applicable_channels FROM notification_templates;

-- View seeded groups
-- SELECT name, description, status FROM notification_groups;

-- View seeded rules
-- SELECT r.name, t.name AS template, r.active, r.channels 
-- FROM notification_rules r
-- LEFT JOIN notification_templates t ON r.template_id = t.id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next Steps:
-- 1. Run verification queries above
-- 2. Test RLS policies with different user roles
-- 3. Proceed to Day 2: Backend Services (TypeScript types & services)
-- ============================================================================
