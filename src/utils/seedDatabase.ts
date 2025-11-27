import { supabase } from '../lib/supabase';

// Mock data generation utilities

interface Substation {
  id?: string;
  name: string;
  code: string;
  voltage_level: string;
  latitude: number;
  longitude: number;
  region: string;
  status: string;
}

interface PQMeter {
  id?: string;
  meter_id: string;
  substation_id: string;
  location: string;
  status: string;
  last_communication: string;
  firmware_version: string;
  installed_date: string;
}

interface Customer {
  id?: string;
  account_number: string;
  name: string;
  address: string;
  substation_id: string;
  transformer_id: string;
  contract_demand_kva: number;
  customer_type: string;
  critical_customer: boolean;
}

export const generateSubstations = (): Omit<Substation, 'id'>[] => {
  return [
    {
      name: 'Tai Po Grid Substation',
      code: 'TPGS',
      voltage_level: '400kV/132kV',
      latitude: 22.4469,
      longitude: 114.1657,
      region: 'New Territories East',
      status: 'operational'
    },
    {
      name: 'Castle Peak Power Station',
      code: 'CPPS',
      voltage_level: '400kV/132kV',
      latitude: 22.3667,
      longitude: 113.9500,
      region: 'New Territories West',
      status: 'operational'
    },
    {
      name: 'Shatin Substation',
      code: 'STS',
      voltage_level: '132kV/11kV',
      latitude: 22.3644,
      longitude: 114.1946,
      region: 'New Territories East',
      status: 'operational'
    },
    {
      name: 'Tsuen Wan Substation',
      code: 'TWS',
      voltage_level: '132kV/11kV',
      latitude: 22.3700,
      longitude: 114.1167,
      region: 'New Territories West',
      status: 'operational'
    },
    {
      name: 'Hong Kong Island West',
      code: 'HKIW',
      voltage_level: '132kV/11kV',
      latitude: 22.2783,
      longitude: 114.1747,
      region: 'Hong Kong Island',
      status: 'operational'
    },
    {
      name: 'Kowloon East Substation',
      code: 'KES',
      voltage_level: '132kV/11kV',
      latitude: 22.3193,
      longitude: 114.2245,
      region: 'Kowloon',
      status: 'operational'
    },
    {
      name: 'Yuen Long Substation',
      code: 'YLS',
      voltage_level: '132kV/11kV',
      latitude: 22.4450,
      longitude: 114.0256,
      region: 'New Territories West',
      status: 'maintenance'
    },
    {
      name: 'Tseung Kwan O Substation',
      code: 'TKOS',
      voltage_level: '132kV/11kV',
      latitude: 22.3167,
      longitude: 114.2667,
      region: 'New Territories East',
      status: 'operational'
    },
    {
      name: 'Aberdeen Substation',
      code: 'ABS',
      voltage_level: '132kV/11kV',
      latitude: 22.2478,
      longitude: 114.1581,
      region: 'Hong Kong Island',
      status: 'operational'
    },
    {
      name: 'Lantau Island Substation',
      code: 'LIS',
      voltage_level: '132kV/11kV',
      latitude: 22.2644,
      longitude: 113.9442,
      region: 'Outlying Islands',
      status: 'operational'
    }
  ];
};

export const generatePQMeters = (substations: Substation[]): Omit<PQMeter, 'id'>[] => {
  const meters: Omit<PQMeter, 'id'>[] = [];
  const statuses = ['active', 'abnormal', 'inactive'];
  const firmwareVersions = ['v2.1.3', 'v2.0.8', 'v1.9.5', 'v2.2.0'];

  substations.forEach((substation) => {
    // Generate 3-4 meters per substation
    const meterCount = Math.floor(Math.random() * 2) + 3;
    
    for (let i = 1; i <= meterCount; i++) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 30));
      
      meters.push({
        meter_id: `PQM-${substation.code}-${i.toString().padStart(2, '0')}`,
        substation_id: substation.id!,
        location: `Bay ${i}`,
        status: statuses[Math.floor(Math.random() * (i === 1 ? 2 : 3))], // First meter more likely to be active
        last_communication: new Date(baseDate.getTime() + Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        firmware_version: firmwareVersions[Math.floor(Math.random() * firmwareVersions.length)],
        installed_date: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString()
      });
    }
  });

  return meters;
};

