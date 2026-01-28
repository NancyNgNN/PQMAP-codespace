export interface CriticalMessage {
  id: string;
  title: string;
  content: string;
  severity: 'critical' | 'warning' | 'info';
  is_active: boolean;
  start_time: string;
  end_time: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface CriticalMessageInput {
  title: string;
  content: string;
  severity: 'critical' | 'warning' | 'info';
  is_active: boolean;
  start_time: string;
  end_time?: string;
}
