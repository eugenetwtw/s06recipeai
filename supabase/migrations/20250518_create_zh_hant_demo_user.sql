-- Create Traditional Chinese demo user if it doesn't exist
DO $$
DECLARE
  zh_hant_demo_user_id UUID;
BEGIN
  -- Check if Traditional Chinese demo user already exists
  SELECT id INTO zh_hant_demo_user_id FROM auth.users WHERE email = 'demo-zh-Hant@demo.com';
  
  -- If Traditional Chinese demo user doesn't exist, create it
  IF zh_hant_demo_user_id IS NULL THEN
    -- Insert Traditional Chinese demo user into auth.users table
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
      'demo-zh-Hant@demo.com',
      crypt('demodemo', gen_salt('bf')), -- Password: demodemo
      NOW(),
      NULL,
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"繁體中文示範用戶"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO zh_hant_demo_user_id;
    
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name, dietary_preferences, cuisine_preferences)
    VALUES (
      zh_hant_demo_user_id,
      '繁體中文示範用戶',
      '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
      '{"中式": 5, "台式": 5, "日式": 4, "韓式": 3, "義式": 3, "美式": 2}'::jsonb
    );
    
    -- Create taste profile
    INSERT INTO user_taste_profiles (user_id, preferred_cuisines, spiciness_tolerance, protein_preferences, cooking_style_preferences)
    VALUES (
      zh_hant_demo_user_id,
      '["中式", "台式", "日式", "韓式", "義式"]'::jsonb,
      4,
      '{"豬肉": 5, "雞肉": 5, "牛肉": 4, "魚": 5, "豆腐": 4}'::jsonb,
      '{"炒": 5, "煮": 4, "蒸": 5, "燉": 4, "烤": 3}'::jsonb
    );
    
    -- Create kitchen tools data
    INSERT INTO kitchen_tools (user_id, image_url, detected_tools, uploaded_at)
    VALUES
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools1.jpg',
      '{"kitchenTools": ["中式炒鍋", "菜刀", "砧板", "飯鍋", "蒸籠"]}'::jsonb,
      NOW() - INTERVAL '10 days'
    ),
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools2.jpg',
      '{"kitchenTools": ["電子鍋", "電磁爐", "攪拌機", "調理機", "量杯"]}'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools3.jpg',
      '{"kitchenTools": ["鑄鐵鍋", "不沾鍋", "烤盤", "電子鍋", "氣炸鍋"]}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
    
    -- Create kitchen tool metadata
    INSERT INTO user_kitchen_tool_metadata (user_id, tool_name, category, condition, is_favorite)
    VALUES
    (zh_hant_demo_user_id, '中式炒鍋', '烹飪', '良好', true),
    (zh_hant_demo_user_id, '菜刀', '切割', '良好', false),
    (zh_hant_demo_user_id, '砧板', '準備', '良好', false),
    (zh_hant_demo_user_id, '飯鍋', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '蒸籠', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '電子鍋', '電器', '良好', true),
    (zh_hant_demo_user_id, '電磁爐', '電器', '良好', true),
    (zh_hant_demo_user_id, '攪拌機', '電器', '良好', false),
    (zh_hant_demo_user_id, '調理機', '電器', '良好', false),
    (zh_hant_demo_user_id, '量杯', '測量', '良好', false),
    (zh_hant_demo_user_id, '鑄鐵鍋', '烹飪', '良好', true),
    (zh_hant_demo_user_id, '不沾鍋', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '烤盤', '烘焙', '良好', false),
    (zh_hant_demo_user_id, '氣炸鍋', '電器', '良好', true);
    
    -- Create meal history data
    INSERT INTO meal_history (id, user_id, image_url, meal_type, source, cuisine_type, uploaded_at)
    VALUES
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal1.jpg',
      'dinner',
      'restaurant',
      '台式',
      NOW() - INTERVAL '14 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal2.jpg',
      'lunch',
      'homemade',
      '中式',
      NOW() - INTERVAL '10 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal3.jpg',
      'dinner',
      'restaurant',
      '日式',
      NOW() - INTERVAL '7 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal4.jpg',
      'dinner',
      'homemade',
      '韓式',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal5.jpg',
      'lunch',
      'restaurant',
      '中式',
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the meal IDs for the meal history metadata
    WITH meal_ids AS (
      SELECT id FROM meal_history WHERE user_id = zh_hant_demo_user_id ORDER BY uploaded_at DESC LIMIT 5
    )
    INSERT INTO user_meal_history_metadata (user_id, meal_id, name, restaurant, date, cuisine, dishes, is_favorite)
    SELECT 
      zh_hant_demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '夜市小吃'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '家常炒飯'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '日式料理'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '韓式烤肉'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '港式點心'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '師大夜市'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '家裡廚房'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '鮨彩壽司'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '家裡廚房'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '添好運點心'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN NOW() - INTERVAL '14 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN NOW() - INTERVAL '10 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN NOW() - INTERVAL '7 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN NOW() - INTERVAL '3 days'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN NOW() - INTERVAL '1 day'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '台式'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '中式'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '日式'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '韓式'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '中式'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '[{"name": "蚵仔煎"}, {"name": "臭豆腐"}, {"name": "珍珠奶茶"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '[{"name": "蛋炒飯"}, {"name": "炒青菜"}, {"name": "酸辣湯"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '[{"name": "鮭魚壽司"}, {"name": "鮪魚壽司"}, {"name": "味噌湯"}, {"name": "茶碗蒸"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '[{"name": "韓式烤肉"}, {"name": "泡菜"}, {"name": "拌飯"}]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '[{"name": "蝦餃"}, {"name": "燒賣"}, {"name": "叉燒包"}, {"name": "腸粉"}]'::jsonb
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
      zh_hant_demo_user_id,
      '三杯雞',
      '["雞腿肉", "九層塔", "薑", "蒜頭", "辣椒", "麻油", "醬油", "米酒", "冰糖"]'::jsonb,
      '["將雞腿肉切成小塊。", "熱鍋，倒入麻油，爆香薑、蒜頭和辣椒。", "加入雞肉，煎至表面金黃。", "加入醬油、米酒和冰糖，蓋上鍋蓋燜煮約10分鐘。", "加入九層塔，炒勻即可。"]'::jsonb,
      '{"calories": 450, "protein": 30, "carbs": 10, "fat": 30}'::jsonb,
      '00:30:00',
      'easy',
      '台式',
      '["炒鍋", "鍋鏟", "砧板", "菜刀"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '12 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      '麻婆豆腐',
      '["豆腐", "絞肉", "蔥", "薑", "蒜頭", "豆瓣醬", "辣豆瓣醬", "醬油", "太白粉", "花椒粉", "麻油"]'::jsonb,
      '["將豆腐切成小方塊，放入熱水中焯燙，撈起瀝乾。", "熱鍋，倒入油，爆香蔥、薑、蒜頭。", "加入絞肉，炒至變色。", "加入豆瓣醬和辣豆瓣醬，炒出香味。", "加入適量水，煮沸後加入豆腐，燜煮5分鐘。", "用太白粉水勾芡，撒上花椒粉和蔥花，淋上麻油即可。"]'::jsonb,
      '{"calories": 380, "protein": 25, "carbs": 15, "fat": 25}'::jsonb,
      '00:25:00',
      'medium',
      '中式',
      '["炒鍋", "鍋鏟", "砧板", "菜刀"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '8 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      '涼拌黃瓜',
      '["小黃瓜", "蒜頭", "辣椒", "香菜", "醬油", "醋", "香油", "糖", "鹽"]'::jsonb,
      '["將小黃瓜洗淨，切成細條。", "蒜頭和辣椒切碎。", "將小黃瓜放入大碗中，加入鹽醃製10分鐘。", "擠乾小黃瓜中的水分。", "加入蒜頭、辣椒、香菜，拌勻。", "調製醬汁：醬油、醋、香油、糖混合。", "將醬汁倒入小黃瓜中，拌勻即可。"]'::jsonb,
      '{"calories": 120, "protein": 3, "carbs": 15, "fat": 5}'::jsonb,
      '00:15:00',
      'easy',
      '中式',
      '["砧板", "菜刀", "碗", "湯匙"]'::jsonb,
      '["素食", "無麩質"]'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      '電子鍋紅燒肉',
      '["五花肉", "紅蘿蔔", "洋蔥", "薑", "蒜頭", "八角", "桂皮", "醬油", "冰糖", "米酒", "水", "蔥"]'::jsonb,
      '["將五花肉切成大塊，汆燙去血水。", "電子鍋內鍋放入少許油，加入薑、蒜頭爆香。", "加入五花肉，煎至表面變色。", "加入八角、桂皮、醬油、冰糖、米酒和適量水。", "蓋上鍋蓋，按下煮飯鍵，等待電子鍋跳起。", "加入紅蘿蔔和洋蔥，再按下煮飯鍵煮10分鐘。", "開蓋後撒上蔥花即可。"]'::jsonb,
      '{"calories": 420, "protein": 25, "carbs": 20, "fat": 30}'::jsonb,
      '01:00:00',
      'medium',
      '中式',
      '["電子鍋", "砧板", "菜刀"]'::jsonb,
      '[]'::jsonb,
      NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      '氣炸鍋椒鹽豆腐',
      '["板豆腐", "太白粉", "椒鹽粉", "蒜頭", "辣椒", "蔥", "香菜", "油"]'::jsonb,
      '["將豆腐切成小方塊，用廚房紙巾吸乾水分。", "將豆腐均勻裹上一層太白粉。", "氣炸鍋預熱至180°C。", "將豆腐放入氣炸鍋中，噴一層薄油，氣炸10分鐘，中途翻面一次。", "蒜頭、辣椒、蔥切碎，與椒鹽粉混合。", "豆腐氣炸完成後，趁熱撒上椒鹽粉和香料，拌勻即可。"]'::jsonb,
      '{"calories": 250, "protein": 15, "carbs": 20, "fat": 15}'::jsonb,
      '00:20:00',
      'easy',
      '中式',
      '["氣炸鍋", "砧板", "菜刀", "碗"]'::jsonb,
      '["素食"]'::jsonb,
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the recipe IDs for the generated recipe metadata
    WITH recipe_ids AS (
      SELECT id FROM generated_recipes WHERE user_id = zh_hant_demo_user_id ORDER BY generated_at DESC LIMIT 5
    )
    INSERT INTO user_generated_recipe_metadata (user_id, recipe_id, name, ingredients, is_favorite)
    SELECT 
      zh_hant_demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '三杯雞'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '麻婆豆腐'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '涼拌黃瓜'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '電子鍋紅燒肉'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '氣炸鍋椒鹽豆腐'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '["雞腿肉", "九層塔", "薑", "蒜頭", "辣椒", "麻油", "醬油", "米酒", "冰糖"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '["豆腐", "絞肉", "蔥", "薑", "蒜頭", "豆瓣醬", "辣豆瓣醬", "醬油", "太白粉", "花椒粉", "麻油"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '["小黃瓜", "蒜頭", "辣椒", "香菜", "醬油", "醋", "香油", "糖", "鹽"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '["五花肉", "紅蘿蔔", "洋蔥", "薑", "蒜頭", "八角", "桂皮", "醬油", "冰糖", "米酒", "水", "蔥"]'::jsonb
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '["板豆腐", "太白粉", "椒鹽粉", "蒜頭", "辣椒", "蔥", "香菜", "油"]'::jsonb
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) IN (2, 3, 5) THEN true
        ELSE false
      END
    FROM recipe_ids;
  END IF;
END $$;

-- Create a function to reset Traditional Chinese demo user data
CREATE OR REPLACE FUNCTION reset_zh_hant_demo_user_data()
RETURNS void AS $$
DECLARE
  zh_hant_demo_user_id UUID;
BEGIN
  -- Get Traditional Chinese demo user ID
  SELECT id INTO zh_hant_demo_user_id FROM auth.users WHERE email = 'demo-zh-Hant@demo.com';
  
  IF zh_hant_demo_user_id IS NOT NULL THEN
    -- Delete all data associated with Traditional Chinese demo user
    DELETE FROM user_generated_recipe_metadata WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM generated_recipes WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM user_meal_history_metadata WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM meal_history WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM user_kitchen_tool_metadata WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM kitchen_tools WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM user_taste_profiles WHERE user_id = zh_hant_demo_user_id;
    DELETE FROM user_profiles WHERE user_id = zh_hant_demo_user_id;
    
    -- Reinsert Traditional Chinese demo data
    -- Create user profile
    INSERT INTO user_profiles (user_id, display_name, dietary_preferences, cuisine_preferences)
    VALUES (
      zh_hant_demo_user_id,
      '繁體中文示範用戶',
      '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
      '{"中式": 5, "台式": 5, "日式": 4, "韓式": 3, "義式": 3, "美式": 2}'::jsonb
    );
    
    -- Create taste profile
    INSERT INTO user_taste_profiles (user_id, preferred_cuisines, spiciness_tolerance, protein_preferences, cooking_style_preferences)
    VALUES (
      zh_hant_demo_user_id,
      '["中式", "台式", "日式", "韓式", "義式"]'::jsonb,
      4,
      '{"豬肉": 5, "雞肉": 5, "牛肉": 4, "魚": 5, "豆腐": 4}'::jsonb,
      '{"炒": 5, "煮": 4, "蒸": 5, "燉": 4, "烤": 3}'::jsonb
    );
    
    -- Create kitchen tools data
    INSERT INTO kitchen_tools (user_id, image_url, detected_tools, uploaded_at)
    VALUES
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools1.jpg',
      '{"kitchenTools": ["中式炒鍋", "菜刀", "砧板", "飯鍋", "蒸籠"]}'::jsonb,
      NOW() - INTERVAL '10 days'
    ),
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools2.jpg',
      '{"kitchenTools": ["電子鍋", "電磁爐", "攪拌機", "調理機", "量杯"]}'::jsonb,
      NOW() - INTERVAL '5 days'
    ),
    (
      zh_hant_demo_user_id,
      'https://example.com/kitchen_tools3.jpg',
      '{"kitchenTools": ["鑄鐵鍋", "不沾鍋", "烤盤", "電子鍋", "氣炸鍋"]}'::jsonb,
      NOW() - INTERVAL '2 days'
    );
    
    -- Create kitchen tool metadata
    INSERT INTO user_kitchen_tool_metadata (user_id, tool_name, category, condition, is_favorite)
    VALUES
    (zh_hant_demo_user_id, '中式炒鍋', '烹飪', '良好', true),
    (zh_hant_demo_user_id, '菜刀', '切割', '良好', false),
    (zh_hant_demo_user_id, '砧板', '準備', '良好', false),
    (zh_hant_demo_user_id, '飯鍋', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '蒸籠', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '電子鍋', '電器', '良好', true),
    (zh_hant_demo_user_id, '電磁爐', '電器', '良好', true),
    (zh_hant_demo_user_id, '攪拌機', '電器', '良好', false),
    (zh_hant_demo_user_id, '調理機', '電器', '良好', false),
    (zh_hant_demo_user_id, '量杯', '測量', '良好', false),
    (zh_hant_demo_user_id, '鑄鐵鍋', '烹飪', '良好', true),
    (zh_hant_demo_user_id, '不沾鍋', '烹飪', '良好', false),
    (zh_hant_demo_user_id, '烤盤', '烘焙', '良好', false),
    (zh_hant_demo_user_id, '氣炸鍋', '電器', '良好', true);
    
    -- Create meal history data
    INSERT INTO meal_history (id, user_id, image_url, meal_type, source, cuisine_type, uploaded_at)
    VALUES
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal1.jpg',
      'dinner',
      'restaurant',
      '台式',
      NOW() - INTERVAL '14 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal2.jpg',
      'lunch',
      'homemade',
      '中式',
      NOW() - INTERVAL '10 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal3.jpg',
      'dinner',
      'restaurant',
      '日式',
      NOW() - INTERVAL '7 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal4.jpg',
      'dinner',
      'homemade',
      '韓式',
      NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid(),
      zh_hant_demo_user_id,
      'https://example.com/meal5.jpg',
      'lunch',
      'restaurant',
      '中式',
      NOW() - INTERVAL '1 day'
    );
    
    -- Get the meal IDs for the meal history metadata
    WITH meal_ids AS (
      SELECT id FROM meal_history WHERE user_id = zh_hant_demo_user_id ORDER BY uploaded_at DESC LIMIT 5
    )
    INSERT INTO user_meal_history_metadata (user_id, meal_id, name, restaurant, date, cuisine, dishes, is_favorite)
    SELECT 
      zh_hant_demo_user_id,
      id,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN '夜市小吃'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN '家常炒飯'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 3 THEN '日式料理'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 4 THEN '韓式烤肉'
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 5 THEN '港式點心'
      END,
      CASE 
        WHEN ROW_NUMBER() OVER (ORDER BY id) = 1