export const generateCustomers = (substations: Substation[]): Omit<Customer, 'id'>[] => {
  const customers: Omit<Customer, 'id'>[] = [];
  const customerTypes = ['residential', 'commercial', 'industrial'];
  const names = [
    'Hong Kong International Airport', 'IFC Mall', 'Harbour City', 'Times Square',
    'MTR Corporation', 'Hong Kong Hospital Authority', 'City University',
    'Hong Kong University of Science & Technology', 'Ocean Park', 'Hong Kong Disneyland',
    'Cathay Pacific Airways', 'Hong Kong Electric Company', 'CLP Power',
    'Hong Kong Observatory', 'Legislative Council Complex', 'Central Government Complex',
    'Hong Kong Convention and Exhibition Centre', 'Star Ferry Terminal',
    'Tai Kwun Heritage and Arts', 'M+ Museum', 'Palace Museum',
    'Hong Kong Space Museum', 'Hong Kong Museum of Art', 'Hong Kong Cultural Centre'
  ];

  substations.forEach(substation => {
    // Generate 8-12 customers per substation
    const customerCount = Math.floor(Math.random() * 5) + 8;
    
    for (let i = 0; i < customerCount; i++) {
      const customerType = customerTypes[Math.floor(Math.random() * customerTypes.length)];
      const isCritical = customerType === 'industrial' || Math.random() < 0.2;
      
      customers.push({
        account_number: `ACC-${substation.code}-${(i + 1).toString().padStart(4, '0')}`,
        name: names[Math.floor(Math.random() * names.length)] + (i > 0 ? ` (${i + 1})` : ''),
        address: `${Math.floor(Math.random() * 200) + 1} Sample Street, ${substation.region}`,
        substation_id: substation.id!,
        transformer_id: `TX-${substation.code}-${Math.floor(Math.random() * 4) + 1}`,
        contract_demand_kva: customerType === 'industrial' ? 
          (Math.random() * 5000 + 1000) : 
          customerType === 'commercial' ? 
            (Math.random() * 500 + 100) : 
            (Math.random() * 50 + 20),
        customer_type: customerType,
        critical_customer: isCritical
      });
    }
  });

  return customers;
};

