/**
 * Mother Event Demo Data Generator
 * Creates realistic mother event scenarios with child events for demonstration
 */

// Use dynamic import for ES modules
async function loadSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient;
}

// Supabase configuration
const supabaseUrl = 'https://yqxifdbkuxlxhfzfsfra.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGlmZGJrdXhseGhmemZzZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1OTQ5NjgsImV4cCI6MjA0NjE3MDk2OH0.VEZFJnZLbLMJh2n4tixMZfP6q-k0yLm9Ef4yA5VD7Fs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Demo scenarios for mother events
const MOTHER_EVENT_SCENARIOS = [
  {
    title: 'Grid Switching Cascade Failure',
    description: 'Primary substation switching operation caused cascading voltage dips across multiple downstream stations',
    motherEvent: {
      event_type: 'interruption',
      severity: 'critical',
      root_cause: 'Grid switching operation - Primary breaker malfunction',
      duration_ms: 245000, // 4+ minutes
      magnitude: 0, // Complete interruption
    },
    childEvents: [
      {
        event_type: 'voltage_dip',
        severity: 'high',
        root_cause: 'Downstream voltage dip from upstream switching',
        duration_ms: 850,
        magnitude: 72.3,
        delay_ms: 15000, // 15 seconds later
      },
      {
        event_type: 'voltage_dip', 
        severity: 'high',
        root_cause: 'Secondary cascade effect from grid switching',
        duration_ms: 1200,
        magnitude: 68.7,
        delay_ms: 35000, // 35 seconds later
      },
      {
        event_type: 'voltage_dip',
        severity: 'medium',
        root_cause: 'Tertiary voltage disturbance',
        duration_ms: 650,
        magnitude: 81.2,
        delay_ms: 95000, // 1 minute 35 seconds later
      }
    ]
  },
  {
    title: 'Transformer Overload Event Group',
    description: 'Main transformer overload leading to multiple harmonic distortions and voltage irregularities',
    motherEvent: {
      event_type: 'voltage_swell',
      severity: 'high',
      root_cause: 'Transformer tap operation under high load conditions',
      duration_ms: 125000, // 2+ minutes
      magnitude: 112.8,
    },
    childEvents: [
      {
        event_type: 'harmonic',
        severity: 'medium', 
        root_cause: 'Harmonic distortion from transformer saturation',
        duration_ms: 45000,
        magnitude: 8.7, // 8.7% THD
        delay_ms: 8000, // 8 seconds later
      },
      {
        event_type: 'harmonic',
        severity: 'medium',
        root_cause: 'Secondary harmonic resonance effect',
        duration_ms: 38000,
        magnitude: 6.3, // 6.3% THD  
        delay_ms: 62000, // 1 minute 2 seconds later
      },
      {
        event_type: 'flicker',
        severity: 'low',
        root_cause: 'Voltage flicker from transformer instability',
        duration_ms: 28000,
        magnitude: 2.1,
        delay_ms: 145000, // 2 minutes 25 seconds later
      }
    ]
  },
  {
    title: 'Weather-Related Multi-Station Impact',
    description: 'Severe weather caused multiple faults across the regional grid network',
    motherEvent: {
      event_type: 'interruption',
      severity: 'critical',
      root_cause: 'Weather-related - Lightning strike on main transmission line',
      duration_ms: 1850000, // 30+ minutes
      magnitude: 0,
    },
    childEvents: [
      {
        event_type: 'transient',
        severity: 'high',
        root_cause: 'Lightning-induced transient overvoltage',
        duration_ms: 12,
        magnitude: 185.3,
        delay_ms: 2500, // 2.5 seconds later
      },
      {
        event_type: 'voltage_dip',
        severity: 'high', 
        root_cause: 'System recovery voltage dip after lightning',
        duration_ms: 3400,
        magnitude: 63.1,
        delay_ms: 45000, // 45 seconds later
      },
      {
        event_type: 'interruption',
        severity: 'medium',
        root_cause: 'Secondary protection trip from weather damage',
        duration_ms: 125000,
        magnitude: 0,
        delay_ms: 280000, // 4 minutes 40 seconds later
      },
      {
        event_type: 'voltage_swell',
        severity: 'medium',
        root_cause: 'Load redistribution after weather outage',
        duration_ms: 8500,
        magnitude: 108.4,
        delay_ms: 920000, // 15 minutes 20 seconds later
      }
    ]
  },
  {
    title: 'Industrial Load Harmonic Propagation',
    description: 'Large industrial customer switching caused harmonic propagation through local network',
    motherEvent: {
      event_type: 'harmonic',
      severity: 'high',
      root_cause: 'Industrial customer - Large VFD startup harmonic injection',
      duration_ms: 85000,
      magnitude: 12.4, // 12.4% THD
    },
    childEvents: [
      {
        event_type: 'harmonic',
        severity: 'medium',
        root_cause: 'Harmonic amplification in adjacent feeder',
        duration_ms: 32000,
        magnitude: 7.8,
        delay_ms: 12000, // 12 seconds later
      },
      {
        event_type: 'flicker',
        severity: 'medium',
        root_cause: 'Voltage flicker from harmonic interactions',
        duration_ms: 25000,
        magnitude: 3.2,
        delay_ms: 28000, // 28 seconds later
      },
      {
        event_type: 'voltage_dip',
        severity: 'low',
        root_cause: 'Voltage regulation response to harmonic load',
        duration_ms: 1800,
        magnitude: 88.7,
        delay_ms: 55000, // 55 seconds later
      }
    ]
  }
];

