// SARFI Data Seeder - Run this in browser console (F12) while on PQMAP Dashboard
// Or navigate to: http://localhost:5173 and paste this in console

(async function seedSARFIData() {
  console.log('%c🌱 SARFI Data Seeding Script', 'font-size: 16px; font-weight: bold; color: #3b82f6');
  console.log('Starting to populate SARFI demonstration data...\n');

  // Get supabase client from window (should be available in app)
  const { supabase } = await import('/src/lib/supabase.ts');

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

  const WEIGHT_FACTORS = {
    '400kV': 1.5,
    '132kV': 1.2,
    '11kV': 1.0,
    '380V': 0.8,
  };

  try {
    // Step 1: Get or create substation
    console.log('📍 Step 1: Setting up substation...');
    let { data: existingSubstations } = await supabase
      .from('substations')
      .select('id, name, voltage_level')
      .limit(1);

    let substationId;
    if (existingSubstations && existingSubstations.length > 0) {
      substationId = existingSubstations[0].id;
      console.log('✓ Using existing substation:', existingSubstations[0].name);
    } else {
      const { data: newSubstation } = await supabase
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
      
      substationId = newSubstation.id;
      console.log('✓ Created new substation:', newSubstation.name);
    }

    // Step 2: Create PQ Meters
    console.log('\n⚡ Step 2: Creating PQ meters...');
    const createdMeters = [];

    for (const meterData of SAMPLE_METERS) {
      const { data: existing } = await supabase
        .from('pq_meters')
        .select('id, meter_id')
        .eq('meter_id', meterData.meter_id)
        .single();

      if (existing) {
        console.log(`  ⊙ ${meterData.meter_id} exists`);
        createdMeters.push(existing);
      } else {
        const { data: newMeter } = await supabase
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

        if (newMeter) {
          console.log(`  ✓ Created ${meterData.meter_id}`);
          createdMeters.push(newMeter);
        }
      }
    }

    console.log(`✓ Total meters ready: ${createdMeters.length}`);

    // Step 3: Create SARFI Profile
    console.log('\n📊 Step 3: Creating SARFI profile...');
    
    const { data: existingProfile } = await supabase
      .from('sarfi_profiles')
      .select('id, name')
      .eq('year', 2025)
      .eq('name', '2025 Standard Profile')
      .single();

    let profileId;
    if (existingProfile) {
      profileId = existingProfile.id;
      console.log('✓ Using existing profile:', existingProfile.name);
    } else {
      const { data: newProfile } = await supabase
        .from('sarfi_profiles')
        .insert([{
          name: '2025 Standard Profile',
          description: 'Standard SARFI calculation profile for 2025',
          year: 2025,
          is_active: true,
        }])
        .select()
        .single();

      profileId = newProfile.id;
      console.log('✓ Created profile:', newProfile.name);
    }

    // Step 4: Create Profile Weights
    console.log('\n⚖️  Step 4: Creating profile weights...');
    let weightsCreated = 0;

    for (const meter of createdMeters) {
      const meterInfo = SAMPLE_METERS.find(m => m.meter_id === meter.meter_id);
      const weightFactor = WEIGHT_FACTORS[meterInfo?.voltage_level] || 1.0;

      const { error } = await supabase
        .from('sarfi_profile_weights')
        .upsert([{
          profile_id: profileId,
          meter_id: meter.id,
          weight_factor: weightFactor,
          notes: `Weight based on ${meterInfo?.voltage_level}`,
        }], {
          onConflict: 'profile_id,meter_id'
        });

      if (!error) {
        console.log(`  ✓ Weight for ${meter.meter_id}: ${weightFactor}`);
        weightsCreated++;
      }
    }

    // Step 5: Create Sample Events
    console.log('\n⚡ Step 5: Creating sample PQ events...');
    const events = [];
    const now = new Date();

    // Create events for past 3 months
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const eventMonth = new Date(now);
      eventMonth.setMonth(now.getMonth() - monthOffset);

      for (const meter of createdMeters) {
        const eventCount = Math.floor(Math.random() * 11) + 10; // 10-20 events

        for (let i = 0; i < eventCount; i++) {
          const eventDate = new Date(eventMonth);
          eventDate.setDate(Math.floor(Math.random() * 28) + 1);
          eventDate.setHours(Math.floor(Math.random() * 24));

          // Generate magnitude for SARFI thresholds
          let magnitude;
          const rand = Math.random();
          if (rand < 0.5) {
            magnitude = 70 + Math.random() * 20; // 70-90%
          } else if (rand < 0.75) {
            magnitude = 50 + Math.random() * 20; // 50-70%
          } else if (rand < 0.9) {
            magnitude = 20 + Math.random() * 30; // 20-50%
          } else {
            magnitude = 5 + Math.random() * 15; // 5-20%
          }

          const meterInfo = SAMPLE_METERS.find(m => m.meter_id === meter.meter_id);
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
            voltage_level: meterInfo?.voltage_level || '11kV',
            is_special_event: Math.random() < 0.1,
          });
        }
      }
    }

    console.log(`  Creating ${events.length} events in batches...`);
    
    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      await supabase.from('pq_events').insert(batch);
      inserted += batch.length;
      console.log(`  ✓ Batch ${Math.floor(i / batchSize) + 1}: ${inserted}/${events.length}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('%c🎉 SARFI Data Seeding Complete!', 'font-size: 14px; font-weight: bold; color: #10b981');
    console.log('='.repeat(60));
    console.log(`📊 Profile: 2025 Standard Profile`);
    console.log(`⚡ Meters: ${createdMeters.length}`);
    console.log(`⚖️  Weights: ${weightsCreated}`);
    console.log(`📈 Events: ${inserted}`);
    console.log('\n%c✅ Next Steps:', 'font-weight: bold; color: #3b82f6');
    console.log('   1. Go to Dashboard page');
    console.log('   2. Click Settings icon on SARFI chart');
    console.log('   3. Select "2025 Standard Profile"');
    console.log('   4. Enable "Show Data Table"');
    console.log('   5. Apply filters');
    console.log('\n%c💡 Tip: Reload the page to see the SARFI chart update!', 'color: #f59e0b');

  } catch (error) {
    console.error('%c❌ Error:', 'font-weight: bold; color: #ef4444', error);
  }
})();
