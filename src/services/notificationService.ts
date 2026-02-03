import { supabase } from '../lib/supabase';
import type {
  NotificationChannel,
  NotificationTemplate,
  NotificationGroup,
  NotificationGroupMember,
  NotificationRule,
  NotificationLog,
  NotificationSystemConfig,
  PQEvent
} from '../types/database';

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Get all notification templates with optional status filter
 */
export const getTemplates = async (status?: 'draft' | 'approved' | 'archived') => {
  let query = supabase.from('notification_templates').select('*');
  if (status) {
    query = query.eq('status', status);
  }
  return query.order('created_at', { ascending: false });
};

/**
 * Get a single template by ID
 */
export const getTemplate = async (id: string) => {
  return supabase
    .from('notification_templates')
    .select('*')
    .eq('id', id)
    .single();
};

/**
 * Get a template by code (for use in rules)
 */
export const getTemplateByCode = async (code: string) => {
  return supabase
    .from('notification_templates')
    .select('*')
    .eq('code', code)
    .eq('status', 'approved')
    .single();
};

/**
 * Create a new draft template
 */
export const createTemplate = async (
  template: Omit<NotificationTemplate, 'id' | 'created_at' | 'updated_at' | 'version' | 'approved_by' | 'approved_at'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_templates')
    .insert({
      ...template,
      status: 'draft',
      version: 1,
      created_by: user?.id
    })
    .select()
    .single();
};

/**
 * Update an existing template (creates new version if approved)
 */
