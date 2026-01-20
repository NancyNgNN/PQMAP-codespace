// Quick Mother Event Demo Data Generator - Console Script
// Copy and paste this into the browser console while on the PQMAP application

(async function generateMotherEventDemoData() {
  console.log('🚀 PQMAP Mother Event Demo Data Generator');
  console.log('==========================================');
  
  // Try to get Supabase client from various possible sources
  let supabase = null;
  
  // Method 1: Check if it's available on window
  if (typeof window !== 'undefined' && window.supabase) {
    supabase = window.supabase;
    console.log('✅ Found Supabase on window object');
  }
  // Method 2: Try to access from React DevTools or app globals
  else if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    console.log('🔍 Trying to find Supabase from React app...');
    // This will require manual setup - see instructions below
  }
  // Method 3: Create our own client (requires environment variables)
  else {
    console.log('🔧 Creating Supabase client...');
    
    // Try to import Supabase dynamically
    try {
      const { createClient } = await import('https://cdn.skypack.dev/@supabase/supabase-js');
      
      // Use your actual Supabase credentials here
      const supabaseUrl = 'https://yqxifdbkuxlxhfzfsfra.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeGlmZGJrdXhseGhmemZzZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1OTQ5NjgsImV4cCI6MjA0NjE3MDk2OH0.VEZFJnZLbLMJh2n4tixMZfP6q-k0yLm9Ef4yA5VD7Fs';
      
      supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ Created Supabase client from CDN');
    } catch (error) {
      console.error('❌ Could not create Supabase client:', error);
    }
  }
  
  if (!supabase) {
    console.error('❌ Could not access Supabase client.');
    console.log('📝 Manual setup instructions:');
    console.log('1. First run this command to make Supabase available globally:');
    console.log('   window.supabase = (await import("../src/lib/supabase.ts")).supabase');
    console.log('2. Then run this script again');
    console.log('');
    console.log('Alternative: Run this from the React app component console');
    return;
  }
  
  // Demo scenarios for mother events
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
        },
        {
          event_type: 'voltage_dip',
          severity: 'medium',
          root_cause: 'Tertiary voltage disturbance',
          duration_ms: 650,
          magnitude: 81.2,
          delay_ms: 95000,
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
        },
        {
          event_type: 'flicker',
          severity: 'low',
          root_cause: 'Voltage flicker from transformer instability',
          duration_ms: 28000,
          magnitude: 2.1,
          delay_ms: 145000,
        }
      ]
    },
    {
      title: 'Weather-Related Multi-Station Impact',
      description: 'Severe weather caused multiple faults across the regional grid',
      motherEvent: {
        event_type: 'interruption',
        severity: 'critical',
        root_cause: 'Weather-related - Lightning strike on main transmission line',
        duration_ms: 1850000,
        magnitude: 0,
      },
      childEvents: [
        {
          event_type: 'transient',
          severity: 'high',
          root_cause: 'Lightning-induced transient overvoltage',
          duration_ms: 12,
          magnitude: 185.3,
          delay_ms: 2500,
        },
        {
          event_type: 'voltage_dip',
          severity: 'high',
          root_cause: 'System recovery voltage dip after lightning',
          duration_ms: 3400,
          magnitude: 63.1,
          delay_ms: 45000,
        },
        {
          event_type: 'interruption',
          severity: 'medium',
          root_cause: 'Secondary protection trip from weather damage',
          duration_ms: 125000,
          magnitude: 0,
          delay_ms: 280000,
        }
      ]
    }
  ];

  // Generate realistic waveform data
  function generateWaveformData(eventType, magnitude, duration) {
    const samples = Math.min(500, Math.max(50, Math.floor(duration / 20)));
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
        case 'transient':
          if (i < samples * 0.1) {
            voltageValue = magnitude * 2.3 + Math.sin(i * 2) * 50;
          } else {
            voltageValue = 230 + Math.sin(i * 0.1) * 10 + Math.random() * 5;
          }
          break;
        case 'flicker':
          voltageValue = 230 + Math.sin(i * 0.05) * magnitude * 5 + Math.random() * 3;
          break;
        default:
          voltageValue = 230 + Math.sin(i * 0.1) * 10 + Math.random() * 5;
      }
      
      voltage.push({ time: Math.round(time * 1000) / 1000, value: Math.round(voltageValue * 100) / 100 });
      current.push({ time: Math.round(time * 1000) / 1000, value: Math.round(currentValue * 100) / 100 });
    }
    
    return { voltage, current };
  }

  try {
    // Get infrastructure data
    console.log('\n📡 Fetching infrastructure data...');
    const { data: substations, error: substationsError } = await supabase
      .from('substations')
      .select('id, name, code, region')
      .eq('status', 'operational')
      .limit(8);
      
    if (substationsError || !substations || substations.length === 0) {
      console.error('❌ No substations found:', substationsError);
      return;
    }

    const { data: meters } = await supabase
      .from('pq_meters') 
      .select('id, meter_id, substation_id, location')
      .eq('status', 'active');

    console.log(`   ✅ Found ${substations.length} substations and ${meters?.length || 0} meters`);
    
    // Create mother event scenarios
    let totalEvents = 0;
    
    for (let scenarioIndex = 0; scenarioIndex < MOTHER_EVENT_SCENARIOS.length; scenarioIndex++) {
      const scenario = MOTHER_EVENT_SCENARIOS[scenarioIndex];
      console.log(`\n🎯 Creating scenario ${scenarioIndex + 1}: ${scenario.title}`);
      
      // Select random substation
      const primarySubstation = substations[Math.floor(Math.random() * substations.length)];
      const primaryMeter = meters?.find(m => m.substation_id === primarySubstation.id) || null;
      
      // Create base timestamp (recent, within last 3 days)
      const baseTime = new Date();
      baseTime.setDate(baseTime.getDate() - Math.floor(Math.random() * 3));
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
        status: ['new', 'acknowledged', 'investigating', 'resolved'][Math.floor(Math.random() * 4)],
        waveform_data: generateWaveformData(scenario.motherEvent.event_type, scenario.motherEvent.magnitude, scenario.motherEvent.duration_ms)
      };
      
      const { data: motherEvent, error: motherError } = await supabase
        .from('pq_events')
        .insert(motherEventData)
        .select('id')
        .single();
        
      if (motherError) {
        console.error(`   ❌ Error creating mother event:`, motherError);
        continue;
      }
      
      console.log(`   ✅ Mother event created: ${motherEvent.id.substring(0, 8)}...`);
      console.log(`      Type: ${motherEventData.event_type}, Severity: ${motherEventData.severity}`);
      console.log(`      Location: ${primarySubstation.name}`);
      totalEvents++;
      
      // Create child events
      for (let childIndex = 0; childIndex < scenario.childEvents.length; childIndex++) {
        const childSpec = scenario.childEvents[childIndex];
        
        // Select substation for child event (mostly same substation)
        let childSubstation = primarySubstation;
        if (Math.random() < 0.3 && substations.length > 1) {
          const otherStations = substations.filter(s => s.id !== primarySubstation.id);
          childSubstation = otherStations[Math.floor(Math.random() * otherStations.length)];
        }
        
        const childMeter = meters?.find(m => m.substation_id === childSubstation.id) || null;
        const childTime = new Date(baseTime.getTime() + childSpec.delay_ms);
        
        const childEventData = {
          event_type: childSpec.event_type,
          severity: childSpec.severity,
          root_cause: childSpec.root_cause,
          duration_ms: childSpec.duration_ms,
          magnitude: childSpec.magnitude,
          substation_id: childSubstation.id,
          meter_id: childMeter?.id || null,
          timestamp: childTime.toISOString(),
          is_mother_event: false,
          parent_event_id: motherEvent.id,
          is_child_event: true,
          grouping_type: 'automatic',
          grouped_at: new Date().toISOString(),
          affected_phases: Math.random() < 0.7 ? ['A', 'B', 'C'] : ['A'],
          status: ['new', 'acknowledged', 'investigating', 'resolved'][Math.floor(Math.random() * 4)],
          waveform_data: generateWaveformData(childSpec.event_type, childSpec.magnitude, childSpec.duration_ms)
        };
        
        const { data: childEvent, error: childError } = await supabase
          .from('pq_events')
          .insert(childEventData)
          .select('id')
          .single();
          
        if (childError) {
          console.error(`   ❌ Error creating child event ${childIndex + 1}:`, childError);
        } else {
          console.log(`   ✅ Child event ${childIndex + 1} created: ${childEvent.id.substring(0, 8)}...`);
          console.log(`      Type: ${childEventData.event_type}, Delay: +${Math.round(childSpec.delay_ms / 1000)}s`);
          totalEvents++;
        }
      }
      
      // Small delay between scenarios
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`\n✨ Demo data generation complete!`);
    console.log(`📈 Summary:`);
    console.log(`   • ${MOTHER_EVENT_SCENARIOS.length} mother event scenarios created`);
    console.log(`   • ${totalEvents} total events generated`);
    console.log(`   • Events distributed across multiple substations`);
    
    console.log('\n🎯 Demo scenarios created:');
    MOTHER_EVENT_SCENARIOS.forEach((scenario, index) => {
      console.log(`   ${index + 1}. ${scenario.title}`);
    });
    
    console.log('\n📋 How to test:');
    console.log('   1. Go to Event Management page');
    console.log('   2. Look for events with "Mother Event" status');
    console.log('   3. Click on a mother event to view details');
    console.log('   4. Use the "Child Events" tab to navigate to child events');
    console.log('   5. Test the back navigation functionality');
    
    console.log('\n🔄 To refresh the events list, reload the Event Management page.');
    
    return { success: true, totalEvents };
    
  } catch (error) {
    console.error('❌ Error generating demo data:', error);
    return { success: false, error: error.message };
  }
})();