// Generate realistic waveform data based on event type
function generateWaveformData(eventType, magnitude, duration) {
  const samples = Math.min(1000, Math.max(100, Math.floor(duration / 10))); // Adaptive sample count
  const voltage = [];
  const current = [];
  
  for (let i = 0; i < samples; i++) {
    const time = (i / samples) * (duration / 1000); // Time in seconds
    
    let voltageValue = 230; // Base voltage
    let currentValue = 50;  // Base current
    
    switch (eventType) {
      case 'voltage_dip':
        voltageValue = magnitude * 2.3 + Math.sin(i * 0.1) * 5 + Math.random() * 3;
        currentValue = 50 + Math.sin(i * 0.1) * 10 + Math.random() * 2;
        break;
      case 'voltage_swell': 
        voltageValue = magnitude * 2.3 + Math.sin(i * 0.1) * 8 + Math.random() * 4;
        currentValue = 50 + Math.sin(i * 0.1) * 15 + Math.random() * 3;
        break;
      case 'interruption':
        voltageValue = Math.random() * 10; // Near zero with noise
        currentValue = Math.random() * 5;
        break;
      case 'harmonic':
        // Add harmonic distortion
        voltageValue = 230 + Math.sin(i * 0.314) * 20;
        voltageValue += Math.sin(i * 0.942) * (magnitude * 2); // 3rd harmonic
        voltageValue += Math.sin(i * 1.57) * (magnitude * 1.5); // 5th harmonic  
        voltageValue += Math.random() * 5;
        currentValue = 50 + Math.sin(i * 0.314) * 15 + Math.random() * 3;
        break;
      case 'transient':
        if (i < samples * 0.1) { // Transient spike
          voltageValue = magnitude * 2.3 + Math.sin(i * 2) * 50;
        } else {
          voltageValue = 230 + Math.sin(i * 0.1) * 10 + Math.random() * 5;
        }
        currentValue = 50 + Math.sin(i * 0.1) * 12 + Math.random() * 4;
        break;
      case 'flicker':
        voltageValue = 230 + Math.sin(i * 0.05) * magnitude * 5 + Math.random() * 3;
        currentValue = 50 + Math.sin(i * 0.05) * 8 + Math.random() * 2;
        break;
      default:
        voltageValue = 230 + Math.sin(i * 0.1) * 10 + Math.random() * 5;
        currentValue = 50 + Math.sin(i * 0.1) * 12 + Math.random() * 3;
    }
    
    voltage.push({ time: time, value: Math.round(voltageValue * 100) / 100 });
    current.push({ time: time, value: Math.round(currentValue * 100) / 100 });
  }
  
  return { voltage, current };
}

async function getSubstationsAndMeters(supabase) {
  const { data: substations, error: substationsError } = await supabase
    .from('substations')
    .select('id, name, code, region')
    .eq('status', 'operational')
    .limit(8);
    
  if (substationsError) {
    console.error('Error fetching substations:', substationsError);
    return { substations: [], meters: [] };
  }

  const { data: meters, error: metersError } = await supabase
    .from('pq_meters')
    .select('id, meter_id, substation_id, location')
    .eq('status', 'active');
    
  if (metersError) {
    console.error('Error fetching meters:', metersError);
    return { substations, meters: [] };
  }

  return { substations, meters };
}

