import { supabase } from '../lib/supabase';

/**
 * Apply Mother Event Grouping Database Schema Updates
 * This script adds the missing columns needed for mother event functionality
 */

export async function applyMotherEventSchemaUpdates() {
  console.log('🔧 Applying Mother Event Grouping schema updates...');
  
  try {
    // Check if columns already exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('pq_events')
      .select('is_child_event, grouping_type, grouped_at')
      .limit(1);
    
    if (!testError && testData !== null) {
      console.log('✅ Schema columns already exist - no update needed');
      return { success: true, message: 'Schema columns already exist' };
    }
    
    console.log('🔍 Missing columns detected, applying schema updates...');
    
    // Apply the schema updates using SQL
    const schemaUpdates = `
      -- Add mother event grouping columns
      ALTER TABLE pq_events 
      ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN ('automatic', 'manual')) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;
      
      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_pq_events_is_child_event ON pq_events (is_child_event);
      CREATE INDEX IF NOT EXISTS idx_pq_events_grouping_type ON pq_events (grouping_type);
    `;
    
    // Execute the schema updates using rpc or direct query
    const { error: schemaError } = await supabase.rpc('exec_sql', { 
      sql: schemaUpdates 
    });
    
    if (schemaError) {
      console.error('❌ Schema update failed:', schemaError);
      console.log('📝 Manual fix required:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Run the following SQL:');
      console.log('');
      console.log('ALTER TABLE pq_events');
      console.log('ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,');
      console.log('ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN (\'automatic\', \'manual\')) DEFAULT NULL,');
      console.log('ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;');
      console.log('');
      console.log('4. Then try generating mother events again');
      
      return { 
        success: false, 
        message: 'Schema update failed - manual SQL execution required',
        sqlToRun: schemaUpdates
      };
    }
    
    console.log('✅ Schema updates applied successfully');
    return { success: true, message: 'Schema updates applied successfully' };
    
  } catch (error) {
    console.error('❌ Error applying schema updates:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// If running directly
if (typeof window !== 'undefined' && window.location) {
  // Browser environment
  console.log('Run applyMotherEventSchemaUpdates() to apply schema updates');
}