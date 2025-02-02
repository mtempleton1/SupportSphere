import { createClient } from '@supabase/supabase-js'

export interface SupabaseConfig {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey?: string;  // Optional service role key for admin operations
}

export function createSupabaseClient(config: SupabaseConfig, options?: { storageKey?: string }) {
  // Validate required config
  const url = config.projectUrl
  if (!url) throw new Error('Supabase project URL is required')

  // Use service role key if provided, otherwise use anon key
  const key = config.serviceRoleKey || config.anonKey
  if (!key) throw new Error('Either service role key or anon key is required')

  // Create client with unique storage key
  return createClient(url, key, {
    auth: {
      storageKey: options?.storageKey || 'sb-' + Math.random(),
      persistSession: false, // Disable session persistence in tests
      autoRefreshToken: false
    }
  })
}

// Create a default client for backwards compatibility
const defaultConfig: SupabaseConfig = {
  projectUrl: import.meta.env?.VITE_SUPABASE_PROJECT_URL,
  anonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY
};
if (!defaultConfig.projectUrl || !defaultConfig.anonKey) {
  console.error('Missing required Supabase environment variables:', {
    projectUrl: defaultConfig.projectUrl,
    hasAnonKey: !!defaultConfig.anonKey
  });
}
export const supabase = createSupabaseClient(defaultConfig)

// // Create a service role client for admin operations
// export async function getTestUser() {
//   const serviceConfig: SupabaseConfig = {
//     projectUrl: import.meta.env.VITE_SUPABASE_PROJECT_URL,
//     anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
//     serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_KEY
//   };

//   // Use a different storage key for test client
//   const adminClient = createSupabaseClient(serviceConfig, { 
//     storageKey: 'sb-test-auth'
//   });
  
//   try {
//     // Try to fetch the first active staff user from the database
//     const { data: user, error } = await adminClient
//       .from('UserProfiles')
//       .select('*')
//       .eq('userType', 'staff')
//       .eq('isActive', true)
//       .limit(1)
//       .maybeSingle(); // Use maybeSingle instead of single to avoid error if no rows found

//     if (error) {
//       console.warn('Error fetching test user:', error.message);
//     }

//     // If we found a user, return it
//     if (user) {
//       return user;
//     }

//     // If no user found or there was an error, return a mock user for testing
//     return {
//       userId: '00000000-0000-0000-0000-000000000000',
//       name: 'Test User',
//       email: 'test@example.com',
//       userType: 'staff',
//       roleId: '00000000-0000-0000-0000-000000000000',
//       accountId: '00000000-0000-0000-0000-000000000000',
//       isActive: true,
//       isSuspended: false,
//       isEmailVerified: true,
//       isOnline: false,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     };
//   } catch (err) {
//     console.warn('Error in getTestUser:', err);
//     // Return mock user in case of any error
//     return {
//       userId: '00000000-0000-0000-0000-000000000000',
//       name: 'Test User',
//       email: 'test@example.com',
//       userType: 'staff',
//       roleId: '00000000-0000-0000-0000-000000000000',
//       accountId: '00000000-0000-0000-0000-000000000000',
//       isActive: true,
//       isSuspended: false,
//       isEmailVerified: true,
//       isOnline: false,
//       createdAt: new Date().toISOString(),
//       updatedAt: new Date().toISOString()
//     };
//   }
// }