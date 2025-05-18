import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Use the authenticated user's ID, not the one from the request body
    const userId = user.id;
    
    const body = await request.json();
    const { text, imageUrl } = body;
    
    console.log('Processing meal history with:', { userId, hasImageUrl: !!imageUrl, hasText: !!text });

    let mealData = {};

    // If we have an image URL, process the image
    if (imageUrl) {
      const imagePrompt = `
        Analyze this image of a food delivery receipt, restaurant receipt, or meal photo and extract structured information.
        The receipt may be in any language including English, Chinese, Japanese, Korean, or other languages.
        
        For receipts from food delivery apps (like UberEats, Foodpanda, DoorDash, etc.) or restaurant receipts:
        - Look for the restaurant name, which may be in large text or at the top of the receipt
        - Identify all food items/dishes ordered, which are usually listed with quantities and prices
        - Find the date and time of the order if available
        - Determine the cuisine type based on the restaurant name and dishes
        
        For photos of actual food:
        - Describe what dishes are visible
        - Try to identify the cuisine type based on the appearance
        
        Please extract the following information and format it as JSON:
        - restaurant_name: The name of the restaurant (preserve original language if possible)
        - order_date: The date of the order (if available)
        - dishes: An array of dishes ordered, with each dish as a string (preserve original language if possible)
        - cuisine_type: The type of cuisine (e.g., Japanese, Chinese, Italian, etc.)
        
        Example for a Japanese restaurant receipt:
        {
          "restaurant_name": "SUKIYA",
          "order_date": "2025-04-20",
          "dishes": ["Kid Beef Donburi", "Kid Curry Rice", "Orange Juice"],
          "cuisine_type": "Japanese"
        }
        
        Return ONLY the JSON without any additional text or explanation.
      `;

      const imageResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'user', 
            content: [
              { type: "text", text: imagePrompt },
              { type: "image_url", image_url: { url: imageUrl } }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      });

      try {
        mealData = JSON.parse(imageResponse.choices[0].message.content || '{}');
      } catch (parseError) {
        console.error('Error parsing image analysis JSON:', parseError);
        mealData = {
          restaurant_name: "Unknown Restaurant",
          dishes: ["Unknown Dish"],
          cuisine_type: "other"
        };
      }
    } 
    // If we have text, process the text
    else if (text) {
      const textPrompt = `
        Analyze the following text from a food delivery service order history (like UberEats, Foodpanda, DoorDash, etc.) 
        or restaurant receipt and extract structured information about the meals.
        The text may be in any language including English, Chinese, Japanese, Korean, or other languages.
        
        Text:
        ${text}
        
        Please extract the following information and format it as JSON:
        - restaurant_name: The name of the restaurant (preserve original language if possible)
        - order_date: The date of the order (if available)
        - dishes: An array of dishes ordered, with each dish as a string (preserve original language if possible)
        - cuisine_type: The type of cuisine (e.g., Japanese, Chinese, Italian, etc.)
        
        Example for a Japanese restaurant receipt:
        {
          "restaurant_name": "SUKIYA",
          "order_date": "2025-04-20",
          "dishes": ["Kid Beef Donburi", "Kid Curry Rice", "Orange Juice"],
          "cuisine_type": "Japanese"
        }
        
        Return ONLY the JSON without any additional text or explanation.
      `;

      const textResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: textPrompt }],
        response_format: { type: 'json_object' }
      });

      try {
        mealData = JSON.parse(textResponse.choices[0].message.content || '{}');
      } catch (parseError) {
        console.error('Error parsing text analysis JSON:', parseError);
        mealData = {
          restaurant_name: "Unknown Restaurant",
          dishes: ["Unknown Dish"],
          cuisine_type: "other"
        };
      }
    } else {
      return NextResponse.json({ error: 'Either text or imageUrl is required' }, { status: 400 });
    }

    // Generate a natural language summary using OpenAI
    const summaryPrompt = `
      Write a concise, natural language summary of the following meal order JSON for a user-facing meal history log.
      The data may contain restaurant names and dishes in various languages including English, Chinese, Japanese, etc.
      Preserve the original language names but provide translations in parentheses if the names are not in English.
      Focus on making it readable and friendly. Here is the JSON:
      ${JSON.stringify(mealData, null, 2)}
      
      Example summary: "Order from SUKIYA (すき家) Japanese restaurant on April 20, 2025. 
      Ordered Kid Beef Donburi, Kid Curry Rice, and Orange Juice."
    `;

    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: summaryPrompt }],
      max_tokens: 120,
    });

    const naturalLanguageSummary = summaryResponse.choices[0].message.content?.trim() || '';

    // Save to Supabase - store the meal data and the summary
    const { data, error } = await supabase
      .from('meal_history')
      .insert({
        user_id: userId,
        image_url: imageUrl || '',
        detected_ingredients: mealData, // Using detected_ingredients as a temporary field for meal data
        natural_language_summary: naturalLanguageSummary
      });

    if (error) {
      console.error('Error saving meal history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Meal history processed successfully',
      data: mealData,
      summary: naturalLanguageSummary
    });
  } catch (error) {
    console.error('Error processing meal history:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { status: 500 });
  }
}
