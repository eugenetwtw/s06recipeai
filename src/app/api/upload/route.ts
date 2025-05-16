import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  // Extract access token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
  }

  // Get the user from the token
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user?.id) {
    return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
  }

  const userId = user.id;
  const formData = await request.formData();
  // Support multiple files
  const files = formData.getAll('files') as File[];
  const uploadType = formData.get('type') as string;

  if (!files.length) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Upload to Supabase storage
  const results = [];

  for (const file of files) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${uploadType}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME!)
      .upload(fileName, file);

    if (uploadError) {
      results.push({ error: uploadError.message, file: file.name });
      continue;
    }

    // Analyze image with OpenAI
    const imageUrl = supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET_NAME!)
      .getPublicUrl(fileName).data.publicUrl;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: `Describe the contents of this ${uploadType} image in detail.` },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    });

    const analysis = response.choices[0].message.content || '{}';

    // Save to appropriate table
    let insertResult;
    switch(uploadType) {
      case 'refrigerator':
        insertResult = await supabase
          .from('refrigerator_contents')
          .insert({ 
            user_id: userId, 
            image_url: imageUrl, 
            detected_ingredients: JSON.parse(analysis) 
          });
        break;
      case 'kitchen_tools':
        insertResult = await supabase
          .from('kitchen_tools')
          .insert({ 
            user_id: userId, 
            image_url: imageUrl, 
            detected_tools: JSON.parse(analysis) 
          });
        break;
      case 'meal_history':
        insertResult = await supabase
          .from('meal_history')
          .insert({ 
            user_id: userId, 
            image_url: imageUrl 
          });
        break;
    }

    results.push({ 
      message: 'Upload successful', 
      imageUrl, 
      analysis,
      file: file.name
    });
  }

  return NextResponse.json({ results });
}