export const generatePQEvents = (substations: Substation[], meters: PQMeter[]): any[] => {
  const events: any[] = [];
  const eventTypes = ['voltage_dip', 'voltage_swell', 'harmonic', 'interruption', 'transient', 'flicker'];
  const severities = ['critical', 'high', 'medium', 'low'];
  const statuses = ['new', 'acknowledged', 'investigating', 'resolved'];
  const rootCauses = [
    'Grid switching operation', 'Equipment malfunction', 'Weather-related',
    'Transformer tap operation', 'Load variation', 'External system fault',
    'Maintenance activity', 'Power plant dispatch', 'Harmonic resonance'
  ];
  
  // For grouping logic
  const motherEventGroups: any[] = [];
  let eventIdCounter = 1;

  // Generate events for the past 6 months
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  for (let day = 0; day < 180; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    // Generate 1-8 events per day
    const dailyEvents = Math.floor(Math.random() * 8) + 1;
    
    // Occasionally create mother event groups (cascading events)
    const shouldCreateGroup = Math.random() < 0.15; // 15% chance
    
    if (shouldCreateGroup && dailyEvents >= 3) {
      // Create a mother event group (cascading failure)
      const groupTimestamp = new Date(currentDate);
      groupTimestamp.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
      
      const groupSubstation = substations[Math.floor(Math.random() * substations.length)];
      const groupCause = rootCauses[Math.floor(Math.random() * rootCauses.length)];
      
      // Mother event
      const motherId = `mother_${Date.now()}_${eventIdCounter}`;
      const motherEvent = createEvent(groupSubstation, meters, groupTimestamp, groupCause, true, null, eventIdCounter++, motherId);
      events.push(motherEvent);
      
      // Child events (2-4 related events within 5 minutes)
      const childCount = Math.floor(Math.random() * 3) + 2;
      for (let c = 0; c < childCount; c++) {
        const childTimestamp = new Date(groupTimestamp.getTime() + (c + 1) * 60000 + Math.random() * 180000); // 1-4 minutes later
        const childEvent = createEvent(groupSubstation, meters, childTimestamp, groupCause, false, motherId, eventIdCounter++);
        events.push(childEvent);
      }
    } else {
      // Regular standalone events
      for (let i = 0; i < dailyEvents; i++) {
        const eventDate = new Date(currentDate);
        eventDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
        
        const substation = substations[Math.floor(Math.random() * substations.length)];
        const cause = rootCauses[Math.floor(Math.random() * rootCauses.length)];
        
        events.push(createEvent(substation, meters, eventDate, cause, false, null, eventIdCounter++));
      }
    }
  }

  // Helper function to create individual events
  function createEvent(substation: any, meters: any[], timestamp: Date, rootCause: string, isMotherEvent: boolean, parentId: string | null, eventNumber: number, customId?: string) {
    const substationMeters = meters.filter(m => m.substation_id === substation.id);
    const meter = substationMeters.length > 0 ? substationMeters[Math.floor(Math.random() * substationMeters.length)] : null;
    
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      id: customId || `event_${Date.now()}_${eventNumber}`,
      event_type: eventType,
      substation_id: substation.id,
      meter_id: meter?.id || null,
      timestamp: timestamp.toISOString(),
      duration_ms: eventType === 'interruption' ? 
        Math.floor(Math.random() * 300000) + 1000 : // 1s to 5min for interruptions
        Math.floor(Math.random() * 5000) + 100,     // 100ms to 5s for others
      magnitude: eventType === 'voltage_dip' || eventType === 'voltage_swell' ? 
        (Math.random() * 30 + 70) : // 70-100% for voltage events
        eventType === 'harmonic' ?
          (Math.random() * 15 + 2) : // 2-17% THD for harmonics
          (Math.random() * 100 + 50), // Generic magnitude
      severity: severity,
      status: status,
      is_mother_event: isMotherEvent,
      parent_event_id: parentId,
      root_cause: rootCause,
      affected_phases: Math.random() < 0.7 ? ['A', 'B', 'C'] : 
        Math.random() < 0.5 ? ['A'] : 
        Math.random() < 0.5 ? ['B'] : ['C'],
      // Enhanced fields for advanced filtering
      idr_number: Math.random() < 0.3 ? `IDR-${new Date().getFullYear()}-${String(eventNumber).padStart(4, '0')}` : null,
      remaining_voltage: eventType === 'voltage_dip' ? Math.floor(Math.random() * 40) + 50 : null, // 50-90%
      circuit_id: `CKT-${substation.code}-${Math.floor(Math.random() * 10) + 1}`,
      voltage_level: substation.voltage_level,
      customer_count: Math.floor(Math.random() * 500) + 50, // 50-550 customers affected
      validated_by_adms: Math.random() < 0.8, // 80% validated
      is_false_positive: Math.random() < 0.05, // 5% false positives
      waveform_data: {
        voltage: Array.from({length: 200}, (_, i) => ({
          time: i * 0.1,
          value: 220 + Math.sin(i * 0.314) * 10 + Math.random() * 5
        })),
        current: Array.from({length: 200}, (_, i) => ({
          time: i * 0.1,
          value: 50 + Math.sin(i * 0.314) * 15 + Math.random() * 3
        }))
      },
      resolved_at: status === 'resolved' ? 
        new Date(timestamp.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : 
        null
    };
  }

  return events;
};

export const generateSARFIMetrics = (substations: Substation[]): any[] => {
  const metrics: any[] = [];
  const currentDate = new Date();
  
  substations.forEach(substation => {
    // Generate 12 months of SARFI data
    for (let month = 0; month < 12; month++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - month);
      
      metrics.push({
        substation_id: substation.id,
        period_year: date.getFullYear(),
        period_month: date.getMonth() + 1,
        sarfi_70: Math.random() * 10 + 5,   // 5-15 events
        sarfi_80: Math.random() * 8 + 3,    // 3-11 events
        sarfi_90: Math.random() * 6 + 2,    // 2-8 events
        total_events: Math.floor(Math.random() * 50) + 20 // 20-70 total events
      });
    }
  });

  return metrics;
};

