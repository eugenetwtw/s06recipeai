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

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a professional chef specializing in creating personalized recipes based on available ingredients.'
          },
          {
            role: 'user',
            content: `Generate a creative recipe using these ingredients: ${ingredients.join(', ')}. 
                      Additional context: ${context}. 
                      Please provide:
                      - Recipe name
                      - Ingredients list
                      - Step-by-step instructions
                      - Estimated cooking time
                      - Difficulty level`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Recipe Generation Error:', error);
      throw new Error('Failed to generate recipe');
    }
  }
}
