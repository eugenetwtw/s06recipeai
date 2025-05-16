'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('refrigerator');
  const [user, setUser] = useState<any>(null);
  const [mealHistoryText, setMealHistoryText] = useState<string>('');
  const [processingText, setProcessingText] = useState<boolean>(false);
  const [processingSeconds, setProcessingSeconds] = useState<number>(0);

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

          {/* --- Marketing Section: Eye-catching, benefit-driven --- */}
          <section className="w-full my-12 flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-pink-600 mb-4">AI 智能料理，讓生活更美好！</h2>
            <p className="text-lg md:text-xl text-gray-800 font-semibold mb-2">
              讓 AI 幫你規劃菜單，省時、省錢、又營養！再也不用煩惱今天吃什麼，冰箱剩菜也能變美味大餐。
            </p>
            <p className="text-lg md:text-xl text-gray-700 mb-4">
              Recipe AI uses cutting-edge AI to plan your meals, save money, and boost nutrition. No more thinking about what to eat—just enjoy healthy, delicious recipes tailored to you!
            </p>
            <div className="flex flex-wrap justify-center gap-6 my-6">
              {/* Replace src with your DALL·E generated images */}
              <img src="/images/ai-chef.png" alt="AI Chef" className="rounded-xl shadow-lg w-64 h-64 object-cover" />
              <img src="/images/happy-family.png" alt="Happy Family" className="rounded-xl shadow-lg w-64 h-64 object-cover" />
              <img src="/images/smart-fridge.png" alt="Smart Fridge" className="rounded-xl shadow-lg w-64 h-64 object-cover" />
            </div>
            <ul className="text-lg text-green-700 font-bold mt-4 space-y-2">
              <li>🌟 AI自動生成專屬菜單，輕鬆健康每一天</li>
              <li>💰 精打細算，善用冰箱食材不浪費</li>
              <li>🥗 營養均衡，適合全家大小</li>
              <li>🤖 一鍵搞定，無腦料理新體驗</li>
            </ul>
            <ul className="text-lg text-blue-700 font-bold mt-4 space-y-2">
              <li>🌟 AI-powered personalized menus for effortless healthy living</li>
              <li>💰 Save money by using what you already have</li>
              <li>🥗 Nutritious, balanced meals for everyone</li>
              <li>🤖 One-click magic—let AI do the thinking!</li>
            </ul>
          </section>
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
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="input-primary flex-1"
                      />
                      <button 
                        onClick={handleFileUpload}
                        className="btn-primary"
                      >
                        Upload Image
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
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="input-primary flex-1"
                    />
                    <button 
                      onClick={handleFileUpload}
                      className="btn-primary"
                    >
                      Upload Image
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
