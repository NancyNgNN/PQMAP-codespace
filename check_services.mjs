import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qfqvuepfuwnbwcdtkruu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmcXZ1ZXBmdXduYndjZHRrcnV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzNDQ5NzMsImV4cCI6MjA0NTkyMDk3M30.IjDEZCG2XOXCGAWlRdD1aZZt7QJJ3H4q0xwc-1NOwsY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServices() {
  console.log('🔍 Checking pq_service_records table...\n');
  
  // Check total count
  const { count: totalCount } = await supabase
    .from('pq_service_records')
    .select('*', { count: 'exact', head: true });
  
  console.log('📊 Total service records:', totalCount);
  
  // Get sample records with customer join
  const { data: samples, error } = await supabase
    .from('pq_service_records')
    .select(\`
      id,
      customer_id,
      service_type,
      start_date,
      end_date,
      status,
      customer:customers(account_number, name)
    \`)
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('\n📋 Sample records:');
  samples?.forEach((record, i) => {
    console.log(\`\n\${i + 1}. Service ID: \${record.id}\`);
    console.log(\`   Customer: \${record.customer?.account_number} - \${record.customer?.name}\`);
    console.log(\`   Service Type: \${record.service_type}\`);
    console.log(\`   Start Date: \${record.start_date}\`);
    console.log(\`   End Date: \${record.end_date || 'Ongoing'}\`);
    console.log(\`   Status: \${record.status || 'N/A'}\`);
  });
}

checkServices().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
