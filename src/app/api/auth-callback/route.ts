import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams } = url;
  const code = searchParams.get('code');
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  
  // Get the language parameter
  const lang = searchParams.get('lang') || 'en';
  
  // Check if we have a code (authorization code flow) or tokens in the URL (implicit flow)
  if (code) {
    try {
      // Authorization code flow - exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Error exchanging code for session:', error);
        return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
      }

      // Check if this is a demo account login and reset the demo data if needed
      if (data.session && data.session.user) {
        const userEmail = data.session.user.email;
        
        // Reset demo account data
        if (userEmail === 'demo@demo.com') {
          // Reset English demo user data
          await supabase.rpc('reset_demo_user_data');
        } else if (userEmail === 'demo-zh-Hant@demo.com') {
          // Reset Traditional Chinese demo user data
          await supabase.rpc('reset_zh_hant_demo_user_data');
        }
      }

      // Set session cookies manually before redirecting
      // Get the origin from the request to support both local development and production
      const requestUrl = new URL(request.url);
      
      // Use the redirect_to or origin parameter if provided, otherwise use the request origin
      const redirectTo = requestUrl.searchParams.get('redirect_to');
      const originalOrigin = requestUrl.searchParams.get('origin');
      const origin = redirectTo || originalOrigin || requestUrl.origin;
      
      console.log('Auth callback redirecting to origin:', origin);
      
      // Preserve the language parameter if it exists in the request
      const lang = requestUrl.searchParams.get('lang') || 'en';
      const redirectUrl = new URL('/', origin);
      redirectUrl.searchParams.set('lang', lang);
      
      const response = NextResponse.redirect(redirectUrl);
      
      // Set access and refresh tokens as cookies
      if (data.session) {
        // Determine if the request is HTTPS
        const isSecure = origin.startsWith('https://');
        response.cookies.set('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: isSecure,
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.json({ error: 'Unexpected error during authentication' }, { status: 500 });
    }
  }

  // If we don't have a code but we might have tokens in the URL fragment
  // We'll redirect to the homepage with the language parameter
  // The client-side code will handle extracting tokens from the URL fragment
  
  // Use the redirect_to or origin parameter if provided, otherwise use the request origin
  const redirectTo = url.searchParams.get('redirect_to');
  const originalOrigin = url.searchParams.get('origin');
  const origin = redirectTo || originalOrigin || url.origin;
  
  console.log('Auth callback (no code) redirecting to origin:', origin);
  
  const redirectUrl = new URL('/', origin);
  redirectUrl.searchParams.set('lang', lang);
  
  return NextResponse.redirect(redirectUrl);
}
