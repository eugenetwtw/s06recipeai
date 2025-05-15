import OpenAI from 'openai';

interface MealOrder {
  restaurant: string;
  cuisine: string;
  dishName: string;
  spiciness?: number;
  proteins: string[];
  cuisineStyle: string[];
  dietaryPreferences: string[];
}

interface TasteProfile {
  preferredCuisines: string[];
  spicinessLevel: number;
  proteinPreferences: string[];
  cookingStyles: string[];
  dietaryRestrictions: string[];
}

export class TasteProfiler {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async analyzeMealHistory(mealOrders: MealOrder[]): Promise<TasteProfile> {
    const prompt = `
      Analyze these meal orders and create a comprehensive taste profile:
      ${JSON.stringify(mealOrders, null, 2)}

      Provide a detailed JSON response with:
      - Top 3 preferred cuisines
      - Average spiciness preference (0-10 scale)
      - Most ordered protein types
      - Preferred cooking styles
      - Any dietary preferences or restrictions
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content || '{}') as TasteProfile;
  }

  async generatePersonalizedRecipe(
    tasteProfile: TasteProfile, 
    fridgeIngredients: string[], 
    cookware: string[]
  ): Promise<string> {
    const prompt = `
      Generate a personalized recipe based on:
      Taste Profile: ${JSON.stringify(tasteProfile)}
      Available Ingredients: ${JSON.stringify(fridgeIngredients)}
      Available Cookware: ${JSON.stringify(cookware)}

      Requirements:
      1. Match at least 2 cuisine preferences
      2. Use available ingredients
      3. Utilize available cookware
      4. Respect dietary preferences
      5. Match spiciness level
      6. Include preferred protein types

      Provide a detailed recipe in JSON format with:
      - Recipe Name
      - Cuisine Style
      - Ingredients
      - Step-by-Step Instructions
      - Spiciness Level
      - Cooking Techniques
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return response.choices[0].message.content || '{}';
  }

  // Machine Learning-like Taste Evolution
  updateTasteProfile(
    currentProfile: TasteProfile, 
    newMealOrder: MealOrder
  ): TasteProfile {
    // Simple weighted average approach to evolve taste preferences
    return {
      preferredCuisines: this.updatePreference(
        currentProfile.preferredCuisines, 
        newMealOrder.cuisineStyle
      ),
      spicinessLevel: this.calculateWeightedSpiciness(
        currentProfile.spicinessLevel, 
        newMealOrder.spiciness || 5
      ),
      proteinPreferences: this.updatePreference(
        currentProfile.proteinPreferences, 
        newMealOrder.proteins
      ),
      cookingStyles: this.updatePreference(
        currentProfile.cookingStyles, 
        [newMealOrder.cuisineStyle[0]]
      ),
      dietaryRestrictions: [
        ...new Set([
          ...currentProfile.dietaryRestrictions, 
          ...(newMealOrder.dietaryPreferences || [])
        ])
      ]
    };
  }

  private updatePreference(
    currentPreferences: string[], 
    newPreferences: string[]
  ): string[] {
    const combinedPreferences = [
      ...currentPreferences, 
      ...newPreferences
    ];
    
    // Count occurrences and sort by frequency
    const preferenceCount = combinedPreferences.reduce((acc, pref) => {
      acc[pref] = (acc[pref] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(preferenceCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);
  }

  private calculateWeightedSpiciness(
    currentSpiciness: number, 
    newSpiciness: number
  ): number {
    // Exponential moving average for spiciness
    const alpha = 0.3; // Weight for new data point
    return currentSpiciness * (1 - alpha) + newSpiciness * alpha;
  }
}
