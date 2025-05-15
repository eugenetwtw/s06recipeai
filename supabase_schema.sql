-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id),
    display_name TEXT,
    dietary_preferences JSONB,
    cuisine_preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refrigerator Contents Table
CREATE TABLE refrigerator_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT NOT NULL,
    detected_ingredients JSONB,
    ingredient_categories JSONB,
    expiration_dates JSONB,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kitchen Tools Table
CREATE TABLE kitchen_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT NOT NULL,
    detected_tools JSONB,
    tool_condition TEXT, -- working, broken, needs_repair
    last_maintenance_date TIMESTAMPTZ,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal History Table
CREATE TABLE meal_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    image_url TEXT NOT NULL,
    meal_type TEXT, -- breakfast, lunch, dinner, snack
    source TEXT, -- ubereats, foodpanda, homemade
    cuisine_type TEXT,
    spiciness_level INT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Recipes Table
CREATE TABLE generated_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    recipe_name TEXT NOT NULL,
    ingredients JSONB,
    instructions JSONB,
    nutritional_info JSONB,
    cooking_time INTERVAL,
    difficulty_level TEXT,
    cuisine_type TEXT,
    tools_required JSONB,
    dietary_tags JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    user_rating FLOAT,
    times_cooked INT DEFAULT 0
);

-- Recipe Variations Table
CREATE TABLE recipe_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_recipe_id UUID REFERENCES generated_recipes(id),
    variation_name TEXT,
    variation_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Taste Profile Table
CREATE TABLE user_taste_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES auth.users(id),
    preferred_cuisines JSONB,
    spiciness_tolerance INT,
    protein_preferences JSONB,
    cooking_style_preferences JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE refrigerator_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_taste_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for user data access
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their refrigerator contents" ON refrigerator_contents
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their kitchen tools" ON kitchen_tools
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their meal history" ON meal_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their generated recipes" ON generated_recipes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their recipe variations" ON recipe_variations
    FOR ALL USING (auth.uid() = (SELECT user_id FROM generated_recipes WHERE id = original_recipe_id));

CREATE POLICY "Users can manage their taste profile" ON user_taste_profiles
    FOR ALL USING (auth.uid() = user_id);
