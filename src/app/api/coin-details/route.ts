import { NextRequest, NextResponse } from 'next/server';
import { mcpClient } from '@/lib/mcp-client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const coinId = searchParams.get('id');

  if (!coinId) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
  }

  try {
    const result = await mcpClient.getCoinDetails(coinId);
    return NextResponse.json({ result });
  } catch (error) {
    console.error('Coin details API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin details' },
      { status: 500 }
    );
  }
}