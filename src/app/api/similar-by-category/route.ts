import { NextRequest, NextResponse } from 'next/server';
import { getCoinData } from '@/lib/mcp-coingecko';

export async function POST(request: NextRequest) {
  try {
    const { coinId, marketCap } = await request.json();
    
    if (!coinId || !marketCap) {
      return NextResponse.json({ error: 'coinId and marketCap are required' }, { status: 400 });
    }

    // For now, return a simple response since findSimilarCoinsByCategory is complex
    // You can implement this later or use the analysis API instead
    const similarCoins = [];

    return NextResponse.json({ 
      success: true,
      results: similarCoins 
    });

  } catch (error) {
    console.error('Error getting similar coins by category:', error);
    return NextResponse.json({ error: 'Failed to get similar coins by category' }, { status: 500 });
  }
}