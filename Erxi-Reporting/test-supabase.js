// Test script to verify Supabase connection and create demo user
// Run this in the browser console (F12) on your PQMAP login page

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('❌ Supabase connection error:', error);
      return;
    }
    
    console.log('✅ Supabase connected successfully');
    
    // Test database access - check if profiles table exists
    const { data: profilesTest, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ Database schema error (profiles table):', profilesError);
      console.log('💡 You need to run the database migration in your Supabase SQL editor');
      return;
    }
    
    console.log('✅ Database schema is set up correctly');
    
    // Test user creation
    console.log('🔧 Testing demo user creation...');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@clp.com',
      password: 'admin123',
      options: {
        data: {
          full_name: 'Admin User',
        },
      },
    });

    if (signUpError) {
      console.error('❌ User creation error:', signUpError);
      if (signUpError.message.includes('already registered')) {
        console.log('ℹ️ User already exists, trying to sign in...');
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'admin@clp.com',
          password: 'admin123'
        });
        
        if (signInError) {
          console.error('❌ Sign in error:', signInError);
        } else {
          console.log('✅ Successfully signed in with existing user');
        }
      }
      return;
    }
    
    console.log('✅ Demo user created successfully:', signUpData);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testSupabaseConnection();