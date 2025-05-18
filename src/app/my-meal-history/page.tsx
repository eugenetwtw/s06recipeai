'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

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
}

export default function MyMealHistoryPage() {
  const router = useRouter();
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
      setMealHistory(meals);
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
        <h1 className="text-3xl font-bold text-indigo-700">My Meal History</h1>
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
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Meals</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, restaurant, or dish..."
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Cuisine</label>
            <select
              value={selectedCuisine}
              onChange={(e) => setSelectedCuisine(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">All Cuisines</option>
              {cuisines.map(cuisine => (
                <option key={cuisine.id} value={cuisine.id}>{cuisine.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3 flex justify-end items-end">
            <button
              onClick={handleAddMeal}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
            >
              Add New Meal
            </button>
          </div>
        </div>
      </div>

      {/* Meal History List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">Your Meal History</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">Loading your meal history...</p>
          </div>
        ) : sortedMeals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No meal history found. Add some meals to get started!</p>
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
                    <div className="mt-2">
                      <img 
                        src={meal.imageUrl} 
                        alt={meal.name} 
                        className="w-full h-32 object-cover rounded-lg" 
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
