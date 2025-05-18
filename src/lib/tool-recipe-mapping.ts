interface ToolRecipeMapping {
  techniques: string[];
  suitableRecipes: string[];
}

export const toolRecipeMapping: Record<string, ToolRecipeMapping> = {
  'oven': {
    techniques: ['baking', 'roasting', 'broiling'],
    suitableRecipes: ['pizza', 'casserole', 'roast chicken', 'cookies', 'lasagna', 'bread']
  },
  'stovetop': {
    techniques: ['sautéing', 'boiling', 'frying', 'simmering'],
    suitableRecipes: ['pasta', 'stir-fry', 'soup', 'fried rice', 'pancakes', 'omelette']
  },
  'blender': {
    techniques: ['blending', 'pureeing', 'emulsifying'],
    suitableRecipes: ['smoothie', 'soup', 'sauce', 'dip', 'milkshake', 'hummus']
  },
  'food processor': {
    techniques: ['chopping', 'pureeing', 'mixing', 'grinding'],
    suitableRecipes: ['pesto', 'hummus', 'salsa', 'dough', 'chopped salad', 'nut butter']
  },
  'slow cooker': {
    techniques: ['slow cooking', 'braising', 'stewing'],
    suitableRecipes: ['stew', 'pulled pork', 'chili', 'pot roast', 'curry', 'soup']
  },
  'pressure cooker': {
    techniques: ['pressure cooking', 'steaming', 'quick braising'],
    suitableRecipes: ['risotto', 'beans', 'stew', 'rice', 'chicken curry', 'bone broth']
  },
  'air fryer': {
    techniques: ['air frying', 'roasting', 'crisping'],
    suitableRecipes: ['french fries', 'chicken wings', 'roasted vegetables', 'fish', 'mozzarella sticks']
  },
  'grill': {
    techniques: ['grilling', 'charring', 'smoking'],
    suitableRecipes: ['burgers', 'steak', 'kebabs', 'grilled vegetables', 'fish', 'corn on the cob']
  },
  'microwave': {
    techniques: ['microwaving', 'steaming', 'reheating'],
    suitableRecipes: ['mug cake', 'steamed vegetables', 'poached eggs', 'nachos', 'baked potato']
  },
  'toaster oven': {
    techniques: ['toasting', 'small-batch baking', 'broiling'],
    suitableRecipes: ['toast', 'small pizza', 'melts', 'cookies', 'roasted nuts', 'garlic bread']
  },
  'rice cooker': {
    techniques: ['steaming', 'simmering'],
    suitableRecipes: ['rice', 'quinoa', 'steamed vegetables', 'oatmeal', 'rice pudding']
  },
  'stand mixer': {
    techniques: ['mixing', 'kneading', 'whipping'],
    suitableRecipes: ['cake', 'bread', 'cookies', 'whipped cream', 'meringue', 'pizza dough']
  },
  'hand mixer': {
    techniques: ['mixing', 'whipping', 'beating'],
    suitableRecipes: ['cake', 'cookies', 'whipped cream', 'frosting', 'mashed potatoes']
  },
  'knife': {
    techniques: ['chopping', 'slicing', 'dicing', 'mincing'],
    suitableRecipes: ['salad', 'stir-fry', 'salsa', 'guacamole', 'ceviche', 'tartare']
  },
  'cutting board': {
    techniques: ['chopping', 'slicing', 'dicing', 'mincing'],
    suitableRecipes: ['salad', 'stir-fry', 'salsa', 'guacamole', 'ceviche', 'tartare']
  },
  'measuring cups': {
    techniques: ['measuring', 'portioning'],
    suitableRecipes: ['cake', 'cookies', 'bread', 'muffins', 'pancakes', 'soup']
  },
  'measuring spoons': {
    techniques: ['measuring', 'portioning'],
    suitableRecipes: ['cake', 'cookies', 'bread', 'muffins', 'pancakes', 'soup']
  },
  'mixing bowls': {
    techniques: ['mixing', 'tossing', 'marinating'],
    suitableRecipes: ['salad', 'cake batter', 'cookie dough', 'marinade', 'dressing']
  },
  'whisk': {
    techniques: ['whisking', 'beating', 'aerating'],
    suitableRecipes: ['eggs', 'pancakes', 'sauce', 'dressing', 'whipped cream']
  },
  'spatula': {
    techniques: ['flipping', 'folding', 'scraping'],
    suitableRecipes: ['pancakes', 'omelette', 'stir-fry', 'cake', 'cookies']
  },
  'tongs': {
    techniques: ['gripping', 'flipping', 'serving'],
    suitableRecipes: ['pasta', 'stir-fry', 'grilled meat', 'roasted vegetables']
  },
  'pot': {
    techniques: ['boiling', 'simmering', 'stewing'],
    suitableRecipes: ['pasta', 'soup', 'stew', 'rice', 'boiled vegetables']
  },
  'pan': {
    techniques: ['frying', 'sautéing', 'searing'],
    suitableRecipes: ['stir-fry', 'pancakes', 'omelette', 'fried rice', 'seared meat']
  },
  'baking sheet': {
    techniques: ['baking', 'roasting'],
    suitableRecipes: ['cookies', 'roasted vegetables', 'sheet pan dinner', 'pizza']
  },
  'baking dish': {
    techniques: ['baking', 'roasting'],
    suitableRecipes: ['casserole', 'lasagna', 'roast', 'brownies', 'cake']
  },
  'colander': {
    techniques: ['draining', 'rinsing'],
    suitableRecipes: ['pasta', 'rice', 'beans', 'washed vegetables', 'steamed vegetables']
  },
  'grater': {
    techniques: ['grating', 'zesting'],
    suitableRecipes: ['cheese dishes', 'slaw', 'zest-flavored dishes', 'hash browns']
  }
};

/**
 * Get suggested recipes for a list of kitchen tools
 * @param tools Array of kitchen tool names
 * @returns Array of recipe suggestions
 */
export function getSuggestedRecipesForTools(tools: string[]): string[] {
  // Normalize tool names to lowercase for case-insensitive matching
  const normalizedTools = tools.map(tool => tool.toLowerCase());
  
  // Get all recipe suggestions for the tools
  const allSuggestions = normalizedTools.flatMap(tool => {
    // Find the closest matching tool in our mapping
    const matchingTool = Object.keys(toolRecipeMapping).find(mappedTool => 
      tool.includes(mappedTool) || mappedTool.includes(tool)
    );
    
    return matchingTool 
      ? toolRecipeMapping[matchingTool].suitableRecipes 
      : [];
  });
  
  // Remove duplicates
  return allSuggestions.filter((recipe, index) => 
    allSuggestions.indexOf(recipe) === index
  );
}

/**
 * Get cooking techniques for a specific kitchen tool
 * @param tool Kitchen tool name
 * @returns Array of cooking techniques
 */
export function getTechniquesForTool(tool: string): string[] {
  const normalizedTool = tool.toLowerCase();
  
  // Find the closest matching tool in our mapping
  const matchingTool = Object.keys(toolRecipeMapping).find(mappedTool => 
    normalizedTool.includes(mappedTool) || mappedTool.includes(normalizedTool)
  );
  
  return matchingTool 
    ? toolRecipeMapping[matchingTool].techniques 
    : [];
}
