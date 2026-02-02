export type UserRole = 'admin' | 'operator' | 'viewer';
export type EventType = 'voltage_dip' | 'voltage_swell' | 'harmonic' | 'interruption' | 'transient' | 'flicker';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type EventStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved';
export type MeterStatus = 'active' | 'abnormal' | 'inactive';
export type SubstationStatus = 'operational' | 'maintenance' | 'offline';
export type CustomerType = 'residential' | 'commercial' | 'industrial';
export type ServiceType = 'site_survey' | 'harmonic_analysis' | 'consultation' | 'on_site_study' | 'power_quality_audit' | 'installation_support';
export type ReportType = 'supply_reliability' | 'annual_pq' | 'meter_availability' | 'customer_impact' | 'harmonic_analysis' | 'voltage_quality';
export type NotificationType = 'email' | 'teams';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type SystemStatus = 'healthy' | 'degraded' | 'down';
export type LoadType = 'DC' | 'EV' | 'others' | 'RE-PV' | 'RES' | 'RES-HRB' | 'RES-NOC';

// UAM (User Access Management) Types
export type SystemRole = 'system_admin' | 'system_owner' | 'manual_implementator' | 'watcher';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface UAMUser {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  department: string;
  role: SystemRole;
  email: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  id: string;
  role: SystemRole;
  module: string;
  permissions: PermissionAction[];
  description: string | null;
  updated_at: string;
}

export interface SystemModule {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  created_at: string;
  updated_at: string;
}

export interface Substation {
  id: string;
  name: string;
  code: string;
  voltage_level: string;
  latitude: number;
  longitude: number;
  region: string;
  status: SubstationStatus;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_profile?: Profile;
}

export interface PQMeter {
  id: string;
  meter_id: string;
  // PQ Meter location
  site_id?: string;
  voltage_level?: string; 
  substation_id: string;
  circuit_id?: string;
  location: string;
  region?: string;
  oc?: string;
  // Assets detail
  brand?: string;
  model?: string;
  nominal_voltage?: number;
  ct_type?: string;
  asset_number?: string;
  serial_number?: string;
  ip_address?: string;
  firmware_version: string | null;
  framework_version?: string;
  // Meter status
  status: MeterStatus;
  enable?: boolean;  // System enablement flag - when false, meter is excluded from KPIs and reports
  last_communication: string | null;
  installed_date: string | null;
  created_at: string;
  // Transformer Code fields (Migration 20251217000000)
  area: string;
  ss400?: string | null;
  ss132?: string | null;
  ss011?: string | null;
  ss_misc?: string | null;
  // Load Type (Migration 20260102000000)
  load_type?: LoadType;
  substation?: Substation;
}

export type VoltageProfileDataType = 'voltage' | 'current';
export type VoltageProfileValueType = 'average' | 'raw';

