'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('refrigerator');
  const [user, setUser] = useState<any>(null);

  const [refrigeratorData, setRefrigeratorData] = useState<any[]>([]);
  const [kitchenToolsData, setKitchenToolsData] = useState<any[]>([]);
  const [mealHistoryData, setMealHistoryData] = useState<any[]>([]);
  const [recipeHistoryData, setRecipeHistoryData] = useState<any[]>([]);

  useEffect(() => {
    // Fetch current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
    };
    getSession();

    // Listen for auth changes (e.g., sign in/out in another tab)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setRefrigeratorData([]);
        setKitchenToolsData([]);
        setMealHistoryData([]);
        setRecipeHistoryData([]);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch refrigerator contents
      const { data: fridgeData, error: fridgeError } = await supabase
        .from('refrigerator_contents')
        .select('*')
        .eq('user_id', userId);
      if (fridgeError) {
        console.error('Error fetching refrigerator data:', fridgeError);
        setRefrigeratorData([]);
      } else {
        setRefrigeratorData(fridgeData || []);
      }

      // Fetch kitchen tools
      const { data: toolsData, error: toolsError } = await supabase
        .from('kitchen_tools')
        .select('*')
        .eq('user_id', userId);
      if (toolsError) {
        console.error('Error fetching kitchen tools data:', toolsError);
        setKitchenToolsData([]);
      } else {
        setKitchenToolsData(toolsData || []);
      }

      // Fetch meal history
      const { data: mealData, error: mealError } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', userId);
      if (mealError) {
        console.error('Error fetching meal history data:', mealError);
        setMealHistoryData([]);
      } else {
        setMealHistoryData(mealData || []);
      }

      // Fetch generated recipe history (last 5)
      const { data: recipeData, error: recipeError } = await supabase
        .from('generated_recipes')
        .select('recipe_name, generated_at')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(5);
      if (recipeError) {
        console.error('Error fetching recipe history data:', recipeError);
        setRecipeHistoryData([]);
      } else {
        setRecipeHistoryData(recipeData || []);
      }
    } catch (error) {
      console.error('Unexpected error fetching user data:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', uploadType);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      console.log(result);
      // Refresh data after successful upload
      if (user) {
        fetchUserData(user.id);
      }
    } catch (error) {
      console.error('Upload failed', error);
    }
  };

  const handleGenerateRecipe = async () => {
    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST'
      });
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error('Recipe generation failed', error);
    }
  };

  return (
    <main className="min-h-screen flex flex-col justify-center items-center p-6 md:p-12">
      <div className="container-custom">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-600">Recipe AI</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-10 h-10 rounded-full border-2 border-indigo-300"
                />
              )}
              <span className="text-gray-700 font-medium hidden md:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="btn-primary text-sm py-2 px-4"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <a href="/sign-in" className="btn-primary text-sm">Sign In</a>
              <a href="/sign-up" className="btn-secondary text-sm">Sign Up</a>
            </div>
          )}
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card md:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-indigo-700">Upload Your Kitchen Insights</h2>
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4">
                <select 
                  value={uploadType} 
                  onChange={(e) => setUploadType(e.target.value)}
                  className="input-primary flex-1"
                >
                  <option value="refrigerator">Refrigerator Contents</option>
                  <option value="kitchen_tools">Kitchen Tools</option>
                  <option value="meal_history">Meal History</option>
                </select>
                
                <input 
                  type="file" 
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="input-primary flex-1"
                />
              </div>
              
              <button 
                onClick={handleFileUpload}
                className="btn-primary w-full md:w-auto"
              >
                Upload Image
              </button>
            </div>
          </div>

          <div className="card flex flex-col justify-center items-center text-center">
            <h2 className="text-2xl font-bold mb-4 text-teal-600">Magic Recipe Generator</h2>
            <p className="text-gray-600 mb-6">Let AI craft a personalized recipe based on your kitchen inventory!</p>
            <button 
              onClick={handleGenerateRecipe}
              className="btn-secondary mb-3"
            >
              Generate Recipe
            </button>
            <p className="text-gray-600 mb-3">Or, customize your recipe with specific ingredients:</p>
            <a 
              href="/recipe-generator"
              className="btn-primary text-sm"
            >
              Custom Recipe Generator
            </a>
          </div>
        </div>

        {user && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="card">
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Your Refrigerator Contents</h2>
              {refrigeratorData.length > 0 ? (
                <ul className="space-y-2">
                  {refrigeratorData.map((item, index) => (
                    <li key={index} className="border-b pb-2">
                      <p className="font-medium">Image: <a href={item.image_url} target="_blank" className="text-indigo-500 underline">{item.image_url}</a></p>
                      <p className="text-sm text-gray-600">Ingredients: {JSON.stringify(item.detected_ingredients, null, 2)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No refrigerator data uploaded yet.</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Your Kitchen Tools</h2>
              {kitchenToolsData.length > 0 ? (
                <ul className="space-y-2">
                  {kitchenToolsData.map((item, index) => (
                    <li key={index} className="border-b pb-2">
                      <p className="font-medium">Image: <a href={item.image_url} target="_blank" className="text-indigo-500 underline">{item.image_url}</a></p>
                      <p className="text-sm text-gray-600">Tools: {JSON.stringify(item.detected_tools, null, 2)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No kitchen tools data uploaded yet.</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Your Meal History</h2>
              {mealHistoryData.length > 0 ? (
                <ul className="space-y-2">
                  {mealHistoryData.map((item, index) => (
                    <li key={index} className="border-b pb-2">
                      <p className="font-medium">Image: <a href={item.image_url} target="_blank" className="text-indigo-500 underline">{item.image_url}</a></p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No meal history data uploaded yet.</p>
              )}
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Generated Recipe History</h2>
              {recipeHistoryData.length > 0 ? (
                <ul className="space-y-2">
                  {recipeHistoryData.map((recipe, index) => (
                    <li key={index} className="border-b pb-2">
                      <p className="font-medium">{recipe.recipe_name}</p>
                      <p className="text-sm text-gray-500">Generated on: {new Date(recipe.generated_at).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600">No generated recipes yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
