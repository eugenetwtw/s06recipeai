import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Structured representation of user's culinary profile
interface UserCulinaryProfile {
  userId: string;
  cookware: {
    [key: string]: {
      present: boolean;
      lastVerified: Date;
      imageUrl?: string;
    }
  };
  foodPreferences: {
    frequentRestaurants: string[];
    commonDishes: string[];
    cuisineTypes: string[];
    spicyLevel: number;
    dietaryRestrictions: string[];
  };
  orderHistory: {
    platformOrders: {
      platform: 'UberEats' | 'Foodpanda' | 'Other';
      dishes: {
        name: string;
        restaurant: string;
        timestamp: Date;
        imageUrl?: string;
      }[];
    }[];
  };
}

export class UserProfileBuilder {
  private supabase: ReturnType<typeof createClient>;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  // Analyze and extract insights from food delivery order photos
  async analyzeDeliveryOrderPhotos(
    userId: string, 
    orderPhotos: string[]
  ): Promise<Partial<UserCulinaryProfile>> {
    const analysisPromises = orderPhotos.map(async (photoUrl) => {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Analyze this food delivery order photo. Extract dish name, restaurant, cuisine type, and any notable characteristics.' 
              },
              { 
                type: 'image_url', 
                image_url: { url: photoUrl } 
              }
            ]
          }
        ]
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    });

    const orderAnalyses = await Promise.all(analysisPromises);

    // Aggregate insights
    const profileUpdate: Partial<UserCulinaryProfile> = {
      userId,
      foodPreferences: {
        frequentRestaurants: [],
        commonDishes: [],
        cuisineTypes: [],
        spicyLevel: 0,
        dietaryRestrictions: []
      },
      orderHistory: {
        platformOrders: [{
          platform: 'UberEats',
          dishes: orderAnalyses.map(analysis => ({
            name: analysis.dishName,
            restaurant: analysis.restaurant,
            timestamp: new Date(),
            imageUrl: analysis.imageUrl
          }))
        }]
      }
    };

    // Analyze overall profile
    const profileAnalysisPrompt = `
      Analyze these food delivery orders:
      ${JSON.stringify(orderAnalyses)}

      Provide insights:
      1. Most frequent cuisine types
      2. Spice tolerance
      3. Common dish types
      4. Dietary patterns
      5. Restaurant preferences
    `;

    const profileAnalysis = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: profileAnalysisPrompt }],
      response_format: { type: 'json_object' }
    });

    const aggregatedInsights = JSON.parse(
      profileAnalysis.choices[0].message.content || '{}'
    );

    // Merge insights
    profileUpdate.foodPreferences = {
      ...profileUpdate.foodPreferences,
      ...aggregatedInsights
    };

    return profileUpdate;
  }

  // Analyze cookware photos and update user's cookware profile
  async analyzeCookwarePhotos(
    userId: string, 
    cookwarePhotos: string[]
  ): Promise<Partial<UserCulinaryProfile>> {
    const cookwareAnalysisPromises = cookwarePhotos.map(async (photoUrl) => {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: 'Identify kitchen equipment in this photo. Provide type, condition, and any notable characteristics.' 
              },
              { 
                type: 'image_url', 
                image_url: { url: photoUrl } 
              }
            ]
          }
        ]
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    });

    const cookwareAnalyses = await Promise.all(cookwareAnalysisPromises);

    // Create cookware profile
    const cookwareProfile = cookwareAnalyses.reduce((acc, analysis) => {
      acc[analysis.equipmentType] = {
        present: true,
        lastVerified: new Date(),
        imageUrl: analysis.imageUrl
      };
      return acc;
    }, {} as UserCulinaryProfile['cookware']);

    return {
      userId,
      cookware: cookwareProfile
    };
  }

  // Update user profile by removing specific items
  async removeProfileItem(
    userId: string, 
    itemType: 'cookware' | 'orderHistory' | 'foodPreferences', 
    itemKey: string
  ) {
    // Retrieve current profile
    const { data: currentProfile } = await this.supabase
      .from('user_culinary_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Modify profile
    let updatedProfile = { ...currentProfile };
    
    switch(itemType) {
      case 'cookware':
        delete updatedProfile.cookware[itemKey];
        break;
      case 'orderHistory':
        updatedProfile.orderHistory.platformOrders = 
          updatedProfile.orderHistory.platformOrders.filter(
            order => order.dishes.some(dish => dish.name !== itemKey)
          );
        break;
      case 'foodPreferences':
        // Example: remove a cuisine type
        updatedProfile.foodPreferences.cuisineTypes = 
          updatedProfile.foodPreferences.cuisineTypes.filter(
            cuisine => cuisine !== itemKey
          );
        break;
    }

    // Update profile in database
    await this.supabase
      .from('user_culinary_profiles')
      .update(updatedProfile)
      .eq('user_id', userId);

    return updatedProfile;
  }

  // Generate recipe prompt using user's profile
  async generateRecipePrompt(userId: string) {
    // Retrieve user's profile
    const { data: profile } = await this.supabase
      .from('user_culinary_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Construct detailed prompt for recipe generation
    return `
      Generate a personalized recipe based on user profile:

      Cookware Available:
      ${JSON.stringify(profile.cookware)}

      Food Preferences:
      ${JSON.stringify(profile.foodPreferences)}

      Recent Order History:
      ${JSON.stringify(profile.orderHistory)}

      Requirements:
      1. Use available cookware
      2. Match cuisine preferences
      3. Consider dietary restrictions
      4. Align with recent order patterns
    `;
  }
}

// Example usage workflow
async function profileBuilderWorkflow() {
  const profileBuilder = new UserProfileBuilder();

  // Analyze UberEats order photos
  const orderPhotoInsights = await profileBuilder.analyzeDeliveryOrderPhotos(
    'user123', 
    ['ubereats_order1.jpg', 'ubereats_order2.jpg']
  );

  // Analyze cookware photos
  const cookwareInsights = await profileBuilder.analyzeCookwarePhotos(
    'user123', 
    ['kitchen_photo1.jpg', 'kitchen_photo2.jpg']
  );

  // Remove an item (e.g., broken oven)
  await profileBuilder.removeProfileItem(
    'user123', 
    'cookware', 
    'oven'
  );

  // Generate recipe prompt
  const recipePrompt = await profileBuilder.generateRecipePrompt('user123');
}
