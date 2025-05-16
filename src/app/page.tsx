'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('refrigerator');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Fetch current session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // Listen for auth changes (e.g., sign in/out in another tab)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

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
            <a href="/sign-in" className="btn-primary text-sm">Sign In</a>
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
              className="btn-secondary"
            >
              Generate Recipe
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
