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

      // Redirect to homepage without tokens in URL
      return NextResponse.redirect(new URL('https://s06recipeai.vercel.app'));
    } catch (err) {
      console.error('Unexpected error in auth callback:', err);
      return NextResponse.json({ error: 'Unexpected error during authentication' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
}
