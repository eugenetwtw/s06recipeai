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
  try {
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
      try {
        if (!(file instanceof File)) {
          results.push({ error: 'Invalid file object', file: typeof file });
          continue;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${uploadType}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET_NAME!)
          .upload(fileName, file);

        if (uploadError) {
          results.push({ error: uploadError.message, file: file.name });
          continue;
        }

        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from(process.env.SUPABASE_STORAGE_BUCKET_NAME!)
          .getPublicUrl(fileName);
        
        // Ensure we have a valid URL
        const imageUrl = publicUrl || '';
        
        // Log the image URL for debugging
        console.log('Image URL:', imageUrl);

        let analysis = '{}';
        try {
          let prompt = '';
          
          if (uploadType === 'kitchen_tools') {
            prompt = `Analyze this image of kitchen tools or appliances. 
            Identify all kitchen tools, appliances, and cookware visible in the image.
            Return ONLY a JSON object with a "kitchenTools" array containing the names of all identified items.
            Example: {"kitchenTools": ["Microwave", "Blender", "Knife Set", "Cutting Board"]}`;
          } else {
            prompt = `Describe the contents of this ${uploadType} image in detail.`;
          }
          
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: imageUrl } }
                ]
              }
            ],
            response_format: uploadType === 'kitchen_tools' ? { type: 'json_object' } : undefined
          });
          
          let content = response.choices[0].message.content || '{}';
          
          // For kitchen tools, ensure we have valid JSON
          if (uploadType === 'kitchen_tools') {
            try {
              // Try to parse the content as JSON
              const parsedContent = JSON.parse(content);
              // Ensure it has the kitchenTools array
              if (!parsedContent.kitchenTools) {
                parsedContent.kitchenTools = [];
              }
              analysis = JSON.stringify(parsedContent);
            } catch (jsonError) {
              // If parsing fails, create a default structure
              analysis = '{"kitchenTools": []}';
              console.error('Failed to parse AI response as JSON:', jsonError);
            }
          } else {
            analysis = content;
          }
        } catch (aiError) {
          results.push({ error: 'OpenAI analysis failed', details: aiError instanceof Error ? aiError.message : aiError, file: file.name });
          continue;
        }

        // Save to appropriate table
        let insertResult;
        try {
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
              
              // Process the meal history image with AI
              try {
                // Use absolute URL for API endpoint to ensure it works in all environments
                const apiUrl = new URL('/api/process-meal-history', request.url).href;
                console.log('Processing meal history with URL:', apiUrl);
                
                const processResponse = await fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    imageUrl,
                    text: `Processing image from ${fileName}`
                  })
                });
                
                if (!processResponse.ok) {
                  const errorData = await processResponse.json();
                  console.error('Process meal history response error:', errorData);
                  throw new Error(errorData.error || 'Failed to process meal history');
                }
                
                const processResult = await processResponse.json();
                console.log('Process meal history result:', processResult);
              } catch (processError) {
                console.error('Error processing meal history image:', processError);
                // Continue even if processing fails - don't throw error to allow upload to complete
              }
              break;
          }
        } catch (dbError) {
          results.push({ error: 'Database insert failed', details: dbError instanceof Error ? dbError.message : dbError, file: file.name });
          continue;
        }

        results.push({ 
          message: 'Upload successful', 
          imageUrl, 
          analysis,
          file: file.name
        });
      } catch (fileError) {
        results.push({ error: 'Unexpected error during file processing', details: fileError instanceof Error ? fileError.message : fileError });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('API /api/upload error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