export const generateSystemHealth = (): any[] => {
  const components = ['server', 'communication', 'integration', 'database'];
  const statuses = ['healthy', 'degraded', 'down'];
  const healthData: any[] = [];

  components.forEach(component => {
    // Generate last 48 hours of health data
    for (let hour = 0; hour < 48; hour++) {
      const checkTime = new Date();
      checkTime.setHours(checkTime.getHours() - hour);
      
      const status = statuses[Math.random() < 0.85 ? 0 : Math.random() < 0.9 ? 1 : 2];
      
      healthData.push({
        component: component,
        status: status,
        message: status === 'healthy' ? 'All systems operational' :
                status === 'degraded' ? 'Performance degraded' :
                'Service unavailable',
        metrics: {
          response_time: Math.random() * 1000 + 100,
          cpu_usage: Math.random() * 100,
          memory_usage: Math.random() * 100,
          disk_usage: Math.random() * 100
        },
        checked_at: checkTime.toISOString()
      });
    }
  });

  return healthData;
};

export const generateNotificationRules = () => {
  return [
    {
      name: 'Critical Events Alert',
      event_type: 'interruption',
      severity_threshold: 'critical',
      recipients: ['ops@clp.com', 'manager@clp.com'],
      include_waveform: true,
      typhoon_mode_enabled: false,
      active: true
    },
    {
      name: 'High Voltage Events',
      event_type: 'voltage_swell',
      severity_threshold: 'high',
      recipients: ['engineer@clp.com'],
      include_waveform: false,
      typhoon_mode_enabled: true,
      active: true
    },
    {
      name: 'Harmonic Distortion Alert',
      event_type: 'harmonic',
      severity_threshold: 'medium',
      recipients: ['quality@clp.com'],
      include_waveform: true,
      typhoon_mode_enabled: false,
      active: true
    }
  ];
};

// Main seeding function
export async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // 1. Insert substations
    console.log('Seeding substations...');
    const substationData = generateSubstations();
    const { data: substations, error: substationError } = await supabase
      .from('substations')
      .insert(substationData)
      .select();

    if (substationError) throw substationError;
    console.log(`✅ Inserted ${substations.length} substations`);

    // 2. Insert PQ meters
    console.log('Seeding PQ meters...');
    const meterData = generatePQMeters(substations);
    const { data: meters, error: meterError } = await supabase
      .from('pq_meters')
      .insert(meterData)
      .select();

    if (meterError) throw meterError;
    console.log(`✅ Inserted ${meters.length} PQ meters`);

    // 3. Insert customers
    console.log('Seeding customers...');
    const customerData = generateCustomers(substations);
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .insert(customerData)
      .select();

    if (customerError) throw customerError;
    console.log(`✅ Inserted ${customers.length} customers`);

    // 4. Insert PQ events
    console.log('Seeding PQ events...');
    const eventData = generatePQEvents(substations, meters);
    const { data: events, error: eventError } = await supabase
      .from('pq_events')
      .insert(eventData)
      .select();

    if (eventError) throw eventError;
    console.log(`✅ Inserted ${events.length} PQ events`);

    // 5. Insert SARFI metrics
    console.log('Seeding SARFI metrics...');
    const sarfiData = generateSARFIMetrics(substations);
    const { error: sarfiError } = await supabase
      .from('sarfi_metrics')
      .insert(sarfiData);

    if (sarfiError) throw sarfiError;
    console.log(`✅ Inserted ${sarfiData.length} SARFI metrics`);

    // 6. Insert system health data
    console.log('Seeding system health data...');
    const healthData = generateSystemHealth();
    const { error: healthError } = await supabase
      .from('system_health')
      .insert(healthData);

    if (healthError) throw healthError;
    console.log(`✅ Inserted ${healthData.length} health records`);

    // 7. Insert notification rules
    console.log('Seeding notification rules...');
    const rulesData = generateNotificationRules();
    const { error: rulesError } = await supabase
      .from('notification_rules')
      .insert(rulesData);

    if (rulesError) throw rulesError;
    console.log(`✅ Inserted ${rulesData.length} notification rules`);

    console.log('🎉 Database seeding completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return false;
  }
}

// Helper function to clear all data (for development)
export async function clearDatabase() {
  console.log('Clearing database...');
  
  const tables = [
    'notifications',
    'event_customer_impact',
    'pq_events',
    'pq_service_records',
    'reports',
    'notification_rules',
    'sarfi_metrics',
    'system_health',
    'customers',
    'pq_meters',
    'substations'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', 0);
    if (error) console.error(`Error clearing ${table}:`, error);
    else console.log(`✅ Cleared ${table}`);
  }

  console.log('🧹 Database cleared!');
}