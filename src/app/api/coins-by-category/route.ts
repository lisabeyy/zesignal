import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get('category');

  if (!category) {
    return NextResponse.json({ error: 'Query parameter "category" is required' }, { status: 400 });
  }

  try {
    const results = await mcpClient.getCoinsByCategory(category);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Coins by category API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coins by category' },
      { status: 500 }
    );
  }
}