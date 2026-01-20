import { supabase } from '../lib/supabase';

// Simplified demo scenarios that work with basic pq_events schema
const MOTHER_EVENT_SCENARIOS = [
  {
    title: 'Grid Switching Cascade Failure',
    description: 'Primary substation switching operation caused cascading voltage dips',
    motherEvent: {
      event_type: 'interruption',
      severity: 'critical',
      root_cause: 'Grid switching operation - Primary breaker malfunction',
      duration_ms: 245000,
      magnitude: 0,
    },
    childEvents: [
      {
        event_type: 'voltage_dip',
        severity: 'high', 
        root_cause: 'Downstream voltage dip from upstream switching',
        duration_ms: 850,
        magnitude: 72.3,
        delay_ms: 15000,
      },
      {
        event_type: 'voltage_dip',
        severity: 'high',
        root_cause: 'Secondary cascade effect from grid switching', 
        duration_ms: 1200,
        magnitude: 68.7,
        delay_ms: 35000,
      }
    ]
  },
  {
    title: 'Transformer Overload Event Group',
    description: 'Main transformer overload leading to multiple harmonic distortions',
    motherEvent: {
      event_type: 'voltage_swell',
      severity: 'high',
      root_cause: 'Transformer tap operation under high load conditions',
      duration_ms: 125000,
      magnitude: 112.8,
    },
    childEvents: [
      {
        event_type: 'harmonic',
        severity: 'medium',
        root_cause: 'Harmonic distortion from transformer saturation',
        duration_ms: 45000,
        magnitude: 8.7,
        delay_ms: 8000,
      }
    ]
  }
];

// Generate basic waveform data
function generateWaveformData(eventType: string, magnitude: number, duration: number) {
  const samples = Math.min(200, Math.max(50, Math.floor(duration / 50)));
  const voltage = [];
  const current = [];
  
  for (let i = 0; i < samples; i++) {
    const time = (i / samples) * (duration / 1000);
    let voltageValue = 230;
    let currentValue = 50;
    
    switch (eventType) {
      case 'voltage_dip':
        voltageValue = magnitude * 2.3 + Math.sin(i * 0.1) * 5 + Math.random() * 3;
        break;
      case 'voltage_swell':
        voltageValue = magnitude * 2.3 + Math.sin(i * 0.1) * 8 + Math.random() * 4;
        break;
      case 'interruption':
        voltageValue = Math.random() * 10;
        currentValue = Math.random() * 5;
        break;
      case 'harmonic':
        voltageValue = 230 + Math.sin(i * 0.314) * 20;
        voltageValue += Math.sin(i * 0.942) * (magnitude * 2);
        voltageValue += Math.random() * 5;
        break;
      default:
        voltageValue = 230 + Math.sin(i * 0.1) * 10 + Math.random() * 5;
    }
    
    voltage.push({ time: Math.round(time * 1000) / 1000, value: Math.round(voltageValue * 100) / 100 });
    current.push({ time: Math.round(time * 1000) / 1000, value: Math.round(currentValue * 100) / 100 });
  }
  
  return { voltage, current };
}

async function checkSchemaColumns() {
  // Check if the required columns exist
  const { error } = await supabase
    .from('pq_events')
    .select('is_child_event, grouped_at')
    .limit(1);
    
  return { hasColumns: !error, error };
}

