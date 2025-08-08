import { NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

export async function GET() {
  try {
    const results = await mcpClient.getTrendingCoins();
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending coins' },
      { status: 500 }
    );
  }
}