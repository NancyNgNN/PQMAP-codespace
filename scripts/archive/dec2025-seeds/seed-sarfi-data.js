/**
 * Seed Script for SARFI Demonstration Data
 * 
 * This script creates:
 * 1. PQ Meters (if not exist)
 * 2. SARFI Profile for 2025
 * 3. Profile Weights for each meter
 * 4. Sample PQ Events with appropriate magnitudes for SARFI calculation
 */

// Use dynamic import to load from src/lib/supabase.ts
const { supabase } = await import('./src/lib/supabase.ts');

// Sample meter data
const SAMPLE_METERS = [
  { meter_id: 'MTR-001', location: 'Main Street Substation', voltage_level: '132kV' },
  { meter_id: 'MTR-002', location: 'Industrial Park A', voltage_level: '132kV' },
  { meter_id: 'MTR-003', location: 'Downtown District', voltage_level: '11kV' },
  { meter_id: 'MTR-004', location: 'Residential Area North', voltage_level: '11kV' },
  { meter_id: 'MTR-005', location: 'Commercial Zone East', voltage_level: '11kV' },
  { meter_id: 'MTR-006', location: 'Factory Complex B', voltage_level: '400kV' },
  { meter_id: 'MTR-007', location: 'Hospital District', voltage_level: '11kV' },
  { meter_id: 'MTR-008', location: 'Tech Park South', voltage_level: '132kV' },
];

// Weight factors for different meter importance
const WEIGHT_FACTORS = {
  '400kV': 1.5,  // High voltage - more critical
  '132kV': 1.2,
  '11kV': 1.0,
  '380V': 0.8,
};

