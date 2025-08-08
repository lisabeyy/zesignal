import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

export async function POST(request: NextRequest) {
  try {
    const { coinId, marketCap } = await request.json();
    
    if (!coinId || !marketCap) {
      return NextResponse.json({ error: 'coinId and marketCap are required' }, { status: 400 });
    }

    const similarCoins = await mcpClient.findSimilarCoinsByCategory(coinId, marketCap);

    return NextResponse.json({ 
      success: true,
      results: similarCoins 
    });

  } catch (error) {
    console.error('Error getting similar coins by category:', error);
    return NextResponse.json({ error: 'Failed to get similar coins by category' }, { status: 500 });
  }
}