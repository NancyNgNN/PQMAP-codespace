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
 * Update customer count for a meter and recalculate all weight factors in the profile
 */
export async function updateCustomerCount(
  weightId: string,
  customerCount: number
): Promise<void> {
  // Update the customer count
  const { data: updatedWeight, error: updateError } = await supabase
    .from('sarfi_profile_weights')
    .update({ customer_count: customerCount })
    .eq('id', weightId)
    .select('profile_id')
    .single();

  if (updateError) {
    console.error('❌ Error updating customer count:', updateError);
    throw updateError;
  }

  // Recalculate weight factors for entire profile
  await recalculateWeightFactors(updatedWeight.profile_id);
}

/**
 * Batch update customer counts and recalculate weight factors
 */
export async function batchUpdateCustomerCounts(
  profileId: string,
  updates: Array<{ meter_id: string; customer_count: number }>
): Promise<{ success: number; failed: number; errors: any[] }> {
  const errors: any[] = [];
  let success = 0;
  let failed = 0;

  // Update each customer count
  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('sarfi_profile_weights')
        .update({ customer_count: update.customer_count })
        .eq('profile_id', profileId)
        .eq('meter_id', update.meter_id);

      if (error) {
        errors.push({ meter_id: update.meter_id, error: error.message });
        failed++;
      } else {
        success++;
      }
    } catch (err: any) {
      errors.push({ meter_id: update.meter_id, error: err.message });
      failed++;
    }
  }

  // Recalculate weight factors for entire profile
  if (success > 0) {
    await recalculateWeightFactors(profileId);
  }

  return { success, failed, errors };
}

/**
 * Recalculate weight factors for all meters in a profile
 * Formula: weight_factor = customer_count / SUM(all customer_counts)
 */
export async function recalculateWeightFactors(profileId: string): Promise<void> {
  // Fetch all weights for the profile
  const { data: weights, error: fetchError } = await supabase
    .from('sarfi_profile_weights')
    .select('id, customer_count')
    .eq('profile_id', profileId);

  if (fetchError) {
    console.error('❌ Error fetching weights for recalculation:', fetchError);
    throw fetchError;
  }

  if (!weights || weights.length === 0) {
    console.warn('⚠️ No weights found for profile:', profileId);
    return;
  }

  // Calculate total customer count
  const totalCustomers = weights.reduce((sum, w) => sum + (w.customer_count || 0), 0);

  if (totalCustomers === 0) {
    console.warn('⚠️ Total customer count is 0, setting all weights to 0');
    // Set all weights to 0
    for (const weight of weights) {
      await supabase
        .from('sarfi_profile_weights')
        .update({ weight_factor: 0 })
        .eq('id', weight.id);
    }
    return;
  }

  // Update each weight factor
  const updatePromises = weights.map(weight => {
    const weightFactor = (weight.customer_count || 0) / totalCustomers;
    return supabase
      .from('sarfi_profile_weights')
      .update({ weight_factor: weightFactor })
      .eq('id', weight.id);
  });

  const results = await Promise.all(updatePromises);
  const updateErrors = results.filter(r => r.error);

  if (updateErrors.length > 0) {
    console.error('❌ Error recalculating weight factors:', updateErrors);
    throw new Error('Failed to recalculate some weight factors');
  }

  console.log(`✅ Recalculated weight factors for ${weights.length} meters`);
}

/**
 * Add new meter to profile with customer count
 */
export async function addMeterToProfile(
  profileId: string,
  meterId: string,
  customerCount: number,
  notes?: string
): Promise<SARFIProfileWeight> {
  const { data, error } = await supabase
    .from('sarfi_profile_weights')
    .insert({
      profile_id: profileId,
      meter_id: meterId,
      customer_count: customerCount,
      weight_factor: 0, // Will be recalculated
      notes: notes || null
    })
    .select(`
      *,
      meter:pq_meters(
        id,
        meter_id,
        location
      )
    `)
    .single();

  if (error) {
    console.error('❌ Error adding meter to profile:', error);
    throw error;
  }

  // Recalculate weight factors
  await recalculateWeightFactors(profileId);

  return data;
}

/**
 * Import weight factors from CSV data
 */
export async function importWeightFactorsCSV(
  profileId: string,
  csvData: Array<{ meter_id: string; customer_count: number }>
): Promise<{ success: number; failed: number; errors: Array<{ row: number; meter_id: string; message: string }> }> {
  const errors: Array<{ row: number; meter_id: string; message: string }> = [];
  let success = 0;
  let failed = 0;

  // Validate that profile exists
  const { data: profile, error: profileError } = await supabase
    .from('sarfi_profiles')
    .select('id')
    .eq('id', profileId)
    .single();

  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  // Fetch all PQ meters for validation
  const { data: allMeters, error: metersError } = await supabase
    .from('pq_meters')
    .select('id, meter_id');

  if (metersError) {
    throw new Error('Failed to fetch meters for validation');
  }

  const meterIdToUuidMap = new Map(allMeters?.map(m => [m.meter_id, m.id]) || []);

  // Process each row
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 1;

    try {
      // Validate meter exists
      const meterUuid = meterIdToUuidMap.get(row.meter_id);
      if (!meterUuid) {
        errors.push({
          row: rowNumber,
          meter_id: row.meter_id,
          message: 'Meter not found in system'
        });
        failed++;
        continue;
      }

      // Validate customer count
      if (row.customer_count < 0 || !Number.isInteger(row.customer_count)) {
        errors.push({
          row: rowNumber,
          meter_id: row.meter_id,
          message: 'Customer count must be a non-negative integer'
        });
        failed++;
        continue;
      }

      // Upsert the weight
      const { error: upsertError } = await supabase
        .from('sarfi_profile_weights')
        .upsert({
          profile_id: profileId,
          meter_id: meterUuid,
          customer_count: row.customer_count,
          weight_factor: 0 // Will be recalculated
        }, {
          onConflict: 'profile_id,meter_id'
        });

      if (upsertError) {
        errors.push({
          row: rowNumber,
          meter_id: row.meter_id,
          message: upsertError.message
        });
        failed++;
      } else {
        success++;
      }
    } catch (err: any) {
      errors.push({
        row: rowNumber,
        meter_id: row.meter_id,
        message: err.message || 'Unknown error'
      });
      failed++;
    }
  }

  // Recalculate weight factors if any succeeded
  if (success > 0) {
    await recalculateWeightFactors(profileId);
  }

  return { success, failed, errors };
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

  // Get customer count map from weights
  const customerCountMap = new Map(weights.map(w => [w.meter_id, w.customer_count || 0]));

  // Initialize all meters from the profile
  meterIds.forEach(meterId => {
    const meterDetails = meterDetailsMap.get(meterId);
    if (meterDetails) {
      meterMap.set(meterId, {
        meter_id: meterId,
        meter_no: meterDetails.meter_id,
        location: meterDetails.location,
        customer_count: customerCountMap.get(meterId) || 0,
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
    // SARFI-X counts events where remaining voltage drops below (100 - X)%
    // i.e., voltage dip is X% or greater
    if (remainingVoltage < 90) dataPoint.sarfi_10++;  // Dip >= 10%
    if (remainingVoltage < 70) dataPoint.sarfi_30++;  // Dip >= 30%
    if (remainingVoltage < 50) dataPoint.sarfi_50++;  // Dip >= 50%
    if (remainingVoltage < 30) dataPoint.sarfi_70++;  // Dip >= 70%
    if (remainingVoltage < 20) dataPoint.sarfi_80++;  // Dip >= 80%
    if (remainingVoltage < 10) dataPoint.sarfi_90++;  // Dip >= 90%
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
