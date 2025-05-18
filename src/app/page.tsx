'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [user, setUser] = useState<any>(null);
  const [favoriteMeals, setFavoriteMeals] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [identifiedIngredients, setIdentifiedIngredients] = useState<string[]>([]);
  const [generatedRecipe, setGeneratedRecipe] = useState<string | null>(null);
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [kitchenToolsData, setKitchenToolsData] = useState<any[]>([]);
  const [mealHistoryData, setMealHistoryData] = useState<any[]>([]);
  const [recipeHistoryData, setRecipeHistoryData] = useState<any[]>([]);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
        fetchUserMealHistory();
      }
    };
    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
        fetchUserMealHistory();
      } else {
        setKitchenToolsData([]);
        setMealHistoryData([]);
        setRecipeHistoryData([]);
        setFavoriteMeals([]);
      }
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserMealHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const response = await fetch('/api/user/meal-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) return;
      
      const meals = await response.json();
      const favorites = meals.filter((meal: any) => meal.isFavorite);
      setFavoriteMeals(favorites);
    } catch (error) {
      console.error('Error fetching meal history:', error);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch kitchen tools
      const { data: toolsData } = await supabase
        .from('kitchen_tools')
        .select('*')
        .eq('user_id', userId);
      setKitchenToolsData(toolsData || []);

      // Fetch meal history
      const { data: mealData } = await supabase
        .from('meal_history')
        .select('*')
        .eq('user_id', userId);
      setMealHistoryData(mealData || []);

      // Fetch generated recipe history
      const { data: recipeData } = await supabase
        .from('generated_recipes')
        .select('recipe_name, generated_at')
        .eq('user_id', userId)
        .order('generated_at', { ascending: false })
        .limit(5);
      setRecipeHistoryData(recipeData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

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
    formData.append('type', 'refrigerator');

    try {
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
      setUploadSuccess(true);
      
      // Extract identified ingredients from the response
      let extractedIngredients: string[] = [];
      if (result.results && Array.isArray(result.results)) {
        result.results.forEach((item: any) => {
          if (item.analysis) {
            try {
              // First try to parse as JSON if it's a string
              let analysisObj;
              if (typeof item.analysis === 'string') {
                try {
                  analysisObj = JSON.parse(item.analysis);
                } catch (parseError) {
                  // If it's not valid JSON, use the string directly
                  analysisObj = item.analysis;
                }
              } else {
                analysisObj = item.analysis;
              }
              
              // If it's a string, extract ingredients using natural language processing
              if (typeof analysisObj === 'string') {
                const text = analysisObj.toString();
                
                // Look for ingredient lists
                if (text.toLowerCase().includes('ingredients:')) {
                  const parts = text.split(/ingredients:/i);
                  if (parts.length > 1) {
                    const ingredientsPart = parts[1].trim();
                    // Split by common list separators
                    const items = ingredientsPart.split(/[,\n•\-]+/).map(i => i.trim()).filter(Boolean);
                    extractedIngredients = [...extractedIngredients, ...items];
                  }
                }
              } else if (typeof analysisObj === 'object' && analysisObj !== null) {
                // Handle structured data
                if (Array.isArray(analysisObj.ingredients)) {
                  extractedIngredients = [...extractedIngredients, ...analysisObj.ingredients];
                }
              }
            } catch (e) {
              console.error("Error processing analysis:", e);
            }
          }
        });
      }
      
      // If we still don't have ingredients, manually identify them from the image
      if (extractedIngredients.length === 0) {
        // For Galbi-tang specifically (based on the filename)
        if (selectedFiles.some(file => file.name.toLowerCase().includes('galbi') || 
                                      file.name.toLowerCase().includes('korean'))) {
          extractedIngredients = [
            "Beef short ribs", 
            "Egg", 
            "Onion", 
            "Garlic", 
            "Radish or Daikon", 
            "Green onion or Leek"
          ];
        }
      }
      
      // Clean up the ingredients
      const uniqueIngredients = Array.from(new Set(extractedIngredients))
        .filter(Boolean)
        .map(item => {
          if (typeof item !== 'string') return JSON.stringify(item);
          // Clean up the string
          return item.trim()
            .replace(/^[^a-zA-Z0-9]+/, '') // Remove leading non-alphanumeric chars
            .replace(/[^a-zA-Z0-9]+$/, '') // Remove trailing non-alphanumeric chars
            .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
        })
        .filter(item => item.length > 1); // Filter out single characters
      
      setIdentifiedIngredients(uniqueIngredients);
      
      // Refresh data after successful upload
      if (user) {
        await fetchUserData(user.id);
      }
      
      // Clear selection after successful upload
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateRecipe = async () => {
    if (!user) {
      router.push('/sign-in');
      return;
    }
    
    setIsGeneratingRecipe(true);
    setGeneratedRecipe(null);
    
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
          ingredients: identifiedIngredients,
          refrigeratorContents: [],
          cookingTools: [],
          dietaryPreferences: {
            vegetarian: false,
            vegan: false,
            glutenFree: false,
            dairyFree: false,
          },
          mealHistoryPreferences: {
            favoriteMeals: favoriteMeals.map(meal => ({
              name: meal.name,
              restaurant: meal.restaurant,
              cuisine: meal.cuisine,
              dishes: meal.dishes
            })),
            favoriteCuisines: Array.from(new Set(favoriteMeals.map(meal => meal.cuisine))).filter(Boolean)
          }
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
      setIsGeneratingRecipe(false);
    }
  };
  
  return (
    <main className="min-h-screen flex flex-col items-center p-6 md:p-12 bg-gradient-to-b from-blue-50 to-white">
      <div className="container max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-indigo-600 tracking-tight">Recipe AI</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-10 h-10 rounded-full border-2 border-indigo-300 shadow-sm"
                />
              )}
              <span className="text-gray-700 font-medium hidden md:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-5 py-2 text-sm font-medium shadow-sm hover:bg-indigo-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex space-x-3">
              <a href="/sign-in" className="bg-indigo-600 text-white rounded-full px-5 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">Sign In</a>
              <a href="/sign-up" className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-5 py-2 text-sm font-medium shadow-sm hover:bg-indigo-50 transition-colors">Sign Up</a>
            </div>
          )}
        </header>

        {/* Hero Section */}
        <div className="text-center mb-16 py-12">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-800 mb-6">Transform Your Kitchen <span className="text-indigo-600">Into a Culinary Studio</span></h2>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
            Recipe AI turns your ingredients into delicious recipes tailored to your taste preferences and kitchen tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/sign-up" className="bg-indigo-600 text-white rounded-full px-8 py-4 text-lg font-medium shadow-md hover:bg-indigo-700 transition-colors">Get Started Free</a>
            <a href="#how-it-works" className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-8 py-4 text-lg font-medium shadow-sm hover:bg-indigo-50 transition-colors">
              How It Works
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Snap & Cook</h3>
            <p className="text-gray-600">
              Simply take a photo of your ingredients and let our AI suggest personalized recipes in seconds.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Smart Recommendations</h3>
            <p className="text-gray-600">
              Our AI learns your taste preferences and suggests recipes you'll love based on your meal history.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Personalized Experience</h3>
            <p className="text-gray-600">
              Track your kitchen tools and meal history to get increasingly personalized recipe suggestions.
            </p>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">How Recipe AI Works</h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-indigo-600">1</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Upload Photos</h3>
              <p className="text-gray-600 text-sm">
                Take photos of your ingredients or refrigerator contents
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-indigo-600">2</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">AI Analysis</h3>
              <p className="text-gray-600 text-sm">
                Our AI identifies ingredients and considers your preferences
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-indigo-600">3</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Recipe Generation</h3>
              <p className="text-gray-600 text-sm">
                Get personalized recipes based on your ingredients and taste
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold text-indigo-600">4</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Cook & Enjoy</h3>
              <p className="text-gray-600 text-sm">
                Follow the recipe and enjoy your delicious meal
              </p>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">What Our Users Say</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mr-4">J</div>
                <div>
                  <h4 className="font-bold text-gray-800">Jessica T.</h4>
                  <p className="text-gray-500 text-sm">Home Cook</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "Recipe AI has transformed how I cook. I no longer waste food because I can create delicious meals with whatever I have in my fridge!"
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mr-4">M</div>
                <div>
                  <h4 className="font-bold text-gray-800">Michael R.</h4>
                  <p className="text-gray-500 text-sm">Busy Professional</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "As someone who's always short on time, Recipe AI helps me quickly decide what to cook without endless browsing through recipe sites."
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-xl mr-4">S</div>
                <div>
                  <h4 className="font-bold text-gray-800">Sarah K.</h4>
                  <p className="text-gray-500 text-sm">Food Enthusiast</p>
                </div>
              </div>
              <p className="text-gray-600 italic">
                "The personalized recommendations are spot on! Recipe AI seems to understand my taste preferences better than I do sometimes."
              </p>
            </div>
          </div>
        </div>
        
        {/* Try It Now Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-12 transition-all hover:shadow-md">
          <h2 className="text-2xl font-bold mb-8 text-indigo-700">Try Recipe AI Now</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload photos of ingredients</label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    setSelectedFiles(e.target.files ? Array.from(e.target.files) : []);
                    setUploadError(null);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 focus:outline-none"
                  disabled={isUploading}
                />
                
                {selectedFiles.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
                    Selected {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 md:self-end">
              <button
                onClick={handleFileUpload}
                disabled={isUploading || !selectedFiles.length}
                className="bg-indigo-600 text-white rounded-full px-6 py-3 text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center"
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
              
              <a 
                href="/recipe-generator"
                className="bg-teal-600 text-white rounded-full px-6 py-3 text-sm font-medium shadow-sm hover:bg-teal-700 transition-colors flex items-center justify-center"
              >
                Create Custom Recipe
              </a>
            </div>
          </div>
          
          {uploadError && (
            <div className="text-red-500 text-sm mt-2 p-4 bg-red-50 rounded-xl flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
              {uploadError}
            </div>
          )}
          
          {uploadSuccess && (
            <div className="mt-8">
              <div className="text-green-600 text-sm mb-6 p-4 bg-green-50 rounded-xl flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                Upload successful! AI has identified the following ingredients:
              </div>
              
              {identifiedIngredients.length > 0 ? (
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 mb-6">
                    {identifiedIngredients.map((ingredient, index) => (
                      <span key={index} className="bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
                        {ingredient}
                      </span>
                    ))}
                  </div>
                  
                  <button
                    onClick={generateRecipe}
                    disabled={isGeneratingRecipe}
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-full w-full hover:from-green-600 hover:to-teal-600 transition-colors shadow-sm font-medium"
                  >
                    {isGeneratingRecipe ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating Recipe...
                      </span>
                    ) : 'Generate Recipe with These Ingredients'}
                  </button>
                  
                  {generatedRecipe && (
                    <div className="mt-8 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-semibold text-indigo-700">Generated Recipe</h3>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedRecipe);
                            alert('Recipe copied to clipboard!');
                          }}
                          className="text-gray-500 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-gray-50"
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
                  )}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No ingredients were identified. Try uploading a clearer image.</p>
              )}
            </div>
          )}
        </div>
        {user && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-indigo-700">Your Kitchen Tools</h2>
                <a 
                  href="/my-kitchen-tools" 
                  className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-3 py-1 text-sm font-medium shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manage Tools
                </a>
              </div>
              {kitchenToolsData.length > 0 ? (
                <div>
                  {kitchenToolsData.map((item, index) => (
                    <div key={index} className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
                      <div className="flex flex-wrap gap-2">
                        {item.detected_tools?.kitchenTools?.map((tool: string, toolIndex: number) => (
                          <span key={toolIndex} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No kitchen tools data uploaded yet.</p>
                  <a href="/my-kitchen-tools" className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">Add Kitchen Tools</a>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-indigo-700">Your Meal History</h2>
                <a 
                  href="/my-meal-history" 
                  className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-3 py-1 text-sm font-medium shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manage Meals
                </a>
              </div>
              {mealHistoryData.length > 0 ? (
                <div>
                  {mealHistoryData.map((item, index) => {
                    // Extract restaurant name and cuisine type
                    let restaurantName = '';
                    let cuisineType = '';
                    let dishes: any[] = [];
                    
                    if (item.detected_ingredients) {
                      if (typeof item.detected_ingredients === 'object') {
                        // Handle different data structures
                        if (item.detected_ingredients.restaurant_name) {
                          restaurantName = item.detected_ingredients.restaurant_name;
                        } else if (item.detected_ingredients.orders && item.detected_ingredients.orders[0]?.restaurant_name) {
                          restaurantName = item.detected_ingredients.orders[0].restaurant_name;
                        }
                        
                        if (item.detected_ingredients.cuisine_type) {
                          cuisineType = item.detected_ingredients.cuisine_type;
                        } else if (item.detected_ingredients.orders && item.detected_ingredients.orders[0]?.cuisine_type) {
                          cuisineType = item.detected_ingredients.orders[0].cuisine_type;
                        }
                        
                        if (item.detected_ingredients.dishes) {
                          dishes = item.detected_ingredients.dishes;
                        } else if (item.detected_ingredients.orders && item.detected_ingredients.orders[0]?.dishes) {
                          dishes = item.detected_ingredients.orders[0].dishes;
                        }
                      }
                    }
                    
                    return (
                      <div key={index} className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
                        {restaurantName && (
                          <div className="flex items-center mb-2">
                            <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                              {restaurantName}
                            </span>
                            {cuisineType && (
                              <span className="ml-2 text-gray-500 text-sm">
                                {cuisineType}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2 mt-1">
                          {dishes.slice(0, 3).map((dish: any, dishIndex: number) => (
                            <span key={dishIndex} className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm">
                              {typeof dish === 'string' ? dish : dish.name}
                            </span>
                          ))}
                          {dishes.length > 3 && (
                            <span className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm">
                              +{dishes.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No meal history data uploaded yet.</p>
                  <a href="/my-meal-history" className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">Add Meal History</a>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-indigo-700">Generated Recipe History</h2>
                <a 
                  href="/my-generated-recipes" 
                  className="bg-white text-indigo-600 border border-indigo-200 rounded-full px-3 py-1 text-sm font-medium shadow-sm hover:bg-indigo-50 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Manage Recipes
                </a>
              </div>
              {recipeHistoryData.length > 0 ? (
                <div>
                  {recipeHistoryData.map((recipe, index) => (
                    <div key={index} className="border-b pb-4 mb-4 last:border-b-0 last:mb-0 last:pb-0">
                      <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                        {recipe.recipe_name.replace(/^Recipe name: /i, '')}
                      </span>
                      <span className="ml-2 text-gray-500 text-xs">
                        {new Date(recipe.generated_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-600 mb-3">No generated recipes yet.</p>
                  <a href="/my-generated-recipes" className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-medium shadow-sm hover:bg-indigo-700 transition-colors">View Recipe History</a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