export const updateTemplate = async (id: string, updates: Partial<NotificationTemplate>) => {
  const { data: existing } = await getTemplate(id);
  
  if (!existing) {
    throw new Error('Template not found');
  }
  
  // If updating an approved template, create new draft version
  if (existing.status === 'approved') {
    return supabase
      .from('notification_templates')
      .insert({
        ...existing,
        ...updates,
        id: undefined, // Let DB generate new ID
        version: existing.version + 1,
        status: 'draft',
        approved_by: null,
        approved_at: null
      })
      .select()
      .single();
  }
  
  // Otherwise, update draft in place
  return supabase
    .from('notification_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

/**
 * Approve a template (admin only)
 */
export const approveTemplate = async (id: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_templates')
    .update({
      status: 'approved',
      approved_by: user?.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
};

/**
 * Archive a template
 */
export const archiveTemplate = async (id: string) => {
  return supabase
    .from('notification_templates')
    .update({ status: 'archived' })
    .eq('id', id)
    .select()
    .single();
};

/**
 * Delete a template (only drafts can be deleted)
 */
export const deleteTemplate = async (id: string) => {
  return supabase
    .from('notification_templates')
    .delete()
    .eq('id', id)
    .eq('status', 'draft');
};

// ============================================================================
// CHANNEL MANAGEMENT
// ============================================================================

/**
 * Get all notification channels
 */
export const getChannels = async () => {
  return supabase
    .from('notification_channels')
    .select('*')
    .order('priority', { ascending: true });
};

/**
 * Get a single channel by ID
 */
export const getChannel = async (id: string) => {
  return supabase
    .from('notification_channels')
    .select('*')
    .eq('id', id)
    .single();
};

/**
 * Update channel configuration
 */
export const updateChannel = async (id: string, updates: Partial<NotificationChannel>) => {
  return supabase
    .from('notification_channels')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

/**
 * Update channel status
 */
export const updateChannelStatus = async (
  id: string,
  status: 'enabled' | 'disabled' | 'maintenance'
) => {
  return supabase
    .from('notification_channels')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
};

// ============================================================================
// GROUP MANAGEMENT
// ============================================================================

/**
 * Get all notification groups
 */
export const getGroups = async () => {
  return supabase
    .from('notification_groups')
    .select(`
      *,
      members:notification_group_members(count)
    `)
    .order('name', { ascending: true });
};

/**
 * Get a single group by ID with members
 */
export const getGroup = async (id: string) => {
  return supabase
    .from('notification_groups')
    .select(`
      *,
      members:notification_group_members(
        *,
        profile:profiles(full_name, email)
      )
    `)
    .eq('id', id)
    .single();
};

/**
 * Create a new notification group
 */
export const createGroup = async (
  group: Omit<NotificationGroup, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_groups')
    .insert({
      ...group,
      created_by: user?.id
    })
    .select()
    .single();
};

/**
 * Update a notification group
 */
export const updateGroup = async (id: string, updates: Partial<NotificationGroup>) => {
  return supabase
    .from('notification_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

/**
 * Delete a notification group
 */
export const deleteGroup = async (id: string) => {
  // First delete all members
  await supabase
    .from('notification_group_members')
    .delete()
    .eq('group_id', id);
  
  // Then delete the group
  return supabase
    .from('notification_groups')
    .delete()
    .eq('id', id);
};

/**
 * Add a member to a group
 */
export const addGroupMember = async (
  member: Omit<NotificationGroupMember, 'id' | 'added_at'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_group_members')
    .insert({
      ...member,
      added_by: user?.id
    })
    .select()
    .single();
};

/**
 * Remove a member from a group
 */
export const removeGroupMember = async (id: string) => {
  return supabase
    .from('notification_group_members')
    .delete()
    .eq('id', id);
};

/**
 * Update member preferences
 */
export const updateGroupMember = async (
  id: string,
  updates: Partial<NotificationGroupMember>
) => {
  return supabase
    .from('notification_group_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

// ============================================================================
// RULE MANAGEMENT
// ============================================================================

/**
 * Get all notification rules
 */
export const getRules = async (activeOnly?: boolean) => {
  let query = supabase
    .from('notification_rules')
    .select(`
      *,
      template:notification_templates(name, code)
    `)
    .order('priority', { ascending: true });
  
  if (activeOnly) {
    query = query.eq('active', true);
  }
  
  return query;
};

/**
 * Get a single rule by ID
 */
export const getRule = async (id: string) => {
  return supabase
    .from('notification_rules')
    .select(`
      *,
      template:notification_templates(*)
    `)
    .eq('id', id)
    .single();
};

/**
 * Create a new notification rule
 */
export const createRule = async (
  rule: Omit<NotificationRule, 'id' | 'created_at' | 'updated_at'>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_rules')
    .insert({
      ...rule,
      created_by: user?.id
    })
    .select()
    .single();
};

/**
 * Update a notification rule
 */
export const updateRule = async (id: string, updates: Partial<NotificationRule>) => {
  return supabase
    .from('notification_rules')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
};

/**
 * Toggle rule active status
 */
export const toggleRule = async (id: string, active: boolean) => {
  return supabase
    .from('notification_rules')
    .update({ active })
    .eq('id', id)
    .select()
    .single();
};

/**
 * Delete a notification rule
 */
export const deleteRule = async (id: string) => {
  return supabase
    .from('notification_rules')
    .delete()
    .eq('id', id);
};

// ============================================================================
// NOTIFICATION LOGS
// ============================================================================

/**
 * Get notification logs with optional filters
 */
export const getLogs = async (filters?: {
  ruleId?: string;
  eventId?: string;
  channel?: string;
  status?: 'pending' | 'sent' | 'failed' | 'suppressed';
  startDate?: string;
  endDate?: string;
}) => {
  let query = supabase
    .from('notification_logs')
    .select(`
      *,
      rule:notification_rules(name),
      template:notification_templates(name, code)
    `)
    .order('created_at', { ascending: false });
  
  if (filters?.ruleId) {
    query = query.eq('rule_id', filters.ruleId);
  }
  if (filters?.eventId) {
    query = query.eq('event_id', filters.eventId);
  }
  if (filters?.channel) {
    query = query.eq('channel', filters.channel);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }
  
  return query;
};

/**
 * Get logs for a specific event
 */
export const getEventLogs = async (eventId: string) => {
  return supabase
    .from('notification_logs')
    .select(`
      *,
      rule:notification_rules(name),
      template:notification_templates(name, code)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });
};

/**
 * Create a notification log entry
 */
export const createLog = async (
  log: Omit<NotificationLog, 'id' | 'created_at'>
) => {
  return supabase
    .from('notification_logs')
    .insert(log)
    .select()
    .single();
};

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * Get system configuration
 */
export const getSystemConfig = async () => {
  return supabase
    .from('notification_system_config')
    .select('*')
    .single();
};

/**
 * Update system configuration
 */
export const updateSystemConfig = async (
  updates: Partial<NotificationSystemConfig>
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return supabase
    .from('notification_system_config')
    .update({
      ...updates,
      updated_by: user?.id
    })
    .eq('id', (await getSystemConfig()).data?.id)
    .select()
    .single();
};

/**
 * Enable/disable typhoon mode
 */
export const setTyphoonMode = async (enabled: boolean, until?: string) => {
  return updateSystemConfig({
    typhoon_mode: enabled,
    typhoon_mode_until: until || null
  });
};

/**
 * Enable/disable maintenance mode
 */
export const setMaintenanceMode = async (enabled: boolean, until?: string) => {
  return updateSystemConfig({
    maintenance_mode: enabled,
    maintenance_mode_until: until || null
  });
};

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

/**
 * Substitute template variables with actual event data
 * 
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns String with variables replaced
 * 
 * @example
 * substituteVariables(
 *   "Event {{event_type}} at {{location}} with magnitude {{magnitude}}",
 *   { event_type: "Voltage Dip", location: "SS001", magnitude: "85%" }
 * )
 * // Returns: "Event Voltage Dip at SS001 with magnitude 85%"
 */
export const substituteVariables = (
  template: string,
  variables: Record<string, any>
): string => {
  if (!template) return '';
  
  let result = template;
  
  // Replace all {{variable}} patterns
  const regex = /\{\{(\w+)\}\}/g;
  result = result.replace(regex, (match, varName) => {
    const value = variables[varName];
    
    // Handle undefined/null
    if (value === undefined || value === null) {
      return `{{${varName}}}`; // Keep placeholder if no value
    }
    
    // Handle dates
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    // Handle numbers
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    // Handle objects/arrays
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    // Default: convert to string
    return String(value);
  });
  
  return result;
};

/**
 * Prepare variables from a PQ event for template substitution
 */
export const prepareEventVariables = (event: PQEvent): Record<string, any> => {
  return {
    event_id: event.id,
    event_type: event.event_type,
    timestamp: new Date(event.timestamp).toLocaleString(),
    duration: event.duration_ms ? `${(event.duration_ms / 1000).toFixed(2)}s` : 'N/A',
    magnitude: event.magnitude ? `${event.magnitude.toFixed(2)}%` : 'N/A',
    severity: event.severity,
    location: event.location || event.meter_id,
    meter_id: event.meter_id,
    substation: event.substation?.name || 'Unknown',
    customer_count: event.customer_count || 0,
    description: event.description || '',
    root_cause: event.root_cause || 'Under investigation',
    // Add more as needed
  };
};

// ============================================================================
// RULE EVALUATION ENGINE
// ============================================================================

/**
 * Evaluate if an event matches a rule's conditions (AND logic)
 * 
 * @param event - The PQ event to evaluate
 * @param rule - The notification rule with conditions
 * @returns true if all conditions match, false otherwise
 */
export const evaluateRule = (event: PQEvent, rule: NotificationRule): boolean => {
  // Check if rule is active
  if (!rule.active) {
    return false;
  }
  
  // Check if no conditions (matches all)
  if (!rule.conditions || rule.conditions.length === 0) {
    return true;
  }
  
  // Evaluate all conditions with AND logic
  return rule.conditions.every(condition => {
    const { field, operator, value } = condition;
    const eventValue = getEventFieldValue(event, field);
    
    switch (operator) {
      case 'equals':
        return eventValue === value;
      
      case 'not_equals':
        return eventValue !== value;
      
      case 'greater_than':
        return Number(eventValue) > Number(value);
      
      case 'less_than':
        return Number(eventValue) < Number(value);
      
      case 'in':
        if (Array.isArray(value)) {
          return value.includes(eventValue);
        }
        return false;
      
      case 'contains':
        if (typeof eventValue === 'string' && typeof value === 'string') {
          return eventValue.toLowerCase().includes(value.toLowerCase());
        }
        if (Array.isArray(eventValue)) {
          return eventValue.includes(value);
        }
        return false;
      
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  });
};

/**
 * Get a field value from an event object (supports nested fields)
 */
const getEventFieldValue = (event: PQEvent, field: string): any => {
  // Handle nested fields like "substation.name"
  const parts = field.split('.');
  let value: any = event;
  
  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  
  return value;
};

/**
 * Find all rules that match an event
 */
export const findMatchingRules = async (event: PQEvent): Promise<NotificationRule[]> => {
  const { data: rules } = await getRules(true); // Get active rules only
  
  if (!rules) {
    return [];
  }
  
  // Filter rules that match the event
  const matchingRules = rules.filter(rule => evaluateRule(event, rule));
  
  // Sort by priority (lower number = higher priority)
  return matchingRules.sort((a, b) => a.priority - b.priority);
};

// ============================================================================
// DEMO NOTIFICATION SENDER
// ============================================================================

/**
 * Send a demo notification (logs to console instead of real channels)
 * 
 * @param recipient - Email address
 * @param subject - Email subject
 * @param message - Notification message
 * @param metadata - Additional metadata for logging
 */
export const sendDemoNotification = async (
  recipient: string,
  subject: string | null,
  message: string,
  metadata?: {
    rule_id?: string;
    event_id?: string;
    template_id?: string;
  }
) => {
  console.log('====================================');
  console.log('[DEMO NOTIFICATION - EMAIL]');
  console.log('====================================');
  console.log(`To: ${recipient}`);
  
  if (subject) {
    console.log(`Subject: ${subject}`);
  }
  
  console.log(`Message:\n${message}`);
  
  if (metadata) {
    console.log(`\nMetadata:`, metadata);
  }
  
  console.log('====================================\n');
  
  // Log to database
  return createLog({
    channel: 'email',
    recipient_email: recipient,
    subject,
    message,
    status: 'sent',
    sent_at: new Date().toISOString(),
    triggered_by: { system: true },
    ...metadata
  } as Omit<NotificationLog, 'id' | 'created_at'>);
};

/**
 * Process an event through notification system (demo mode)
 * 
 * This finds matching rules, generates messages, and sends demo notifications
 */
export const processEventNotifications = async (event: PQEvent) => {
  // Find matching rules
  const matchingRules = await findMatchingRules(event);
  
  if (matchingRules.length === 0) {
    console.log('No matching notification rules for event:', event.id);
    return;
  }
  
  console.log(`Found ${matchingRules.length} matching rules for event ${event.id}`);
  
  // Prepare event variables
  const variables = prepareEventVariables(event);
  
  // Process each rule
  for (const rule of matchingRules) {
    // Get template
    if (!rule.template_id) continue;
    
    const { data: template } = await getTemplate(rule.template_id);
    if (!template) continue;
    
    // Get group members
    const recipients: Array<{ email?: string; phone?: string }> = [];
    
    for (const groupId of rule.notification_groups) {
      const { data: group } = await getGroup(groupId);
      if (group?.members) {
        recipients.push(
          ...group.members.map(m => ({
            email: m.email || undefined,
            phone: m.phone || undefined
          }))
        );
      }
    }
    
    // Add additional recipients
    if (rule.additional_recipients) {
      recipients.push(...rule.additional_recipients);
    }
    
    // Only send via email channel
    if (template.email_subject && template.email_body) {
      const subject = substituteVariables(template.email_subject, variables);
      const message = substituteVariables(template.email_body, variables);
      
      // Send to each recipient
      for (const recipient of recipients) {
        if (!recipient.email) continue;
        
        await sendDemoNotification(
          recipient.email,
          subject,
          message,
          {
            rule_id: rule.id,
            event_id: event.id,
            template_id: template.id
          }
        );
      }
    }
  }
};
