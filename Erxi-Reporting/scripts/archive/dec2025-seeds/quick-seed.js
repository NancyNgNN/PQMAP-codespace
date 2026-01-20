// Database seeding script - paste this in browser console (F12) on PQMAP dashboard

async function seedPQMAPDatabase() {
  console.log('🌱 Starting PQMAP database seeding...');
  
  try {
    // Import the seeding function from the global scope
    const seedResponse = await fetch('/src/utils/seedDatabase.ts');
    
    // Since we can't directly import modules in console, we'll use the supabase client directly
    // This is a simplified seeding script
    
    // 1. Create substations
    console.log('📍 Creating substations...');
    const substations = [
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
      }
    ];
    
    const { data: subData, error: subError } = await supabase
      .from('substations')
      .insert(substations)
      .select();
    
    if (subError) throw subError;
    console.log(`✅ Created ${subData.length} substations`);
    
    // 2. Create PQ meters
    console.log('🔌 Creating PQ meters...');
    const meters = subData.map((sub, i) => ({
      meter_id: `PQM-${sub.code}-001`,
      substation_id: sub.id,
      location: `Bay ${i + 1}`,
      status: 'active',
      last_communication: new Date().toISOString(),
      firmware_version: '2.1.4',
      installed_date: '2023-01-15'
    }));
    
    const { data: meterData, error: meterError } = await supabase
      .from('pq_meters')
      .insert(meters)
      .select();
    
    if (meterError) throw meterError;
    console.log(`✅ Created ${meterData.length} PQ meters`);
    
    // 3. Create some PQ events
    console.log('⚡ Creating PQ events...');
    const events = [];
    const eventTypes = ['voltage_dip', 'voltage_swell', 'harmonic'];
    const severities = ['critical', 'high', 'medium', 'low'];
    
    for (let i = 0; i < 10; i++) {
      const meter = meterData[Math.floor(Math.random() * meterData.length)];
      const substation = subData.find(s => s.id === meter.substation_id);
      
      events.push({
        event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        substation_id: substation.id,
        meter_id: meter.id,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration_ms: Math.floor(Math.random() * 5000) + 100,
        magnitude: Math.random() * 50 + 10,
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: 'new',
        is_mother_event: Math.random() > 0.8
      });
    }
    
    const { data: eventData, error: eventError } = await supabase
      .from('pq_events')
      .insert(events)
      .select();
    
    if (eventError) throw eventError;
    console.log(`✅ Created ${eventData.length} PQ events`);
    
    // 4. Create SARFI metrics
    console.log('📊 Creating SARFI metrics...');
    const sarfiMetrics = subData.map(sub => ({
      substation_id: sub.id,
      period_year: 2024,
      period_month: 11,
      sarfi_70: Math.random() * 5,
      sarfi_80: Math.random() * 3,
      sarfi_90: Math.random() * 1,
      total_events: Math.floor(Math.random() * 20) + 5
    }));
    
    const { error: sarfiError } = await supabase
      .from('sarfi_metrics')
      .insert(sarfiMetrics);
    
    if (sarfiError) throw sarfiError;
    console.log(`✅ Created ${sarfiMetrics.length} SARFI metrics`);
    
    // 5. Create system health records
    console.log('💊 Creating system health records...');
    const healthRecords = [
      { component: 'server', status: 'healthy', message: 'All systems operational' },
      { component: 'database', status: 'healthy', message: 'Database responding normally' },
      { component: 'communication', status: 'degraded', message: 'Minor delays in SCADA communication' },
      { component: 'integration', status: 'healthy', message: 'All integrations active' }
    ];
    
    const { error: healthError } = await supabase
      .from('system_health')
      .insert(healthRecords);
    
    if (healthError) throw healthError;
    console.log(`✅ Created ${healthRecords.length} health records`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('🔄 Refresh the page to see the data');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    return false;
  }
}

// Run the seeding
seedPQMAPDatabase();