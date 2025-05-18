import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const { text, userId } = await request.json();
    if (!text || !userId) {
      return NextResponse.json({ error: 'Text and userId are required' }, { status: 400 });
    }

    // Use OpenAI to parse the text into a JSON array of tools
    const prompt = `
      You are given a list of kitchen tools as plain text. Extract an array of tool names in JSON.
      Text:
      ${text}

      Respond with ONLY a JSON array of strings, for example: ["Spatula", "Whisk", "Saucepan"]
    `;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const toolsArray = aiResponse.choices[0].message.content as unknown as string[];
    // Save into Supabase kitchen_tools table
    const { data, error } = await supabase
      .from('kitchen_tools')
      .insert({
        user_id: userId,
        image_url: '',
        detected_tools: toolsArray
      });

    if (error) {
      console.error('Error saving kitchen tools:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Kitchen tools processed successfully',
      tools: toolsArray
    });
  } catch (err) {
    console.error('Error in process-kitchen-tools:', err);
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
