'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<string>('refrigerator');
  const [user, setUser] = useState<any>(null);
  const [mealHistoryText, setMealHistoryText] = useState<string>('');
  const [processingText, setProcessingText] = useState<boolean>(false);
  const [processingSeconds, setProcessingSeconds] = useState<number>(0);

  const [refrigeratorData, setRefrigeratorData] = useState<any[]>([]);
  const [kitchenToolsData, setKitchenToolsData] = useState<any[]>([]);
  const [mealHistoryData, setMealHistoryData] = useState<any[]>([]);
  const [recipeHistoryData, setRecipeHistoryData] = useState<any[]>([]);
  // userPreferences: 全面支援物件型態
  const [userPreferences, setUserPreferences] = useState<any>({
    vegetarian: false,
    vegan: false,
    gluten_free: false,
    dairy_free: false,
    exclude_ingredients: [],
    favorite_cuisines: [],
    spiciness_preference: 5,
    notes: ''
  });
  const [newExcludeIngredient, setNewExcludeIngredient] = useState('');
  const [newFavoriteCuisine, setNewFavoriteCuisine] = useState('');
  const [preferencesChanged, setPreferencesChanged] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (processingText) {
      setProcessingSeconds(0);
      timer = setInterval(() => {
        setProcessingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setProcessingSeconds(0);
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [processingText]);

  useEffect(() => {
    // Fetch current session and user preferences
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
        fetchUserPreferences(session.user.id);
      }
    };
    getSession();

    // Listen for auth changes (e.g., sign in/out in another tab)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
        fetchUserPreferences(session.user.id);
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

  const fetchUserPreferences = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch('/api/user/preferences', {
         headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      // 直接設為物件
      setUserPreferences({
        vegetarian: !!data.vegetarian,
        vegan: !!data.vegan,
        gluten_free: !!data.gluten_free,
        dairy_free: !!data.dairy_free,
        exclude_ingredients: Array.isArray(data.exclude_ingredients) ? data.exclude_ingredients : [],
        favorite_cuisines: Array.isArray(data.favorite_cuisines) ? data.favorite_cuisines : [],
        spiciness_preference: typeof data.spiciness_preference === 'number' ? data.spiciness_preference : 5,
        notes: data.notes || ''
      });
      setPreferencesChanged(false);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  const handleSavePreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) return;
      const res = await fetch('/api/user/preferences', {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
         },
         body: JSON.stringify(userPreferences)
      });
      const result = await res.json();
      setPreferencesChanged(false);
      fetchUserPreferences(user?.id);
      console.log('Saved preferences:', result);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles.length) return;

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', uploadType);

    try {
      // Get the current user's access token
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
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

  const handleProcessMealHistory = async () => {
    if (!mealHistoryText.trim() || !user) return;
    
    setProcessingText(true);
    
    try {
      const response = await fetch('/api/process-meal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: mealHistoryText,
          userId: user.id
        })
      });
      
      const result = await response.json();
      console.log(result);
      
      // Refresh data after successful processing
      if (user) {
        fetchUserData(user.id);
        setMealHistoryText(''); // Clear the text area
      }
    } catch (error) {
      console.error('Meal history processing failed', error);
    } finally {
      setProcessingText(false);
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
  
  // Exclude Ingredients
  const handleAddExcludeIngredient = () => {
    if (newExcludeIngredient.trim() !== "") {
      setUserPreferences((prev: any) => ({
        ...prev,
        exclude_ingredients: [...prev.exclude_ingredients, newExcludeIngredient.trim()]
      }));
      setNewExcludeIngredient("");
      setPreferencesChanged(true);
    }
  };
  const handleDeleteExcludeIngredient = (index: number) => {
    setUserPreferences((prev: any) => ({
      ...prev,
      exclude_ingredients: prev.exclude_ingredients.filter((_: any, i: number) => i !== index)
    }));
    setPreferencesChanged(true);
  };

  // Favorite Cuisines
  const handleAddFavoriteCuisine = () => {
    if (newFavoriteCuisine.trim() !== "") {
      setUserPreferences((prev: any) => ({
        ...prev,
        favorite_cuisines: [...prev.favorite_cuisines, newFavoriteCuisine.trim()]
      }));
      setNewFavoriteCuisine("");
      setPreferencesChanged(true);
    }
  };
  const handleDeleteFavoriteCuisine = (index: number) => {
    setUserPreferences((prev: any) => ({
      ...prev,
      favorite_cuisines: prev.favorite_cuisines.filter((_: any, i: number) => i !== index)
    }));
    setPreferencesChanged(true);
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
              <div className="flex flex-col gap-4">
                <select 
                  value={uploadType} 
                  onChange={(e) => setUploadType(e.target.value)}
                  className="input-primary"
                >
                  <option value="refrigerator">Refrigerator Contents</option>
                  <option value="kitchen_tools">Kitchen Tools</option>
                  <option value="meal_history">Meal History</option>
                </select>
                
                {uploadType === 'meal_history' ? (
                  <>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                        className="input-primary flex-1"
                      />
                      <button
                        onClick={handleFileUpload}
                        className="btn-primary"
                      >
                        Choose photos to upload
                      </button>
                    </div>
                    
                    <div className="mt-4">
                      <p className="text-gray-700 mb-2">Or paste text from historical meal orders (UberEats, Foodpanda, DoorDash, etc.):</p>
                      <textarea 
                        value={mealHistoryText}
                        onChange={(e) => setMealHistoryText(e.target.value)}
                        className="input-primary w-full h-32"
                        placeholder="Paste your order history text here..."
                      />
                      <button 
                        onClick={handleProcessMealHistory}
                        disabled={processingText || !mealHistoryText.trim()}
                        className="btn-secondary w-full mt-2"
                      >
                        {processingText ? `Processing... (${processingSeconds}s)` : 'Process Text'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col md:flex-row gap-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => setSelectedFiles(e.target.files ? Array.from(e.target.files) : [])}
                      className="input-primary flex-1"
                    />
                    <button
                      onClick={handleFileUpload}
                      className="btn-primary"
                    >
                      Choose photos to upload
                    </button>
                  </div>
                )}
              </div>
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
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Your Dietary Preferences</h2>
              <div className="mb-4">
                <div className="flex flex-wrap gap-4 mb-2">
                  <label>
                    <input
                      type="checkbox"
                      checked={userPreferences.vegetarian}
                      onChange={e => {
                        setUserPreferences((prev: any) => ({ ...prev, vegetarian: e.target.checked }));
                        setPreferencesChanged(true);
                      }}
                    /> Vegetarian
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={userPreferences.vegan}
                      onChange={e => {
                        setUserPreferences((prev: any) => ({ ...prev, vegan: e.target.checked }));
                        setPreferencesChanged(true);
                      }}
                    /> Vegan
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={userPreferences.gluten_free}
                      onChange={e => {
                        setUserPreferences((prev: any) => ({ ...prev, gluten_free: e.target.checked }));
                        setPreferencesChanged(true);
                      }}
                    /> Gluten-Free
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={userPreferences.dairy_free}
                      onChange={e => {
                        setUserPreferences((prev: any) => ({ ...prev, dairy_free: e.target.checked }));
                        setPreferencesChanged(true);
                      }}
                    /> Dairy-Free
                  </label>
                </div>
                <div className="mb-2">
                  <label className="font-medium">Exclude Ingredients:</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userPreferences.exclude_ingredients.map((item: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center bg-red-100 text-red-700 px-2 py-1 rounded mr-2 mb-1">
                        {item}
                        <button
                          className="ml-1 text-red-500 font-bold"
                          onClick={() => handleDeleteExcludeIngredient(idx)}
                          aria-label="Remove"
                        >-</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={newExcludeIngredient}
                      onChange={e => setNewExcludeIngredient(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExcludeIngredient();
                        }
                      }}
                      className="input-primary w-32"
                      placeholder="Add ingredient"
                    />
                    <button
                      className="btn-primary px-2 py-1"
                      onClick={handleAddExcludeIngredient}
                      aria-label="Add"
                    >+</button>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="font-medium">Favorite Cuisines:</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {userPreferences.favorite_cuisines.map((item: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2 mb-1">
                        {item}
                        <button
                          className="ml-1 text-blue-500 font-bold"
                          onClick={() => handleDeleteFavoriteCuisine(idx)}
                          aria-label="Remove"
                        >-</button>
                      </span>
                    ))}
                    <input
                      type="text"
                      value={newFavoriteCuisine}
                      onChange={e => setNewFavoriteCuisine(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFavoriteCuisine();
                        }
                      }}
                      className="input-primary w-32"
                      placeholder="Add cuisine"
                    />
                    <button
                      className="btn-primary px-2 py-1"
                      onClick={handleAddFavoriteCuisine}
                      aria-label="Add"
                    >+</button>
                  </div>
                </div>
                <div className="mb-2">
                  <label className="font-medium">Spiciness Preference: </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    value={userPreferences.spiciness_preference}
                    onChange={e => {
                      setUserPreferences((prev: any) => ({
                        ...prev,
                        spiciness_preference: Number(e.target.value)
                      }));
                      setPreferencesChanged(true);
                    }}
                    className="w-32 align-middle"
                  />
                  <span className="ml-2">{userPreferences.spiciness_preference}</span>
                </div>
                <div className="mb-2">
                  <label className="font-medium">Notes:</label>
                  <textarea
                    value={userPreferences.notes}
                    onChange={e => {
                      setUserPreferences((prev: any) => ({
                        ...prev,
                        notes: e.target.value
                      }));
                      setPreferencesChanged(true);
                    }}
                    className="input-primary w-full h-16"
                    placeholder="Other dietary notes..."
                  />
                </div>
                <button
                  className={`btn-primary w-full mt-2 ${!preferencesChanged ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleSavePreferences}
                  disabled={!preferencesChanged}
                >
                  Save Preferences
                </button>
              </div>
            </div>
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
                <ul className="space-y-4">
                  {mealHistoryData.map((item, index) => (
                    <li key={index} className="border-b pb-4">
                      {item.image_url && (
                        <p className="font-medium mb-2">
                          <img 
                            src={item.image_url} 
                            alt="Meal" 
                            className="w-full h-32 object-cover rounded-lg mb-2" 
                          />
                        </p>
                      )}
                      
                      {item.natural_language_summary ? (
                        <div className="text-sm italic text-gray-800 mb-2">
                          {item.natural_language_summary}
                        </div>
                      ) : item.detected_ingredients && (
                        <div className="text-sm">
                          {item.detected_ingredients.restaurant_name && (
                            <p className="font-bold text-indigo-600">{item.detected_ingredients.restaurant_name}</p>
                          )}
                          
                          {item.detected_ingredients.order_date && (
                            <p className="text-gray-500 mb-1">Date: {item.detected_ingredients.order_date}</p>
                          )}
                          
                          {item.detected_ingredients.cuisine_type && (
                            <p className="text-gray-500 mb-1">Cuisine: {item.detected_ingredients.cuisine_type}</p>
                          )}
                          
                          {item.detected_ingredients.dishes && item.detected_ingredients.dishes.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">Dishes:</p>
                              <ul className="list-disc pl-5">
                                {item.detected_ingredients.dishes.map((dish: any, dishIndex: number) => (
                                  <li key={dishIndex}>
                                    {dish.name}
                                    {dish.quantity && <span> (x{dish.quantity})</span>}
                                    {dish.price && <span> - {dish.price}</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
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
                      <p className="text-sm text-gray-500">Generated on: {new Date(recipe.generated_at).toLocaleString()}</p>
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
