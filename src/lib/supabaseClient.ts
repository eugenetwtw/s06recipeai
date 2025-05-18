import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a custom Supabase client with auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Set the site URL dynamically based on the current environment
    // This is used by Supabase to determine where to redirect after authentication
    ...(isBrowser && { 
      site: window.location.origin,
      flowType: 'pkce',
    }),
  }
});

// If we're in a browser environment, log the site URL for debugging
if (isBrowser) {
  console.log('Supabase client initialized with site URL:', window.location.origin);
}
