-- Create user_kitchen_tool_metadata table
CREATE TABLE IF NOT EXISTS user_kitchen_tool_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  condition TEXT NOT NULL DEFAULT 'good',
  last_maintenance_date DATE,
  notes TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, tool_name)
);

-- Create RLS policies for user_kitchen_tool_metadata table
ALTER TABLE user_kitchen_tool_metadata ENABLE ROW LEVEL SECURITY;

-- Allow users to select their own kitchen tool metadata
CREATE POLICY "Users can view their own kitchen tool metadata"
  ON user_kitchen_tool_metadata
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own kitchen tool metadata
CREATE POLICY "Users can insert their own kitchen tool metadata"
  ON user_kitchen_tool_metadata
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own kitchen tool metadata
CREATE POLICY "Users can update their own kitchen tool metadata"
  ON user_kitchen_tool_metadata
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own kitchen tool metadata
CREATE POLICY "Users can delete their own kitchen tool metadata"
  ON user_kitchen_tool_metadata
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to create the table if it doesn't exist
CREATE OR REPLACE FUNCTION create_kitchen_tool_metadata_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_kitchen_tool_metadata'
  ) THEN
    -- Create the table
    CREATE TABLE public.user_kitchen_tool_metadata (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      condition TEXT NOT NULL DEFAULT 'good',
      last_maintenance_date DATE,
      notes TEXT,
      is_favorite BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
      UNIQUE(user_id, tool_name)
    );

    -- Enable RLS
    ALTER TABLE public.user_kitchen_tool_metadata ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY "Users can view their own kitchen tool metadata"
      ON public.user_kitchen_tool_metadata
      FOR SELECT
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own kitchen tool metadata"
      ON public.user_kitchen_tool_metadata
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own kitchen tool metadata"
      ON public.user_kitchen_tool_metadata
      FOR UPDATE
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own kitchen tool metadata"
      ON public.user_kitchen_tool_metadata
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_kitchen_tool_metadata_updated_at
BEFORE UPDATE ON user_kitchen_tool_metadata
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
