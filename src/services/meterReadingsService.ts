import { supabase } from '../lib/supabase';
import type { MeterVoltageReading, VoltageProfile } from '../types/database';

export async function getLatestMeterReading(meterId: string): Promise<MeterVoltageReading | null> {
  const { data, error } = await supabase
    .from('meter_voltage_readings')
    .select('id, meter_id, timestamp, v1, v2, v3, i1, i2, i3, created_at')
    .eq('meter_id', meterId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as MeterVoltageReading | null;
}

export async function getVoltageProfiles(): Promise<VoltageProfile[]> {
  const { data, error } = await supabase
    .from('voltage_profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as VoltageProfile[];
}