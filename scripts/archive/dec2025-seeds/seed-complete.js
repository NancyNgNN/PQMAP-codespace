#!/usr/bin/env node
/**
 * Complete Database Seeder
 * Seeds all necessary data including substations, meters, events, and SARFI profiles
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key === 'VITE_SUPABASE_URL') supabaseUrl = value;
      if (key === 'VITE_SUPABASE_ANON_KEY') supabaseKey = value;
    }
  } catch (error) {
    console.error('❌ Could not read .env file');
    process.exit(1);
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCompleteDatabase() {
  console.log('🌱 Starting complete database seeding...\n');

  try {
    // 1. Seed Substations
    console.log('🏢 Creating substations...');
    const substations = [
      { name: 'Tsuen Wan', code: 'TW-SS01', voltage_level: '132kV', latitude: 22.3722, longitude: 114.1152, region: 'New Territories', status: 'operational' },
      { name: 'Causeway Bay', code: 'CB-SS01', voltage_level: '132kV', latitude: 22.2804, longitude: 114.1846, region: 'Hong Kong Island', status: 'operational' },
      { name: 'Kowloon Bay', code: 'KB-SS01', voltage_level: '132kV', latitude: 22.3218, longitude: 114.2116, region: 'Kowloon', status: 'operational' },
      { name: 'Sha Tin', code: 'ST-SS01', voltage_level: '11kV', latitude: 22.3822, longitude: 114.1945, region: 'New Territories', status: 'operational' },
      { name: 'Central', code: 'CT-SS01', voltage_level: '132kV', latitude: 22.2819, longitude: 114.1579, region: 'Hong Kong Island', status: 'operational' },
    ];

    const { data: subData, error: subError } = await supabase
      .from('substations')
      .upsert(substations, { onConflict: 'code' })
      .select();

    if (subError) throw subError;
    console.log(`✅ Created ${subData.length} substations\n`);

    // 2. Seed PQ Meters
    console.log('📟 Creating PQ meters...');
    const meters = [];
    subData.forEach((sub, i) => {
      const meterCount = Math.floor(Math.random() * 3) + 2; // 2-4 meters per substation
      for (let j = 0; j < meterCount; j++) {
        meters.push({
          meter_id: `PQM-${String(i * 10 + j + 1).padStart(3, '0')}`,
          substation_id: sub.id,
          location: `${sub.name} - Floor ${j + 1}`,
          status: 'active',
          last_communication: new Date().toISOString(),
          firmware_version: '2.1.0',
          installed_date: '2023-01-15',
        });
      }
    });

    const { data: meterData, error: meterError } = await supabase
      .from('pq_meters')
      .upsert(meters, { onConflict: 'meter_id' })
      .select();

    if (meterError) throw meterError;
    console.log(`✅ Created ${meterData.length} PQ meters\n`);

    // 3. Seed SARFI Profiles
    console.log('📊 Creating SARFI profiles...');
    const years = [2023, 2024, 2025];
    const profiles = [];

    for (const year of years) {
      const { data: profile, error: profileError } = await supabase
        .from('sarfi_profiles')
        .upsert({
          name: `${year} Standard Profile`,
          description: `SARFI calculation profile for ${year} with regional weighting factors`,
          year: year,
          is_active: year === 2025,
        }, { onConflict: 'name' })
        .select()
        .single();

      if (profileError) {
        console.warn(`⚠️  Profile for ${year} may already exist:`, profileError.message);
        continue;
      }
      
      profiles.push(profile);
      console.log(`  ✓ Created profile: ${profile.name}`);

      // 4. Create weighting factors
      const weights = meterData.map(meter => {
        const baseWeight = 0.5 + Math.random() * 4.5; // 0.5 to 5.0
        const variation = year === 2023 ? 0.9 : year === 2024 ? 1.0 : 1.1;
        
        return {
          profile_id: profile.id,
          meter_id: meter.id,
          weight_factor: parseFloat((baseWeight * variation).toFixed(4)),
          notes: `Auto-generated for ${year}`,
        };
      });

      const { error: weightsError } = await supabase
        .from('sarfi_profile_weights')
        .upsert(weights, { onConflict: 'profile_id,meter_id' });

      if (weightsError) {
        console.warn(`⚠️  Some weights for ${year} may already exist:`, weightsError.message);
      } else {
        console.log(`  ✓ Added ${weights.length} weighting factors`);
      }
    }

    console.log(`✅ Created ${profiles.length} SARFI profiles\n`);

    // 5. Summary
    console.log('✨ Database seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`  - Substations: ${subData.length}`);
    console.log(`  - PQ Meters: ${meterData.length}`);
    console.log(`  - SARFI Profiles: ${profiles.length}`);
    console.log(`  - Weight Records: ${profiles.length * meterData.length}`);
    console.log('\n💡 Next Steps:');
    console.log('  1. Start the application: npm run dev');
    console.log('  2. Navigate to SARFI dashboard');
    console.log('  3. Click the settings button (⚙️)');
    console.log('  4. Test the configuration features');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedCompleteDatabase();
