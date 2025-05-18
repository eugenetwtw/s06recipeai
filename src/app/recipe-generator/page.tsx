'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
// Kitchen tool mapping import removed as per user request

type DietaryPreferences = {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
};

export default function RecipeGeneratorPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  // Kitchen tool related states removed as per user request
  const [mealHistory, setMealHistory] = useState<any[]>([]);
  const [favoriteMeals, setFavoriteMeals] = useState<any[]>([]);
  const [suggestedMealRecipes, setSuggestedMealRecipes] = useState<string[]>([]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserMealHistory();
    }
  }, [user]);

  // Effect for kitchen tools removed as per user request

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session) {
      setUser(session.user);
      setSession(session);
    } else {
      setUser(null);
      setSession(null);
      router.push('/login');
    }
  };

  // Kitchen tools fetch function removed as per user request

  const fetchUserMealHistory = async () => {
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Fetch meal history from the API
      const response = await fetch('/api/user/meal-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch meal history');
      }
      
      const meals = await response.json();
      setMealHistory(meals);
      
      // Extract favorite meals
      const favorites = meals.filter((meal: any) => meal.isFavorite);
      setFavoriteMeals(favorites);
      
      // Extract dish names from favorite meals to suggest recipes
      const dishNames = favorites.flatMap((meal: any) => meal.dishes || []);
      const uniqueDishNames = dishNames.filter((dish: string, index: number) => 
        dishNames.indexOf(dish) === index
      );
      setSuggestedMealRecipes(uniqueDishNames);
    } catch (error) {
      console.error('Error fetching meal history:', error);
    }
  };

  const addIngredient = () => {
    if (newIngredient.trim() && !ingredients.includes(newIngredient.trim())) {
      setIngredients(prev => [...prev, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (ingredientToRemove: string) => {
    setIngredients(prev => prev.filter(ing => ing !== ingredientToRemove));
  };

  const generateRecipe = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (ingredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    setIsLoading(true);
    setGeneratedRecipe(null);

    const dietaryPreferences: DietaryPreferences = {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Kitchen tools are no longer needed for recipe generation

      // Prepare meal history preferences
      const mealHistoryPreferences = {
        favoriteMeals: favoriteMeals.map(meal => ({
          name: meal.name,
          restaurant: meal.restaurant,
          cuisine: meal.cuisine,
          dishes: meal.dishes
        })),
        favoriteCuisines: Array.from(new Set(favoriteMeals.map(meal => meal.cuisine))).filter(Boolean)
      };

      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ingredients,
          refrigeratorContents: [],
          cookingTools: [], // Empty array as kitchen tools are not needed
          dietaryPreferences,
          mealHistoryPreferences
        })
      });

      const data = await response.json();

      if (response.ok) {
        setGeneratedRecipe(data.recipe);
      } else {
        throw new Error(data.error || 'Recipe generation failed');
      }
    } catch (error) {
      console.error('Recipe Generation Error:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate recipe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

    return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Recipe Generator</h1>
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <button
              onClick={() => router.push('/login')}
              className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 text-sm flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Login
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-gray-700 font-medium">{user?.user_metadata?.full_name || user?.email}</span>
                  <span className="text-sm text-gray-500">{user?.email}</span>
                </div>
              </div>
            </div>
          )}
          <a href="/" className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 text-sm">
            Back to Homepage
          </a>
        </div>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Ingredients Input Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Ingredients</h2>
          
                  {/* Kitchen tool selection removed as per user request */}
          
          {/* Suggested recipes based on kitchen tools removed as per user request */}
          
          {suggestedMealRecipes.length > 0 && (
            <div className="mb-4 p-3 bg-rose-50 rounded-lg">
              <h3 className="text-md font-medium text-rose-700 mb-2">
                Inspired by your favorite meals:
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedMealRecipes.slice(0, 12).map((dish, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setNewIngredient(dish);
                      addIngredient();
                    }}
                    className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full hover:bg-rose-200 text-sm"
                  >
                    {dish}
                  </button>
                ))}
              </div>
              <p className="text-xs text-rose-600 mt-2">
                Click on a dish to add it as an ingredient
              </p>
            </div>
          )}
          
          <div className="flex mb-4">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              placeholder="Enter an ingredient"
              className="flex-grow mr-2 p-2 border rounded"
              onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
            />
            <button
              onClick={addIngredient}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {ingredients.map((ing) => (
              <div
                key={ing}
                className="bg-blue-500 text-white px-3 py-1 rounded-full flex items-center"
              >
                {ing}
                <button
                  onClick={() => removeIngredient(ing)}
                  className="ml-2 text-white hover:text-red-200"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={generateRecipe}
            disabled={isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded mt-4 w-full"
          >
            {isLoading ? 'Generating...' : 'Generate Recipe'}
          </button>
        </div>

        {/* Recipe Display Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Recipe</h2>
          
          {isLoading ? (
            <div className="text-center text-blue-500">
              Cooking up something delicious...
            </div>
          ) : generatedRecipe ? (
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-indigo-700">Recipe Details:</h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedRecipe);
                    alert('Recipe copied to clipboard!');
                  }}
                  className="text-gray-500 hover:text-indigo-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{generatedRecipe}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center">
              Your recipe will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
