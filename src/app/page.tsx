'use client';

import { useState } from 'react';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('refrigerator');

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
          <a href="/sign-in" className="bg-indigo-500 text-white p-2 rounded">Sign In</a>
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