async function createMotherEventScenario(scenario, substations, meters, supabase) {
  console.log(`\n🎯 Creating scenario: ${scenario.title}`);
  console.log(`   ${scenario.description}`);
  
  // Select random substation for this scenario
  const primarySubstation = substations[Math.floor(Math.random() * substations.length)];
  const primaryMeter = meters.find(m => m.substation_id === primarySubstation.id) || null;
  
  // Create base timestamp (recent, within last 7 days)
  const baseTime = new Date();
  baseTime.setDate(baseTime.getDate() - Math.floor(Math.random() * 7));
  baseTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
  
  // Create mother event
  const motherEventData = {
    ...scenario.motherEvent,
    substation_id: primarySubstation.id,
    meter_id: primaryMeter?.id || null,
    timestamp: baseTime.toISOString(),
    is_mother_event: true,
    parent_event_id: null,
    is_child_event: false,
    grouping_type: 'automatic',
    grouped_at: new Date().toISOString(),
    affected_phases: ['A', 'B', 'C'],
    status: Math.random() < 0.3 ? 'resolved' : (Math.random() < 0.5 ? 'investigating' : 'acknowledged'),
    waveform_data: generateWaveformData(scenario.motherEvent.event_type, scenario.motherEvent.magnitude, scenario.motherEvent.duration_ms)
  };
  
  const { data: motherEvent, error: motherError } = await supabase
    .from('pq_events')
    .insert(motherEventData)
    .select('id')
    .single();
    
  if (motherError) {
    console.error('   ❌ Error creating mother event:', motherError);
    return null;
  }
  
  console.log(`   ✅ Mother event created: ${motherEvent.id}`);
  console.log(`      Type: ${motherEventData.event_type}, Severity: ${motherEventData.severity}`);
  console.log(`      Location: ${primarySubstation.name} (${primarySubstation.code})`);
  
  // Create child events
  const childEventIds = [];
  for (let i = 0; i < scenario.childEvents.length; i++) {
    const childSpec = scenario.childEvents[i];
    
    // Select substation for child event (80% same substation, 20% nearby)
    let childSubstation = primarySubstation;
    if (Math.random() < 0.2 && substations.length > 1) {
      // Select different substation from same region if possible
      const sameRegionStations = substations.filter(s => 
        s.region === primarySubstation.region && s.id !== primarySubstation.id
      );
      if (sameRegionStations.length > 0) {
        childSubstation = sameRegionStations[Math.floor(Math.random() * sameRegionStations.length)];
      }
    }
    
    const childMeter = meters.find(m => m.substation_id === childSubstation.id) || null;
    const childTime = new Date(baseTime.getTime() + childSpec.delay_ms);
    
    const childEventData = {
      ...childSpec,
      substation_id: childSubstation.id,
      meter_id: childMeter?.id || null,
      timestamp: childTime.toISOString(),
      is_mother_event: false,
      parent_event_id: motherEvent.id,
      is_child_event: true,
      grouping_type: 'automatic',
      grouped_at: new Date().toISOString(),
      affected_phases: Math.random() < 0.7 ? ['A', 'B', 'C'] : 
        (Math.random() < 0.5 ? ['A', 'B'] : ['A']),
      status: Math.random() < 0.4 ? 'resolved' : (Math.random() < 0.4 ? 'investigating' : 'new'),
      waveform_data: generateWaveformData(childSpec.event_type, childSpec.magnitude, childSpec.duration_ms)
    };
    
    // Remove delay_ms before inserting
    delete childEventData.delay_ms;
    
    const { data: childEvent, error: childError } = await supabase
      .from('pq_events')
      .insert(childEventData)
      .select('id')
      .single();
      
    if (childError) {
      console.error(`   ❌ Error creating child event ${i + 1}:`, childError);
    } else {
      childEventIds.push(childEvent.id);
      console.log(`   ✅ Child event ${i + 1} created: ${childEvent.id}`);
      console.log(`      Type: ${childEventData.event_type}, Severity: ${childEventData.severity}`);
      console.log(`      Location: ${childSubstation.name} (${childSubstation.code})`);
      console.log(`      Delay: +${Math.round(childSpec.delay_ms / 1000)}s`);
    }
  }
  
  console.log(`   📊 Scenario complete: 1 mother + ${childEventIds.length} child events`);
  return { motherId: motherEvent.id, childIds: childEventIds };
}

