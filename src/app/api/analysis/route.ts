import { NextRequest, NextResponse } from 'next/server';
import { connectCG, getCoinData } from '@/lib/mcp-coingecko';
import { connectZE, getSocialSentiment } from '@/lib/mcp-zedashboard';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting dual MCP analysis...');
    
    // 1. Connect to both MCPs
    console.log('🔌 Connecting to MCP servers...');
    await Promise.all([
      connectCG(),
      connectZE()
    ]);
    console.log('✅ Both MCP servers connected');

    // 2. Fetch market data from CoinGecko MCP
    console.log('📊 Fetching market data from CoinGecko MCP...');
    const coins = ['bitcoin', 'ethereum', 'solana', 'taraxa'];
    const marketData = await getCoinData(coins);
    console.log(`✅ Fetched market data for ${marketData.length} coins`);

    // 3. Fetch sentiment data from ZeDashboard MCP
    console.log('📡 Fetching sentiment data from ZeDashboard MCP...');
    const sentimentPromises = coins.map(coin => getSocialSentiment(coin));
    const sentimentResults = await Promise.allSettled(sentimentPromises);
    
    const sentimentData = sentimentResults.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          coin: coins[index],
          ...result.value
        };
      } else {
        console.warn(`Failed to get sentiment for ${coins[index]}:`, result.reason);
        return {
          coin: coins[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
    console.log(`✅ Fetched sentiment data for ${sentimentData.filter(s => s.success).length} coins`);

    // 4. Generate AI analysis (simplified for now - you can add Claude later)
    console.log('🤖 Generating AI analysis...');
    const analysis = generateAnalysis(marketData, sentimentData);
    console.log('✅ AI analysis generated');

    // 5. Return everything to the UI
    return NextResponse.json({
      success: true,
      marketData,
      sentimentData,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Analysis API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Simplified AI analysis function (replace with Claude API call later)
function generateAnalysis(marketData: any[], sentimentData: any[]) {
  const analysis = {
    summary: '',
    signals: [] as any[],
    timestamp: new Date().toISOString()
  };

  // Analyze each coin
  marketData.forEach((market, index) => {
    const sentiment = sentimentData[index];
    
    if (sentiment && sentiment.success) {
      const priceChange = market.price_change_percentage_24h;
      const sentimentScore = sentiment.sentimentScore;
      
      let signal = 'hold';
      let confidence = 50;
      let reasoning = '';
      
      // Simple analysis logic
      if (priceChange > 5 && sentimentScore > 0.7) {
        signal = 'strong_buy';
        confidence = 85;
        reasoning = 'Strong positive momentum with bullish sentiment';
      } else if (priceChange < -5 && sentimentScore < 0.3) {
        signal = 'strong_sell';
        confidence = 80;
        reasoning = 'Strong negative momentum with bearish sentiment';
      } else if (priceChange > 2 && sentimentScore > 0.6) {
        signal = 'buy';
        confidence = 70;
        reasoning = 'Positive momentum with good sentiment';
      } else if (priceChange < -2 && sentimentScore < 0.4) {
        signal = 'sell';
        confidence = 65;
        reasoning = 'Negative momentum with poor sentiment';
      } else {
        signal = 'hold';
        confidence = 60;
        reasoning = 'Mixed signals, maintain current position';
      }
      
      analysis.signals.push({
        coin: market.symbol,
        name: market.name,
        price: market.current_price,
        priceChange24h: priceChange,
        sentimentScore: sentimentScore,
        signal,
        confidence,
        reasoning
      });
    }
  });

  // Generate summary
  const buySignals = analysis.signals.filter(s => s.signal.includes('buy')).length;
  const sellSignals = analysis.signals.filter(s => s.signal.includes('sell')).length;
  const holdSignals = analysis.signals.filter(s => s.signal === 'hold').length;
  
  analysis.summary = `Market Analysis: ${buySignals} buy signals, ${sellSignals} sell signals, ${holdSignals} hold recommendations. Overall market sentiment is ${buySignals > sellSignals ? 'bullish' : sellSignals > buySignals ? 'bearish' : 'neutral'}.`;

  return analysis;
}
