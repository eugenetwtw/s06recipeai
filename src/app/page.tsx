'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  type UploadType = 'refrigerator' | 'kitchen_tools' | 'meal_history';
  const [uploadType, setUploadType] = useState<UploadType>('refrigerator');
  const [user, setUser] = useState<any>(null);

  
  const [mealHistoryText, setMealHistoryText] = useState<string>('');
  const [processingText, setProcessingText] = useState<boolean>(false);
  const [processingSeconds, setProcessingSeconds] = useState<number>(0);
  const [kitchenToolsText, setKitchenToolsText] = useState<string>('');
  const [processingKitchenToolsText, setProcessingKitchenToolsText] = useState<boolean>(false);
  const [processingKitchenToolsSeconds, setProcessingKitchenToolsSeconds] = useState<number>(0);

  const [refrigeratorData, setRefrigeratorData] = useState<any[]>([]);
  const [kitchenToolsData, setKitchenToolsData] = useState<any[]>([]);
  const [mealHistoryData, setMealHistoryData] = useState<any[]>([]);
  const [recipeHistoryData, setRecipeHistoryData] = useState<any[]>([]);

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
    let timerKitchen: NodeJS.Timeout | null = null;
    if (processingKitchenToolsText) {
      setProcessingKitchenToolsSeconds(0);
      timerKitchen = setInterval(() => {
        setProcessingKitchenToolsSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setProcessingKitchenToolsSeconds(0);
      if (timerKitchen) clearInterval(timerKitchen);
    }
    return () => {
      if (timerKitchen) clearInterval(timerKitchen);
    };
  }, [processingKitchenToolsText]);

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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileUpload = async () => {
    if (!user) { router.push('/sign-in'); return; }
    if (!selectedFiles.length) {
      setUploadError('Please select at least one file');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', uploadType);

    try {
      // Get the current user's access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please sign in to upload files');
      }
      const accessToken = session.access_token;

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      console.log('Upload successful:', result);
      setUploadSuccess(true);
      
      // Refresh data after successful upload
      if (user) {
        await fetchUserData(user.id);
      }
      
      // Clear selection after successful upload
      setSelectedFiles([]);
      
      // Reset success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
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

  const handleProcessKitchenTools = async () => {
    if (!user) { router.push('/sign-in'); return; }
    if (!kitchenToolsText.trim()) return;
    setProcessingKitchenToolsText(true);
    try {
      const response = await fetch('/api/process-kitchen-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: kitchenToolsText, userId: user.id })
      });
      const result = await response.json();
      console.log(result);
      if (user) {
        fetchUserData(user.id);
        setKitchenToolsText('');
      }
    } catch (error) {
      console.error('Kitchen tools processing failed', error);
    } finally {
      setProcessingKitchenToolsText(false);
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
              <div className="flex flex-col gap-4">
                <select 
                  value={uploadType} 
                  onChange={(e) => setUploadType(e.target.value as UploadType)}
                  className="input-primary"
                >
                  <option value="refrigerator">Refrigerator Contents</option>
                  <option value="kitchen_tools">Kitchen Tools</option>
                  <option value="meal_history">Meal History</option>
                </select>
                
                {uploadType === 'meal_history' ? (
                  <>
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            setSelectedFiles(e.target.files ? Array.from(e.target.files) : []);
                            setUploadError(null);
                          }}
                          className="input-primary flex-1"
                          disabled={isUploading}
                        />
                        <button
                          onClick={handleFileUpload}
                          disabled={isUploading || !selectedFiles.length}
                          className="btn-primary whitespace-nowrap"
                        >
                          {isUploading ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Uploading...
                            </span>
                          ) : 'Upload Photos'}
                        </button>
                      </div>
                      
                      {selectedFiles.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {uploadError && (
                        <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded">
                          {uploadError}
                        </div>
                      )}
                      
                      {uploadSuccess && (
                        <div className="text-green-600 text-sm mt-2 p-2 bg-green-50 rounded">
                          {(() => {
                            const type = uploadType as string;
                            if (type === 'kitchen_tools') {
                              return 'Upload successful! Processing your kitchen tools...';
                            } else if (type === 'refrigerator') {
                              return 'Upload successful! Processing your refrigerator contents...';
                            } else if (type === 'meal_history') {
                              return 'Upload successful! Processing your meal history...';
                            }
                            return 'Upload successful! Processing...';
                          })()}
                        </div>
                      )}
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
                ) : uploadType === 'kitchen_tools' ? (
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
                    <p className="text-gray-700 mb-2">Or paste text of your kitchen tools:</p>
                    <textarea
                      value={kitchenToolsText}
                      onChange={(e) => setKitchenToolsText(e.target.value)}
                      className="input-primary w-full h-32"
                      placeholder="Paste your kitchen tools list here..."
                    />
                    <button
                      onClick={handleProcessKitchenTools}
                      disabled={processingKitchenToolsText || !kitchenToolsText.trim()}
                      className="btn-secondary w-full mt-2"
                    >
                      {processingKitchenToolsText ? `Processing... (${processingKitchenToolsSeconds}s)` : 'Process Text'}
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
              <h2 className="text-2xl font-bold mb-6 text-indigo-700">Your Refrigerator Contents or ingredients by hand</h2>
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
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-indigo-700">Your Kitchen Tools</h2>
                <a 
                  href="/my-kitchen-tools" 
                  className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manage Tools
                </a>
              </div>
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
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No kitchen tools data uploaded yet.</p>
                  <a href="/my-kitchen-tools" className="btn-primary text-sm">Add Kitchen Tools</a>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-indigo-700">Your Meal History</h2>
                <a 
                  href="/my-meal-history" 
                  className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manage Meals
                </a>
              </div>
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
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No meal history data uploaded yet.</p>
                  <a href="/my-meal-history" className="btn-primary text-sm">Add Meal History</a>
                </div>
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
