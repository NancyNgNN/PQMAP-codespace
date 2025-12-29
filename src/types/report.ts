export type ChartType = 
  | 'Table' 
  | 'Table Heatmap'
  | 'Table Col Heatmap'
  | 'Table Row Heatmap'
  | 'Bar Chart'
  | 'Stacked Bar Chart'
  | 'Line Chart'
  | 'Area Chart'
  | 'Scatter Chart'
  | 'Multiple Pie Chart';

export type AggregationFunction = 
  | 'Count'
  | 'Count Unique Values'
  | 'List Unique Values'
  | 'Sum'
  | 'Integer Sum'
  | 'Average'
  | 'Median'
  | 'Sample Variance'
  | 'Sample Standard Deviation'
  | 'Minimum'
  | 'Maximum'
  | 'First'
  | 'Last'
  | 'Sum over Sum'
  | 'Sum as Fraction of Total'
  | 'Sum as Fraction of Rows'
  | 'Sum as Fraction of Columns'
  | 'Count as Fraction of Total'
  | 'Count as Fraction of Rows'
  | 'Count as Fraction of Columns';

export type DateFilterPreset = 
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'last_quarter'
  | 'this_year'
  | 'last_year'
  | 'last_3_years'
  | 'custom';

export interface CalculatedField {
  id: string;
  name: string;
  expression: string; // e.g., "Duration (ms) * 0.001" or "Affected Customers * 10"
  description?: string;
  type: 'number' | 'string' | 'boolean';
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
  label?: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  dateFilter: DateFilterPreset;
  customDateRange?: {
    start: string;
    end: string;
  };
  filters: ReportFilter[];
  rows: string[];
  cols: string[];
  vals: string[];
  aggregatorName: AggregationFunction;
  rendererName: ChartType;
  calculatedFields: CalculatedField[];
  includeFalseEvents: boolean;
  refreshInterval?: number; // minutes
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedReport {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  config: ReportConfig;
  is_public: boolean;
  shared_with: string[]; // user IDs
  created_at: string;
  updated_at: string;
}

export interface ShareReportRequest {
  reportId: string;
  shareWithUserIds: string[];
  message?: string;
}
