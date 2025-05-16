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
    <main className="min-h-screen p-24">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Recipe AI</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="avatar"
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-gray-700">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-gray-300 text-gray-800 p-2 rounded"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <a href="/sign-in" className="bg-indigo-500 text-white p-2 rounded">Sign In</a>
          )}
        </div>
        
        <div>
          <select 
            value={uploadType} 
            onChange={(e) => setUploadType(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="refrigerator">Refrigerator Contents</option>
            <option value="kitchen_tools">Kitchen Tools</option>
            <option value="meal_history">Meal History</option>
          </select>
          
          <input 
            type="file" 
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="ml-4"
          />
          
          <button 
            onClick={handleFileUpload}
            className="bg-blue-500 text-white p-2 rounded ml-4"
          >
            Upload Image
          </button>
        </div>

        <button 
          onClick={handleGenerateRecipe}
          className="bg-green-500 text-white p-2 rounded"
        >
          Generate Personalized Recipe
        </button>
      </div>
    </main>
  );
}
