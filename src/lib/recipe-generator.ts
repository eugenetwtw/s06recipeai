import OpenAI from 'openai';

interface RecipeGenerationContext {
  refrigeratorContents: any[];
  cookware: any[];
  orderHistory: any[];
  handFoodPreferences: any[];
}

export class RecipeGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  // Create a comprehensive prompt for recipe generation
  createRecipePrompt(context: RecipeGenerationContext): string {
    return `
      Generate a personalized recipe based on these insights:

      Refrigerator Contents:
      ${JSON.stringify(context.refrigeratorContents)}

      Available Cookware:
      ${JSON.stringify(context.cookware)}

      Recent Food Order History:
      ${JSON.stringify(context.orderHistory)}

      Hand Food Preferences:
      ${JSON.stringify(context.handFoodPreferences)}

      Recipe Generation Requirements:
      1. Use at least 3 ingredients from refrigerator
      2. Utilize available cookware
      3. Match flavor profiles from order history
      4. Consider hand food preferences
      5. Provide step-by-step cooking instructions
      6. Include nutritional information
      7. Suggest potential modifications

      Output Format:
      {
        "recipeName": string,
        "ingredients": [
          {
            "name": string,
            "quantity": string,
            "source": "refrigerator" | "suggested purchase"
          }
        ],
        "instructions": string[],
        "cookingTime": string,
        "difficulty": "Easy" | "Medium" | "Advanced",
        "nutritionalInfo": {
          "calories": number,
          "protein": string,
          "carbs": string,
          "fat": string
        },
        "variations": string[]
      }
    `;
  }

  // Generate personalized recipe using GPT-4o
  async generateRecipe(prompt: string): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      });

      // Parse and format the recipe
      const recipeData = JSON.parse(
        response.choices[0].message.content || '{}'
      );

      return this.formatRecipe(recipeData);
    } catch (error) {
      console.error('Recipe generation failed', error);
      throw error;
    }
  }

  // Format recipe for human-readable display
  private formatRecipe(recipeData: any): string {
    return `
🍽️ ${recipeData.recipeName}

⏰ Cooking Time: ${recipeData.cookingTime}
🔥 Difficulty: ${recipeData.difficulty}

📋 Ingredients:
${recipeData.ingredients.map((ing: any) => 
  `- ${ing.quantity} ${ing.name} (${ing.source})`
).join('\n')}

👨‍🍳 Instructions:
${recipeData.instructions.map((step: string, index: number) => 
  `${index + 1}. ${step}`
).join('\n')}

🍎 Nutritional Information:
- Calories: ${recipeData.nutritionalInfo.calories}
- Protein: ${recipeData.nutritionalInfo.protein}
- Carbs: ${recipeData.nutritionalInfo.carbs}
- Fat: ${recipeData.nutritionalInfo.fat}

🔄 Recipe Variations:
${recipeData.variations.map((variation: string) => 
  `- ${variation}`
).join('\n')}
    `;
  }
}
