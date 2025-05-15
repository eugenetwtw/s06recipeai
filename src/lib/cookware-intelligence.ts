import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Comprehensive cookware classification
enum CookwareType {
  STOVETOP = 'stovetop',
  OVEN = 'oven',
  MICROWAVE = 'microwave',
  AIR_FRYER = 'air_fryer',
  INSTANT_POT = 'instant_pot',
  BLENDER = 'blender',
  TOASTER_OVEN = 'toaster_oven',
  SLOW_COOKER = 'slow_cooker'
}

// Cookware condition and capability tracking
interface CookwareStatus {
  type: CookwareType;
  isWorking: boolean;
  lastMaintenanceDate?: Date;
  limitations?: string[];
}

// Recipe adaptation strategy
interface CookwareAdaptationStrategy {
  originalMethod: string;
  alternativeMethods: string[];
  requiredEquipment: CookwareType[];
}

export class CookwareIntelligence {
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

  // Detect cookware through image recognition
  async detectCookware(imageUrl: string): Promise<CookwareStatus[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: 'Analyze the kitchen equipment in this image. Identify all cookware, their condition, and any visible limitations.' 
            },
            { 
              type: 'image_url', 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ]
    });

    const cookwareAnalysis = JSON.parse(response.choices[0].message.content || '[]');

    // Save cookware inventory to user profile
    await this.updateUserCookwareInventory(cookwareAnalysis);

    return cookwareAnalysis;
  }

  // Update user's cookware inventory in database
  private async updateUserCookwareInventory(cookwareStatus: CookwareStatus[]) {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (!user) return;

    await this.supabase
      .from('user_cookware')
      .upsert({
        user_id: user.id,
        cookware_inventory: cookwareStatus,
        last_updated: new Date()
      });
  }

  // Adapt recipe based on available cookware
  async adaptRecipeForAvailableCookware(
    originalRecipe: any, 
    availableCookware: CookwareStatus[]
  ): Promise<any> {
    // Identify working cookware types
    const workingCookware = availableCookware
      .filter(cookware => cookware.isWorking)
      .map(cookware => cookware.type);

    const adaptationPrompt = `
      Original Recipe: ${JSON.stringify(originalRecipe)}
      Available Cookware: ${JSON.stringify(workingCookware)}

      Tasks:
      1. Identify original cooking methods
      2. Propose alternative cooking techniques
      3. Adapt recipe steps for available equipment
      4. Provide workarounds for missing or broken equipment
      5. Maintain recipe's core flavor and texture

      Response Format:
      {
        "adaptedRecipe": {
          "cookingMethods": [],
          "modifiedInstructions": [],
          "equipmentSubstitutions": []
        }
      }
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: adaptationPrompt }],
      response_format: { type: 'json_object' }
    });

    const adaptedRecipe = JSON.parse(response.choices[0].message.content || '{}');

    // Save adaptation for future reference
    await this.recordRecipeAdaptation(
      originalRecipe.id, 
      adaptedRecipe
    );

    return adaptedRecipe;
  }

  // Record recipe adaptation for learning
  private async recordRecipeAdaptation(
    originalRecipeId: string, 
    adaptedRecipe: any
  ) {
    await this.supabase
      .from('recipe_adaptations')
      .insert({
        original_recipe_id: originalRecipeId,
        adapted_recipe: adaptedRecipe,
        adaptation_date: new Date()
      });
  }

  // Provide maintenance recommendations
  async getCookwareMaintenanceAdvice(brokenCookware: CookwareStatus): Promise<string> {
    const maintenancePrompt = `
      Cookware with issues: ${JSON.stringify(brokenCookware)}
      
      Provide:
      1. Potential repair methods
      2. Temporary workarounds
      3. Cost-effective solutions
      4. When to consider replacement
      5. DIY maintenance tips
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: maintenancePrompt }]
    });

    return response.choices[0].message.content || 'No maintenance advice available.';
  }

  // Example workflow demonstrating full capability
  async cookwareAdaptationWorkflow(userId: string) {
    // 1. Retrieve user's cookware inventory
    const { data } = await this.supabase
      .from('user_cookware')
      .select('cookware_inventory')
      .eq('user_id', userId)
      .single();

    const cookware_inventory = (data?.cookware_inventory as CookwareStatus[]) || [];

    // 2. Identify broken cookware
    const brokenCookware = cookware_inventory.filter(
      (item: CookwareStatus) => !item.isWorking
    );

    // 3. Get maintenance advice for broken items
    const maintenanceAdvice = await Promise.all(
      brokenCookware.map(
        async (item: CookwareStatus) => ({
          cookwareType: item.type,
          advice: await this.getCookwareMaintenanceAdvice(item)
        })
      )
    );

    // 4. Retrieve latest recipe
    const { data: latestRecipe } = await this.supabase
      .from('generated_recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 5. Adapt recipe for available cookware
    const adaptedRecipe = await this.adaptRecipeForAvailableCookware(
      latestRecipe, 
      cookware_inventory
    );

    return {
      brokenCookware,
      maintenanceAdvice,
      adaptedRecipe
    };
  }
}

// Example usage
async function exampleCookwareWorkflow() {
  const cookwareIntelligence = new CookwareIntelligence();

  // Detect cookware from kitchen image
  const cookwareStatus = await cookwareIntelligence.detectCookware(
    'https://example.com/kitchen_image.jpg'
  );

  // If microwave is broken, get maintenance advice
  const brokenMicrowave = cookwareStatus.find(
    item => item.type === CookwareType.MICROWAVE && !item.isWorking
  );

  if (brokenMicrowave) {
    const maintenanceAdvice = await cookwareIntelligence.getCookwareMaintenanceAdvice(
      brokenMicrowave
    );
    console.log('Microwave Maintenance:', maintenanceAdvice);
  }
}
