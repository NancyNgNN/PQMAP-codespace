// ============================================================================
// SARFI Data Debugging Script - Run in Browser Console
// ============================================================================
// This script helps debug why SARFI data table is not showing
// Open Browser DevTools (F12) → Console → Paste and run this script
// ============================================================================

async function debugSARFIData() {
  console.log('🔍 Starting SARFI Data Debug...\n');
  
  // Get supabase client from window
  const { supabase } = window;
  
  if (!supabase) {
    console.error('❌ Supabase client not found! Make sure app is loaded.');
    return;
  }

  console.log('✅ Supabase client found\n');

  // Step 1: Check SARFI Profiles
  console.log('📊 Step 1: Checking SARFI Profiles...');
  const { data: profiles, error: profileError } = await supabase
    .from('sarfi_profiles')
    .select('*')
    .order('year', { ascending: false });
  
  if (profileError) {
    console.error('❌ Error fetching profiles:', profileError);
    return;
  }
  
  console.log(`✅ Found ${profiles.length} profiles:`);
  profiles.forEach(p => {
    console.log(`   - ${p.name} (${p.year}) - Active: ${p.is_active} - ID: ${p.id}`);
  });
  
  if (profiles.length === 0) {
    console.error('❌ No SARFI profiles found! Run seed script first.');
    return;
  }

  const activeProfile = profiles.find(p => p.is_active) || profiles[0];
  console.log(`\n📌 Using profile: "${activeProfile.name}" (ID: ${activeProfile.id})\n`);

  // Step 2: Check Profile Weights
  console.log('📊 Step 2: Checking Profile Weights...');
  const { data: weights, error: weightError } = await supabase
    .from('sarfi_profile_weights')
    .select('*')
    .eq('profile_id', activeProfile.id);
  
  if (weightError) {
    console.error('❌ Error fetching weights:', weightError);
    return;
  }
  
  console.log(`✅ Found ${weights.length} weights for this profile`);
  if (weights.length === 0) {
    console.error('❌ No weights found for this profile! Check seed script.');
    return;
  }

  const meterIds = weights.map(w => w.meter_id);
  console.log(`📍 Meter IDs: ${meterIds.slice(0, 3).join(', ')}${meterIds.length > 3 ? '...' : ''}\n`);

  // Step 3: Check Meters
  console.log('📊 Step 3: Checking PQ Meters...');
  const { data: meters, error: meterError } = await supabase
    .from('pq_meters')
    .select('id, meter_id, location, voltage_level')
    .in('id', meterIds);
  
  if (meterError) {
    console.error('❌ Error fetching meters:', meterError);
    return;
  }
  
  console.log(`✅ Found ${meters.length} meters:`);
  meters.slice(0, 5).forEach(m => {
    console.log(`   - ${m.meter_id} at ${m.location} (${m.voltage_level || 'No voltage level'})`);
  });
  
  // Check voltage levels
  const voltageLevels = [...new Set(meters.map(m => m.voltage_level).filter(Boolean))];
  console.log(`\n📊 Voltage levels in meters: ${voltageLevels.join(', ')}`);
  
  if (voltageLevels.length === 0) {
    console.warn('⚠️ No voltage levels set on meters! This might cause filtering issues.');
  }

  // Step 4: Check Events
  console.log('\n📊 Step 4: Checking PQ Events...');
  const { data: allEvents, error: eventError } = await supabase
    .from('pq_events')
    .select('id, event_type, meter_id, voltage_level, magnitude, remaining_voltage, is_special_event')
    .in('meter_id', meterIds);
  
  if (eventError) {
    console.error('❌ Error fetching events:', eventError);
    return;
  }
  
  console.log(`✅ Found ${allEvents.length} events for these meters`);
  
  // Analyze event types
  const eventTypes = {};
  allEvents.forEach(e => {
    eventTypes[e.event_type] = (eventTypes[e.event_type] || 0) + 1;
  });
  console.log('📊 Event types:', eventTypes);
  
  // Check voltage dips specifically
  const voltageDips = allEvents.filter(e => e.event_type === 'voltage_dip');
  console.log(`📉 Voltage dips: ${voltageDips.length}`);
  
  if (voltageDips.length === 0) {
    console.error('❌ No voltage_dip events found! SARFI only counts voltage dips.');
    return;
  }

  // Check voltage levels on events
  const eventVoltageLevels = [...new Set(allEvents.map(e => e.voltage_level).filter(Boolean))];
  console.log(`📊 Voltage levels in events: ${eventVoltageLevels.join(', ') || 'None set'}`);
  
  if (eventVoltageLevels.length === 0) {
    console.warn('⚠️ No voltage levels set on events! Voltage level filtering will not work.');
  }

  // Step 5: Analyze SARFI Calculation
  console.log('\n📊 Step 5: Analyzing SARFI Thresholds...');
  
  const sarfiCounts = {
    sarfi_10: 0,
    sarfi_30: 0,
    sarfi_50: 0,
    sarfi_70: 0,
    sarfi_80: 0,
    sarfi_90: 0
  };

  voltageDips.forEach(event => {
    const rv = event.remaining_voltage ?? event.magnitude ?? 100;
    if (rv <= 90) sarfiCounts.sarfi_10++;
    if (rv <= 70) sarfiCounts.sarfi_30++;
    if (rv <= 50) sarfiCounts.sarfi_50++;
    if (rv <= 30) sarfiCounts.sarfi_70++;
    if (rv <= 20) sarfiCounts.sarfi_80++;
    if (rv <= 10) sarfiCounts.sarfi_90++;
  });

  console.log('📊 SARFI Threshold Counts:');
  Object.entries(sarfiCounts).forEach(([key, value]) => {
    console.log(`   ${key}: ${value} events`);
  });

  // Step 6: Sample Events Analysis
  console.log('\n📊 Step 6: Sample Event Analysis (first 5 voltage dips):');
  voltageDips.slice(0, 5).forEach((e, i) => {
    const rv = e.remaining_voltage ?? e.magnitude ?? 100;
    console.log(`   Event ${i + 1}:`);
    console.log(`     - Remaining Voltage: ${rv}%`);
    console.log(`     - Voltage Level: ${e.voltage_level || 'Not set'}`);
    console.log(`     - Special Event: ${e.is_special_event}`);
  });

  // Step 7: Test Actual Query
  console.log('\n📊 Step 7: Testing Actual SARFI Query...');
  
  const testFilters = {
    profileId: activeProfile.id,
    voltageLevel: 'All',
    excludeSpecialEvents: false
  };
  
  console.log('🔍 Test filters:', testFilters);
  
  let testQuery = supabase
    .from('pq_events')
    .select('id, event_type, magnitude, remaining_voltage, meter_id, voltage_level, is_special_event')
    .in('meter_id', meterIds)
    .eq('event_type', 'voltage_dip');
  
  if (testFilters.voltageLevel !== 'All') {
    testQuery = testQuery.eq('voltage_level', testFilters.voltageLevel);
  }
  
  if (testFilters.excludeSpecialEvents) {
    testQuery = testQuery.or('is_special_event.is.null,is_special_event.eq.false');
  }
  
  const { data: testEvents, error: testError } = await testQuery;
  
  if (testError) {
    console.error('❌ Query error:', testError);
    return;
  }
  
  console.log(`✅ Query returned ${testEvents.length} events`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Profiles: ${profiles.length}`);
  console.log(`Active Profile: ${activeProfile.name}`);
  console.log(`Weights (meters in profile): ${weights.length}`);
  console.log(`PQ Meters: ${meters.length}`);
  console.log(`Total Events: ${allEvents.length}`);
  console.log(`Voltage Dip Events: ${voltageDips.length}`);
  console.log(`Events matching query: ${testEvents.length}`);
  console.log('='.repeat(60));

  if (testEvents.length === 0) {
    console.error('\n❌ PROBLEM: No events match the query!');
    console.log('\n💡 Possible causes:');
    console.log('   1. No voltage_dip events exist');
    console.log('   2. Events have different meter_id than weights');
    console.log('   3. Voltage level mismatch (if filtered)');
    console.log('   4. All events are special events (if excluded)');
  } else {
    console.log('\n✅ Data looks good! Check browser console for errors in the app.');
    console.log('\n💡 Next steps:');
    console.log('   1. Open SARFI chart settings (⚙️ icon)');
    console.log('   2. Select profile:', activeProfile.name);
    console.log('   3. Voltage level: All');
    console.log('   4. Check "Show Data Table"');
    console.log('   5. Click "Apply Filters"');
  }

  return {
    profiles,
    activeProfile,
    weights,
    meters,
    events: allEvents,
    voltageDips,
    sarfiCounts,
    testEvents
  };
}

// Run the debug
console.log('🚀 Running SARFI Data Debug...\n');
debugSARFIData().then(result => {
  if (result) {
    console.log('\n✅ Debug complete! Results stored in variable.');
    console.log('💾 Access via: result.profiles, result.meters, result.events, etc.');
    window.sarfiDebugResult = result;
  }
}).catch(error => {
  console.error('❌ Debug failed:', error);
});
