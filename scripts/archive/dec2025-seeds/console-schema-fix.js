// Mother Event Schema Fix - Console Script for Browser
// Run this in the browser console to get the SQL commands needed

console.log('🔧 Mother Event Schema Fix');
console.log('=========================');
console.log('');
console.log('❌ Error: The database is missing columns needed for mother event functionality');
console.log('');
console.log('🎯 Quick Fix:');
console.log('1. Open your Supabase project dashboard in a new tab');
console.log('2. Go to "SQL Editor" in the left sidebar');
console.log('3. Create a new query and copy-paste the SQL below');
console.log('4. Click "RUN" to execute');
console.log('5. Come back and try generating mother events again');
console.log('');
console.log('📋 SQL TO COPY AND RUN:');
console.log('========================');
console.log('');

const sqlCommands = [
  '-- Add missing mother event columns',
  'ALTER TABLE pq_events',
  'ADD COLUMN IF NOT EXISTS is_child_event BOOLEAN DEFAULT FALSE,',
  'ADD COLUMN IF NOT EXISTS grouping_type TEXT CHECK (grouping_type IN (\'automatic\', \'manual\')) DEFAULT NULL,',
  'ADD COLUMN IF NOT EXISTS grouped_at TIMESTAMPTZ DEFAULT NULL;',
  '',
  '-- Add indexes for performance',
  'CREATE INDEX IF NOT EXISTS idx_pq_events_is_child_event ON pq_events (is_child_event);',
  'CREATE INDEX IF NOT EXISTS idx_pq_events_grouping_type ON pq_events (grouping_type);'
];

sqlCommands.forEach(line => console.log(line));

console.log('');
console.log('✅ After running the SQL, the mother event generator should work!');
console.log('');
console.log('🚀 Alternative: If you have CLI access, you can run:');
console.log('   supabase db reset');
console.log('   (This will apply all migrations including the mother event schema)');
console.log('');

// Make the SQL easily copyable
const fullSQL = sqlCommands.join('\n');
console.log('📄 Complete SQL (click to expand and copy):');
console.groupCollapsed('Complete SQL Commands');
console.log(fullSQL);
console.groupEnd();

// Try to copy to clipboard if supported
if (navigator.clipboard && window.isSecureContext) {
  navigator.clipboard.writeText(fullSQL).then(() => {
    console.log('✅ SQL commands copied to clipboard!');
  }).catch(() => {
    console.log('ℹ️ Could not copy to clipboard - please copy the SQL manually');
  });
} else {
  console.log('ℹ️ Copy the SQL commands manually from above');
}