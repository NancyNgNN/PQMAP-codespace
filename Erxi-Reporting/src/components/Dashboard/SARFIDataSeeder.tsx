import { useState } from 'react';
import { Database, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

const WEIGHT_FACTORS: Record<string, number> = {
  '400kV': 1.5,
  '132kV': 1.2,
  '11kV': 1.0,
  '380V': 0.8,
};

export default function SARFIDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addProgress = (message: string) => {
    setProgress(prev => [...prev, message]);
  };

  const seedData = async () => {
    setIsSeeding(true);
    setProgress([]);
    setError(null);

    try {
      addProgress('🌱 Starting SARFI data seeding...');

      // Step 1: Get or create substation
      addProgress('📍 Setting up substation...');
      const { data: existingSubstations } = await supabase
        .from('substations')
        .select('id, name')
        .limit(1);

      let substationId: string;
      if (existingSubstations && existingSubstations.length > 0) {
        substationId = existingSubstations[0].id;
        addProgress(`✓ Using existing substation: ${existingSubstations[0].name}`);
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

        substationId = newSubstation!.id;
        addProgress(`✓ Created substation: ${newSubstation!.name}`);
      }

      // Step 2: Create meters
      addProgress('⚡ Creating PQ meters...');
      const createdMeters = [];

      for (const meterData of SAMPLE_METERS) {
        const { data: existing } = await supabase
          .from('pq_meters')
          .select('id, meter_id')
          .eq('meter_id', meterData.meter_id)
          .single();

        if (existing) {
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

          if (newMeter) createdMeters.push(newMeter);
        }
      }
      addProgress(`✓ Meters ready: ${createdMeters.length}`);

      // Step 3: Create profile
      addProgress('📊 Creating SARFI profile...');
      const { data: existingProfile } = await supabase
        .from('sarfi_profiles')
        .select('id, name')
        .eq('year', 2025)
        .eq('name', '2025 Standard Profile')
        .single();

      let profileId: string;
      if (existingProfile) {
        profileId = existingProfile.id;
        addProgress('✓ Using existing profile');
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

        profileId = newProfile!.id;
        addProgress('✓ Created profile: 2025 Standard Profile');
      }

      // Step 4: Create weights
      addProgress('⚖️  Creating profile weights...');
      for (const meter of createdMeters) {
        const meterInfo = SAMPLE_METERS.find(m => m.meter_id === meter.meter_id);
        const weightFactor = WEIGHT_FACTORS[meterInfo?.voltage_level || '11kV'] || 1.0;

        await supabase
          .from('sarfi_profile_weights')
          .upsert([{
            profile_id: profileId,
            meter_id: meter.id,
            weight_factor: weightFactor,
          }], { onConflict: 'profile_id,meter_id' });
      }
      addProgress(`✓ Profile weights created`);

      // Step 5: Create events
      addProgress('⚡ Creating sample PQ events...');
      const events = [];
      const now = new Date();

      for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
        const eventMonth = new Date(now);
        eventMonth.setMonth(now.getMonth() - monthOffset);

        for (const meter of createdMeters) {
          const eventCount = Math.floor(Math.random() * 11) + 10;

          for (let i = 0; i < eventCount; i++) {
            const eventDate = new Date(eventMonth);
            eventDate.setDate(Math.floor(Math.random() * 28) + 1);
            eventDate.setHours(Math.floor(Math.random() * 24));

            let magnitude: number;
            const rand = Math.random();
            if (rand < 0.5) magnitude = 70 + Math.random() * 20;
            else if (rand < 0.75) magnitude = 50 + Math.random() * 20;
            else if (rand < 0.9) magnitude = 20 + Math.random() * 30;
            else magnitude = 5 + Math.random() * 15;

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

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        await supabase.from('pq_events').insert(batch);
        addProgress(`✓ Inserted batch ${Math.floor(i / batchSize) + 1}`);
      }

      addProgress(`✅ Complete! Created ${events.length} events`);
      addProgress('💡 Reload the page to see updated SARFI data');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      addProgress(`❌ Error: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-bold text-slate-900">SARFI Data Seeder</h3>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Click the button below to populate the database with demonstration SARFI data including meters, profiles, weights, and sample PQ events.
      </p>

      <button
        onClick={seedData}
        disabled={isSeeding}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
      >
        {isSeeding ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Seeding Database...
          </>
        ) : (
          <>
            <Database className="w-4 h-4" />
            Seed SARFI Data
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {progress.length > 0 && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg max-h-64 overflow-y-auto">
          <div className="space-y-1 font-mono text-xs">
            {progress.map((msg, i) => (
              <div key={i} className="text-slate-700">{msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
