import OpenAI from 'openai';
import { z } from 'zod';

// Zod schema for validating OpenAI configuration
const OpenAIConfigSchema = z.object({
  apiKey: z.string().startsWith('sk-', { message: 'Invalid OpenAI API Key' }),
  organization: z.string().optional()
});

export class OpenAIService {
  private static instance: OpenAI;

  private constructor() {}

  public static getInstance(): OpenAI {
    if (!this.instance) {
      try {
        // Validate OpenAI configuration
        const config = OpenAIConfigSchema.parse({
          apiKey: process.env.OPENAI_API_KEY
        });

        this.instance = new OpenAI({
          apiKey: config.apiKey,
          organization: config.organization
        });
      } catch (error) {
        console.error('OpenAI Configuration Error:', error);
        throw new Error('Failed to initialize OpenAI service');
      }
    }
    return this.instance;
  }

  public static async analyzeImage(imageUrl: string) {
    const openai = this.getInstance();
    
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Describe the contents of this image in detail' },
              { 
                type: 'image_url',
                image_url: { 
                  url: imageUrl,
                  detail: 'high' 
                }
              }
            ]
          }
        ],
        max_tokens: 300
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Image Analysis Error:', error);
      throw new Error('Failed to analyze image');
    }
  }

  public static async generateRecipe(ingredients: string[], context: string) {
    const openai = this.getInstance();
    
    // Parse the context to extract kitchen tools
    let contextObj;
    try {
      contextObj = JSON.parse(context);
    } catch (error) {
      contextObj = { cookingTools: [] };
    }
    
    const cookingTools = contextObj.cookingTools || [];

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef specializing in creating personalized recipes based on available ingredients and kitchen tools.'
          },
          {
            role: 'user',
            content: `Generate a creative recipe using these ingredients: ${ingredients.join(', ')}. 
                      
                      Available kitchen tools: ${cookingTools.length > 0 ? cookingTools.join(', ') : 'Basic kitchen tools only'}.
                      
                      IMPORTANT: Only suggest cooking methods that can be done with the available tools.
                      For example, if an oven is available, you can suggest baking a pizza. If no oven
                      is available, avoid recipes that require baking.
                      
                      Additional context: ${context}. 
                      
                      Please provide:
                      - Recipe name
                      - Ingredients list
                      - Step-by-step instructions (using only available tools)
                      - Estimated cooking time
                      - Difficulty level
                      - Explanation of how this recipe is suitable for the available kitchen tools`
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Recipe Generation Error:', error);
      throw new Error('Failed to generate recipe');
    }
  }
}
