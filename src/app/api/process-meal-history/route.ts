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

    // Process the text with OpenAI to extract meal history information
    const prompt = `
      Analyze the following text from a food delivery service order history (like UberEats, Foodpanda, DoorDash, etc.) 
      and extract structured information about the meals. 
      
      Text:
      ${text}
      
      Please extract the following information and format it as JSON:
      - restaurant_name: The name of the restaurant
      - order_date: The date of the order (if available)
      - dishes: An array of dishes ordered, with each dish containing:
        - name: The name of the dish
        - quantity: The quantity ordered (if available)
        - price: The price (if available)
      - cuisine_type: The type of cuisine (if you can determine it)
      
      Return ONLY the JSON without any additional text or explanation.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const mealData = JSON.parse(response.choices[0].message.content || '{}');

    // Save to Supabase - store the meal data in the detected_ingredients field
    // since the meal_history table doesn't have an order_details column
    const mealDataString = JSON.stringify(mealData);
    
    const { data, error } = await supabase
      .from('meal_history')
      .insert({
        user_id: userId,
        detected_ingredients: mealData // Using detected_ingredients as a temporary field for meal data
      });

    if (error) {
      console.error('Error saving meal history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Meal history processed successfully',
      data: mealData
    });
  } catch (error) {
    console.error('Error processing meal history:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }, { status: 500 });
  }
}