export interface VoltageProfile {
  id: string;
  user_id: string;
  profile_name: string;
  data_type: VoltageProfileDataType;
  value_type: VoltageProfileValueType;
  voltage_level: string | null;
  selected_meters: string[] | null;
  parameters: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface MeterVoltageReading {
  id: string;
  meter_id: string;
  timestamp: string;
  v1: number | null;
  v2: number | null;
  v3: number | null;
  i1: number | null;
  i2: number | null;
  i3: number | null;
  created_at: string;
}

export interface Customer {
  id: string;
  account_number: string;
  name: string;
  address: string | null;
  substation_id: string | null;
  contract_demand_kva: number | null;
  customer_type: CustomerType;
  critical_customer: boolean;
  created_at: string;
  substation?: Substation;
}

export interface WaveformPoint {
  time: number;
  value: number;
}

export interface WaveformData {
  voltage: WaveformPoint[];
  current: WaveformPoint[];
}

export interface PQEvent {
  id: string;
  // Event characteristics
  is_mother_event: boolean;
  is_child_event: boolean;
  parent_event_id: string | null;
  is_special_event: boolean;
  false_event: boolean;
  is_late_event: boolean;
  // Event timestamp
  timestamp: string;
  // Event location (reference to PQMeter via meter_id)
  event_type: EventType;
  meter_id: string | null;
  substation_id: string | null;
  // Event impact & measurements
  duration_ms: number | null;
    // Voltage Measurements (V1, V2, V3)
  v1: number | null;
  v2: number | null;
  v3: number | null;
  customer_count: number | null;
    // SARFI Indices
  sarfi_10: number | null;
  sarfi_20: number | null;
  sarfi_30: number | null;
  sarfi_40: number | null;
  sarfi_50: number | null;
  sarfi_60: number | null;
  sarfi_70: number | null;
  sarfi_80: number | null;
  sarfi_90: number | null;
  magnitude: number | null;
  remaining_voltage: number | null;
  affected_phases: string[];
  severity: SeverityLevel;
  waveform_data: WaveformData | null;
  waveform_csv: string | null; // CSV data for waveform visualization (Timestamp,V1,V2,V3)
  status: EventStatus;
  // Mother Event Grouping properties
  grouping_type: 'automatic' | 'manual' | null;
  grouped_at: string | null;
  remarks: string | null;
  // IDR details
  idr_no: string | null;
  created_at: string;
  resolved_at: string | null;
    // Location & Equipment Details
  address: string | null;
  equipment_type: string | null;
   // Cause Analysis
  cause_group: string | null;
  cause: string | null;
  psbg_cause: 'VEGETATION' | 'DAMAGED BY THIRD PARTY' | 'UNCONFIRMED' | 'ANIMALS, BIRDS, INSECTS' | null;
  description: string | null;
    // Equipment Fault Details
  object_part_group: string | null;
  object_part_code: string | null;
  damage_group: string | null;
  damage_code: string | null;
    // Event Context
  outage_type: string | null;
  weather: string | null;
  total_cmi: number | null;
   // IDR (Incident Data Record) Fields
  fault_type: string | null;
  weather_condition: string | null;
  responsible_oc: string | null;
  manual_create_idr: boolean;
  substation?: Substation;
  meter?: PQMeter;
  customer_impacts?: EventCustomerImpact[];
  harmonic_event?: HarmonicEvent; // Optional: populated for harmonic event types
}

export interface EventCustomerImpact {
  id: string;
  event_id: string;
  customer_id: string;
  impact_level: string;
  estimated_downtime_min: number | null;
  created_at: string;
  customer?: Customer;
  event?: PQEvent;
}

export interface HarmonicEvent {
  id: string;
  pqevent_id: string;
  // Phase 1 (Current I1) Measurements - For 400kV/132kV/11kV meters
  I1_THD_10m: number | null;
  I1_TEHD_10m: number | null;
  I1_TOHD_10m: number | null;
  I1_TDD_10m: number | null;
  // Phase 2 (Current I2) Measurements - For 400kV/132kV/11kV meters
  I2_THD_10m: number | null;
  I2_TEHD_10m: number | null;
  I2_TOHD_10m: number | null;
  I2_TDD_10m: number | null;
  // Phase 3 (Current I3) Measurements - For 400kV/132kV/11kV meters
  I3_THD_10m: number | null;
  I3_TEHD_10m: number | null;
  I3_TOHD_10m: number | null;
  I3_TDD_10m: number | null;
  
