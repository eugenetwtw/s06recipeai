import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/openai-config';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authentication required. Please log in.');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the token with Supabase
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      throw new Error('Authentication required. Please log in.');
    }
    const userId = user.id;

    // Parse request body
    const { 
      ingredients, 
      refrigeratorContents, 
      cookingTools, 
      dietaryPreferences 
    } = await request.json();

    // Prepare context for recipe generation
    const context = JSON.stringify({
      refrigeratorContents,
      cookingTools,
      dietaryPreferences
    });

    // Generate recipe using OpenAI
    const recipeContent = await OpenAIService.generateRecipe(
      ingredients, 
      context
    );

    // Parse and structure recipe data
    const recipeData = {
      user_id: userId,
      recipe_name: recipeContent?.match(/^([^\n]+)/)?.[1] || 'Unnamed Recipe',
      ingredients: ingredients,
      instructions: recipeContent,
      generated_at: new Date().toLocaleString()
    };

    // Insert recipe into Supabase
    const { data, error: insertError } = await supabase
      .from('generated_recipes')
      .insert(recipeData)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ 
      recipe: recipeContent,
      savedRecipe: data?.[0] || null
    });

  } catch (error) {
    console.error('Recipe Generation Error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate recipe', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
