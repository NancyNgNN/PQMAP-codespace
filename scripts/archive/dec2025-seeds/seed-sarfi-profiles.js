#!/usr/bin/env node
/**
 * Seed script for SARFI Profiles and Weighting Factors
 * 
 * This script creates sample profiles for 2023, 2024, and 2025 with
 * randomized weighting factors for testing the SARFI configuration feature.
 * 
 * Usage:
 *   VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key node scripts/seed-sarfi-profiles.js
 * 
 * Or create a .env file with:
 *   VITE_SUPABASE_URL=your_url
 *   VITE_SUPABASE_ANON_KEY=your_key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file if it exists
let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// If not in env, try to read from .env file
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
    // .env file doesn't exist, that's okay
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('');
  console.error('Please provide credentials in one of these ways:');
  console.error('1. Set environment variables:');
  console.error('   VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key node scripts/seed-sarfi-profiles.js');
  console.error('');
  console.error('2. Create a .env file in the project root with:');
  console.error('   VITE_SUPABASE_URL=your_url');
  console.error('   VITE_SUPABASE_ANON_KEY=your_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedSARFIProfiles() {
  console.log('🌱 Starting SARFI profiles seeding...\n');

  try {
    // 1. Fetch existing meters
    console.log('📊 Fetching PQ meters...');
    const { data: meters, error: metersError } = await supabase
      .from('pq_meters')
      .select('id, meter_id, location')
      .limit(50); // Limit for testing

    if (metersError) throw metersError;
    if (!meters || meters.length === 0) {
      console.error('❌ No meters found. Please seed meters first.');
      console.error('');
      console.error('Run one of these commands first:');
      console.error('  node quick-seed.js');
      console.error('  node console-seed-fixed.js');
      console.error('');
      process.exit(1);
    }
    console.log(`✅ Found ${meters.length} meters\n`);

    // 2. Clear existing profiles and weights
    console.log('🧹 Clearing existing SARFI profiles...');
    const { error: clearError } = await supabase
      .from('sarfi_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (clearError && clearError.code !== 'PGRST116') {
      console.warn('⚠️  Warning clearing profiles:', clearError.message);
    }
    console.log('✅ Cleared existing profiles\n');

    // 3. Create profiles for 2023, 2024, 2025
    const years = [2023, 2024, 2025];
    const profiles = [];

    for (const year of years) {
      console.log(`📝 Creating profile for ${year}...`);
      
      const { data: profile, error: profileError } = await supabase
        .from('sarfi_profiles')
        .insert({
          name: `${year} Standard Profile`,
          description: `SARFI calculation profile for ${year} with regional weighting factors`,
          year: year,
          is_active: year === 2025, // Only 2025 is active
        })
        .select()
        .single();

      if (profileError) throw profileError;
      
      profiles.push(profile);
      console.log(`✅ Created profile: ${profile.name} (ID: ${profile.id})`);

      // 4. Create weighting factors for this profile
      console.log(`   Adding weighting factors for ${meters.length} meters...`);
      
      const weights = meters.map(meter => {
        // Generate realistic weighting factors based on typical customer counts
        // Residential transformers: 10-100 customers (0.5-5.0 weight)
        // Commercial: 5-50 customers (0.3-3.0 weight)
        // Industrial: 1-20 customers (0.1-2.0 weight)
        const baseWeight = 0.5 + Math.random() * 4.5; // 0.5 to 5.0
        const variation = year === 2023 ? 0.9 : year === 2024 ? 1.0 : 1.1; // Slight variation by year
        
        return {
          profile_id: profile.id,
          meter_id: meter.id,
          weight_factor: parseFloat((baseWeight * variation).toFixed(4)),
          notes: `Auto-generated for ${year}`,
        };
      });

      const { error: weightsError } = await supabase
        .from('sarfi_profile_weights')
        .insert(weights);

      if (weightsError) throw weightsError;
      
      console.log(`   ✅ Added ${weights.length} weighting factors\n`);
    }

    // 5. Summary
    console.log('\n✨ SARFI Profiles Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Profiles created: ${profiles.length}`);
    console.log(`   - Meters per profile: ${meters.length}`);
    console.log(`   - Total weight records: ${profiles.length * meters.length}`);
    console.log('\n📋 Created Profiles:');
    
    profiles.forEach(p => {
      console.log(`   - ${p.name} (${p.year}) ${p.is_active ? '✓ Active' : ''}`);
    });

    console.log('\n💡 Next Steps:');
    console.log('   1. Run the application');
    console.log('   2. Navigate to SARFI dashboard');
    console.log('   3. Click the settings button (top right)');
    console.log('   4. Test different profile selections');
    console.log('   5. Enable "Show Data Table" to see meter-level data');

  } catch (error) {
    console.error('\n❌ Error seeding SARFI profiles:', error);
    process.exit(1);
  }
}

// Run the seed function
seedSARFIProfiles();
