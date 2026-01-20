import { supabase } from '../lib/supabase';

export async function createDemoUser() {
  try {
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
      console.error('Error creating user:', signUpError);
      return { error: signUpError };
    }

    if (signUpData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: signUpData.user.id,
          email: 'admin@clp.com',
          full_name: 'Admin User',
          role: 'admin',
          department: 'Power Quality',
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      return { success: true, user: signUpData.user };
    }

    return { error: 'No user created' };
  } catch (error) {
    console.error('Unexpected error:', error);
    return { error };
  }
}
