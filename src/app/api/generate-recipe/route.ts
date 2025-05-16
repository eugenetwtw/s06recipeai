import { NextRequest, NextResponse } from 'next/server';
import { OpenAIService } from '@/lib/openai-config';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
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

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Log detailed request information for debugging
    const headersObj: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    console.log('Request headers:', headersObj);
    console.log('Cookies received:', request.cookies.getAll());
    
    // Try different possible cookie names for Supabase auth token
    const possibleCookieNames = [
      'supabase-auth-token',
      'sb-access-token',
      'sb-refresh-token'
    ];
    let sessionToken = null;
    for (const name of possibleCookieNames) {
      const token = request.cookies.get(name)?.value;
      if (token) {
        console.log(`Found token in cookie: ${name}`);
        sessionToken = token;
        break;
      }
    }
    
    if (!sessionToken) {
      console.log('No session token found in any known cookies');
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }

    // Use the session token to get user data
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionToken);
    if (userError || !user) {
      console.log('Error fetching user or no user found:', userError?.message || 'No user');
      return NextResponse.json({ error: 'Authentication required. Please log in.' }, { status: 401 });
    }
    const userId = user.id;
    
    // Parse and structure recipe data
    const recipeData = {
      user_id: userId,
      recipe_name: recipeContent?.match(/^([^\n]+)/)?.[1] || 'Unnamed Recipe',
      ingredients: ingredients,
      instructions: recipeContent,
      generated_at: new Date().toISOString()
    };

    // Insert recipe into Supabase
    const { data, error } = await supabase
      .from('generated_recipes')
      .insert(recipeData)
      .select();

    if (error) throw error;

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
