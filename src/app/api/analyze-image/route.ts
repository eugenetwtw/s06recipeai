import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/openai-config';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const analysisResult = await OpenAIService.analyzeImage(imageUrl);

    return NextResponse.json({ 
      analysis: analysisResult,
      userId: 'anonymous' // Using 'anonymous' instead of userId
    });
  } catch (error) {
    console.error('Image Analysis API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to analyze image', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
