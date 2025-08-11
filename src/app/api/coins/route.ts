import { NextRequest, NextResponse } from 'next/server';
import { getCoinData } from '@/lib/mcp-coingecko';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ids = searchParams.get('ids');
  const vsCurrency = searchParams.get('vs_currency') || 'usd';

  if (!ids) {
    return NextResponse.json({ error: 'Query parameter "ids" is required' }, { status: 400 });
  }

  try {
    const coinIds = ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
    const results = await getCoinData(coinIds);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Coins API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coin data' },
      { status: 500 }
    );
  }
}