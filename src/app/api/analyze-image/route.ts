import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAIService } from '@/lib/openai-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const analysisResult = await OpenAIService.analyzeImage(imageUrl);

    // Get the user ID from the current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const userId = session.user.id;
    
    return NextResponse.json({ 
      analysis: analysisResult,
      userId: userId
    });
  } catch (error) {
    console.error('Image Analysis API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze image', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
