'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nContext';

interface GeneratedRecipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string;
  notes?: string;
  isFavorite: boolean;
  generatedAt: string;
}

export default function MyGeneratedRecipesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingRecipe, setEditingRecipe] = useState<GeneratedRecipe | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user) {
      fetchGeneratedRecipes();
    }
  }, [user]);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session);
    if (session) {
      setUser(session.user);
    } else {
      setUser(null);
      router.push('/sign-in');
    }
  };

  const fetchGeneratedRecipes = async () => {
    setIsLoading(true);
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Fetch generated recipes from the API
      const response = await fetch('/api/user/generated-recipes', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch generated recipes');
      }
      
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching generated recipes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecipe = (recipe: GeneratedRecipe) => {
    setEditingRecipe(recipe);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRecipe) return;
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the recipe metadata to the API
      const response = await fetch('/api/user/generated-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editingRecipe)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }
      
      // Update the local state
      setRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === editingRecipe.id ? editingRecipe : recipe
        )
      );
      
      setIsEditing(false);
      setEditingRecipe(null);
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert('Failed to save recipe. Please try again.');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      // Find the recipe to delete
      const recipeToDelete = recipes.find(recipe => recipe.id === id);
      if (!recipeToDelete) return;
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Delete the recipe metadata from the API
      const response = await fetch(`/api/user/generated-recipes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete recipe');
      }
      
      // Update the local state
      setRecipes(prevRecipes => prevRecipes.filter(recipe => recipe.id !== id));
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      // Find the recipe to update
      const recipeToUpdate = recipes.find(recipe => recipe.id === id);
      if (!recipeToUpdate) return;
      
      // Create updated recipe with toggled favorite status
      const updatedRecipe = {
        ...recipeToUpdate,
        isFavorite: !recipeToUpdate.isFavorite
      };
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the updated recipe metadata to the API
      const response = await fetch('/api/user/generated-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updatedRecipe)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update recipe');
      }
      
      // Update the local state
      setRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === id ? updatedRecipe : recipe
        )
      );
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Failed to update recipe. Please try again.');
    }
  };

  const handleDeleteAllRecipes = async () => {
    // Confirm with the user before deleting all recipes
    if (!confirm('Are you sure you want to delete ALL generated recipes? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Call the delete-all API endpoint
      const response = await fetch('/api/user/generated-recipes/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete all recipes');
      }
      
      // Clear the local state
      setRecipes([]);
      
      // Show success message
      alert('All generated recipes have been deleted successfully.');
    } catch (error) {
      console.error('Error deleting all recipes:', error);
      alert('Failed to delete all recipes. Please try again.');
    }
  };

  // Filter recipes based on search term and filter selection
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = 
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.ingredients.some(ingredient => ingredient.toLowerCase().includes(searchTerm.toLowerCase())) ||
      recipe.instructions.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      selectedFilter === 'all' || 
      (selectedFilter === 'favorites' && recipe.isFavorite);
    
    return matchesSearch && matchesFilter;
  });

  // Sort recipes by generation date (newest first)
  const sortedRecipes = [...filteredRecipes].sort((a, b) => 
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">My Generated Recipes</h1>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div className="flex flex-col">
                  <span className="text-gray-700 font-medium">{user?.email}</span>
                </div>
              </div>
            </div>
          )}
          <a href="/" className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 text-sm">
            Back to Homepage
          </a>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Recipes</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ingredients, or instructions..."
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">All Recipes</option>
              <option value="favorites">Favorites Only</option>
            </select>
          </div>
          
          <div className="w-full md:w-1/3 flex justify-end items-end gap-2">
            <a
              href="/recipe-generator"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Generate New Recipe
            </a>
            <button
              onClick={handleDeleteAllRecipes}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              title="Delete all generated recipes"
            >
              Delete All
            </button>
          </div>
        </div>
      </div>

      {/* Recipe List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">Your Generated Recipes</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Loading your recipes...</p>
          </div>
        ) : sortedRecipes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No recipes found. Generate some recipes to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRecipes.map(recipe => (
              <div key={recipe.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{recipe.name}</h3>
                  <button
                    onClick={() => handleToggleFavorite(recipe.id)}
                    className={`text-xl ${recipe.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  <p>Generated: <span className="font-medium">{new Date(recipe.generatedAt).toLocaleDateString()}</span></p>
                  
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Ingredients:</p>
                      <ul className="list-disc pl-5">
                        {recipe.ingredients.slice(0, 5).map((ingredient, index) => (
                          <li key={index}>{ingredient}</li>
                        ))}
                        {recipe.ingredients.length > 5 && (
                          <li className="italic">...and {recipe.ingredients.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {recipe.instructions && (
                    <div className="mt-2">
                      <p className="font-medium">Instructions:</p>
                      <p className="line-clamp-3 italic">
                        {typeof recipe.instructions === 'string' 
                          ? recipe.instructions.substring(0, 150) + '...'
                          : typeof recipe.instructions === 'object'
                            ? JSON.stringify(recipe.instructions).substring(0, 150) + '...'
                            : String(recipe.instructions).substring(0, 150) + '...'}
                      </p>
                    </div>
                  )}
                  
                  {recipe.notes && (
                    <p className="mt-2">Notes: <span className="italic">{recipe.notes}</span></p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleEditRecipe(recipe)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Recipe Modal */}
      {isEditing && editingRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Edit Recipe</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={editingRecipe.name}
                  onChange={(e) => setEditingRecipe({...editingRecipe, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ingredients</label>
                <textarea
                  value={editingRecipe.ingredients.join('\n')}
                  onChange={(e) => setEditingRecipe({
                    ...editingRecipe, 
                    ingredients: e.target.value.split('\n').filter(line => line.trim() !== '')
                  })}
                  className="w-full p-2 border rounded h-32"
                  placeholder="One ingredient per line"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                <textarea
                  value={editingRecipe.instructions}
                  onChange={(e) => setEditingRecipe({...editingRecipe, instructions: e.target.value})}
                  className="w-full p-2 border rounded h-64"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingRecipe.notes || ''}
                  onChange={(e) => setEditingRecipe({...editingRecipe, notes: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                  placeholder="Add any notes about this recipe"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingRecipe.isFavorite}
                  onChange={(e) => setEditingRecipe({...editingRecipe, isFavorite: e.target.checked})}
                  className="mr-2"
                />
                <label>Mark as favorite</label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
