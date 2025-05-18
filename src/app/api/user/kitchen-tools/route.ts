import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Interface for kitchen tool metadata
interface KitchenToolMetadata {
  id: string;
  name: string;
  category: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  lastMaintenanceDate?: string;
  notes?: string;
  isFavorite: boolean;
}

// GET: Fetch user's kitchen tools with metadata
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;

    // Fetch raw kitchen tools data
    const { data: rawTools, error: toolsError } = await supabase
      .from('kitchen_tools')
      .select('*')
      .eq('user_id', userId);

    if (toolsError) {
      return NextResponse.json({ error: toolsError.message }, { status: 500 });
    }

    // Fetch user's kitchen tool metadata
    const { data: toolMetadata, error: metadataError } = await supabase
      .from('user_kitchen_tool_metadata')
      .select('*')
      .eq('user_id', userId);

    if (metadataError) {
      // If the table doesn't exist yet, we'll just return the raw tools
      console.error('Error fetching tool metadata:', metadataError);
    }

    // Process the raw data to extract individual tools
    const processedTools: any[] = [];
    const metadataMap = new Map();
    
    // Create a map of tool name to metadata
    if (toolMetadata) {
      toolMetadata.forEach((meta: any) => {
        metadataMap.set(meta.tool_name.toLowerCase(), meta);
      });
    }
    
    // Process each raw tool entry
    rawTools.forEach(rawTool => {
      if (rawTool.detected_tools && rawTool.detected_tools.kitchenTools) {
        rawTool.detected_tools.kitchenTools.forEach((toolName: string) => {
          // Check if this tool already exists in our processed list
          const existingTool = processedTools.find(t => 
            t.name.toLowerCase() === toolName.toLowerCase()
          );
          
          if (!existingTool) {
            // Check if we have metadata for this tool
            const metadata = metadataMap.get(toolName.toLowerCase());
            
            // Add as a new tool with metadata or default values
            processedTools.push({
              id: metadata?.id || `${rawTool.id}-${processedTools.length}`,
              name: toolName,
              category: metadata?.category || guessCategory(toolName),
              condition: metadata?.condition || 'good',
              lastMaintenanceDate: metadata?.last_maintenance_date || '',
              notes: metadata?.notes || '',
              isFavorite: metadata?.is_favorite || false,
              imageUrl: rawTool.image_url || '', // Include the image URL
              rawToolId: rawTool.id // Include the raw tool ID for reference
            });
          } else if (!existingTool.imageUrl && rawTool.image_url) {
            // If the tool exists but doesn't have an image, add the image
            existingTool.imageUrl = rawTool.image_url;
            existingTool.rawToolId = rawTool.id;
          }
        });
      }
    });

    return NextResponse.json(processedTools);
  } catch (error) {
    console.error('Error in kitchen-tools GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: Update or create kitchen tool metadata
export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;

    // Parse request body
    const toolData: KitchenToolMetadata = await request.json();
    
    // Validate required fields
    if (!toolData.name) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
    }

    // Check if the tool metadata already exists
    const { data: existingMetadata, error: checkError } = await supabase
      .from('user_kitchen_tool_metadata')
      .select('*')
      .eq('user_id', userId)
      .eq('tool_name', toolData.name);

    if (checkError) {
      // If the table doesn't exist, create it
      await supabase.rpc('create_kitchen_tool_metadata_table_if_not_exists');
    }

    // Prepare data for insertion/update
    const metadataRecord = {
      user_id: userId,
      tool_name: toolData.name,
      category: toolData.category,
      condition: toolData.condition,
      last_maintenance_date: toolData.lastMaintenanceDate,
      notes: toolData.notes,
      is_favorite: toolData.isFavorite
    };

    let result;
    
    if (existingMetadata && existingMetadata.length > 0) {
      // Update existing metadata
      result = await supabase
        .from('user_kitchen_tool_metadata')
        .update(metadataRecord)
        .eq('user_id', userId)
        .eq('tool_name', toolData.name)
        .select();
    } else {
      // Insert new metadata
      result = await supabase
        .from('user_kitchen_tool_metadata')
        .insert(metadataRecord)
        .select();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Kitchen tool metadata saved successfully',
      data: result.data
    });
  } catch (error) {
    console.error('Error in kitchen-tools POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a kitchen tool and its metadata
export async function DELETE(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify the token with Supabase
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(token);
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const userId = user.id;

    // Get tool name from URL
    const url = new URL(request.url);
    const toolName = url.searchParams.get('name');
    
    if (!toolName) {
      return NextResponse.json({ error: 'Tool name is required' }, { status: 400 });
    }

    // Delete the tool metadata
    const { error: metadataError } = await supabase
      .from('user_kitchen_tool_metadata')
      .delete()
      .eq('user_id', userId)
      .eq('tool_name', toolName);

    if (metadataError) {
      console.error('Error deleting kitchen tool metadata:', metadataError);
      // Continue even if metadata deletion fails
    }
    
    // Find and delete any kitchen tools entries with this tool name
    // First, get all kitchen tools for this user
    const { data: kitchenTools, error: fetchError } = await supabase
      .from('kitchen_tools')
      .select('*')
      .eq('user_id', userId);
      
    if (fetchError) {
      console.error('Error fetching kitchen tools:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }
    
    // For each kitchen tool entry, check if it contains the tool to delete
    for (const tool of kitchenTools || []) {
      if (tool.detected_tools && 
          tool.detected_tools.kitchenTools && 
          Array.isArray(tool.detected_tools.kitchenTools) &&
          tool.detected_tools.kitchenTools.includes(toolName)) {
        
        // Remove the tool from the kitchenTools array
        const updatedTools = {
          ...tool.detected_tools,
          kitchenTools: tool.detected_tools.kitchenTools.filter((t: string) => t !== toolName)
        };
        
        // Update the kitchen tool entry
        const { error: updateError } = await supabase
          .from('kitchen_tools')
          .update({ detected_tools: updatedTools })
          .eq('id', tool.id)
          .eq('user_id', userId);
          
        if (updateError) {
          console.error('Error updating kitchen tool:', updateError);
          // Continue with other deletions even if this one fails
        }
      }
    }

    return NextResponse.json({
      message: 'Kitchen tool deleted successfully'
    });
  } catch (error) {
    console.error('Error in kitchen-tools DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to guess the category based on the tool name
function guessCategory(toolName: string): string {
  toolName = toolName.toLowerCase();
  
  if (toolName.includes('oven') || toolName.includes('mixer') || 
      toolName.includes('blender') || toolName.includes('processor') || 
      toolName.includes('cooker') || toolName.includes('maker')) {
    return 'appliance';
  }
  
  if (toolName.includes('pan') || toolName.includes('pot') || 
      toolName.includes('skillet') || toolName.includes('wok')) {
    return 'cooking';
  }
  
  if (toolName.includes('sheet') || toolName.includes('dish') || 
      toolName.includes('tray') || toolName.includes('tin')) {
    return 'baking';
  }
  
  if (toolName.includes('knife') || toolName.includes('spoon') || 
      toolName.includes('fork') || toolName.includes('whisk') || 
      toolName.includes('spatula') || toolName.includes('tongs')) {
    return 'utensil';
  }
  
  if (toolName.includes('container') || toolName.includes('jar') || 
      toolName.includes('bag') || toolName.includes('wrap')) {
    return 'storage';
  }
  
  return 'other';
}
