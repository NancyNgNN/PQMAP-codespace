// Simple database seeding script - NO IMPORTS NEEDED
// Copy and paste this entire script in browser console (F12) on PQMAP page

(async function simpleQuickSeed() {
  console.log('🌱 Starting simple database seeding...');
  
  try {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you are on the PQMAP page.');
      return;
    }
    
    // 1. Simple clear - just delete everything
    console.log('🧹 Clearing existing data...');
    
    // Clear in proper order (children first)
    const clearOrder = [
      'notifications', 'event_customer_impact', 'pq_events', 
      'pq_service_records', 'reports', 'notification_rules', 
      'sarfi_metrics', 'system_health', 'customers', 'pq_meters', 'substations'
    ];
    
    for (const table of clearOrder) {
      try {
        // Use created_at field which all tables have
        await supabase.from(table).delete().lt('created_at', '2030-01-01');
        console.log(`✅ Cleared ${table}`);
      } catch (err) {
        console.log(`⚠️ Could not clear ${table}:`, err);
      }
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
    
    if (subError) {
      console.error('❌ Error creating substations:', subError);
      return;
    }
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
    
    if (meterError) {
      console.error('❌ Error creating meters:', meterError);
      return;
    }
    console.log(`✅ Created ${meterData.length} PQ meters`);
    
    // 4. Insert customers
    console.log('👥 Creating customers...');
    const customers = subData.flatMap((sub, i) => [
      {
        account_number: `CA${String(1000 + i * 3).padStart(6, '0')}`,
        name: `Hospital ${sub.region}`,
        address: `${i * 3 + 1} Main Street, ${sub.region}`,
        substation_id: sub.id,
        transformer_id: `TX-${sub.code}-1`,
        contract_demand_kva: 500,
        customer_type: 'commercial',
        critical_customer: true
      },
      {
        account_number: `CA${String(1001 + i * 3).padStart(6, '0')}`,
        name: `Mall ${sub.region}`,
        address: `${i * 3 + 2} Commerce Blvd, ${sub.region}`,
        substation_id: sub.id,
        transformer_id: `TX-${sub.code}-2`,
        contract_demand_kva: 200,
        customer_type: 'commercial',
        critical_customer: false
      },
      {
        account_number: `CA${String(1002 + i * 3).padStart(6, '0')}`,
        name: `Residential Complex ${sub.region}`,
        address: `${i * 3 + 3} Residential Ave, ${sub.region}`,
        substation_id: sub.id,
        transformer_id: `TX-${sub.code}-3`,
        contract_demand_kva: 50,
        customer_type: 'residential',
        critical_customer: false
      }
    ]);
    
    const { data: custData, error: custError } = await supabase
      .from('customers')
      .insert(customers)
      .select();
    
    if (custError) {
      console.error('❌ Error creating customers:', custError);
      return;
    }
    console.log(`✅ Created ${custData.length} customers`);
    
    // 5. Insert PQ events (simplified - no custom IDs)
    console.log('⚡ Creating PQ events...');
    const events = [];
    const eventTypes = ['voltage_dip', 'voltage_swell', 'harmonic'];
    const severities = ['critical', 'high', 'medium', 'low'];
    const statuses = ['new', 'acknowledged', 'resolved'];
    
    for (let i = 0; i < 25; i++) {
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
        status: statuses[Math.floor(Math.random() * statuses.length)],
        cause: 'Equipment Failure',
        affected_phases: ['A', 'B', 'C']
      });
    }
    
    const { data: eventData, error: eventError } = await supabase
      .from('pq_events')
      .insert(events)
      .select();
    
    if (eventError) {
      console.error('❌ Error creating events:', eventError);
      return;
    }
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
    
    if (sarfiError) {
      console.error('❌ Error creating SARFI metrics:', sarfiError);
      return;
    }
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
    
    if (healthError) {
      console.error('❌ Error creating health records:', healthError);
      return;
    }
    console.log(`✅ Created ${healthRecords.length} health records`);
    
    console.log('🎉 Database seeding completed successfully!');
    console.log('🔄 Refresh the dashboard to see the populated data');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    return false;
  }
})();