async function seedSARFIData() {
  console.log('🌱 Starting SARFI data seeding...\n');

  try {
    // Step 1: Get or create substations
    console.log('📍 Step 1: Setting up substations...');
    const { data: existingSubstations } = await supabase
      .from('substations')
      .select('id, name, voltage_level')
      .limit(1);

    let substationId;
    if (existingSubstations && existingSubstations.length > 0) {
      substationId = existingSubstations[0].id;
      console.log('✓ Using existing substation:', existingSubstations[0].name);
    } else {
      const { data: newSubstation, error } = await supabase
        .from('substations')
        .insert([{
          name: 'Demo Main Substation',
          voltage_level: '132kV',
          location: 'Demo Location',
          latitude: 1.3521,
          longitude: 103.8198,
        }])
        .select()
        .single();

      if (error) throw error;
      substationId = newSubstation.id;
      console.log('✓ Created new substation:', newSubstation.name);
    }

    // Step 2: Create PQ Meters
    console.log('\n⚡ Step 2: Creating PQ meters...');
    const createdMeters = [];

    for (const meterData of SAMPLE_METERS) {
      // Check if meter exists
      const { data: existing } = await supabase
        .from('pq_meters')
        .select('id, meter_id')
        .eq('meter_id', meterData.meter_id)
        .single();

      if (existing) {
        console.log(`  ⊙ Meter ${meterData.meter_id} already exists`);
        createdMeters.push(existing);
      } else {
        const { data: newMeter, error } = await supabase
          .from('pq_meters')
          .insert([{
            meter_id: meterData.meter_id,
            substation_id: substationId,
            location: meterData.location,
            voltage_level: meterData.voltage_level,
            meter_type: 'PQ Monitor',
            installation_date: '2024-01-01',
          }])
          .select()
          .single();

        if (error) {
          console.error(`  ✗ Error creating meter ${meterData.meter_id}:`, error.message);
        } else {
          console.log(`  ✓ Created meter ${meterData.meter_id}`);
          createdMeters.push(newMeter);
        }
      }
    }

    console.log(`✓ Total meters ready: ${createdMeters.length}`);

    // Step 3: Create SARFI Profile for 2025
    console.log('\n📊 Step 3: Creating SARFI profile...');
    
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('sarfi_profiles')
      .select('id, name')
      .eq('year', 2025)
      .single();

    let profileId;
    if (existingProfile) {
      profileId = existingProfile.id;
      console.log('✓ Using existing profile:', existingProfile.name);
    } else {
      const { data: newProfile, error } = await supabase
        .from('sarfi_profiles')
        .insert([{
          name: '2025 Standard Profile',
          description: 'Standard SARFI calculation profile for 2025 with weighted factors',
          year: 2025,
          is_active: true,
        }])
        .select()
        .single();

      if (error) {
        console.error('✗ Error creating profile:', error.message);
        throw error;
      }
      profileId = newProfile.id;
      console.log('✓ Created profile:', newProfile.name);
    }

    // Step 4: Create Profile Weights
    console.log('\n⚖️  Step 4: Creating profile weights...');
    let weightsCreated = 0;

    for (const meter of createdMeters) {
      // Get voltage level from the original meter data
      const meterInfo = SAMPLE_METERS.find(m => m.meter_id === meter.meter_id);
      const weightFactor = WEIGHT_FACTORS[meterInfo?.voltage_level] || 1.0;

      const { error } = await supabase
        .from('sarfi_profile_weights')
        .insert([{
          profile_id: profileId,
          meter_id: meter.id,
          weight_factor: weightFactor,
          notes: `Weight factor based on ${meterInfo?.voltage_level} voltage level`,
        }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`  ⊙ Weight for ${meter.meter_id} already exists`);
        } else {
          console.error(`  ✗ Error creating weight for ${meter.meter_id}:`, error.message);
        }
      } else {
        console.log(`  ✓ Created weight for ${meter.meter_id}: ${weightFactor}`);
        weightsCreated++;
      }
    }

    console.log(`✓ Profile weights created: ${weightsCreated}`);

    // Step 5: Create Sample PQ Events for SARFI calculation
    console.log('\n⚡ Step 5: Creating sample PQ events...');
    const events = [];
    const now = new Date();

    // Create events for the past 3 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const eventMonth = new Date(now);
      eventMonth.setMonth(now.getMonth() - monthOffset);

      for (const meter of createdMeters) {
        // Create 10-20 random events per meter per month
        const eventCount = Math.floor(Math.random() * 11) + 10;

        for (let i = 0; i < eventCount; i++) {
          const eventDate = new Date(eventMonth);
          eventDate.setDate(Math.floor(Math.random() * 28) + 1);
          eventDate.setHours(Math.floor(Math.random() * 24));
          eventDate.setMinutes(Math.floor(Math.random() * 60));

          // Generate magnitude values that will trigger different SARFI thresholds
          // SARFI-10: voltage <= 90%
          // SARFI-30: voltage <= 70%
          // SARFI-50: voltage <= 50%
          // SARFI-70: voltage <= 30%
          // SARFI-80: voltage <= 20%
          // SARFI-90: voltage <= 10%
          
          let magnitude;
          const rand = Math.random();
          if (rand < 0.5) {
            magnitude = 70 + Math.random() * 20; // 70-90% (SARFI-10, 30)
          } else if (rand < 0.75) {
            magnitude = 50 + Math.random() * 20; // 50-70% (SARFI-10, 30, 50)
          } else if (rand < 0.9) {
            magnitude = 20 + Math.random() * 30; // 20-50% (SARFI-10, 30, 50, 70)
          } else {
            magnitude = 5 + Math.random() * 15; // 5-20% (All SARFI thresholds)
          }

          events.push({
            event_type: 'voltage_dip',
            substation_id: substationId,
            meter_id: meter.id,
            timestamp: eventDate.toISOString(),
            duration_ms: Math.floor(Math.random() * 5000) + 100,
            magnitude: parseFloat(magnitude.toFixed(2)),
            remaining_voltage: parseFloat(magnitude.toFixed(2)),
            severity: magnitude < 50 ? 'critical' : magnitude < 70 ? 'high' : 'medium',
            status: 'resolved',
            affected_phases: ['A', 'B', 'C'],
            customer_count: Math.floor(Math.random() * 50) + 10,
            circuit_id: `CKT-${meter.meter_id}`,
            voltage_level: SAMPLE_METERS.find(m => m.meter_id === meter.meter_id)?.voltage_level || '11kV',
            is_special_event: Math.random() < 0.1, // 10% chance of special event
          });
        }
      }
    }

    console.log(`  Creating ${events.length} PQ events...`);
    
    // Insert events in batches of 100
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const { error } = await supabase
        .from('pq_events')
        .insert(batch);

      if (error) {
        console.error(`  ✗ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        inserted += batch.length;
        console.log(`  ✓ Inserted batch ${Math.floor(i / batchSize) + 1} (${inserted}/${events.length})`);
      }
    }

    console.log(`✓ Total events created: ${inserted}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SARFI Data Seeding Complete!');
    console.log('='.repeat(60));
    console.log(`📊 Profile: 2025 Standard Profile`);
    console.log(`⚡ Meters: ${createdMeters.length}`);
    console.log(`⚖️  Weights: ${weightsCreated}`);
    console.log(`📈 Events: ${inserted}`);
    console.log('\n✅ You can now:');
    console.log('   1. Open the Dashboard');
    console.log('   2. Click the Settings icon on SARFI chart');
    console.log('   3. Select "2025 Standard Profile"');
    console.log('   4. Enable "Show Data Table"');
    console.log('   5. View the meter-level SARFI data!');
    console.log('');

  } catch (error) {
    console.error('\n❌ Error seeding SARFI data:', error);
    process.exit(1);
  }
}

// Run the seed script
seedSARFIData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
