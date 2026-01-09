import { supabase } from '../lib/supabase';
import type { PQMeter } from '../types/database';

export interface MeterHierarchyFilters {
  searchTerm?: string;
  areas?: string[];
  regions?: string[];
  voltageLevels?: string[];
  active?: boolean | null;
}

export interface CreateMeterInput {
  meter_id: string;
  site_id?: string;
  voltage_level: string;
  substation_id: string;
  circuit_id?: string;
  location: string;
  region?: string;
  oc?: string;
  brand?: string;
  model?: string;
  nominal_voltage?: number;
  ct_type?: string;
  asset_number?: string;
  serial_number?: string;
  ip_address?: string;
  firmware_version?: string;
  framework_version?: string;
  status: 'active' | 'abnormal' | 'inactive';
  enable: boolean;
  last_communication?: string;
  installed_date?: string;
  area: string;
  ss400?: string;
  ss132?: string;
  ss011?: string;
  ss_misc?: string;
  load_type?: string;
}

export interface UpdateMeterInput extends Partial<CreateMeterInput> {
  id: string;
}

/**
 * Validation rules for transformer codes based on voltage level
 */
export function validateTransformerCodes(
  voltageLevel: string,
  ss400?: string | null,
  ss132?: string | null,
  ss011?: string | null
): { valid: boolean; message?: string } {
  const level = voltageLevel?.toLowerCase();

  // SS400: only for 400kV
  if (ss400 && level !== '400kv') {
    return {
      valid: false,
      message: 'SS400 code can only be set for 400kV meters'
    };
  }

  // SS132: only for 132kV & 11kV
  if (ss132 && !['132kv', '11kv'].includes(level)) {
    return {
      valid: false,
      message: 'SS132 code can only be set for 132kV and 11kV meters'
    };
  }

  // SS011: only for 11kV & 380V
  if (ss011 && !['11kv', '380v'].includes(level)) {
    return {
      valid: false,
      message: 'SS011 code can only be set for 11kV and 380V meters'
    };
  }

  // Hierarchical validation
  // SS011 must have parent SS132
  if (ss011 && !ss132) {
    return {
      valid: false,
      message: 'SS011 requires a parent SS132 code'
    };
  }

  // SS132 must have parent SS400 (if 132kV)
  if (ss132 && level === '132kv' && !ss400) {
    return {
      valid: false,
      message: 'SS132 at 132kV requires a parent SS400 code'
    };
  }

  return { valid: true };
}

/**
 * Prevent circular references in transformer codes
 */
export function validateNoCircularReference(
  ss400?: string | null,
  ss132?: string | null,
  ss011?: string | null
): { valid: boolean; message?: string } {
  const codes = [ss400, ss132, ss011].filter(Boolean);
  const uniqueCodes = new Set(codes);

  if (codes.length !== uniqueCodes.size) {
    return {
      valid: false,
      message: 'Circular reference detected: transformer codes must be unique'
    };
  }

  return { valid: true };
}

/**
 * Auto-populate area and transformer codes from meter name
 * Example: PQMS_11KV.APA0042_H3 → area: APA, ss132: APA132, ss011: APA011
 */
export function autoPopulateFromMeterName(
  meterName: string,
  voltageLevel: string
): { area?: string; ss400?: string; ss132?: string; ss011?: string } {
  // Extract area code from meter name (e.g., "APA" from "PQMS_11KV.APA0042_H3")
  const areaMatch = meterName.match(/[A-Z]{3}(?=\d)/);
  if (!areaMatch) return {};

  const area = areaMatch[0];
  const level = voltageLevel?.toLowerCase();
  const result: { area?: string; ss400?: string; ss132?: string; ss011?: string } = { area };

  // Auto-populate based on voltage level
  switch (level) {
    case '400kv':
      result.ss400 = `${area}400`;
      break;
    case '132kv':
      result.ss400 = `${area}400`;
      result.ss132 = `${area}132`;
      break;
    case '11kv':
      result.ss132 = `${area}132`;
      result.ss011 = `${area}011`;
      break;
    case '380v':
      result.ss011 = `${area}011`;
      break;
  }

  return result;
}

