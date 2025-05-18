'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthHandler() {
  const router = useRouter();

  useEffect(() => {
    // Check if we have tokens in the URL fragment
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // Parse the hash to extract tokens
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const tokenType = hashParams.get('token_type');
        
        if (accessToken && refreshToken) {
          // Set the session in Supabase
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          }).then(({ data, error }) => {
            if (error) {
              console.error('Error setting session:', error);
            } else {
              console.log('Session set successfully');
              
              // Clear the hash from the URL without triggering a navigation
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname + window.location.search
              );
              
              // Refresh the page to update the UI
              router.refresh();
            }
          });
        }
      }
    }
  }, [router]);

  return null; // This component doesn't render anything
}
