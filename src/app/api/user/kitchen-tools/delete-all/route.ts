import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// DELETE: Remove all kitchen tool entries for a user
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

    // Delete all kitchen tool metadata for this user
    const { error: metadataError } = await supabase
      .from('user_kitchen_tool_metadata')
      .delete()
      .eq('user_id', userId);

    if (metadataError) {
      console.error('Error deleting kitchen tool metadata:', metadataError);
      // Continue even if metadata deletion fails
    }

    // Delete all kitchen tool entries for this user
    const { error: toolError } = await supabase
      .from('kitchen_tools')
      .delete()
      .eq('user_id', userId);

    if (toolError) {
      console.error('Error deleting kitchen tools:', toolError);
      return NextResponse.json({ error: toolError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'All kitchen tools deleted successfully'
    });
  } catch (error) {
    console.error('Error in kitchen-tools DELETE ALL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
