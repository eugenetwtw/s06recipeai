-- Create user_generated_recipe_metadata table
CREATE TABLE IF NOT EXISTS user_generated_recipe_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES generated_recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, recipe_id)
);

-- Create RLS policies for user_generated_recipe_metadata table
ALTER TABLE user_generated_recipe_metadata ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own generated recipe metadata
CREATE POLICY "Users can view their own generated recipe metadata"
  ON user_generated_recipe_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own generated recipe metadata
CREATE POLICY "Users can insert their own generated recipe metadata"
  ON user_generated_recipe_metadata
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own generated recipe metadata
CREATE POLICY "Users can update their own generated recipe metadata"
  ON user_generated_recipe_metadata
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own generated recipe metadata
CREATE POLICY "Users can delete their own generated recipe metadata"
  ON user_generated_recipe_metadata
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_generated_recipe_metadata_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_generated_recipe_metadata'
  ) THEN
    -- Create the table
    CREATE TABLE public.user_generated_recipe_metadata (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      recipe_id UUID NOT NULL REFERENCES generated_recipes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      is_favorite BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      UNIQUE(user_id, recipe_id)
    );

    -- Enable RLS
    ALTER TABLE public.user_generated_recipe_metadata ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own generated recipe metadata"
      ON public.user_generated_recipe_metadata
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own generated recipe metadata"
      ON public.user_generated_recipe_metadata
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own generated recipe metadata"
      ON public.user_generated_recipe_metadata
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own generated recipe metadata"
      ON public.user_generated_recipe_metadata
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column
CREATE TRIGGER update_user_generated_recipe_metadata_updated_at
BEFORE UPDATE ON user_generated_recipe_metadata
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
