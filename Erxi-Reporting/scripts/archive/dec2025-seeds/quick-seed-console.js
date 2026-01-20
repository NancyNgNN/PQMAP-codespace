// Quick and simple database seeding script
// Run this in browser console (F12) on PQMAP page

async function quickSeedDatabase() {
  console.log('🌱 Starting quick database seeding...');
  
  try {
    // 1. Clear existing data first
    console.log('🧹 Clearing existing data...');
    const tables = ['notifications', 'event_customer_impact', 'pq_events', 
                   'pq_service_records', 'reports', 'notification_rules', 
                   'sarfi_metrics', 'system_health', 'customers', 'pq_meters', 'substations'];
    
    for (const table of tables) {
      await supabase.from(table).delete().neq('id', 0);
      console.log(`✅ Cleared ${table}`);
    }
    
    // 2. Insert substations
    console.log('📍 Creating substations...');
    const substations = [
      {
        name: 'Tai Po Grid Substation', code: 'TPGS', voltage_level: '400kV/132kV',
        latitude: 22.4469, longitude: 114.1657, region: 'New Territories East', status: 'operational'
      },
      {
        name: 'Castle Peak Power Station', code: 'CPPS', voltage_level: '400kV/132kV', 
        latitude: 22.3667, longitude: 113.9500, region: 'New Territories West', status: 'operational'
      },
      {
        name: 'Shatin Substation', code: 'STS', voltage_level: '132kV/11kV',
        latitude: 22.3644, longitude: 114.1946, region: 'New Territories East', status: 'operational'
      },
      {
        name: 'Hong Kong Island West', code: 'HKIW', voltage_level: '132kV/11kV',
        latitude: 22.2783, longitude: 114.1747, region: 'Hong Kong Island', status: 'operational'
      },
      {
        name: 'Kowloon East', code: 'KES', voltage_level: '132kV/11kV',
        latitude: 22.3193, longitude: 114.2245, region: 'Kowloon', status: 'operational'
      }
    ];
    
    const { data: subData, error: subError } = await supabase
      .from('substations')
      .insert(substations)
      .select();
    
    if (subError) throw subError;
    console.log(`✅ Created ${subData.length} substations`);
    
    // 3. Insert PQ meters
    console.log('🔌 Creating PQ meters...');
    const meters = subData.map((sub, i) => ({
      meter_id: `PQM-${sub.code}-001`,
      substation_id: sub.id,
      location: `Bay ${i + 1}`,
      status: 'active',
      last_communication: new Date().toISOString(),
      firmware_version: '2.1.4',
      installed_date: '2023-01-15T00:00:00Z'
    }));
    
    const { data: meterData, error: meterError } = await supabase
      .from('pq_meters')
      .insert(meters)
      .select();
    
    if (meterError) throw meterError;
    console.log(`✅ Created ${meterData.length} PQ meters`);
    
    // 4. Insert customers
    console.log('👥 Creating customers...');
    const customers = subData.map((sub, i) => ({
      account_number: `CA${String(1000 + i).padStart(6, '0')}`,
      name: `Customer ${i + 1} - ${sub.region}`,
      address: `${i + 1} Main Street, ${sub.region}`,
      substation_id: sub.id,
      transformer_id: `TX-${sub.code}-${i + 1}`,
      contract_demand_kva: 100 + (i * 50),
      customer_type: i % 3 === 0 ? 'industrial' : i % 2 === 0 ? 'commercial' : 'residential',
      critical_customer: i === 0
    }));
    
    const { data: custData, error: custError } = await supabase
      .from('customers')
      .insert(customers)
      .select();
    
    if (custError) throw custError;
    console.log(`✅ Created ${custData.length} customers`);
    
    // 5. Insert PQ events
    console.log('⚡ Creating PQ events...');
    const events = [];
    const eventTypes = ['voltage_dip', 'voltage_swell', 'harmonic'];
    const severities = ['critical', 'high', 'medium', 'low'];
    
    for (let i = 0; i < 20; i++) {
      const meter = meterData[Math.floor(Math.random() * meterData.length)];
      const substation = subData.find(s => s.id === meter.substation_id);
      
      events.push({
        event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
        substation_id: substation.id,
        meter_id: meter.id,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration_ms: Math.floor(Math.random() * 5000) + 100,
        magnitude: Math.random() * 50 + 10,
        severity: severities[Math.floor(Math.random() * severities.length)],
        status: Math.random() > 0.7 ? 'resolved' : 'new',
        root_cause: 'Equipment fault'
      });
    }
    
    const { data: eventData, error: eventError } = await supabase
      .from('pq_events')
      .insert(events)
      .select();
    
    if (eventError) throw eventError;
    console.log(`✅ Created ${eventData.length} PQ events`);
    
    // 6. Insert SARFI metrics
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
    
    // 7. Insert system health
    console.log('💊 Creating system health records...');
    const healthRecords = [
      { component: 'server', status: 'healthy', message: 'All systems operational' },
      { component: 'database', status: 'healthy', message: 'Database responding normally' },
      { component: 'communication', status: 'degraded', message: 'Minor delays in SCADA' },
      { component: 'integration', status: 'healthy', message: 'All integrations active' }
    ];
    
    const { error: healthError } = await supabase
      .from('system_health')
      .insert(healthRecords);
    
    if (healthError) throw healthError;
    console.log(`✅ Created ${healthRecords.length} health records`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('🔄 Refresh the dashboard to see the data');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    return false;
  }
}

// Run the seeding
quickSeedDatabase();