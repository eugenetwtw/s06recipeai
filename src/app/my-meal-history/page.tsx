'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nContext';

interface MealHistoryItem {
  id: string;
  name: string;
  restaurant: string;
  date: string;
  cuisine: string | { name: string } | any; // Allow for cuisine to be a string or an object with a name property
  dishes: string[];
  notes?: string;
  isFavorite: boolean;
  imageUrl?: string;
  detected_ingredients?: any; // Add this to store the AI-detected meal data
  natural_language_summary?: string; // Add this to store the AI-generated summary
}

export default function MyMealHistoryPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [mealHistory, setMealHistory] = useState<MealHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingMeal, setEditingMeal] = useState<MealHistoryItem | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newMeal, setNewMeal] = useState<Partial<MealHistoryItem>>({
    name: '',
    restaurant: '',
    date: new Date().toISOString().split('T')[0],
    cuisine: '',
    dishes: [],
    notes: '',
    isFavorite: false
  });
  const [newDish, setNewDish] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Common cuisines for filtering
  const cuisines = [
    { id: 'italian', name: 'Italian' },
    { id: 'chinese', name: 'Chinese' },
    { id: 'japanese', name: 'Japanese' },
    { id: 'mexican', name: 'Mexican' },
    { id: 'indian', name: 'Indian' },
    { id: 'thai', name: 'Thai' },
    { id: 'american', name: 'American' },
    { id: 'french', name: 'French' },
    { id: 'mediterranean', name: 'Mediterranean' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user) {
      fetchMealHistory();
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

  const fetchMealHistory = async () => {
    setIsLoading(true);
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Fetch meal history from the API
      const response = await fetch('/api/user/meal-history', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch meal history');
      }
      
      const meals = await response.json();
      // Process each meal to extract data from detected_ingredients
      const processedMeals = meals.map((meal: MealHistoryItem) => extractMealData(meal));
      setMealHistory(processedMeals);
    } catch (error) {
      console.error('Error fetching meal history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to guess the cuisine based on the restaurant or dish names
  const guessCuisine = (restaurant: string, dishes: string[]): string => {
    const text = (restaurant + ' ' + dishes.join(' ')).toLowerCase();
    
    if (text.includes('pizza') || text.includes('pasta') || text.includes('italian')) {
      return 'italian';
    }
    
    if (text.includes('sushi') || text.includes('ramen') || text.includes('japanese')) {
      return 'japanese';
    }
    
    if (text.includes('taco') || text.includes('burrito') || text.includes('mexican')) {
      return 'mexican';
    }
    
    if (text.includes('curry') || text.includes('naan') || text.includes('indian')) {
      return 'indian';
    }
    
    if (text.includes('pad thai') || text.includes('thai')) {
      return 'thai';
    }
    
    if (text.includes('burger') || text.includes('steak') || text.includes('american')) {
      return 'american';
    }
    
    if (text.includes('croissant') || text.includes('french')) {
      return 'french';
    }
    
    if (text.includes('hummus') || text.includes('falafel') || text.includes('mediterranean')) {
      return 'mediterranean';
    }
    
    if (text.includes('dim sum') || text.includes('chinese')) {
      return 'chinese';
    }
    
    return 'other';
  };

  const handleEditMeal = (meal: MealHistoryItem) => {
    setEditingMeal(meal);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMeal) return;
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the meal metadata to the API
      const response = await fetch('/api/user/meal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editingMeal)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save meal history');
      }
      
      // Update the local state
      setMealHistory(prevMeals => 
        prevMeals.map(meal => 
          meal.id === editingMeal.id ? editingMeal : meal
        )
      );
      
      setIsEditing(false);
      setEditingMeal(null);
    } catch (error) {
      console.error('Error saving meal history:', error);
      alert('Failed to save meal history. Please try again.');
    }
  };

  const handleAddMeal = () => {
    setIsAdding(true);
  };

  const handleAddDishToNewMeal = () => {
    if (newDish.trim() === '') return;
    
    setNewMeal(prev => ({
      ...prev,
      dishes: [...(prev.dishes || []), newDish.trim()]
    }));
    
    setNewDish('');
  };

  const handleRemoveDishFromNewMeal = (index: number) => {
    setNewMeal(prev => ({
      ...prev,
      dishes: (prev.dishes || []).filter((_, i) => i !== index)
    }));
  };

  const handleAddDishToEditingMeal = () => {
    if (!editingMeal || newDish.trim() === '') return;
    
    setEditingMeal({
      ...editingMeal,
      dishes: [...editingMeal.dishes, newDish.trim()]
    });
    
    setNewDish('');
  };

  const handleRemoveDishFromEditingMeal = (index: number) => {
    if (!editingMeal) return;
    
    setEditingMeal({
      ...editingMeal,
      dishes: editingMeal.dishes.filter((_, i) => i !== index)
    });
  };

  const handleSaveNewMeal = async () => {
    if (!newMeal.name || !newMeal.restaurant || !newMeal.date || !(newMeal.dishes && newMeal.dishes.length > 0)) {
      alert('Please fill in all required fields (name, restaurant, date, and at least one dish)');
      return;
    }
    
    const meal: MealHistoryItem = {
      id: `new-${Date.now()}`,
      name: newMeal.name,
      restaurant: newMeal.restaurant,
      date: newMeal.date || new Date().toISOString().split('T')[0],
      cuisine: newMeal.cuisine || guessCuisine(newMeal.restaurant, newMeal.dishes || []),
      dishes: newMeal.dishes || [],
      notes: newMeal.notes,
      isFavorite: newMeal.isFavorite || false,
      imageUrl: newMeal.imageUrl
    };
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the meal metadata to the API
      const response = await fetch('/api/user/meal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(meal)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save meal history');
      }
      
      // Update the local state
      setMealHistory(prevMeals => [...prevMeals, meal]);
      
      setNewMeal({
        name: '',
        restaurant: '',
        date: new Date().toISOString().split('T')[0],
        cuisine: '',
        dishes: [],
        notes: '',
        isFavorite: false
      });
      
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving meal history:', error);
      alert('Failed to save meal history. Please try again.');
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      // Find the meal to delete
      const mealToDelete = mealHistory.find(meal => meal.id === id);
      if (!mealToDelete) return;
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Delete the meal metadata from the API
      const response = await fetch(`/api/user/meal-history?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete meal history');
      }
      
      // Update the local state
      setMealHistory(prevMeals => prevMeals.filter(meal => meal.id !== id));
    } catch (error) {
      console.error('Error deleting meal history:', error);
      alert('Failed to delete meal history. Please try again.');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      // Find the meal to update
      const mealToUpdate = mealHistory.find(meal => meal.id === id);
      if (!mealToUpdate) return;
      
      // Create updated meal with toggled favorite status
      const updatedMeal = {
        ...mealToUpdate,
        isFavorite: !mealToUpdate.isFavorite
      };
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the updated meal metadata to the API
      const response = await fetch('/api/user/meal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updatedMeal)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update meal history');
      }
      
      // Update the local state
      setMealHistory(prevMeals => 
        prevMeals.map(meal => 
          meal.id === id ? updatedMeal : meal
        )
      );
    } catch (error) {
      console.error('Error updating meal history:', error);
      alert('Failed to update meal history. Please try again.');
    }
  };

  const handleDeleteAllMeals = async () => {
    // Confirm with the user before deleting all meal history
    if (!confirm('Are you sure you want to delete ALL meal history entries? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Call the delete-all API endpoint
      const response = await fetch('/api/user/meal-history/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete all meal history');
      }
      
      // Clear the local state
      setMealHistory([]);
      
      // Show success message
      alert('All meal history entries have been deleted successfully.');
    } catch (error) {
      console.error('Error deleting all meal history:', error);
      alert('Failed to delete all meal history. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    setIsUploading(true);
      setProcessingStatus(t('myMealHistory.preparingUpload'));
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', 'meal_history');

    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      setProcessingStatus(t('myMealHistory.uploadingPhotos'));
      // Upload the files
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload meal history photos');
      }

      const result = await response.json();
      setUploadSuccess(true);
      
      setProcessingStatus(t('myMealHistory.analyzingMeals'));
      setIsProcessing(true);
      
      // Process the uploaded images with the meal history processing API
      const processResponse = await fetch('/api/process-meal-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          text: "Processing uploaded meal history images",
          userId: session.user.id
        })
      });
      
      if (!processResponse.ok) {
        const errorData = await processResponse.json();
        throw new Error(errorData.error || 'Failed to process meal history');
      }
      
      setProcessingStatus(t('myMealHistory.updatingHistory'));
      // Refresh the meal history list
      await fetchMealHistory();
      
      setIsProcessing(false);
      // Show success message
      alert(t('myMealHistory.uploadSuccess'));
    } catch (error) {
      console.error('Error uploading meal history photos:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload meal history photos');
      alert(t('myMealHistory.uploadError'));
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setProcessingStatus('');
      // Reset the file input
      e.target.value = '';
    }
  };

  // Helper function to extract data from detected_ingredients
  const extractMealData = (meal: MealHistoryItem) => {
    // Check if meal has detected_ingredients and it's an object
    if (meal.detected_ingredients && typeof meal.detected_ingredients === 'object') {
      const ingredients = meal.detected_ingredients;
      
      // Extract restaurant name
      if ('restaurant_name' in ingredients && ingredients.restaurant_name) {
        meal.restaurant = ingredients.restaurant_name;
      }
      
      // Extract cuisine type
      if ('cuisine_type' in ingredients && ingredients.cuisine_type) {
        meal.cuisine = ingredients.cuisine_type;
      }
      
      // Extract dishes
      if ('dishes' in ingredients && Array.isArray(ingredients.dishes)) {
        meal.dishes = ingredients.dishes;
      }
      
      // Extract date if available and meal.date is not already set
      if ('order_date' in ingredients && ingredients.order_date && (!meal.date || meal.date === new Date().toISOString().split('T')[0])) {
        meal.date = ingredients.order_date;
      }
    }
    
    return meal;
  };

  // Helper function to get cuisine string value
  const getCuisineString = (cuisine: any): string => {
    if (typeof cuisine === 'string') {
      return cuisine;
    } else if (typeof cuisine === 'object' && cuisine !== null) {
      if ('name' in cuisine) {
        return cuisine.name;
      } else if ('id' in cuisine) {
        return cuisine.id;
      }
    }
    return 'other';
  };

  // Filter meals based on search term and cuisine
  const filteredMeals = mealHistory.filter(meal => {
    const matchesSearch = 
      meal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.restaurant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meal.dishes.some(dish => dish.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const cuisineStr = getCuisineString(meal.cuisine);
    const matchesCuisine = selectedCuisine === 'all' || cuisineStr === selectedCuisine;
    
    return matchesSearch && matchesCuisine;
  });

  // Sort meals by date (newest first)
  const sortedMeals = [...filteredMeals].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">{t('myMealHistory.title')}</h1>
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
            {t('common.backToHome')}
          </a>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('myMealHistory.searchMeals')}</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('myMealHistory.searchPlaceholder')}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('myMealHistory.filterByCuisine')}</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">{t('myMealHistory.allCuisines')}</option>
              {cuisines.map(cuisine => (
                <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <div className="flex justify-end items-end gap-2">
              <button
                onClick={handleAddMeal}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                {t('myMealHistory.addMeal')}
              </button>
              <label className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors cursor-pointer">
                {t('myMealHistory.uploadPhotos')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={handleDeleteAllMeals}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                title={t('myMealHistory.deleteAllTitle')}
              >
                {t('myMealHistory.deleteAll')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              {t('myMealHistory.uploadDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Processing Status Indicator */}
      {(isUploading || isProcessing) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center">
          <div className="mr-4">
            <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-700">{processingStatus}</p>
            <p className="text-sm text-blue-600">Please wait while we process your request...</p>
          </div>
        </div>
      )}

      {/* Meal History List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">{t('myMealHistory.title')}</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">{t('myMealHistory.loading')}</p>
          </div>
        ) : sortedMeals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{t('myMealHistory.noMeals')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedMeals.map(meal => (
              <div key={meal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{meal.name}</h3>
                  <button
                    onClick={() => handleToggleFavorite(meal.id)}
                    className={`text-xl ${meal.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {meal.natural_language_summary && (
                    <p className="mb-2 italic text-gray-700">{meal.natural_language_summary}</p>
                  )}
                  
                  <p>Restaurant: <span className="font-medium">{meal.restaurant}</span></p>
                  <p>Date: <span className="font-medium">{new Date(meal.date).toLocaleDateString()}</span></p>
                  <p>Cuisine: <span className="font-medium">
                    {cuisines.find(c => c.id === meal.cuisine)?.name || 
                     (typeof meal.cuisine === 'object' && meal.cuisine && 'name' in meal.cuisine ? meal.cuisine.name : null) || 
                     (typeof meal.cuisine === 'string' ? meal.cuisine : 'Other')}
                  </span></p>
                  
                  {meal.dishes && meal.dishes.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Dishes:</p>
                      <ul className="list-disc pl-5">
                        {meal.dishes.map((dish, index) => (
                          <li key={index}>{dish}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {meal.notes && (
                    <p className="mt-2">Notes: <span className="italic">{meal.notes}</span></p>
                  )}
                  
                  {meal.imageUrl && (
                    <div className="mt-3 mb-3">
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.name}
                        className="w-full h-48 object-cover rounded-md shadow-sm"
                        onError={(e) => {
                          // Handle image loading errors
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleEditMeal(meal)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteMeal(meal.id)}
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

      {/* Edit Meal Modal */}
      {isEditing && editingMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Meal</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Name</label>
                <input
                  type="text"
                  value={editingMeal.name}
                  onChange={(e) => setEditingMeal({...editingMeal, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant</label>
                <input
                  type="text"
                  value={editingMeal.restaurant}
                  onChange={(e) => setEditingMeal({...editingMeal, restaurant: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editingMeal.date}
                  onChange={(e) => setEditingMeal({...editingMeal, date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                <select
                  value={typeof editingMeal.cuisine === 'string' ? editingMeal.cuisine : 
                         typeof editingMeal.cuisine === 'object' && editingMeal.cuisine && 'id' in editingMeal.cuisine ? 
                         editingMeal.cuisine.id : 'other'}
                  onChange={(e) => setEditingMeal({...editingMeal, cuisine: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {cuisines.map(cuisine => (
                    <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dishes</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingMeal.dishes.map((dish, index) => (
                    <span key={index} className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {dish}
                      <button
                        className="ml-1 text-blue-500 font-bold"
                        onClick={() => handleRemoveDishFromEditingMeal(index)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDish}
                    onChange={(e) => setNewDish(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDishToEditingMeal();
                      }
                    }}
                    className="flex-1 p-2 border rounded"
                    placeholder="Add a dish"
                  />
                  <button
                    onClick={handleAddDishToEditingMeal}
                    className="bg-blue-500 text-white px-3 py-2 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingMeal.notes || ''}
                  onChange={(e) => setEditingMeal({...editingMeal, notes: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingMeal.isFavorite}
                  onChange={(e) => setEditingMeal({...editingMeal, isFavorite: e.target.checked})}
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

      {/* Add Meal Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Meal</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meal Name</label>
                <input
                  type="text"
                  value={newMeal.name || ''}
                  onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="e.g., Dinner, Lunch, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant</label>
                <input
                  type="text"
                  value={newMeal.restaurant || ''}
                  onChange={(e) => setNewMeal({...newMeal, restaurant: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="Restaurant name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newMeal.date || ''}
                  onChange={(e) => setNewMeal({...newMeal, date: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
                <select
                  value={newMeal.cuisine || 'other'}
                  onChange={(e) => setNewMeal({...newMeal, cuisine: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {cuisines.map(cuisine => (
                    <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dishes</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newMeal.dishes && newMeal.dishes.map((dish, index) => (
                    <span key={index} className="inline-flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {dish}
                      <button
                        className="ml-1 text-blue-500 font-bold"
                        onClick={() => handleRemoveDishFromNewMeal(index)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDish}
                    onChange={(e) => setNewDish(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDishToNewMeal();
                      }
                    }}
                    className="flex-1 p-2 border rounded"
                    placeholder="Add a dish"
                  />
                  <button
                    onClick={handleAddDishToNewMeal}
                    className="bg-blue-500 text-white px-3 py-2 rounded"
                  >
                    Add
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newMeal.notes || ''}
                  onChange={(e) => setNewMeal({...newMeal, notes: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                  placeholder="Any additional notes about this meal"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newMeal.isFavorite || false}
                  onChange={(e) => setNewMeal({...newMeal, isFavorite: e.target.checked})}
                  className="mr-2"
                />
                <label>Mark as favorite</label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewMeal}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
