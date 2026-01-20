export type UserRole = 'admin' | 'operator' | 'viewer';
export type EventType = 'voltage_dip' | 'voltage_swell' | 'harmonic' | 'interruption' | 'transient' | 'flicker';
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';
export type EventStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved';
export type MeterStatus = 'active' | 'abnormal' | 'inactive';
export type SubstationStatus = 'operational' | 'maintenance' | 'offline';
export type CustomerType = 'residential' | 'commercial' | 'industrial';
export type ServiceType = 'site_survey' | 'harmonic_analysis' | 'consultation' | 'on_site_study' | 'power_quality_audit' | 'installation_support';
export type ReportType = 'supply_reliability' | 'annual_pq' | 'meter_availability' | 'customer_impact' | 'harmonic_analysis' | 'voltage_quality';
export type NotificationType = 'email' | 'sms' | 'both';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type ReportStatus = 'generating' | 'completed' | 'failed';
export type SystemStatus = 'healthy' | 'degraded' | 'down';

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
  meter_type?: string;
  status: MeterStatus;
  active?: boolean;
  last_communication: string | null;
  installed_date: string | null;
  created_at: string;
  // Transformer Code fields (Migration 20251217000000)
  area: string;
  ss400?: string | null;
  ss132?: string | null;
  ss011?: string | null;
  substation?: Substation;
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
  // Event timestamp
  timestamp: string;
  // Event location (reference from PQmeter)
  event_type: EventType;
  meter_id: string | null;
  site_id: string | null;
  voltage_level: string | null;
  substation_id: string | null;
  circuit_id: string;
  region: string | null;
  oc: string | null;
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
  validated_by_adms: boolean;
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

export interface IDRRecord {
  id: string;
  event_id: string;
  // Basic Information
  idr_no: string | null;
  status: string | null;
  voltage_level: string | null;
  duration_ms: number | null;
  // Location & Equipment
  address: string | null;
  equipment_type: string | null;
  // Voltage Measurements
  v1: number | null;
  v2: number | null;
  v3: number | null;
  // Fault Details
  fault_type: string | null;
  // Cause Analysis
  cause_group: string | null;
  cause: string; // REQUIRED
  remarks: string | null;
  object_part_group: string | null;
  object_part_code: string | null;
  damage_group: string | null;
  damage_code: string | null;
  // Environment & Operations
  outage_type: string | null;
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
  content: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  engineer?: Profile;
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
