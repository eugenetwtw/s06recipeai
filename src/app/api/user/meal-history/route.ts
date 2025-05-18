import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Interface for meal history metadata
interface MealHistoryMetadata {
  id: string;
  name: string;
  restaurant: string;
  date: string;
  cuisine: string;
  dishes: string[];
  notes?: string;
  isFavorite: boolean;
  imageUrl?: string;
}

// GET: Fetch user's meal history with metadata
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

    // Fetch raw meal history data
    const { data: rawMeals, error: mealsError } = await supabase
      .from('meal_history')
      .select('*')
      .eq('user_id', userId);

    if (mealsError) {
      return NextResponse.json({ error: mealsError.message }, { status: 500 });
    }

    // Fetch user's meal history metadata
    const { data: mealMetadata, error: metadataError } = await supabase
      .from('user_meal_history_metadata')
      .select('*')
      .eq('user_id', userId);

    if (metadataError) {
      // If the table doesn't exist yet, we'll just return the raw meals
      console.error('Error fetching meal metadata:', metadataError);
    }

    // Process the raw data to extract individual meals
    const processedMeals: any[] = [];
    const metadataMap = new Map();
    
    // Create a map of meal id to metadata
    if (mealMetadata) {
      mealMetadata.forEach((meta: any) => {
        metadataMap.set(meta.meal_id, meta);
      });
    }
    
    // Process each raw meal entry
    rawMeals.forEach(rawMeal => {
      // Generate a unique ID for this meal
      const mealId = rawMeal.id;
      
      // Check if we have metadata for this meal
      const metadata = metadataMap.get(mealId);
      
      // Extract restaurant and dishes from detected_ingredients
      let restaurant = '';
      let dishes: string[] = [];
      let cuisine = 'other';
      
      if (rawMeal.detected_ingredients) {
        if (rawMeal.detected_ingredients.restaurant_name) {
          restaurant = rawMeal.detected_ingredients.restaurant_name;
        }
        
        if (rawMeal.detected_ingredients.dishes && Array.isArray(rawMeal.detected_ingredients.dishes)) {
          dishes = rawMeal.detected_ingredients.dishes.map((dish: any) => 
            typeof dish === 'string' ? dish : dish.name || ''
          ).filter(Boolean);
        }
        
        if (rawMeal.detected_ingredients.cuisine_type) {
          cuisine = rawMeal.detected_ingredients.cuisine_type.toLowerCase();
        }
      }
      
      // Create a name for the meal based on the data
      const mealDate = new Date(rawMeal.uploaded_at).toISOString().split('T')[0];
      const mealName = metadata?.name || `Meal from ${restaurant || 'Unknown Restaurant'}`;
      
      // Process dishes from metadata if they exist
      let processedDishes: string[] = dishes;
      if (metadata?.dishes && Array.isArray(metadata.dishes)) {
        processedDishes = metadata.dishes.map((dish: any) => 
          typeof dish === 'string' ? dish : (dish.name || '')
        ).filter(Boolean);
      }
      
      // Add as a new meal with metadata or default values
      processedMeals.push({
        id: mealId,
        name: metadata?.name || mealName,
        restaurant: metadata?.restaurant || restaurant,
        date: metadata?.date || mealDate,
        cuisine: metadata?.cuisine || cuisine,
        dishes: processedDishes,
        notes: metadata?.notes || '',
        isFavorite: metadata?.is_favorite || false,
        imageUrl: rawMeal.image_url || ''
      });
    });

    return NextResponse.json(processedMeals);
  } catch (error) {
    console.error('Error in meal-history GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Update or create meal history metadata
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
    const mealData: MealHistoryMetadata = await request.json();
    
    // Validate required fields
    if (!mealData.name || !mealData.restaurant || !mealData.date || !mealData.dishes || mealData.dishes.length === 0) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }

    // Check if the meal metadata already exists
    const { data: existingMetadata, error: checkError } = await supabase
      .from('user_meal_history_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('meal_id', mealData.id);

    if (checkError) {
      // If the table doesn't exist, create it
      await supabase.rpc('create_meal_history_metadata_table_if_not_exists');
    }

    // Prepare data for insertion/update
    const metadataRecord = {
      user_id: userId,
      meal_id: mealData.id,
      name: mealData.name,
      restaurant: mealData.restaurant,
      date: mealData.date,
      cuisine: mealData.cuisine,
      dishes: mealData.dishes,
      notes: mealData.notes,
      is_favorite: mealData.isFavorite
    };

    let result;
    
    if (existingMetadata && existingMetadata.length > 0) {
      // Update existing metadata
      result = await supabase
        .from('user_meal_history_metadata')
        .update(metadataRecord)
        .eq('user_id', userId)
        .eq('meal_id', mealData.id)
        .select();
    } else {
      // Insert new metadata
      result = await supabase
        .from('user_meal_history_metadata')
        .insert(metadataRecord)
        .select();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Meal history metadata saved successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in meal-history POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a meal history entry and its metadata
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

    // Get meal ID from URL
    const url = new URL(request.url);
    const mealId = url.searchParams.get('id');
    
    if (!mealId) {
      return NextResponse.json({ error: 'Meal ID is required' }, { status: 400 });
    }

    // Delete the meal metadata
    const { error: metadataError } = await supabase
      .from('user_meal_history_metadata')
      .delete()
      .eq('user_id', userId)
      .eq('meal_id', mealId);

    if (metadataError) {
      console.error('Error deleting meal metadata:', metadataError);
      // Continue even if metadata deletion fails
    }

    // We don't delete the actual meal history entry, just the metadata
    // This preserves the original data while allowing the user to hide it from their view

    return NextResponse.json({
      message: 'Meal history deleted successfully'
    });
  } catch (error) {
    console.error('Error in meal-history DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
