import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      // Exchange the code for a session
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
      const response = NextResponse.redirect(new URL('https://s06recipeai.vercel.app'));
      
      // Set access and refresh tokens as cookies
      if (data.session) {
        response.cookies.set('sb-access-token', data.session.access_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        });
      }
      
      return response;
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.json({ error: 'Unexpected error during authentication' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
}
