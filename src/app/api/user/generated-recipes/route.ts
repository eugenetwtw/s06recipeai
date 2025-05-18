import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Interface for generated recipe metadata
interface GeneratedRecipeMetadata {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  notes?: string;
  isFavorite: boolean;
  generatedAt: string;
}

// GET: Fetch user's generated recipes with metadata
export async function GET(request: NextRequest) {
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
    const userId = user.id;

    // Fetch raw generated recipes data
    const { data: rawRecipes, error: recipesError } = await supabase
      .from('generated_recipes')
      .select('*')
      .eq('user_id', userId);

    if (recipesError) {
      return NextResponse.json({ error: recipesError.message }, { status: 500 });
    }

    // Fetch user's generated recipe metadata
    const { data: recipeMetadata, error: metadataError } = await supabase
      .from('user_generated_recipe_metadata')
      .select('*')
      .eq('user_id', userId);

    if (metadataError) {
      // If the table doesn't exist yet, we'll just return the raw recipes
      console.error('Error fetching recipe metadata:', metadataError);
    }

    // Process the raw data to extract individual recipes
    const processedRecipes: any[] = [];
    const metadataMap = new Map();
    
    // Create a map of recipe id to metadata
    if (recipeMetadata) {
      recipeMetadata.forEach((meta: any) => {
        metadataMap.set(meta.recipe_id, meta);
      });
    }
    
    // Process each raw recipe entry
    rawRecipes.forEach(rawRecipe => {
      // Generate a unique ID for this recipe
      const recipeId = rawRecipe.id;
      
      // Check if we have metadata for this recipe
      const metadata = metadataMap.get(recipeId);
      
      // Extract ingredients from the raw recipe
      let ingredients: string[] = [];
      if (Array.isArray(rawRecipe.ingredients)) {
        ingredients = rawRecipe.ingredients;
      }
      
      // Create a name for the recipe based on the data
      const recipeName = metadata?.name || rawRecipe.recipe_name || 'Unnamed Recipe';
      
      // Process instructions from the raw recipe
      let processedInstructions: string = '';
      if (Array.isArray(rawRecipe.instructions)) {
        processedInstructions = rawRecipe.instructions.join('\n\n');
      } else if (typeof rawRecipe.instructions === 'string') {
        processedInstructions = rawRecipe.instructions;
      } else if (rawRecipe.instructions) {
        processedInstructions = JSON.stringify(rawRecipe.instructions);
      }
      
      // Add as a new recipe with metadata or default values
      processedRecipes.push({
        id: recipeId,
        name: recipeName,
        ingredients: metadata?.ingredients || ingredients,
        instructions: processedInstructions,
        notes: metadata?.notes || '',
        isFavorite: metadata?.is_favorite || false,
        generatedAt: rawRecipe.generated_at
      });
    });

    return NextResponse.json(processedRecipes);
  } catch (error) {
    console.error('Error in generated-recipes GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Update or create generated recipe metadata
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
    const userId = user.id;

    // Parse request body
    const recipeData: GeneratedRecipeMetadata = await request.json();
    
    // Validate required fields
    if (!recipeData.name || !recipeData.id) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // Check if the recipe metadata already exists
    const { data: existingMetadata, error: checkError } = await supabase
      .from('user_generated_recipe_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('recipe_id', recipeData.id);

    if (checkError) {
      // If the table doesn't exist, create it
      await supabase.rpc('create_generated_recipe_metadata_table_if_not_exists');
    }

    // Prepare data for insertion/update
    const metadataRecord = {
      user_id: userId,
      recipe_id: recipeData.id,
      name: recipeData.name,
      ingredients: recipeData.ingredients,
      notes: recipeData.notes,
      is_favorite: recipeData.isFavorite
    };

    let result;
    
    if (existingMetadata && existingMetadata.length > 0) {
      // Update existing metadata
      result = await supabase
        .from('user_generated_recipe_metadata')
        .update(metadataRecord)
        .eq('user_id', userId)
        .eq('recipe_id', recipeData.id)
        .select();
    } else {
      // Insert new metadata
      result = await supabase
        .from('user_generated_recipe_metadata')
        .insert(metadataRecord)
        .select();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Recipe metadata saved successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in generated-recipes POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a generated recipe entry and its metadata
export async function DELETE(request: NextRequest) {
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
    const userId = user.id;

    // Get recipe ID from URL
    const url = new URL(request.url);
    const recipeId = url.searchParams.get('id');
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    // Delete the recipe metadata
    const { error: metadataError } = await supabase
      .from('user_generated_recipe_metadata')
      .delete()
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (metadataError) {
      console.error('Error deleting recipe metadata:', metadataError);
      // Continue even if metadata deletion fails
    }

    // We don't delete the actual generated recipe entry, just the metadata
    // This preserves the original data while allowing the user to hide it from their view

    return NextResponse.json({
      message: 'Recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error in generated-recipes DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
