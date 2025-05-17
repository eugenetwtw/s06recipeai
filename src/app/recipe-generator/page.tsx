'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (!session) {
      router.push('/login');
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

      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ingredients,
          refrigeratorContents: [],
          cookingTools: [],
          dietaryPreferences
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
        <a href="/" className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 text-sm">
          Back to Homepage
        </a>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Ingredients Input Section */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Add Ingredients</h2>
          
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
            <div className="whitespace-pre-wrap">{generatedRecipe}</div>
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
