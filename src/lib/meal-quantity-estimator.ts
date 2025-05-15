import OpenAI from 'openai';

// Comprehensive user context for meal planning
interface MealPlanningContext {
  userId: string;
  householdComposition: {
    adultCount: number;
    childCount: number;
    dietaryNeeds: string[];
  };
  cookingEquipment: string[];
  refrigeratorContents: {
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
    }>;
    estimatedValue: number;
  };
  recentMealHistory: Array<{
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    servingSize: number;
    cuisineType: string;
  }>;
  nutritionalGoals?: {
    targetCalories?: number;
    proteinIntake?: number;
    dietaryRestrictions?: string[];
  };
}

// Meal quantity and style recommendation
interface MealRecommendation {
  servingSize: number;
  mealStyle: 'single_pot' | 'multiple_dishes' | 'batch_cooking';
  cuisineComplexity: 'simple' | 'moderate' | 'complex';
  recommendedDishes: Array<{
    name: string;
    estimatedServings: number;
    primaryIngredients: string[];
  }>;
}

export class MealQuantityEstimator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  // Estimate meal quantity and style
  async estimateMealQuantity(context: MealPlanningContext): Promise<MealRecommendation> {
    // Comprehensive prompt for meal planning
    const mealPlanningPrompt = `
      Meal Planning Analysis:
      
      Household Composition:
      - Adults: ${context.householdComposition.adultCount}
      - Children: ${context.householdComposition.childCount}
      - Dietary Needs: ${JSON.stringify(context.householdComposition.dietaryNeeds)}

      Available Cooking Equipment:
      ${JSON.stringify(context.cookingEquipment)}

      Refrigerator Contents:
      ${JSON.stringify(context.refrigeratorContents.ingredients)}
      Estimated Ingredient Value: $${context.refrigeratorContents.estimatedValue}

      Recent Meal History:
      ${JSON.stringify(context.recentMealHistory)}

      Nutritional Goals:
      ${JSON.stringify(context.nutritionalGoals)}

      Analyze and Provide:
      1. Optimal Serving Size
      2. Meal Preparation Style
      3. Cuisine Complexity
      4. Recommended Dishes
      5. Ingredient Utilization Strategy

      Consider:
      - Household size
      - Available ingredients
      - Cooking equipment
      - Recent eating patterns
      - Nutritional balance

      Output Format:
      {
        "servingSize": number,
        "mealStyle": "single_pot" | "multiple_dishes" | "batch_cooking",
        "cuisineComplexity": "simple" | "moderate" | "complex",
        "recommendedDishes": [
          {
            "name": string,
            "estimatedServings": number,
            "primaryIngredients": string[]
          }
        ],
        "ingredientUtilizationStrategy": string[]
      }
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: mealPlanningPrompt }],
        response_format: { type: 'json_object' }
      });

      return JSON.parse(response.choices[0].message.content || '{}') as MealRecommendation;
    } catch (error) {
      console.error('Meal quantity estimation failed', error);
      
      // Fallback estimation
      return this.fallbackMealEstimation(context);
    }
  }

  // Fallback estimation method
  private fallbackMealEstimation(context: MealPlanningContext): MealRecommendation {
    // Basic heuristic-based estimation
    const totalPeople = context.householdComposition.adultCount + 
                        (context.householdComposition.childCount * 0.5);
    
    // Determine meal style based on cooking equipment
    const mealStyle = context.cookingEquipment.includes('instant_pot') 
      ? 'single_pot'
      : context.cookingEquipment.length > 2 
        ? 'multiple_dishes' 
        : 'batch_cooking';

    // Estimate serving size
    const baseServingSize = Math.max(2, Math.ceil(totalPeople));

    return {
      servingSize: baseServingSize,
      mealStyle: mealStyle,
      cuisineComplexity: 'moderate',
      recommendedDishes: [
        {
          name: 'Flexible Family Meal',
          estimatedServings: baseServingSize,
          primaryIngredients: context.refrigeratorContents.ingredients
            .slice(0, 3)
            .map(ing => ing.name)
        }
      ]
    };
  }

  // Advanced ingredient utilization strategy
  async optimizeIngredientUsage(
    context: MealPlanningContext
  ): Promise<string[]> {
    const ingredients = context.refrigeratorContents.ingredients;
    
    const utilizationPrompt = `
      Ingredient Optimization Challenge:
      
      Available Ingredients:
      ${JSON.stringify(ingredients)}

      Goals:
      1. Minimize food waste
      2. Create diverse meals
      3. Maximize nutritional value
      4. Consider expiration dates

      Provide:
      - Ingredient pairing suggestions
      - Multi-purpose ingredient strategies
      - Preservation techniques
      - Potential recipe transformations
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: utilizationPrompt }]
    });

    return response.choices[0].message.content 
      ? response.choices[0].message.content.split('\n')
      : [];
  }
}

// Example usage
async function mealPlanningWorkflow() {
  const estimator = new MealQuantityEstimator();

  const mealContext: MealPlanningContext = {
    userId: 'user123',
    householdComposition: {
      adultCount: 2,
      childCount: 1,
      dietaryNeeds: ['vegetarian']
    },
    cookingEquipment: ['stovetop', 'instant_pot'],
    refrigeratorContents: {
      ingredients: [
        { name: 'eggs', quantity: 6, unit: 'count' },
        { name: 'cheese', quantity: 200, unit: 'grams' },
        { name: 'spinach', quantity: 100, unit: 'grams' }
      ],
      estimatedValue: 15
    },
    recentMealHistory: [
      { 
        mealType: 'dinner', 
        servingSize: 3, 
        cuisineType: 'Mediterranean' 
      }
    ]
  };

  // Estimate meal quantity
  const mealRecommendation = await estimator.estimateMealQuantity(mealContext);
  console.log('Meal Recommendation:', mealRecommendation);

  // Optimize ingredient usage
  const ingredientStrategy = await estimator.optimizeIngredientUsage(mealContext);
  console.log('Ingredient Utilization:', ingredientStrategy);
}