  // 380V-specific measurements (30 columns) - Only for 380V meters
  description: string | null;
  tdd_limit: number | null;
  non_compliance: number | null;
  // Voltage measurements (Va, Vb, Vc)
  voltage_va: number | null;
  voltage_vb: number | null;
  voltage_vc: number | null;
  // Current measurements (Ia, Ib, Ic)
  current_ia: number | null;
  current_ib: number | null;
  current_ic: number | null;
  // THD Voltage (phases A, B, C)
  thd_voltage_a: number | null;
  thd_voltage_b: number | null;
  thd_voltage_c: number | null;
  // THD Odd Current (phases A, B, C)
  thd_odd_current_a: number | null;
  thd_odd_current_b: number | null;
  thd_odd_current_c: number | null;
  // THD Even (phases A, B, C)
  thd_even_a: number | null;
  thd_even_b: number | null;
  thd_even_c: number | null;
  // THD Current (phases A, B, C)
  thd_current_a: number | null;
  thd_current_b: number | null;
  thd_current_c: number | null;
  // Maximum load current
  il_max: number | null;
  // TDD Odd Current (phases A, B, C)
  tdd_odd_current_a: number | null;
  tdd_odd_current_b: number | null;
  tdd_odd_current_c: number | null;
  // TDD Even Current (phases A, B, C)
  tdd_even_current_a: number | null;
  tdd_even_current_b: number | null;
  tdd_even_current_c: number | null;
  // TDD Current (phases A, B, C)
  tdd_current_a: number | null;
  tdd_current_b: number | null;
  tdd_current_c: number | null;
}

export interface IDRRecord {
  id: string;
  event_id: string;
  // IDR Core Information
  idr_no: string | null;
  status: string | null;
  voltage_level: '400kV' | '132kV' | '11kV' | '380V' | null;
  duration_ms: number | null;
  // Fault & Asset Location
  v1: number | null;
  v2: number | null;
  v3: number | null;
  address: string | null;
  circuit: string | null;
  equipment_type: string | null;
  // Root Cause Analysis
  cause_group: string | null;
  cause: string; // REQUIRED
  faulty_component: string | null;
  remarks: string | null;
  // Extended Technical Details
  external_internal: 'external' | 'internal' | null;
  object_part_group: string | null;
  object_part_code: string | null;
  damage_group: string | null;
  damage_code: string | null;
  fault_type: string | null;
  outage_type: string | null;
  // Environment & Operations
  weather: string | null;
  weather_condition: string | null;
  responsible_oc: string | null;
  total_cmi: number | null;
  // CSV-specific fields
  equipment_affected: string | null;
  restoration_actions: string | null;
  notes: string | null;
  // Metadata
  uploaded_by: string | null;
  upload_source: 'csv_import' | 'manual_entry';
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  event_id: string | null;
  recipient_email: string | null;
  recipient_phone: string | null;
  notification_type: NotificationType;
  subject: string | null;
  message: string | null;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
  event?: PQEvent;
}

export interface NotificationRule {
  id: string;
  name: string;
  event_type: EventType | null;
  severity_threshold: SeverityLevel;
  recipients: string[];
  include_waveform: boolean;
  typhoon_mode_enabled: boolean;
  active: boolean;
  created_at: string;
}

export interface PQServiceRecord {
  id: string;
  customer_id: string | null;
  service_date: string;
  service_type: ServiceType;
  findings: string | null;
  recommendations: string | null;
  benchmark_standard: string | null;
  engineer_id: string | null;
  event_id: string | null;
  idr_no?: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  engineer?: Profile;
  event?: Pick<PQEvent, 'id' | 'idr_no'>;
}

export interface Report {
  id: string;
  report_type: ReportType;
  title: string;
  period_start: string;
  period_end: string;
  generated_by: string | null;
  file_path: string | null;
  status: ReportStatus;
  created_at: string;
  generated_by_profile?: Profile;
}

export interface SystemHealth {
  id: string;
  component: string;
  status: SystemStatus;
  message: string | null;
  metrics: Record<string, any> | null;
  checked_at: string;
}

export interface SARFIMetrics {
  id: string;
  substation_id: string | null;
  period_year: number;
  period_month: number;
  sarfi_70: number | null;
  sarfi_80: number | null;
  sarfi_90: number | null;
  total_events: number;
  created_at: string;
  substation?: Substation;
}

export interface SARFIProfile {
  id: string;
  name: string;
  description: string | null;
  year: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SARFIProfileWeight {
  id: string;
  profile_id: string;
  meter_id: string;
  customer_count: number;
  weight_factor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  meter?: PQMeter;
}

export interface SARFIDataPoint {
  meter_id: string;
  meter_no: string;
  location: string;
  customer_count: number;
  sarfi_10: number;
  sarfi_30: number;
  sarfi_50: number;
  sarfi_70: number;
  sarfi_80: number;
  sarfi_90: number;
  weight_factor: number;
}

export interface SARFIFilters {
  profileId: string;
  voltageLevel: '400kV' | '132kV' | '11kV' | '380V' | 'Others' | 'All';
  excludeSpecialEvents: boolean;
  dataType: 'magnitude' | 'duration';
  showDataTable: boolean;
}

// Dashboard Statistics Interface
export interface DashboardStats {
  totalEvents: number;
  criticalEvents: number;
  activeSubstations: number;
  averageDuration: number;
  activePQMeters: number;
  abnormalMeters: number;
  totalCustomers: number;
  criticalCustomers: number;
}

// Event Statistics Interface
export interface FilterProfile {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  filters: Record<string, any>; // EventFilter stored as JSONB
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventStatistics {
  eventsByType: Record<EventType, number>;
  eventsBySeverity: Record<SeverityLevel, number>;
  eventsByStatus: Record<EventStatus, number>;
  hourlyDistribution: number[];
  monthlyTrend: Array<{ month: string; count: number }>;
}

// Analytics Interfaces
export interface ComplianceMetrics {
  voltageTHD: {
    average: number;
    limit: number;
    compliantPercentage: number;
  };
  currentTHD: {
    average: number;
    limit: number;
    compliantPercentage: number;
  };
  ieee519Compliance: number;
  en50160Compliance: number;
}

export interface PowerQualityMetrics {
  voltageDips: number;
  voltagSwells: number;
  interruptions: number;
  harmonicEvents: number;
  transientEvents: number;
  flickerEvents: number;
}

// Substation Map Interfaces
export interface SubstationMapFilters {
  profileId: string;
  startDate: string;
  endDate: string;
  includeFalseEvents: boolean;
  motherEventsOnly: boolean;
  voltageLevels: string[];
}

export interface SubstationMapProfile {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubstationEventCount {
  substationId: string;
  substation: Substation;
  eventCount: number;
  services: string[];
}

// Root Cause Chart Interfaces
export interface RootCauseFilters {
  profileId: string;
  startDate: string;
  endDate: string;
}

export interface RootCauseProfile {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Customer Transformer Matching Interface
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

// PQ Benchmarking Standard Interfaces
export interface PQBenchmarkStandard {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  created_by_profile?: Profile;
}

export interface PQBenchmarkThreshold {
  id: string;
  standard_id: string;
  min_voltage: number;
  duration: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  standard?: PQBenchmarkStandard;
}

// Realtime PQ Data Interface
export interface RealtimePQData {
  // Volts/Amps Section
  vln: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  vll: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  current: { phaseA: number; phaseB: number; phaseC: number; total: number };
  activePower: { phaseA: number; phaseB: number; phaseC: number; total: number };
  reactivePower: { phaseA: number; phaseB: number; phaseC: number; total: number };
  apparentPower: { phaseA: number; phaseB: number; phaseC: number; total: number };
  frequency: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  powerFactor: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  
  // Power Quality Section
  v2Unb: number;
  vThd: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  iThf: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  iThdOdd: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  iTdd: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  iTddOdd: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  pst: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  plt: { phaseA: number; phaseB: number; phaseC: number; avg: number };
  
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  count?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

// Notification System Types
export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'teams';
  status: 'enabled' | 'disabled' | 'maintenance';
  priority: number;
  config: {
    demo_mode?: boolean;
    smtp_server?: string;
    teams_webhook?: string;
    [key: string]: any;
  };
  monitoring_metrics: {
    last_success?: string;
    success_rate?: number;
    avg_latency_ms?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  email_subject: string | null;
  email_body: string | null;
  teams_body: string | null;
  variables: Array<{
    name: string;
    description: string;
    required: boolean;
    default_value?: string;
  }>;
  status: 'draft' | 'approved' | 'archived';
  version: number;
  applicable_channels: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export interface NotificationGroup {
  id: string;
  name: string;
  description: string | null;
  group_type: 'custom' | 'dynamic';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NotificationGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  email: string | null;
  preferred_channels: string[];
  added_at: string;
  added_by: string | null;
}

export interface NotificationRule {
  id: string;
  name: string;
  description: string | null;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'contains';
    value: any;
  }>;
  template_id: string | null;
  channels: string[];
  notification_groups: string[];
  additional_recipients: Array<{
    email?: string;
    phone?: string;
  }>;
  typhoon_mode_enabled: boolean;
  mother_event_only: boolean;
  include_waveform: boolean;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface NotificationLog {
  id: string;
  rule_id: string | null;
  event_id: string | null;
  template_id: string | null;
  recipient_type: 'user' | 'group' | 'adhoc';
  recipient_id: string | null;
  recipient_email: string | null;
  channel: string;
  subject: string | null;
  message: string | null;
  status: 'pending' | 'sent' | 'failed' | 'suppressed';
  sent_at: string | null;
  failed_reason: string | null;
  triggered_by: {
    user_id?: string;
    system?: boolean;
    [key: string]: any;
  };
  suppression_reason: string | null;
  created_at: string;
}

export interface NotificationSystemConfig {
  id: string;
  typhoon_mode: boolean;
  maintenance_mode: boolean;
  typhoon_mode_until: string | null;
  maintenance_mode_until: string | null;
  default_channels: string[];
  max_notifications_per_event: number;
  notification_cooldown_minutes: number;
  updated_at: string;
  updated_by: string | null;
}