export async function generateMotherEventDemoDataSimple(): Promise<{success: boolean, message: string, totalEvents?: number, needsSchema?: boolean}> {
  try {
    console.log('🚀 Generating Mother Event Demo Data (Simple Version)...');
    
    // Check if schema columns exist
    const schemaCheck = await checkSchemaColumns();
    if (!schemaCheck.hasColumns) {
      console.log('⚠️ Missing mother event schema columns');
      return {
        success: false,
        message: 'Database schema needs to be updated. Please run the schema fix script.',
        needsSchema: true
      };
    }
    
    // Get infrastructure data
    const { data: substations, error: substationsError } = await supabase
      .from('substations')
      .select('id, name, code, region')
      .eq('status', 'operational')
      .limit(8);
      
    if (substationsError || !substations || substations.length === 0) {
      return { success: false, message: 'No substations found. Please seed the database first.' };
    }

    const { data: meters } = await supabase
      .from('pq_meters') 
      .select('id, meter_id, substation_id, location')
      .eq('status', 'active');

    console.log(`Found ${substations.length} substations and ${meters?.length || 0} meters`);
    
    let totalEvents = 0;
    
    for (let scenarioIndex = 0; scenarioIndex < MOTHER_EVENT_SCENARIOS.length; scenarioIndex++) {
      const scenario = MOTHER_EVENT_SCENARIOS[scenarioIndex];
      console.log(`Creating scenario ${scenarioIndex + 1}: ${scenario.title}`);
      
      const primarySubstation = substations[Math.floor(Math.random() * substations.length)];
      const primaryMeter = meters?.find(m => m.substation_id === primarySubstation.id) || null;
      
      const baseTime = new Date();
      baseTime.setDate(baseTime.getDate() - Math.floor(Math.random() * 3));
      baseTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
      
      // Create mother event with schema columns
      const motherEventData = {
        ...scenario.motherEvent,
        substation_id: primarySubstation.id,
        meter_id: primaryMeter?.id || null,
        timestamp: baseTime.toISOString(),
        is_mother_event: true,
        parent_event_id: null,
        is_child_event: false,
        grouped_at: new Date().toISOString(),
        affected_phases: ['A', 'B', 'C'],
        status: ['new', 'acknowledged', 'investigating'][Math.floor(Math.random() * 3)],
        waveform_data: generateWaveformData(scenario.motherEvent.event_type, scenario.motherEvent.magnitude, scenario.motherEvent.duration_ms)
      };
      
      const { data: motherEvent, error: motherError } = await supabase
        .from('pq_events')
        .insert(motherEventData)
        .select('id')
        .single();
        
      if (motherError) {
        console.error('Error creating mother event:', motherError);
        continue;
      }
      
      console.log(`Mother event created: ${motherEvent.id}`);
      totalEvents++;
      
      // Create child events
      for (let childIndex = 0; childIndex < scenario.childEvents.length; childIndex++) {
        const childSpec = scenario.childEvents[childIndex];
        const childTime = new Date(baseTime.getTime() + childSpec.delay_ms);
        
        const childEventData = {
          event_type: childSpec.event_type,
          severity: childSpec.severity,
          root_cause: childSpec.root_cause,
          duration_ms: childSpec.duration_ms,
          magnitude: childSpec.magnitude,
          substation_id: primarySubstation.id,
          meter_id: primaryMeter?.id || null,
          timestamp: childTime.toISOString(),
          is_mother_event: false,
          parent_event_id: motherEvent.id,
          is_child_event: true,
          grouped_at: new Date().toISOString(),
          affected_phases: ['A', 'B', 'C'],
          status: ['new', 'acknowledged'][Math.floor(Math.random() * 2)],
          waveform_data: generateWaveformData(childSpec.event_type, childSpec.magnitude, childSpec.duration_ms)
        };
        
        const { data: childEvent, error: childError } = await supabase
          .from('pq_events')
          .insert(childEventData)
          .select('id')
          .single();
          
        if (childError) {
          console.error(`Error creating child event ${childIndex + 1}:`, childError);
        } else {
          console.log(`Child event ${childIndex + 1} created: ${childEvent.id}`);
          totalEvents++;
        }
      }
    }
    
    console.log(`Demo data generation complete! ${totalEvents} events created.`);
    
    return { 
      success: true, 
      message: `Successfully created ${MOTHER_EVENT_SCENARIOS.length} mother event scenarios with ${totalEvents} total events.`,
      totalEvents 
    };
    
  } catch (error) {
    console.error('Error generating demo data:', error);
    return { 
      success: false, 
      message: `Error generating demo data: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}