/**
 * Fetch meters with optional filters
 */
export async function fetchMeters(filters?: MeterHierarchyFilters): Promise<PQMeter[]> {
  let query = supabase
    .from('pq_meters')
    .select('*, substation:substations(*)');

  // Apply search filter (meter_id or site_id)
  if (filters?.searchTerm) {
    query = query.or(`meter_id.ilike.%${filters.searchTerm}%,site_id.ilike.%${filters.searchTerm}%,area.ilike.%${filters.searchTerm}%`);
  }

  // Apply area filter
  if (filters?.areas && filters.areas.length > 0) {
    query = query.in('area', filters.areas);
  }

  // Apply region filter
  if (filters?.regions && filters.regions.length > 0) {
    query = query.in('region', filters.regions);
  }

  // Apply voltage level filter
  if (filters?.voltageLevels && filters.voltageLevels.length > 0) {
    query = query.in('voltage_level', filters.voltageLevels);
  }

  // Apply active status filter
  if (filters?.active !== undefined && filters?.active !== null) {
    query = query.eq('active', filters.active);
  }

  query = query.order('meter_id', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching meters:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get unique areas from meters
 */
export async function getAreas(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pq_meters')
    .select('area')
    .order('area');

  if (error) {
    console.error('Error fetching areas:', error);
    throw error;
  }

  const uniqueAreas = Array.from(new Set(data?.map(m => m.area).filter(Boolean)));
  return uniqueAreas as string[];
}

/**
 * Get unique regions from meters
 */
export async function getRegions(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pq_meters')
    .select('region')
    .order('region');

  if (error) {
    console.error('Error fetching regions:', error);
    throw error;
  }

  const uniqueRegions = Array.from(new Set(data?.map(m => m.region).filter(Boolean)));
  return uniqueRegions as string[];
}

/**
 * Get unique voltage levels from meters
 */
export async function getVoltageLevels(): Promise<string[]> {
  const { data, error } = await supabase
    .from('pq_meters')
    .select('voltage_level')
    .order('voltage_level');

  if (error) {
    console.error('Error fetching voltage levels:', error);
    throw error;
  }

  const uniqueLevels = Array.from(new Set(data?.map(m => m.voltage_level).filter(Boolean)));
  return uniqueLevels as string[];
}

/**
 * Create a new meter
 */
export async function createMeter(input: CreateMeterInput): Promise<PQMeter> {
  // Validate transformer codes
  const validation = validateTransformerCodes(
    input.voltage_level,
    input.ss400,
    input.ss132,
    input.ss011
  );

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  // Check circular references
  const circularCheck = validateNoCircularReference(
    input.ss400,
    input.ss132,
    input.ss011
  );

  if (!circularCheck.valid) {
    throw new Error(circularCheck.message);
  }

  // Check for duplicate meter_id
  const { data: existing } = await supabase
    .from('pq_meters')
    .select('id')
    .eq('meter_id', input.meter_id)
    .single();

  if (existing) {
    throw new Error(`Meter with ID "${input.meter_id}" already exists`);
  }

  const { data, error } = await supabase
    .from('pq_meters')
    .insert([{
      ...input,
      created_at: new Date().toISOString()
    }])
    .select('*, substation:substations(*)')
    .single();

  if (error) {
    console.error('Error creating meter:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing meter
 */
export async function updateMeter(input: UpdateMeterInput): Promise<PQMeter> {
  const { id, ...updates } = input;

  // Validate transformer codes if voltage_level is being updated
  if (updates.voltage_level) {
    const validation = validateTransformerCodes(
      updates.voltage_level,
      updates.ss400,
      updates.ss132,
      updates.ss011
    );

    if (!validation.valid) {
      throw new Error(validation.message);
    }

    // Check circular references
    const circularCheck = validateNoCircularReference(
      updates.ss400,
      updates.ss132,
      updates.ss011
    );

    if (!circularCheck.valid) {
      throw new Error(circularCheck.message);
    }
  }

  const { data, error } = await supabase
    .from('pq_meters')
    .update(updates)
    .eq('id', id)
    .select('*, substation:substations(*)')
    .single();

  if (error) {
    console.error('Error updating meter:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a meter (hard delete)
 */
export async function deleteMeter(meterId: string): Promise<void> {
  const { error } = await supabase
    .from('pq_meters')
    .delete()
    .eq('id', meterId);

  if (error) {
    console.error('Error deleting meter:', error);
    throw error;
  }
}

/**
 * Toggle meter enable status
 */
export async function toggleMeterEnable(meterId: string, enable: boolean) {
  const { data, error } = await supabase
    .from('pq_meters')
    .update({ enable })
    .eq('id', meterId)
    .select('*, substation:substations(*)')
    .single();

  if (error) {
    console.error('Error toggling meter enable status:', error);
    throw error;
  }

  return data;
}

/**
 * Get meter statistics
 */
export async function getMeterStatistics() {
  const { data, error } = await supabase
    .from('pq_meters')
    .select('enable, status');

  if (error) {
    console.error('Error fetching meter statistics:', error);
    throw error;
  }

  // Filter out disabled meters (enable=false) from all statistics
  const enabledMeters = data?.filter(m => m.enable !== false) || [];
  
  const total = enabledMeters.length;
  const activeCount = enabledMeters.filter(m => m.status === 'active').length;
  const inactiveCount = enabledMeters.filter(m => m.status === 'inactive').length;
  const abnormalCount = enabledMeters.filter(m => m.status === 'abnormal').length;

  return {
    total,
    active: activeCount,
    inactive: inactiveCount,
    abnormal: abnormalCount
  };
}

/**
 * Build hierarchical tree structure from meters
 */
export interface MeterTreeNode {
  id: string;
  meter: PQMeter;
  children: MeterTreeNode[];
  level: 'ss400' | 'ss132' | 'ss011' | 'ss_misc' | 'root';
  hasIncompleteHierarchy: boolean; // Warning flag for missing transformer codes
}

/**
 * Check if meter has complete hierarchy based on voltage level
 */
export function checkMeterHierarchy(meter: PQMeter): { 
  isComplete: boolean; 
  message?: string;
  expectedCodes: { ss400?: boolean; ss132?: boolean; ss011?: boolean };
} {
  const level = meter.voltage_level?.toLowerCase();
  
  switch (level) {
    case '400kv':
      return {
        isComplete: !!(meter.ss400 && !meter.ss132 && !meter.ss011),
        message: meter.ss400 ? undefined : 'Missing SS400 code',
        expectedCodes: { ss400: true, ss132: false, ss011: false }
      };
    case '132kv':
      return {
        isComplete: !!(!meter.ss400 && meter.ss132 && !meter.ss011),
        message: !meter.ss132 ? 'Missing SS132 code' : undefined,
        expectedCodes: { ss400: false, ss132: true, ss011: false }
      };
    case '11kv':
      return {
        isComplete: !!(!meter.ss400 && meter.ss132 && meter.ss011),
        message: !meter.ss132 ? 'Missing SS132 code' : !meter.ss011 ? 'Missing SS011 code' : undefined,
        expectedCodes: { ss400: false, ss132: true, ss011: true }
      };
    case '380v':
      return {
        isComplete: !!(!meter.ss400 && !meter.ss132 && meter.ss011),
        message: meter.ss011 ? undefined : 'Missing SS011 code',
        expectedCodes: { ss400: false, ss132: false, ss011: true }
      };
    default:
      return {
        isComplete: false,
        message: 'Unknown voltage level',
        expectedCodes: {}
      };
  }
}

export function buildMeterHierarchyTree(meters: PQMeter[]): MeterTreeNode[] {
  // Group meters by transformer codes
  const ss400Meters: PQMeter[] = []; // 400kV standalone meters
  const ss132Map = new Map<string, PQMeter[]>(); // 132kV root meters grouped by SS132
  const ss011Map = new Map<string, PQMeter[]>(); // 11kV and 380V meters grouped by SS011
  const orphanMeters: PQMeter[] = []; // Meters with incomplete hierarchy

  meters.forEach(meter => {
    const hierarchyCheck = checkMeterHierarchy(meter);
    
    // If hierarchy is incomplete, mark as orphan
    if (!hierarchyCheck.isComplete) {
      orphanMeters.push(meter);
      return;
    }

    // 400kV meters are standalone (ss400 only)
    if (meter.ss400 && !meter.ss132 && !meter.ss011) {
      ss400Meters.push(meter);
    }
    // 132kV meters are root of SS132 groups (ss132 only)
    else if (meter.ss132 && !meter.ss400 && !meter.ss011) {
      const meters = ss132Map.get(meter.ss132) || [];
      meters.push(meter);
      ss132Map.set(meter.ss132, meters);
    }
    // 11kV meters have both ss132 and ss011
    else if (meter.ss132 && meter.ss011 && !meter.ss400) {
      const meters = ss011Map.get(meter.ss011) || [];
      meters.push(meter);
      ss011Map.set(meter.ss011, meters);
    }
    // 380V meters have only ss011
    else if (meter.ss011 && !meter.ss132 && !meter.ss400) {
      const meters = ss011Map.get(meter.ss011) || [];
      meters.push(meter);
      ss011Map.set(meter.ss011, meters);
    }
  });

  // Build tree nodes with proper parent-child relationships
  const buildNode = (meter: PQMeter, level: MeterTreeNode['level'], isOrphan: boolean = false): MeterTreeNode => {
    const hierarchyCheck = checkMeterHierarchy(meter);
    
    const node: MeterTreeNode = {
      id: meter.id,
      meter,
      children: [],
      level,
      hasIncompleteHierarchy: !hierarchyCheck.isComplete || isOrphan
    };

    // Find children based on transformer codes and voltage hierarchy
    if (meter.ss132 && level === 'ss132' && !meter.ss400 && !meter.ss011) {
      // 132kV root: Find 11kV children with matching SS132
      meters.forEach(m => {
        if (m.ss132 === meter.ss132 && m.ss011 && !m.ss400 && m.id !== meter.id) {
          node.children.push(buildNode(m, 'ss011'));
        }
      });
    } else if (meter.ss011 && meter.ss132 && level === 'ss011') {
      // 11kV: Find 380V children with matching SS011
      meters.forEach(m => {
        if (m.ss011 === meter.ss011 && !m.ss132 && !m.ss400 && m.id !== meter.id) {
          node.children.push(buildNode(m, 'ss011'));
        }
      });
    }

    return node;
  };

  // Build trees: 400kV standalone + SS132 groups
  const trees: MeterTreeNode[] = [];
  
  // Add 400kV standalone meters
  ss400Meters.forEach(meter => {
    trees.push(buildNode(meter, 'ss400'));
  });
  
  // Add SS132 groups (132kV as root with 11kV and 380V children)
  ss132Map.forEach((groupMeters, ss132Code) => {
    groupMeters.forEach(meter => {
      trees.push(buildNode(meter, 'ss132'));
    });
  });

  // Add orphan meters to a separate section at the end with warning flag
  if (orphanMeters.length > 0) {
    const orphanSection: MeterTreeNode = {
      id: 'orphans',
      meter: {
        id: 'orphans',
        meter_id: '⚠️ Incomplete Hierarchy',
        voltage_level: '',
        location: `${orphanMeters.length} meters need transformer codes`,
        substation_id: '',
        status: 'active',
        enable: true,
        created_at: new Date().toISOString()
      } as PQMeter,
      children: orphanMeters.map(m => buildNode(m, 'root', true)),
      level: 'root',
      hasIncompleteHierarchy: true
    };
    trees.push(orphanSection);
  }

  return trees;
}
