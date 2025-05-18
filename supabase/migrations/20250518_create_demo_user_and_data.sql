-- Create demo user if it doesn't exist
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Check if demo user already exists
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@demo.com';
  
  -- If demo user doesn't exist, create it
  IF demo_user_id IS NULL THEN
    -- Insert demo user into auth.users table
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@demo.com',
      crypt('demo', gen_salt('bf')), -- Password: demo
      NOW(),
      NULL,
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Demo User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO demo_user_id;
    
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name, dietary_preferences, cuisine_preferences)
    VALUES (
      demo_user_id,
      'Demo User',
      '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
      '{"asian": 5, "italian": 4, "mexican": 3, "american": 4, "mediterranean": 5}'::jsonb
    );
    
    -- Create taste profile
    INSERT INTO user_taste_profiles (user_id, preferred_cuisines, spiciness_tolerance, protein_preferences, cooking_style_preferences)
    VALUES (
      demo_user_id,
      '["Asian", "Mediterranean", "Italian"]'::jsonb,
      3,
      '{"chicken": 5, "beef": 4, "pork": 3, "fish": 5, "tofu": 4}'::jsonb,
      '{"grilling": 5, "baking": 4, "stir-frying": 5, "slow-cooking": 3}'::jsonb
    );
    
    -- Create kitchen tools data
    INSERT INTO kitchen_tools (user_id, image_url, detected_tools, uploaded_at)
    VALUES
    (
      demo_user_id,
      'https://example.com/kitchen_tools1.jpg',
      '{"kitchenTools": ["Chef''s Knife", "Cutting Board", "Mixing Bowls", "Measuring Cups", "Measuring Spoons"]}'::jsonb,
      NOW() - INTERVAL '10 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools2.jpg',
      '{"kitchenTools": ["Wok", "Rice Cooker", "Food Processor", "Blender", "Stand Mixer"]}'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools3.jpg',
      '{"kitchenTools": ["Cast Iron Skillet", "Dutch Oven", "Baking Sheet", "Instant Pot", "Air Fryer"]}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
    
    -- Create kitchen tool metadata
    INSERT INTO user_kitchen_tool_metadata (user_id, tool_name, category, condition, is_favorite)
    VALUES
    (demo_user_id, 'Chef''s Knife', 'cutting', 'good', true),
    (demo_user_id, 'Cutting Board', 'preparation', 'good', false),
    (demo_user_id, 'Mixing Bowls', 'preparation', 'good', false),
    (demo_user_id, 'Measuring Cups', 'measurement', 'good', false),
    (demo_user_id, 'Measuring Spoons', 'measurement', 'good', false),
    (demo_user_id, 'Wok', 'cooking', 'good', true),
    (demo_user_id, 'Rice Cooker', 'appliance', 'good', true),
    (demo_user_id, 'Food Processor', 'appliance', 'good', false),
    (demo_user_id, 'Blender', 'appliance', 'good', false),
    (demo_user_id, 'Stand Mixer', 'appliance', 'good', false),
    (demo_user_id, 'Cast Iron Skillet', 'cooking', 'good', true),
    (demo_user_id, 'Dutch Oven', 'cooking', 'good', false),
    (demo_user_id, 'Baking Sheet', 'baking', 'good', false),
    (demo_user_id, 'Instant Pot', 'appliance', 'good', true),
    (demo_user_id, 'Air Fryer', 'appliance', 'good', false);
    
    -- Create meal history data
    INSERT INTO meal_history (id, user_id, image_url, meal_type, source, cuisine_type, uploaded_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal1.jpg',
      'dinner',
      'restaurant',
      'italian',
      NOW() - INTERVAL '14 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal2.jpg',
      'lunch',
      'homemade',
      'asian',
      NOW() - INTERVAL '10 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal3.jpg',
      'dinner',
      'restaurant',
      'mexican',
      NOW() - INTERVAL '7 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal4.jpg',
      'dinner',
      'homemade',
      'mediterranean',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal5.jpg',
      'lunch',
      'restaurant',
      'asian',
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the meal IDs for the meal history metadata
    WITH meal_ids AS (
      SELECT id FROM meal_history WHERE user_id = demo_user_id ORDER BY uploaded_at DESC LIMIT 5
    )
    INSERT INTO user_meal_history_metadata (user_id, meal_id, name, restaurant, date, cuisine, dishes, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Pasta Night'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Homemade Stir Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Tuesday'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Mediterranean Feast'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Lunch'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Olive Garden'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Bell'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Palace'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN NOW() - INTERVAL '14 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN NOW() - INTERVAL '10 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN NOW() - INTERVAL '7 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN NOW() - INTERVAL '3 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN NOW() - INTERVAL '1 day'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'italian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'asian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'mexican'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'mediterranean'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'asian'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '[{"name": "Fettuccine Alfredo"}, {"name": "Breadsticks"}, {"name": "Tiramisu"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '[{"name": "Chicken Stir Fry"}, {"name": "Steamed Rice"}, {"name": "Vegetable Spring Rolls"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '[{"name": "Crunchy Tacos"}, {"name": "Burrito Supreme"}, {"name": "Nachos"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '[{"name": "Grilled Chicken Souvlaki"}, {"name": "Greek Salad"}, {"name": "Hummus with Pita"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '[{"name": "California Roll"}, {"name": "Spicy Tuna Roll"}, {"name": "Miso Soup"}, {"name": "Edamame"}]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 4, 5) THEN true
        ELSE false
      END
    FROM meal_ids;
    
    -- Create generated recipes data
    INSERT INTO generated_recipes (id, user_id, recipe_name, ingredients, instructions, nutritional_info, cooking_time, difficulty_level, cuisine_type, tools_required, dietary_tags, generated_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'Garlic Butter Shrimp Pasta',
      '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb,
      '["Cook pasta according to package instructions.", "In a large skillet, melt butter over medium heat.", "Add garlic and red pepper flakes, cook until fragrant.", "Add shrimp and cook until pink.", "Toss with pasta, lemon juice, and parsley.", "Serve with grated parmesan."]'::jsonb,
      '{"calories": 450, "protein": 25, "carbs": 50, "fat": 15}'::jsonb,
      '00:30:00',
      'easy',
      'italian',
      '["pot", "skillet", "cutting board", "knife"]'::jsonb,
      '["pescatarian"]'::jsonb,
      NOW() - INTERVAL '12 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Thai Basil Chicken Stir-Fry',
      '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb,
      '["Cook rice according to package instructions.", "Heat oil in a wok over high heat.", "Add garlic and chili, stir-fry until fragrant.", "Add chicken and stir-fry until cooked through.", "Add sauces and sugar, stir to combine.", "Add basil leaves and stir until wilted.", "Serve over rice."]'::jsonb,
      '{"calories": 380, "protein": 30, "carbs": 40, "fat": 10}'::jsonb,
      '00:25:00',
      'medium',
      'asian',
      '["wok", "rice cooker", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '8 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Mediterranean Chickpea Salad',
      '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb,
      '["Drain and rinse chickpeas.", "Chop cucumber, tomatoes, and red onion.", "Combine all ingredients in a large bowl.", "Whisk together olive oil, lemon juice, oregano, salt, and pepper.", "Pour dressing over salad and toss to combine.", "Refrigerate for at least 30 minutes before serving."]'::jsonb,
      '{"calories": 320, "protein": 15, "carbs": 35, "fat": 12}'::jsonb,
      '00:15:00',
      'easy',
      'mediterranean',
      '["cutting board", "knife", "mixing bowl", "whisk"]'::jsonb,
      '["vegetarian", "gluten-free"]'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Instant Pot Beef Stew',
      '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb,
      '["Set Instant Pot to Sauté mode.", "Season beef with salt and pepper, then coat with flour.", "Brown beef in batches, then remove.", "Sauté onions and garlic until soft.", "Add tomato paste and stir.", "Return beef to pot and add remaining ingredients.", "Seal and cook on high pressure for 35 minutes.", "Natural release for 10 minutes, then quick release.", "Remove bay leaves and thyme sprigs before serving."]'::jsonb,
      '{"calories": 420, "protein": 35, "carbs": 30, "fat": 18}'::jsonb,
      '01:00:00',
      'medium',
      'american',
      '["instant pot", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Air Fryer Crispy Tofu Bowl',
      '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb,
      '["Press tofu to remove excess water, then cut into cubes.", "Toss tofu with cornstarch, salt, and pepper.", "Air fry at 400°F for 15 minutes, shaking halfway through.", "Mix soy sauce, sesame oil, rice vinegar, brown sugar, and garlic powder.", "Cook rice according to package instructions.", "Steam or air fry vegetables.", "Assemble bowls with rice, vegetables, and tofu.", "Drizzle with sauce and sprinkle with sesame seeds."]'::jsonb,
      '{"calories": 380, "protein": 20, "carbs": 45, "fat": 12}'::jsonb,
      '00:40:00',
      'easy',
      'asian',
      '["air fryer", "rice cooker", "cutting board", "knife", "mixing bowl"]'::jsonb,
      '["vegetarian", "vegan"]'::jsonb,
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the recipe IDs for the generated recipe metadata
    WITH recipe_ids AS (
      SELECT id FROM generated_recipes WHERE user_id = demo_user_id ORDER BY generated_at DESC LIMIT 5
    )
    INSERT INTO user_generated_recipe_metadata (user_id, recipe_id, name, ingredients, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Garlic Butter Shrimp Pasta'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Thai Basil Chicken Stir-Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Mediterranean Chickpea Salad'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Instant Pot Beef Stew'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Air Fryer Crispy Tofu Bowl'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 3, 5) THEN true
        ELSE false
      END
    FROM recipe_ids;
  END IF;
END $$;

-- Create a function to reset demo user data
CREATE OR REPLACE FUNCTION reset_demo_user_data()
RETURNS void AS $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Get demo user ID
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@demo.com';
  
  IF demo_user_id IS NOT NULL THEN
    -- Delete all data associated with demo user
    DELETE FROM user_generated_recipe_metadata WHERE user_id = demo_user_id;
    DELETE FROM generated_recipes WHERE user_id = demo_user_id;
    DELETE FROM user_meal_history_metadata WHERE user_id = demo_user_id;
    DELETE FROM meal_history WHERE user_id = demo_user_id;
    DELETE FROM user_kitchen_tool_metadata WHERE user_id = demo_user_id;
    DELETE FROM kitchen_tools WHERE user_id = demo_user_id;
    DELETE FROM user_taste_profiles WHERE user_id = demo_user_id;
    DELETE FROM user_profiles WHERE user_id = demo_user_id;
    
    -- Reinsert demo data
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name, dietary_preferences, cuisine_preferences)
    VALUES (
      demo_user_id,
      'Demo User',
      '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
      '{"asian": 5, "italian": 4, "mexican": 3, "american": 4, "mediterranean": 5}'::jsonb
    );
    
    -- Create taste profile
    INSERT INTO user_taste_profiles (user_id, preferred_cuisines, spiciness_tolerance, protein_preferences, cooking_style_preferences)
    VALUES (
      demo_user_id,
      '["Asian", "Mediterranean", "Italian"]'::jsonb,
      3,
      '{"chicken": 5, "beef": 4, "pork": 3, "fish": 5, "tofu": 4}'::jsonb,
      '{"grilling": 5, "baking": 4, "stir-frying": 5, "slow-cooking": 3}'::jsonb
    );
    
    -- Create kitchen tools data
    INSERT INTO kitchen_tools (user_id, image_url, detected_tools, uploaded_at)
    VALUES
    (
      demo_user_id,
      'https://example.com/kitchen_tools1.jpg',
      '{"kitchenTools": ["Chef''s Knife", "Cutting Board", "Mixing Bowls", "Measuring Cups", "Measuring Spoons"]}'::jsonb,
      NOW() - INTERVAL '10 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools2.jpg',
      '{"kitchenTools": ["Wok", "Rice Cooker", "Food Processor", "Blender", "Stand Mixer"]}'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools3.jpg',
      '{"kitchenTools": ["Cast Iron Skillet", "Dutch Oven", "Baking Sheet", "Instant Pot", "Air Fryer"]}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
    
    -- Create kitchen tool metadata
    INSERT INTO user_kitchen_tool_metadata (user_id, tool_name, category, condition, is_favorite)
    VALUES
    (demo_user_id, 'Chef''s Knife', 'cutting', 'good', true),
    (demo_user_id, 'Cutting Board', 'preparation', 'good', false),
    (demo_user_id, 'Mixing Bowls', 'preparation', 'good', false),
    (demo_user_id, 'Measuring Cups', 'measurement', 'good', false),
    (demo_user_id, 'Measuring Spoons', 'measurement', 'good', false),
    (demo_user_id, 'Wok', 'cooking', 'good', true),
    (demo_user_id, 'Rice Cooker', 'appliance', 'good', true),
    (demo_user_id, 'Food Processor', 'appliance', 'good', false),
    (demo_user_id, 'Blender', 'appliance', 'good', false),
    (demo_user_id, 'Stand Mixer', 'appliance', 'good', false),
    (demo_user_id, 'Cast Iron Skillet', 'cooking', 'good', true),
    (demo_user_id, 'Dutch Oven', 'cooking', 'good', false),
    (demo_user_id, 'Baking Sheet', 'baking', 'good', false),
    (demo_user_id, 'Instant Pot', 'appliance', 'good', true),
    (demo_user_id, 'Air Fryer', 'appliance', 'good', false);
    
    -- Create meal history data
    INSERT INTO meal_history (id, user_id, image_url, meal_type, source, cuisine_type, uploaded_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal1.jpg',
      'dinner',
      'restaurant',
      'italian',
      NOW() - INTERVAL '14 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal2.jpg',
      'lunch',
      'homemade',
      'asian',
      NOW() - INTERVAL '10 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal3.jpg',
      'dinner',
      'restaurant',
      'mexican',
      NOW() - INTERVAL '7 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal4.jpg',
      'dinner',
      'homemade',
      'mediterranean',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal5.jpg',
      'lunch',
      'restaurant',
      'asian',
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the meal IDs for the meal history metadata
    WITH meal_ids AS (
      SELECT id FROM meal_history WHERE user_id = demo_user_id ORDER BY uploaded_at DESC LIMIT 5
    )
    INSERT INTO user_meal_history_metadata (user_id, meal_id, name, restaurant, date, cuisine, dishes, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Pasta Night'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Homemade Stir Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Tuesday'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Mediterranean Feast'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Lunch'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Olive Garden'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Bell'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Palace'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN NOW() - INTERVAL '14 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN NOW() - INTERVAL '10 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN NOW() - INTERVAL '7 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN NOW() - INTERVAL '3 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN NOW() - INTERVAL '1 day'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'italian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'asian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'mexican'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'mediterranean'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'asian'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '[{"name": "Fettuccine Alfredo"}, {"name": "Breadsticks"}, {"name": "Tiramisu"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '[{"name": "Chicken Stir Fry"}, {"name": "Steamed Rice"}, {"name": "Vegetable Spring Rolls"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '[{"name": "Crunchy Tacos"}, {"name": "Burrito Supreme"}, {"name": "Nachos"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '[{"name": "Grilled Chicken Souvlaki"}, {"name": "Greek Salad"}, {"name": "Hummus with Pita"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '[{"name": "California Roll"}, {"name": "Spicy Tuna Roll"}, {"name": "Miso Soup"}, {"name": "Edamame"}]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 4, 5) THEN true
        ELSE false
      END
    FROM meal_ids;
    
    -- Create generated recipes data
    INSERT INTO generated_recipes (id, user_id, recipe_name, ingredients, instructions, nutritional_info, cooking_time, difficulty_level, cuisine_type, tools_required, dietary_tags, generated_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'Garlic Butter Shrimp Pasta',
      '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb,
      '["Cook pasta according to package instructions.", "In a large skillet, melt butter over medium heat.", "Add garlic and red pepper flakes, cook until fragrant.", "Add shrimp and cook until pink.", "Toss with pasta, lemon juice, and parsley.", "Serve with grated parmesan."]'::jsonb,
      '{"calories": 450, "protein": 25, "carbs": 50, "fat": 15}'::jsonb,
      '00:30:00',
      'easy',
      'italian',
      '["pot", "skillet", "cutting board", "knife"]'::jsonb,
      '["pescatarian"]'::jsonb,
      NOW() - INTERVAL '12 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Thai Basil Chicken Stir-Fry',
      '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb,
      '["Cook rice according to package instructions.", "Heat oil in a wok over high heat.", "Add garlic and chili, stir-fry until fragrant.", "Add chicken and stir-fry until cooked through.", "Add sauces and sugar, stir to combine.", "Add basil leaves and stir until wilted.", "Serve over rice."]'::jsonb,
      '{"calories": 380, "protein": 30, "carbs": 40, "fat": 10}'::jsonb,
      '00:25:00',
      'medium',
      'asian',
      '["wok", "rice cooker", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '8 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Mediterranean Chickpea Salad',
      '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb,
      '["Drain and rinse chickpeas.", "Chop cucumber, tomatoes, and red onion.", "Combine all ingredients in a large bowl.", "Whisk together olive oil, lemon juice, oregano, salt, and pepper.", "Pour dressing over salad and toss to combine.", "Refrigerate for at least 30 minutes before serving."]'::jsonb,
      '{"calories": 320, "protein": 15, "carbs": 35, "fat": 12}'::jsonb,
      '00:15:00',
      'easy',
      'mediterranean',
      '["cutting board", "knife", "mixing bowl", "whisk"]'::jsonb,
      '["vegetarian", "gluten-free"]'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Instant Pot Beef Stew',
      '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb,
      '["Set Instant Pot to Sauté mode.", "Season beef with salt and pepper, then coat with flour.", "Brown beef in batches, then remove.", "Sauté onions and garlic until soft.", "Add tomato paste and stir.", "Return beef to pot and add remaining ingredients.", "Seal and cook on high pressure for 35 minutes.", "Natural release for 10 minutes, then quick release.", "Remove bay leaves and thyme sprigs before serving."]'::jsonb,
      '{"calories": 420, "protein": 35, "carbs": 30, "fat": 18}'::jsonb,
      '01:00:00',
      'medium',
      'american',
      '["instant pot", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Air Fryer Crispy Tofu Bowl',
      '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb,
      '["Press tofu to remove excess water, then cut into cubes.", "Toss tofu with cornstarch, salt, and pepper.", "Air fry at 400°F for 15 minutes, shaking halfway through.", "Mix soy sauce, sesame oil, rice vinegar, brown sugar, and garlic powder.", "Cook rice according to package instructions.", "Steam or air fry vegetables.", "Assemble bowls with rice, vegetables, and tofu.", "Drizzle with sauce and sprinkle with sesame seeds."]'::jsonb,
      '{"calories": 380, "protein": 20, "carbs": 45, "fat": 12}'::jsonb,
      '00:40:00',
      'easy',
      'asian',
      '["air fryer", "rice cooker", "cutting board", "knife", "mixing bowl"]'::jsonb,
      '["vegetarian", "vegan"]'::jsonb,
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the recipe IDs for the generated recipe metadata
    WITH recipe_ids AS (
      SELECT id FROM generated_recipes WHERE user_id = demo_user_id ORDER BY generated_at DESC LIMIT 5
    )
    INSERT INTO user_generated_recipe_metadata (user_id, recipe_id, name, ingredients, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Garlic Butter Shrimp Pasta'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Thai Basil Chicken Stir-Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Mediterranean Chickpea Salad'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Instant Pot Beef Stew'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Air Fryer Crispy Tofu Bowl'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 3, 5) THEN true
        ELSE false
      END
    FROM recipe_ids;
  END IF;
END $$;

-- Create a function to reset demo user data
CREATE OR REPLACE FUNCTION reset_demo_user_data()
RETURNS void AS $$
DECLARE
  demo_user_id UUID;
BEGIN
  -- Get demo user ID
  SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@demo.com';
  
  IF demo_user_id IS NOT NULL THEN
    -- Delete all data associated with demo user
    DELETE FROM user_generated_recipe_metadata WHERE user_id = demo_user_id;
    DELETE FROM generated_recipes WHERE user_id = demo_user_id;
    DELETE FROM user_meal_history_metadata WHERE user_id = demo_user_id;
    DELETE FROM meal_history WHERE user_id = demo_user_id;
    DELETE FROM user_kitchen_tool_metadata WHERE user_id = demo_user_id;
    DELETE FROM kitchen_tools WHERE user_id = demo_user_id;
    DELETE FROM user_taste_profiles WHERE user_id = demo_user_id;
    DELETE FROM user_profiles WHERE user_id = demo_user_id;
    
    -- Reinsert demo data
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name, dietary_preferences, cuisine_preferences)
    VALUES (
      demo_user_id,
      'Demo User',
      '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
      '{"asian": 5, "italian": 4, "mexican": 3, "american": 4, "mediterranean": 5}'::jsonb
    );
    
    -- Create taste profile
    INSERT INTO user_taste_profiles (user_id, preferred_cuisines, spiciness_tolerance, protein_preferences, cooking_style_preferences)
    VALUES (
      demo_user_id,
      '["Asian", "Mediterranean", "Italian"]'::jsonb,
      3,
      '{"chicken": 5, "beef": 4, "pork": 3, "fish": 5, "tofu": 4}'::jsonb,
      '{"grilling": 5, "baking": 4, "stir-frying": 5, "slow-cooking": 3}'::jsonb
    );
    
    -- Create kitchen tools data
    INSERT INTO kitchen_tools (user_id, image_url, detected_tools, uploaded_at)
    VALUES
    (
      demo_user_id,
      'https://example.com/kitchen_tools1.jpg',
      '{"kitchenTools": ["Chef''s Knife", "Cutting Board", "Mixing Bowls", "Measuring Cups", "Measuring Spoons"]}'::jsonb,
      NOW() - INTERVAL '10 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools2.jpg',
      '{"kitchenTools": ["Wok", "Rice Cooker", "Food Processor", "Blender", "Stand Mixer"]}'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      demo_user_id,
      'https://example.com/kitchen_tools3.jpg',
      '{"kitchenTools": ["Cast Iron Skillet", "Dutch Oven", "Baking Sheet", "Instant Pot", "Air Fryer"]}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
    
    -- Create kitchen tool metadata
    INSERT INTO user_kitchen_tool_metadata (user_id, tool_name, category, condition, is_favorite)
    VALUES
    (demo_user_id, 'Chef''s Knife', 'cutting', 'good', true),
    (demo_user_id, 'Cutting Board', 'preparation', 'good', false),
    (demo_user_id, 'Mixing Bowls', 'preparation', 'good', false),
    (demo_user_id, 'Measuring Cups', 'measurement', 'good', false),
    (demo_user_id, 'Measuring Spoons', 'measurement', 'good', false),
    (demo_user_id, 'Wok', 'cooking', 'good', true),
    (demo_user_id, 'Rice Cooker', 'appliance', 'good', true),
    (demo_user_id, 'Food Processor', 'appliance', 'good', false),
    (demo_user_id, 'Blender', 'appliance', 'good', false),
    (demo_user_id, 'Stand Mixer', 'appliance', 'good', false),
    (demo_user_id, 'Cast Iron Skillet', 'cooking', 'good', true),
    (demo_user_id, 'Dutch Oven', 'cooking', 'good', false),
    (demo_user_id, 'Baking Sheet', 'baking', 'good', false),
    (demo_user_id, 'Instant Pot', 'appliance', 'good', true),
    (demo_user_id, 'Air Fryer', 'appliance', 'good', false);
    
    -- Create meal history data
    INSERT INTO meal_history (id, user_id, image_url, meal_type, source, cuisine_type, uploaded_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal1.jpg',
      'dinner',
      'restaurant',
      'italian',
      NOW() - INTERVAL '14 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal2.jpg',
      'lunch',
      'homemade',
      'asian',
      NOW() - INTERVAL '10 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal3.jpg',
      'dinner',
      'restaurant',
      'mexican',
      NOW() - INTERVAL '7 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal4.jpg',
      'dinner',
      'homemade',
      'mediterranean',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'https://example.com/meal5.jpg',
      'lunch',
      'restaurant',
      'asian',
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the meal IDs for the meal history metadata
    WITH meal_ids AS (
      SELECT id FROM meal_history WHERE user_id = demo_user_id ORDER BY uploaded_at DESC LIMIT 5
    )
    INSERT INTO user_meal_history_metadata (user_id, meal_id, name, restaurant, date, cuisine, dishes, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Pasta Night'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Homemade Stir Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Tuesday'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Mediterranean Feast'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Lunch'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Olive Garden'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Taco Bell'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Home Kitchen'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Sushi Palace'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN NOW() - INTERVAL '14 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN NOW() - INTERVAL '10 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN NOW() - INTERVAL '7 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN NOW() - INTERVAL '3 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN NOW() - INTERVAL '1 day'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'italian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'asian'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'mexican'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'mediterranean'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'asian'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '[{"name": "Fettuccine Alfredo"}, {"name": "Breadsticks"}, {"name": "Tiramisu"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '[{"name": "Chicken Stir Fry"}, {"name": "Steamed Rice"}, {"name": "Vegetable Spring Rolls"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '[{"name": "Crunchy Tacos"}, {"name": "Burrito Supreme"}, {"name": "Nachos"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '[{"name": "Grilled Chicken Souvlaki"}, {"name": "Greek Salad"}, {"name": "Hummus with Pita"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '[{"name": "California Roll"}, {"name": "Spicy Tuna Roll"}, {"name": "Miso Soup"}, {"name": "Edamame"}]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 4, 5) THEN true
        ELSE false
      END
    FROM meal_ids;
    
    -- Create generated recipes data
    INSERT INTO generated_recipes (id, user_id, recipe_name, ingredients, instructions, nutritional_info, cooking_time, difficulty_level, cuisine_type, tools_required, dietary_tags, generated_at)
    VALUES
    (
      gen_random_uuid(),
      demo_user_id,
      'Garlic Butter Shrimp Pasta',
      '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb,
      '["Cook pasta according to package instructions.", "In a large skillet, melt butter over medium heat.", "Add garlic and red pepper flakes, cook until fragrant.", "Add shrimp and cook until pink.", "Toss with pasta, lemon juice, and parsley.", "Serve with grated parmesan."]'::jsonb,
      '{"calories": 450, "protein": 25, "carbs": 50, "fat": 15}'::jsonb,
      '00:30:00',
      'easy',
      'italian',
      '["pot", "skillet", "cutting board", "knife"]'::jsonb,
      '["pescatarian"]'::jsonb,
      NOW() - INTERVAL '12 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Thai Basil Chicken Stir-Fry',
      '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb,
      '["Cook rice according to package instructions.", "Heat oil in a wok over high heat.", "Add garlic and chili, stir-fry until fragrant.", "Add chicken and stir-fry until cooked through.", "Add sauces and sugar, stir to combine.", "Add basil leaves and stir until wilted.", "Serve over rice."]'::jsonb,
      '{"calories": 380, "protein": 30, "carbs": 40, "fat": 10}'::jsonb,
      '00:25:00',
      'medium',
      'asian',
      '["wok", "rice cooker", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '8 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Mediterranean Chickpea Salad',
      '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb,
      '["Drain and rinse chickpeas.", "Chop cucumber, tomatoes, and red onion.", "Combine all ingredients in a large bowl.", "Whisk together olive oil, lemon juice, oregano, salt, and pepper.", "Pour dressing over salad and toss to combine.", "Refrigerate for at least 30 minutes before serving."]'::jsonb,
      '{"calories": 320, "protein": 15, "carbs": 35, "fat": 12}'::jsonb,
      '00:15:00',
      'easy',
      'mediterranean',
      '["cutting board", "knife", "mixing bowl", "whisk"]'::jsonb,
      '["vegetarian", "gluten-free"]'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Instant Pot Beef Stew',
      '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb,
      '["Set Instant Pot to Sauté mode.", "Season beef with salt and pepper, then coat with flour.", "Brown beef in batches, then remove.", "Sauté onions and garlic until soft.", "Add tomato paste and stir.", "Return beef to pot and add remaining ingredients.", "Seal and cook on high pressure for 35 minutes.", "Natural release for 10 minutes, then quick release.", "Remove bay leaves and thyme sprigs before serving."]'::jsonb,
      '{"calories": 420, "protein": 35, "carbs": 30, "fat": 18}'::jsonb,
      '01:00:00',
      'medium',
      'american',
      '["instant pot", "cutting board", "knife"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      demo_user_id,
      'Air Fryer Crispy Tofu Bowl',
      '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb,
      '["Press tofu to remove excess water, then cut into cubes.", "Toss tofu with cornstarch, salt, and pepper.", "Air fry at 400°F for 15 minutes, shaking halfway through.", "Mix soy sauce, sesame oil, rice vinegar, brown sugar, and garlic powder.", "Cook rice according to package instructions.", "Steam or air fry vegetables.", "Assemble bowls with rice, vegetables, and tofu.", "Drizzle with sauce and sprinkle with sesame seeds."]'::jsonb,
      '{"calories": 380, "protein": 20, "carbs": 45, "fat": 12}'::jsonb,
      '00:40:00',
      'easy',
      'asian',
      '["air fryer", "rice cooker", "cutting board", "knife", "mixing bowl"]'::jsonb,
      '["vegetarian", "vegan"]'::jsonb,
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the recipe IDs for the generated recipe metadata
    WITH recipe_ids AS (
      SELECT id FROM generated_recipes WHERE user_id = demo_user_id ORDER BY generated_at DESC LIMIT 5
    )
    INSERT INTO user_generated_recipe_metadata (user_id, recipe_id, name, ingredients, is_favorite)
    SELECT 
      demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'Garlic Butter Shrimp Pasta'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'Thai Basil Chicken Stir-Fry'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN 'Mediterranean Chickpea Salad'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN 'Instant Pot Beef Stew'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN 'Air Fryer Crispy Tofu Bowl'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '["shrimp", "pasta", "butter", "garlic", "lemon", "parsley", "red pepper flakes", "parmesan cheese"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '["chicken breast", "basil leaves", "garlic", "thai chili", "soy sauce", "oyster sauce", "fish sauce", "sugar", "vegetable oil", "rice"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '["chickpeas", "cucumber", "cherry tomatoes", "red onion", "feta cheese", "kalamata olives", "olive oil", "lemon juice", "oregano", "salt", "pepper"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '["beef chuck", "potatoes", "carrots", "onion", "garlic", "beef broth", "tomato paste", "worcestershire sauce", "thyme", "bay leaves", "flour", "salt", "pepper", "olive oil"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '["extra-firm tofu", "cornstarch", "soy sauce", "sesame oil", "rice vinegar", "brown sugar", "garlic powder", "rice", "broccoli", "carrots", "edamame", "sesame seeds"]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 3, 5) THEN true
        ELSE false
      END
    FROM recipe_ids;
  END IF;
END $$;

-- Create a trigger to reset demo user data on logout
CREATE OR REPLACE FUNCTION auth_user_logout_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user is the demo user
  IF OLD.email = 'demo@demo.com' THEN
    -- Reset demo user data
    PERFORM reset_demo_user_data();
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on auth.users table for logout events
DROP TRIGGER IF EXISTS auth_user_logout_trigger ON auth.users;
CREATE TRIGGER auth_user_logout_trigger
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS NOT NULL AND NEW.last_sign_in_at IS NULL)
EXECUTE FUNCTION auth_user_logout_trigger();
