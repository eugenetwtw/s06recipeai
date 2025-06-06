'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/i18n/I18nContext';

interface KitchenTool {
  id: string;
  name: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  lastMaintenanceDate?: string;
  notes?: string;
  isFavorite: boolean;
  imageUrl?: string;
  rawToolId?: string;
}

export default function MyKitchenToolsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any>(null);
  const [kitchenTools, setKitchenTools] = useState<KitchenTool[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [editingTool, setEditingTool] = useState<KitchenTool | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTool, setNewTool] = useState<Partial<KitchenTool>>({
    name: '',
    category: 'cooking',
    condition: 'good',
    notes: '',
    isFavorite: false
  });
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Categories for kitchen tools
  const categories = [
    { id: 'cooking', name: 'Cooking' },
    { id: 'baking', name: 'Baking' },
    { id: 'appliance', name: 'Appliance' },
    { id: 'utensil', name: 'Utensil' },
    { id: 'storage', name: 'Storage' },
    { id: 'other', name: 'Other' }
  ];

  // Conditions for kitchen tools
  const conditions = [
    { id: 'excellent', name: 'Excellent' },
    { id: 'good', name: 'Good' },
    { id: 'fair', name: 'Fair' },
    { id: 'poor', name: 'Poor' }
  ];

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user) {
      fetchKitchenTools();
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

  const fetchKitchenTools = async () => {
    setIsLoading(true);
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Fetch kitchen tools from the API
      const response = await fetch('/api/user/kitchen-tools', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch kitchen tools');
      }
      
      const tools = await response.json();
      setKitchenTools(tools);
    } catch (error) {
      console.error('Error fetching kitchen tools:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to guess the category based on the tool name
  const guessCategory = (toolName: string): string => {
    toolName = toolName.toLowerCase();
    
    if (toolName.includes('oven') || toolName.includes('mixer') || 
        toolName.includes('blender') || toolName.includes('processor') || 
        toolName.includes('cooker') || toolName.includes('maker')) {
      return 'appliance';
    }
    
    if (toolName.includes('pan') || toolName.includes('pot') || 
        toolName.includes('skillet') || toolName.includes('wok')) {
      return 'cooking';
    }
    
    if (toolName.includes('sheet') || toolName.includes('dish') || 
        toolName.includes('tray') || toolName.includes('tin')) {
      return 'baking';
    }
    
    if (toolName.includes('knife') || toolName.includes('spoon') || 
        toolName.includes('fork') || toolName.includes('whisk') || 
        toolName.includes('spatula') || toolName.includes('tongs')) {
      return 'utensil';
    }
    
    if (toolName.includes('container') || toolName.includes('jar') || 
        toolName.includes('bag') || toolName.includes('wrap')) {
      return 'storage';
    }
    
    return 'other';
  };

  const handleEditTool = (tool: KitchenTool) => {
    setEditingTool(tool);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTool) return;
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the tool metadata to the API
      const response = await fetch('/api/user/kitchen-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editingTool)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save kitchen tool');
      }
      
      // Update the local state
      setKitchenTools(prevTools => 
        prevTools.map(tool => 
          tool.id === editingTool.id ? editingTool : tool
        )
      );
      
      setIsEditing(false);
      setEditingTool(null);
    } catch (error) {
      console.error('Error saving kitchen tool:', error);
      alert('Failed to save kitchen tool. Please try again.');
    }
  };

  const handleAddTool = () => {
    setIsAdding(true);
  };

  const handleSaveNewTool = async () => {
    if (!newTool.name) return;
    
    const tool: KitchenTool = {
      id: `new-${Date.now()}`,
      name: newTool.name,
      category: newTool.category || 'other',
      condition: newTool.condition || 'good',
      lastMaintenanceDate: newTool.lastMaintenanceDate,
      notes: newTool.notes,
      isFavorite: newTool.isFavorite || false
    };
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the tool metadata to the API
      const response = await fetch('/api/user/kitchen-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(tool)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save kitchen tool');
      }
      
      // Update the local state
      setKitchenTools(prevTools => [...prevTools, tool]);
      
      setNewTool({
        name: '',
        category: 'cooking',
        condition: 'good',
        notes: '',
        isFavorite: false
      });
      
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving kitchen tool:', error);
      alert('Failed to save kitchen tool. Please try again.');
    }
  };

  const handleDeleteTool = async (id: string) => {
    try {
      // Find the tool to delete
      const toolToDelete = kitchenTools.find(tool => tool.id === id);
      if (!toolToDelete) return;
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Delete the tool metadata from the API
      const response = await fetch(`/api/user/kitchen-tools?name=${encodeURIComponent(toolToDelete.name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete kitchen tool');
      }
      
      // Update the local state
      setKitchenTools(prevTools => prevTools.filter(tool => tool.id !== id));
    } catch (error) {
      console.error('Error deleting kitchen tool:', error);
      alert('Failed to delete kitchen tool. Please try again.');
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      // Find the tool to update
      const toolToUpdate = kitchenTools.find(tool => tool.id === id);
      if (!toolToUpdate) return;
      
      // Create updated tool with toggled favorite status
      const updatedTool = {
        ...toolToUpdate,
        isFavorite: !toolToUpdate.isFavorite
      };
      
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Save the updated tool metadata to the API
      const response = await fetch('/api/user/kitchen-tools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updatedTool)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update kitchen tool');
      }
      
      // Update the local state
      setKitchenTools(prevTools => 
        prevTools.map(tool => 
          tool.id === id ? updatedTool : tool
        )
      );
    } catch (error) {
      console.error('Error updating kitchen tool:', error);
      alert('Failed to update kitchen tool. Please try again.');
    }
  };

  const handleDeleteAllTools = async () => {
    // Confirm with the user before deleting all kitchen tools
    if (!confirm('Are you sure you want to delete ALL kitchen tools? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
      
      // Call the delete-all API endpoint
      const response = await fetch('/api/user/kitchen-tools/delete-all', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete all kitchen tools');
      }
      
      // Clear the local state
      setKitchenTools([]);
      
      // Show success message
      alert('All kitchen tools have been deleted successfully.');
    } catch (error) {
      console.error('Error deleting all kitchen tools:', error);
      alert('Failed to delete all kitchen tools. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    setIsUploading(true);
    setProcessingStatus(t('myKitchenTools.preparingUpload'));
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    Array.from(e.target.files).forEach((file) => {
      formData.append('files', file);
    });
    formData.append('type', 'kitchen_tools');

    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      setProcessingStatus(t('myKitchenTools.uploadingPhotos'));
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
        throw new Error(errorData.error || 'Failed to upload kitchen tool photos');
      }

      const result = await response.json();
      setUploadSuccess(true);
      
      setProcessingStatus(t('myKitchenTools.analyzingTools'));
      setIsProcessing(true);
      
      // Artificial delay to show processing message (AI analysis happens on server)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setProcessingStatus(t('myKitchenTools.updatingInventory'));
      // Refresh the kitchen tools list
      await fetchKitchenTools();
      
      setIsProcessing(false);
      // Show success message
      alert(t('myKitchenTools.uploadSuccess'));
    } catch (error) {
      console.error('Error uploading kitchen tool photos:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload kitchen tool photos');
      alert(t('myKitchenTools.uploadError'));
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setProcessingStatus('');
      // Reset the file input
      e.target.value = '';
    }
  };

  // Filter tools based on search term and category
  const filteredTools = kitchenTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-700">{t('myKitchenTools.title')}</h1>
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
          <a href={useI18n().getLocalizedUrl('/')} className="bg-indigo-500 text-white px-4 py-2 rounded-lg shadow-md hover:bg-indigo-600 transition-colors duration-200 text-sm">
            {t('common.backToHome') || 'Back to Homepage'}
          </a>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('myKitchenTools.searchTools')}</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('myKitchenTools.searchByName')}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="w-full md:w-1/3">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('myKitchenTools.filterByCategory')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="all">{t('myKitchenTools.allCategories')}</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/3">
            <div className="flex justify-end items-end gap-2">
              <button
                onClick={handleAddTool}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                {t('myKitchenTools.addTools')}
              </button>
              <label className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors cursor-pointer">
                {t('myKitchenTools.uploadPhotos')}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
              <button
                onClick={handleDeleteAllTools}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                title="Delete all kitchen tools"
              >
                {t('myKitchenTools.deleteAll')}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              {t('myKitchenTools.uploadDescription')}
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

      {/* Kitchen Tools List */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-indigo-700">{t('myKitchenTools.title')}</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-gray-600">{t('common.loading') || 'Loading your kitchen tools...'}</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">{t('myKitchenTools.noTools')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map(tool => (
              <div key={tool.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium">{tool.name}</h3>
                  <button
                    onClick={() => handleToggleFavorite(tool.id)}
                    className={`text-xl ${tool.isFavorite ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                </div>
                
                {/* Display image thumbnail if available */}
                {tool.imageUrl && (
                  <div className="mt-3 mb-3">
                    <img 
                      src={tool.imageUrl} 
                      alt={tool.name}
                      className="w-full h-48 object-cover rounded-md shadow-sm"
                      onError={(e) => {
                        // Handle image loading errors
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="mt-2 text-sm text-gray-600">
                  <p>{t('myKitchenTools.category')}: <span className="font-medium">{categories.find(c => c.id === tool.category)?.name || tool.category}</span></p>
                  <p>{t('myKitchenTools.condition')}: <span className="font-medium">{conditions.find(c => c.id === tool.condition)?.name || tool.condition}</span></p>
                  {tool.lastMaintenanceDate && (
                    <p>Last Maintenance: <span className="font-medium">{new Date(tool.lastMaintenanceDate).toLocaleDateString()}</span></p>
                  )}
                  {tool.notes && (
                    <p className="mt-1">Notes: <span className="italic">{tool.notes}</span></p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => handleEditTool(tool)}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {t('common.edit') || 'Edit'}
                  </button>
                  <button
                    onClick={() => handleDeleteTool(tool.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    {t('common.delete') || 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Tool Modal */}
      {isEditing && editingTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Kitchen Tool</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingTool.name}
                  onChange={(e) => setEditingTool({...editingTool, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editingTool.category}
                  onChange={(e) => setEditingTool({...editingTool, category: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={editingTool.condition}
                  onChange={(e) => setEditingTool({...editingTool, condition: e.target.value as any})}
                  className="w-full p-2 border rounded"
                >
                  {conditions.map(condition => (
                    <option key={condition.id} value={condition.id}>{condition.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance Date</label>
                <input
                  type="date"
                  value={editingTool.lastMaintenanceDate || ''}
                  onChange={(e) => setEditingTool({...editingTool, lastMaintenanceDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingTool.notes || ''}
                  onChange={(e) => setEditingTool({...editingTool, notes: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editingTool.isFavorite}
                  onChange={(e) => setEditingTool({...editingTool, isFavorite: e.target.checked})}
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

      {/* Add Tool Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add New Kitchen Tool</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTool.name || ''}
                  onChange={(e) => setNewTool({...newTool, name: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newTool.category || 'other'}
                  onChange={(e) => setNewTool({...newTool, category: e.target.value})}
                  className="w-full p-2 border rounded"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                <select
                  value={newTool.condition || 'good'}
                  onChange={(e) => setNewTool({...newTool, condition: e.target.value as any})}
                  className="w-full p-2 border rounded"
                >
                  {conditions.map(condition => (
                    <option key={condition.id} value={condition.id}>{condition.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance Date</label>
                <input
                  type="date"
                  value={newTool.lastMaintenanceDate || ''}
                  onChange={(e) => setNewTool({...newTool, lastMaintenanceDate: e.target.value})}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newTool.notes || ''}
                  onChange={(e) => setNewTool({...newTool, notes: e.target.value})}
                  className="w-full p-2 border rounded h-24"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={newTool.isFavorite || false}
                  onChange={(e) => setNewTool({...newTool, isFavorite: e.target.checked})}
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
                onClick={handleSaveNewTool}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Tool
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
