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
  // Get the user ID from the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
  }
  
  const userId = session.user.id;
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const uploadType = formData.get('type') as string;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Upload to Supabase storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${uploadType}_${Date.now()}.${fileExt}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(process.env.SUPABASE_STORAGE_BUCKET_NAME!)
    .upload(fileName, file);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
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

  return NextResponse.json({ 
    message: 'Upload successful', 
    imageUrl, 
    analysis 
  });
}
