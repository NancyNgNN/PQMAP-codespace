// Enhanced database seeding script with detailed debugging
// Copy and paste this entire script in browser console (F12) on PQMAP page

(async function debugQuickSeed() {
  console.log('🌱 Starting enhanced database seeding with debugging...');
  
  try {
    // Check if supabase is available
    if (typeof supabase === 'undefined') {
      console.error('❌ Supabase client not found. Make sure you are on the PQMAP page.');
      return;
    }
    
    console.log('✅ Supabase client found');
    
    // 1. Check current data before clearing
    console.log('🔍 Checking existing data...');
    const checkTables = ['substations', 'pq_meters', 'customers', 'pq_events', 'sarfi_metrics'];
    
    for (const table of checkTables) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`📊 Current ${table}: ${count || 0} records`);
      } catch (err) {
        console.log(`⚠️ Could not count ${table}:`, err);
      }
    }
    
    // 2. Enhanced clearing with proper field names
    console.log('🧹 Clearing existing data...');
    
    const clearConfigs = [
      { table: 'notifications', field: 'created_at' },
      { table: 'event_customer_impact', field: 'created_at' },
      { table: 'pq_events', field: 'created_at' },
      { table: 'pq_service_records', field: 'created_at' },
      { table: 'reports', field: 'created_at' },
      { table: 'notification_rules', field: 'created_at' },
      { table: 'sarfi_metrics', field: 'created_at' },
      { table: 'system_health', field: 'checked_at' }, // Different field!
      { table: 'customers', field: 'created_at' },
      { table: 'pq_meters', field: 'created_at' },
      { table: 'substations', field: 'created_at' }
    ];
    
    for (const { table, field } of clearConfigs) {
      try {
        const { error, count } = await supabase.from(table).delete().lt(field, '2030-01-01');
        if (error) {
          console.log(`⚠️ Could not clear ${table}:`, error);
        } else {
          console.log(`✅ Cleared ${table}: ${count || 0} rows deleted`);
        }
      } catch (err) {
        console.log(`⚠️ Error clearing ${table}:`, err);
      }
    }
    
    // 3. Insert substations with debugging
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
    
    console.log(`🔧 Attempting to insert ${substations.length} substations...`);
    const { data: subData, error: subError } = await supabase
      .from('substations')
      .insert(substations)
      .select();
    
    if (subError) {
      console.error('❌ Error creating substations:', subError);
      return;
    }
    console.log(`✅ Created ${subData.length} substations:`, subData.map(s => s.code));
    
    // 4. Insert PQ meters with debugging
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
    
    console.log(`🔧 Attempting to insert ${meters.length} meters...`);
    const { data: meterData, error: meterError } = await supabase
      .from('pq_meters')
      .insert(meters)
      .select();
    
    if (meterError) {
      console.error('❌ Error creating meters:', meterError);
      return;
    }
    console.log(`✅ Created ${meterData.length} PQ meters:`, meterData.map(m => m.meter_id));
    
    // 5. Insert customers with debugging
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
    
    console.log(`🔧 Attempting to insert ${customers.length} customers...`);
    const { data: custData, error: custError } = await supabase
      .from('customers')
      .insert(customers)
      .select();
    
    if (custError) {
      console.error('❌ Error creating customers:', custError);
      return;
    }
    console.log(`✅ Created ${custData.length} customers`);
    
    // 6. Insert PQ events with enhanced debugging
    console.log('⚡ Creating PQ events...');
    const events = [];
    const eventTypes = ['voltage_dip', 'voltage_swell', 'harmonic'];
    const severities = ['critical', 'high', 'medium', 'low'];
    const statuses = ['new', 'acknowledged', 'resolved'];
    
    console.log('🔧 Generating event data...');
    for (let i = 0; i < 30; i++) {
      const meter = meterData[Math.floor(Math.random() * meterData.length)];
      const substation = subData.find(s => s.id === meter.substation_id);
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      
      const event = {
        event_type: eventType,
        substation_id: substation.id,
        meter_id: meter.id,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        duration_ms: Math.floor(Math.random() * 5000) + 100,
        magnitude: Math.random() * 50 + 10,
        severity: severity,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        root_cause: 'Equipment fault',
        affected_phases: ['A', 'B', 'C'],
        is_mother_event: Math.random() < 0.1, // 10% chance
        parent_event_id: null // Always null for now to avoid UUID issues
      };
      
      events.push(event);
    }
    
    console.log(`🔧 Attempting to insert ${events.length} events...`);
    console.log('📝 Sample event structure:', events[0]);
    
    // Insert events in smaller batches to better identify issues
    const batchSize = 10;
    let totalInserted = 0;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      console.log(`🔄 Inserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(events.length/batchSize)} (${batch.length} events)...`);
      
      const { data: batchData, error: batchError } = await supabase
        .from('pq_events')
        .insert(batch)
        .select();
      
      if (batchError) {
        console.error(`❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, batchError);
        console.error('🔍 Problematic batch:', batch);
        break;
      } else {
        totalInserted += batchData.length;
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1} success: ${batchData.length} events`);
      }
    }
    
    console.log(`✅ Total events inserted: ${totalInserted}/${events.length}`);
    
    // 7. Insert SARFI metrics with debugging
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
    
    console.log(`🔧 Attempting to insert ${sarfiMetrics.length} SARFI metrics...`);
    const { data: sarfiData, error: sarfiError } = await supabase
      .from('sarfi_metrics')
      .insert(sarfiMetrics)
      .select();
    
    if (sarfiError) {
      console.error('❌ Error creating SARFI metrics:', sarfiError);
    } else {
      console.log(`✅ Created ${sarfiData.length} SARFI metrics`);
    }
    
    // 8. Insert system health with debugging
    console.log('💊 Creating system health records...');
    const healthRecords = [
      { component: 'server', status: 'healthy', message: 'All systems operational' },
      { component: 'database', status: 'healthy', message: 'Database responding normally' },
      { component: 'communication', status: 'degraded', message: 'Minor delays in SCADA' },
      { component: 'integration', status: 'healthy', message: 'All integrations active' }
    ];
    
    console.log(`🔧 Attempting to insert ${healthRecords.length} health records...`);
    const { error: healthError } = await supabase
      .from('system_health')
      .insert(healthRecords);
    
    if (healthError) {
      console.error('❌ Error creating health records:', healthError);
    } else {
      console.log(`✅ Created ${healthRecords.length} health records`);
    }
    
    // 9. Final verification
    console.log('🔍 Final verification...');
    for (const table of checkTables) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`📊 Final ${table}: ${count || 0} records`);
      } catch (err) {
        console.log(`⚠️ Could not verify ${table}:`, err);
      }
    }
    
    console.log('🎉 Database seeding completed!');
    console.log('📋 Summary:');
    console.log(`   - Substations: ${subData?.length || 0}`);
    console.log(`   - PQ Meters: ${meterData?.length || 0}`);
    console.log(`   - Customers: ${custData?.length || 0}`);
    console.log(`   - Events: ${totalInserted || 0}`);
    console.log(`   - SARFI Metrics: ${sarfiData?.length || 0}`);
    console.log('🔄 Refresh the dashboard to see the populated data');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    return false;
  }
})();