import { supabase } from '../lib/supabase';
import { SARFIProfile, SARFIProfileWeight, SARFIDataPoint, SARFIFilters } from '../types/database';

/**
 * Fetch all SARFI profiles
 */
export async function fetchSARFIProfiles(): Promise<SARFIProfile[]> {
  const { data, error } = await supabase
    .from('sarfi_profiles')
    .select('*')
    .order('year', { ascending: false });

  if (error) {
    console.error('Error fetching SARFI profiles:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch active SARFI profile for a specific year
 */
export async function fetchActiveProfile(year: number): Promise<SARFIProfile | null> {
  const { data, error } = await supabase
    .from('sarfi_profiles')
    .select('*')
    .eq('year', year)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error fetching active profile:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new SARFI profile
 */
export async function createSARFIProfile(profile: {
  name: string;
  year: number;
  description?: string;
}): Promise<SARFIProfile> {
  const { data, error } = await supabase
    .from('sarfi_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) {
    console.error('Error creating SARFI profile:', error);
    throw error;
  }

  return data;
}

/**
 * Update SARFI profile
 */
export async function updateSARFIProfile(
  profileId: string,
  updates: Partial<SARFIProfile>
): Promise<SARFIProfile> {
  const { data, error } = await supabase
    .from('sarfi_profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    console.error('Error updating SARFI profile:', error);
    throw error;
  }

  return data;
}

/**
 * Delete SARFI profile (cascade deletes weights)
 */
export async function deleteSARFIProfile(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('sarfi_profiles')
    .delete()
    .eq('id', profileId);

  if (error) {
    console.error('Error deleting SARFI profile:', error);
    throw error;
  }
}

/**
 * Fetch weighting factors for a profile
 */
export async function fetchProfileWeights(profileId: string): Promise<SARFIProfileWeight[]> {
  const { data, error} = await supabase
    .from('sarfi_profile_weights')
    .select(`
      *,
      meter:pq_meters(
        id,
        meter_id,
        location,
        substation:substations(
          voltage_level
        )
      )
    `)
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching profile weights:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create or update weighting factor for a meter in a profile
 */
export async function upsertProfileWeight(weight: {
  profile_id: string;
  meter_id: string;
  weight_factor: number;
  notes?: string;
}): Promise<SARFIProfileWeight> {
  const { data, error } = await supabase
    .from('sarfi_profile_weights')
    .upsert(weight, {
      onConflict: 'profile_id,meter_id',
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting profile weight:', error);
    throw error;
  }

  return data;
}

/**
 * Batch update weighting factors
 */
export async function batchUpdateWeights(
  weights: Array<{ id: string; weight_factor: number }>
): Promise<void> {
  const promises = weights.map(({ id, weight_factor }) =>
    supabase
      .from('sarfi_profile_weights')
      .update({ weight_factor })
      .eq('id', id)
  );

  const results = await Promise.all(promises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('Error batch updating weights:', errors);
    throw new Error('Failed to update some weights');
  }
}

/**
 * Delete weighting factor
 */
export async function deleteProfileWeight(weightId: string): Promise<void> {
  const { error } = await supabase
    .from('sarfi_profile_weights')
    .delete()
    .eq('id', weightId);

  if (error) {
    console.error('Error deleting profile weight:', error);
    throw error;
  }
}

/**
 * Fetch SARFI data with filters applied
 */
export async function fetchFilteredSARFIData(filters: SARFIFilters): Promise<SARFIDataPoint[]> {
  // Validate profile ID
  if (!filters.profileId) {
    console.warn('⚠️ No profile ID provided, returning empty data');
    return [];
  }

  // Step 1: Fetch weights for the profile to get the list of meters
  const weights = await fetchProfileWeights(filters.profileId);
  
  if (weights.length === 0) {
    console.warn('⚠️ No weights found for profile:', filters.profileId);
    return [];
  }

  const weightMap = new Map(weights.map(w => [w.meter_id, w.weight_factor]));
  const meterIds = Array.from(weightMap.keys());

  // Step 2: Fetch meter details with voltage level filtering
  let meterQuery = supabase
    .from('pq_meters')
    .select(`
      id,
      meter_id,
      location,
      voltage_level,
      substation_id,
      substations(voltage_level)
    `)
    .in('id', meterIds);

  // Apply voltage level filter on pq_events.voltage_level column directly
  // (We'll filter meters based on events that match the voltage level)
  
  const { data: meters, error: meterError } = await meterQuery;

  if (meterError) {
    console.error('❌ Error fetching meters:', meterError);
    throw meterError;
  }

  // Step 3: Fetch events for these meters
  let eventQuery = supabase
    .from('pq_events')
    .select(`
      id,
      event_type,
      magnitude,
      remaining_voltage,
      duration_ms,
      meter_id,
      voltage_level,
      is_special_event,
      timestamp
    `)
    .in('meter_id', meterIds)
    .eq('event_type', 'voltage_dip'); // Only voltage dips count for SARFI

  // Filter by voltage level from pq_events table
  if (filters.voltageLevel !== 'All') {
    eventQuery = eventQuery.eq('voltage_level', filters.voltageLevel);
  }

  // Exclude special events if requested
  if (filters.excludeSpecialEvents) {
    eventQuery = eventQuery.or('is_special_event.is.null,is_special_event.eq.false');
  }

  const { data: events, error: eventError } = await eventQuery;

  if (eventError) {
    console.error('❌ Error fetching events:', eventError);
    throw eventError;
  }

  // Step 4: Create meter lookup map
  const meterDetailsMap = new Map(
    meters?.map(m => [
      m.id,
      {
        meter_id: m.meter_id,
        location: m.location,
        voltage_level: m.voltage_level || (m.substations as any)?.voltage_level || 'Unknown'
      }
    ]) || []
  );

  // Step 5: Group events by meter and calculate SARFI indices
  const meterMap = new Map<string, SARFIDataPoint>();

  // Initialize all meters from the profile
  meterIds.forEach(meterId => {
    const meterDetails = meterDetailsMap.get(meterId);
    if (meterDetails) {
      meterMap.set(meterId, {
        meter_id: meterId,
        meter_no: meterDetails.meter_id,
        location: meterDetails.location,
        sarfi_10: 0,
        sarfi_30: 0,
        sarfi_50: 0,
        sarfi_70: 0,
        sarfi_80: 0,
        sarfi_90: 0,
        weight_factor: weightMap.get(meterId) || 1.0,
      });
    }
  });

  // Process events and count SARFI thresholds
  events?.forEach(event => {
    if (!event.meter_id) return;

    const dataPoint = meterMap.get(event.meter_id);
    if (!dataPoint) return;

    // Use remaining_voltage if available, otherwise use magnitude
    const remainingVoltage = event.remaining_voltage ?? event.magnitude ?? 100;

    // Calculate SARFI thresholds (remaining voltage %)
    // SARFI-X counts events where remaining voltage is <= (100 - X)%
    if (remainingVoltage <= 90) dataPoint.sarfi_10++;
    if (remainingVoltage <= 70) dataPoint.sarfi_30++;
    if (remainingVoltage <= 50) dataPoint.sarfi_50++;
    if (remainingVoltage <= 30) dataPoint.sarfi_70++;
    if (remainingVoltage <= 20) dataPoint.sarfi_80++;
    if (remainingVoltage <= 10) dataPoint.sarfi_90++;
  });

  const result = Array.from(meterMap.values());
  console.log(`✅ SARFI data ready: ${result.length} meters, ${events?.length || 0} events processed`);
  
  return result;
}

/**
 * Calculate weighted SARFI metrics
 */
export function calculateWeightedSARFI(data: SARFIDataPoint[]): {
  sarfi_10: number;
  sarfi_30: number;
  sarfi_50: number;
  sarfi_70: number;
  sarfi_80: number;
  sarfi_90: number;
} {
  const totalWeight = data.reduce((sum, d) => sum + d.weight_factor, 0);

  if (totalWeight === 0) {
    return { sarfi_10: 0, sarfi_30: 0, sarfi_50: 0, sarfi_70: 0, sarfi_80: 0, sarfi_90: 0 };
  }

  return {
    sarfi_10: data.reduce((sum, d) => sum + d.sarfi_10 * d.weight_factor, 0) / totalWeight,
    sarfi_30: data.reduce((sum, d) => sum + d.sarfi_30 * d.weight_factor, 0) / totalWeight,
    sarfi_50: data.reduce((sum, d) => sum + d.sarfi_50 * d.weight_factor, 0) / totalWeight,
    sarfi_70: data.reduce((sum, d) => sum + d.sarfi_70 * d.weight_factor, 0) / totalWeight,
    sarfi_80: data.reduce((sum, d) => sum + d.sarfi_80 * d.weight_factor, 0) / totalWeight,
    sarfi_90: data.reduce((sum, d) => sum + d.sarfi_90 * d.weight_factor, 0) / totalWeight,
  };
}
