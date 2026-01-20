export interface EventOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'group' | 'ungroup';
  operation_type: 'group' | 'ungroup' | 'merge' | 'create' | 'edit' | 'delete';
  performed_by: string; // User ID
  performed_at: string;
  timestamp: string;
  event_ids: string[]; // Array of affected event IDs
  eventId?: string;
  eventData?: any;
  mother_event_id?: string;
  description: string;
  details: Record<string, any>;
  status: 'pending' | 'completed' | 'failed';
  error?: Error;
  affectedEventIds?: string[];
}

export interface EventFilter {
  id?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
  startDate: string;
  endDate: string;
  eventTypes: string[];
  severityLevels: string[];
  statusOptions: string[];
  voltageLevels: string[];
  meterIds: string[];
  minDuration: number;
  maxDuration: number;
  minCustomers: number;
  maxCustomers: number;
  minRemainingVoltage: number;
  maxRemainingVoltage: number;
  circuitIds: string[];
  showOnlyUnvalidated: boolean;
  showOnlyStandaloneEvents: boolean;
  showFalseEventsOnly: boolean;
  filter_rules?: {
    duration_min_ms?: number;
    duration_max_ms?: number;
    magnitude_min?: number;
    magnitude_max?: number;
    event_types?: string[];
    severities?: string[];
    voltage_levels?: string[];
  };
  created_by?: string;
  created_at?: string;
}

export interface EventTreeNode {
  id: string;
  event: any; // PQEvent
  children: EventTreeNode[];
  isExpanded?: boolean;
}