async function createCustomerImpacts(eventIds, substations, supabase) {
  console.log('\n👥 Creating customer impact records...');
  
  // Get some customers for impact simulation
  const { data: customers, error: customersError } = await supabase
    .from('customers')
    .select('id, name, substation_id, critical_customer')
    .limit(50);
    
  if (customersError || !customers || customers.length === 0) {
    console.log('   ⚠️  No customers found for impact simulation');
    return;
  }
  
  const impactRecords = [];
  
  for (const eventId of eventIds) {
    // Get event details to determine impact scope
    const { data: event } = await supabase
      .from('pq_events')
      .select('substation_id, severity, duration_ms, event_type')
      .eq('id', eventId)
      .single();
      
    if (!event) continue;
    
    // Find customers at the same substation
    const affectedCustomers = customers.filter(c => c.substation_id === event.substation_id);
    
    // Determine how many customers are impacted based on severity
    let impactPercentage = 0.1; // Default 10%
    switch (event.severity) {
      case 'critical': impactPercentage = 0.8; break;
      case 'high': impactPercentage = 0.4; break; 
      case 'medium': impactPercentage = 0.2; break;
      case 'low': impactPercentage = 0.05; break;
    }
    
    const impactCount = Math.floor(affectedCustomers.length * impactPercentage);
    const selectedCustomers = affectedCustomers
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, impactCount);
      
    for (const customer of selectedCustomers) {
      const impactLevel = event.severity === 'critical' ? 'major' :
        (event.severity === 'high' ? 'moderate' : 'minor');
        
      const estimatedDowntime = event.event_type === 'interruption' ? 
        Math.floor(event.duration_ms / 60000) : // Convert to minutes
        Math.floor(Math.random() * 5); // Other events: 0-5 minutes
        
      impactRecords.push({
        event_id: eventId,
        customer_id: customer.id,
        impact_level: impactLevel,
        estimated_downtime_min: estimatedDowntime
      });
    }
  }
  
  if (impactRecords.length > 0) {
    const { error: impactError } = await supabase
      .from('event_customer_impact')
      .insert(impactRecords);
      
    if (impactError) {
      console.error('   ❌ Error creating customer impacts:', impactError);
    } else {
      console.log(`   ✅ Created ${impactRecords.length} customer impact records`);
    }
  } else {
    console.log('   ⚠️  No customer impacts created');
  }
}

async function main() {
  console.log('🚀 PQMAP Mother Event Demo Data Generator');
  console.log('==========================================');
  
  try {
    // Load Supabase client dynamically
    const createClient = await loadSupabase();
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // Get infrastructure data
    console.log('\n📡 Fetching infrastructure data...');
    const { substations, meters } = await getSubstationsAndMeters(supabase);
    
    if (substations.length === 0) {
      console.error('❌ No substations found. Please run the main database seeding first.');
      return;
    }
    
    console.log(`   ✅ Found ${substations.length} substations and ${meters.length} meters`);
    
    // Create mother event scenarios
    const allEventIds = [];
    
    for (const scenario of MOTHER_EVENT_SCENARIOS) {
      const result = await createMotherEventScenario(scenario, substations, meters, supabase);
      if (result) {
        allEventIds.push(result.motherId, ...result.childIds);
      }
      
      // Add a small delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\n📈 Demo data summary:`);
    console.log(`   • ${MOTHER_EVENT_SCENARIOS.length} mother event scenarios created`);
    console.log(`   • ${allEventIds.length} total events generated`);
    console.log(`   • Events distributed across ${substations.length} substations`);
    
    // Create customer impact records
    await createCustomerImpacts(allEventIds, substations, supabase);
    
    console.log('\n✨ Mother event demo data generation complete!');
    console.log('\n🎯 Demo scenarios available:');
    MOTHER_EVENT_SCENARIOS.forEach((scenario, index) => {
      console.log(`   ${index + 1}. ${scenario.title}`);
      console.log(`      ${scenario.description}`);
    });
    
    console.log('\n📋 Test the demo:');
    console.log('   1. Open the PQMAP application');
    console.log('   2. Navigate to Event Management');
    console.log('   3. Look for events marked as "Mother Event"');
    console.log('   4. Click on a mother event to view details');
    console.log('   5. Use the "Child Events" tab to navigate to related events');
    console.log('   6. Test the back navigation between mother and child events');
    
  } catch (error) {
    console.error('❌ Error generating demo data:', error);
    process.exit(1);
  }
}

// Run the demo data generator
main();