import { supabase } from '../lib/supabase';
import type { CustomerTransformerMatching } from '../types/database';

export interface CreateMappingInput {
  customer_id: string;
  substation_id: string;
  circuit_id: string;
}

export interface UpdateMappingInput {
  id: string;
  substation_id?: string;
  circuit_id?: string;
  active?: boolean;
}

export interface MappingFilters {
  substationId?: string;
  circuitId?: string;
  customerId?: string;
  activeOnly?: boolean;
}

/**
 * Fetch all customer-transformer mappings with filters
 */
export async function fetchCustomerTransformerMappings(
  filters?: MappingFilters
): Promise<CustomerTransformerMatching[]> {
  let query = supabase
    .from('customer_transformer_matching')
    .select(`
      *,
      customer:customers(*),
      substation:substations(*),
      updated_by_profile:profiles(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.substationId) {
    query = query.eq('substation_id', filters.substationId);
  }

  if (filters?.circuitId) {
    query = query.eq('circuit_id', filters.circuitId);
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters?.activeOnly !== false) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching customer transformer mappings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get distinct circuits for a substation from pq_events
 * Uses Option A: Query from existing events data
 */
export async function getCircuitsForSubstation(
  substationId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('pq_events')
    .select('circuit_id')
    .eq('substation_id', substationId)
    .not('circuit_id', 'is', null)
    .order('circuit_id');

  if (error) {
    console.error('Error fetching circuits:', error);
    throw error;
  }

  // Get unique circuit IDs
  const uniqueCircuits = [...new Set(data.map(d => d.circuit_id).filter(Boolean))];
  return uniqueCircuits.sort();
}

/**
 * Create a new customer-transformer mapping
 */
export async function createCustomerTransformerMapping(
  input: CreateMappingInput,
  userId: string
): Promise<CustomerTransformerMatching> {
  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .insert({
      ...input,
      updated_by: userId
    })
    .select(`
      *,
      customer:customers(*),
      substation:substations(*)
    `)
    .single();

  if (error) {
    console.error('Error creating mapping:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing mapping
 */
export async function updateCustomerTransformerMapping(
  input: UpdateMappingInput,
  userId: string
): Promise<CustomerTransformerMatching> {
  const { id, ...updates } = input;

  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .update({
      ...updates,
      updated_by: userId
    })
    .eq('id', id)
    .select(`
      *,
      customer:customers(*),
      substation:substations(*)
    `)
    .single();

  if (error) {
    console.error('Error updating mapping:', error);
    throw error;
  }

  return data;
}

/**
 * Delete (soft delete by setting active = false)
 */
export async function deleteCustomerTransformerMapping(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('customer_transformer_matching')
    .update({ active: false, updated_by: userId })
    .eq('id', id);

  if (error) {
    console.error('Error deleting mapping:', error);
    throw error;
  }
}

/**
 * Hard delete (permanently remove)
 */
export async function permanentlyDeleteMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_transformer_matching')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error permanently deleting mapping:', error);
    throw error;
  }
}

/**
 * Get mappings count by substation
 */
export async function getMappingStatistics() {
  const { data, error } = await supabase
    .from('customer_transformer_matching')
    .select('substation_id, circuit_id, active')
    .eq('active', true);

  if (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }

  const stats = {
    totalActive: data.length,
    bySubstation: {} as Record<string, number>,
    uniqueCircuits: new Set(data.map(d => d.circuit_id)).size
  };

  data.forEach(mapping => {
    stats.bySubstation[mapping.substation_id] = 
      (stats.bySubstation[mapping.substation_id] || 0) + 1;
  });

  return stats;
}
