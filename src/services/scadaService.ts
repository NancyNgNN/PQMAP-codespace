import { supabase } from '../lib/supabase';
import type { Substation, SubstationStatus } from '../types/database';

export interface CreateSubstationInput {
  code: string;
  name: string;
  voltage_level: string;
  latitude: number;
  longitude: number;
  region: string;
  status: SubstationStatus;
}

export interface UpdateSubstationInput {
  id: string;
  code?: string;
  name?: string;
  voltage_level?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  status?: SubstationStatus;
}

export interface SubstationFilters {
  searchTerm?: string;
  voltageLevels?: string[];
  regions?: string[];
  statuses?: SubstationStatus[];
}

/**
 * Hong Kong geographic bounds for validation
 */
export const HK_BOUNDS = {
  LAT_MIN: 22.15,
  LAT_MAX: 22.58,
  LNG_MIN: 113.83,
  LNG_MAX: 114.41
};

/**
 * Validate geographic coordinates are within Hong Kong
 */
export function validateHKCoordinates(lat: number, lng: number): { valid: boolean; message?: string } {
  if (lat < HK_BOUNDS.LAT_MIN || lat > HK_BOUNDS.LAT_MAX) {
    return {
      valid: false,
      message: `Latitude must be between ${HK_BOUNDS.LAT_MIN} and ${HK_BOUNDS.LAT_MAX} (Hong Kong region)`
    };
  }
  
  if (lng < HK_BOUNDS.LNG_MIN || lng > HK_BOUNDS.LNG_MAX) {
    return {
      valid: false,
      message: `Longitude must be between ${HK_BOUNDS.LNG_MIN} and ${HK_BOUNDS.LNG_MAX} (Hong Kong region)`
    };
  }
  
  return { valid: true };
}

/**
 * Fetch all substations with optional filters
 */
export async function fetchSubstations(filters?: SubstationFilters): Promise<Substation[]> {
  let query = supabase
    .from('substations')
    .select(`
      *,
      updated_by_profile:profiles!substations_updated_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .order('code', { ascending: true });

  // Apply search filter
  if (filters?.searchTerm) {
    query = query.or(`code.ilike.%${filters.searchTerm}%,name.ilike.%${filters.searchTerm}%`);
  }

  // Apply voltage level filter
  if (filters?.voltageLevels && filters.voltageLevels.length > 0) {
    query = query.in('voltage_level', filters.voltageLevels);
  }

  // Apply region filter
  if (filters?.regions && filters.regions.length > 0) {
    query = query.in('region', filters.regions);
  }

  // Apply status filter
  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching substations:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get unique voltage levels from substations
 */
export async function getVoltageLevels(): Promise<string[]> {
  const { data, error } = await supabase
    .from('substations')
    .select('voltage_level')
    .order('voltage_level');

  if (error) {
    console.error('Error fetching voltage levels:', error);
    throw error;
  }

  const uniqueLevels = [...new Set(data.map(d => d.voltage_level).filter(Boolean))];
  return uniqueLevels.sort();
}

/**
 * Get unique regions from substations
 */
export async function getRegions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('substations')
    .select('region')
    .order('region');

  if (error) {
    console.error('Error fetching regions:', error);
    throw error;
  }

  const uniqueRegions = [...new Set(data.map(d => d.region).filter(Boolean))];
  return uniqueRegions.sort();
}

/**
 * Create a new substation
 */
export async function createSubstation(
  input: CreateSubstationInput,
  userId: string
): Promise<Substation> {
  // Validate coordinates
  const validation = validateHKCoordinates(input.latitude, input.longitude);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Check for duplicate code
  const { data: existing } = await supabase
    .from('substations')
    .select('id')
    .eq('code', input.code)
    .single();

  if (existing) {
    throw new Error(`Substation with code "${input.code}" already exists`);
  }

  const { data, error } = await supabase
    .from('substations')
    .insert({
      ...input,
      updated_by: userId
    })
    .select(`
      *,
      updated_by_profile:profiles!substations_updated_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) {
    console.error('Error creating substation:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing substation
 */
export async function updateSubstation(
  input: UpdateSubstationInput,
  userId: string
): Promise<Substation> {
  const { id, ...updates } = input;

  // Validate coordinates if provided
  if (updates.latitude !== undefined && updates.longitude !== undefined) {
    const validation = validateHKCoordinates(updates.latitude, updates.longitude);
    if (!validation.valid) {
      throw new Error(validation.message);
    }
  }

  // Check for duplicate code if updating code
  if (updates.code) {
    const { data: existing } = await supabase
      .from('substations')
      .select('id')
      .eq('code', updates.code)
      .neq('id', id)
      .single();

    if (existing) {
      throw new Error(`Substation with code "${updates.code}" already exists`);
    }
  }

  const { data, error } = await supabase
    .from('substations')
    .update({
      ...updates,
      updated_by: userId
    })
    .eq('id', id)
    .select(`
      *,
      updated_by_profile:profiles!substations_updated_by_fkey(
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) {
    console.error('Error updating substation:', error);
    throw error;
  }

  return data;
}

/**
 * Check if substation has dependencies (meters or events)
 */
export async function checkSubstationDependencies(substationId: string): Promise<{
  hasMeters: boolean;
  hasEvents: boolean;
  meterCount: number;
  eventCount: number;
}> {
  // Check for linked meters
  const { count: meterCount, error: meterError } = await supabase
    .from('pq_meters')
    .select('id', { count: 'exact', head: true })
    .eq('substation_id', substationId);

  if (meterError) {
    console.error('Error checking meters:', meterError);
    throw meterError;
  }

  // Check for linked events
  const { count: eventCount, error: eventError } = await supabase
    .from('pq_events')
    .select('id', { count: 'exact', head: true })
    .eq('substation_id', substationId);

  if (eventError) {
    console.error('Error checking events:', eventError);
    throw eventError;
  }

  return {
    hasMeters: (meterCount || 0) > 0,
    hasEvents: (eventCount || 0) > 0,
    meterCount: meterCount || 0,
    eventCount: eventCount || 0
  };
}

/**
 * Delete a substation (hard delete - only if no dependencies)
 */
export async function deleteSubstation(substationId: string): Promise<void> {
  // Check dependencies first
  const dependencies = await checkSubstationDependencies(substationId);

  if (dependencies.hasMeters || dependencies.hasEvents) {
    throw new Error(
      `Cannot delete substation: ${dependencies.meterCount} meters and ${dependencies.eventCount} events are linked to this substation. Please remove these dependencies first.`
    );
  }

  const { error } = await supabase
    .from('substations')
    .delete()
    .eq('id', substationId);

  if (error) {
    console.error('Error deleting substation:', error);
    throw error;
  }
}

/**
 * Get substation statistics
 */
export async function getSubstationStatistics() {
  const { data, error } = await supabase
    .from('substations')
    .select('status, voltage_level, region');

  if (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }

  const stats = {
    total: data.length,
    byStatus: {} as Record<string, number>,
    byVoltageLevel: {} as Record<string, number>,
    byRegion: {} as Record<string, number>
  };

  data.forEach(substation => {
    // Count by status
    stats.byStatus[substation.status] = (stats.byStatus[substation.status] || 0) + 1;
    
    // Count by voltage level
    if (substation.voltage_level) {
      stats.byVoltageLevel[substation.voltage_level] = 
        (stats.byVoltageLevel[substation.voltage_level] || 0) + 1;
    }
    
    // Count by region
    if (substation.region) {
      stats.byRegion[substation.region] = (stats.byRegion[substation.region] || 0) + 1;
    }
  });

  return stats;
}
