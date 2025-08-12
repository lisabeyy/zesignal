import { NextRequest, NextResponse } from 'next/server';
import { connectCG, getCoinData } from '@/lib/mcp-coingecko';
import { connectZE, getSocialSentiment } from '@/lib/mcp-zedashboard';

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Starting dual MCP analysis...');
    
    // Get the selected token from query parameters
    const { searchParams } = new URL(request.url);
    const selectedToken = searchParams.get('token') || 'bitcoin';
    
    console.log(`🎯 Analyzing token: ${selectedToken}`);
    
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

    // 3. Fetch sentiment data ONLY for the selected token from ZeDashboard MCP
    console.log(`📡 Fetching sentiment data for ${selectedToken} from ZeDashboard MCP...`);
    let sentimentData = [];
    
    try {
      const selectedSentiment = await getSocialSentiment(selectedToken);
      sentimentData = [{
        coin: selectedToken,
        ...selectedSentiment
      }];
      console.log(`✅ Fetched sentiment data for ${selectedToken}`);
      console.log('📊 Sentiment data structure:', JSON.stringify(sentimentData[0], null, 2));
    } catch (sentimentError) {
      console.warn(`Failed to get sentiment for ${selectedToken}:`, sentimentError);
      sentimentData = [{
        coin: selectedToken,
        success: false,
        error: sentimentError instanceof Error ? sentimentError.message : 'Unknown error'
      }];
    }

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
      selectedToken,
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

  // Analyze each coin, but only generate signals for coins with sentiment data
  marketData.forEach((market) => {
    const sentiment = sentimentData.find(s => s.coin === market.id || s.coin === market.symbol?.toLowerCase());
    
    if (sentiment && sentiment.success) {
      const priceChange = market.price_change_percentage_24h;
      const sentimentScore = sentiment.sentimentScore;
      const totalEngagement = sentiment.totalEngagement || 0;
      const postsInLast24h = sentiment.postsInLast24h || 0;
      const averageEngagement = sentiment.averageEngagement || 0;
      
      let signal = 'hold';
      let confidence = 50;
      let reasoning = '';
      
      // Enhanced analysis logic with engagement metrics
      if (priceChange > 5 && sentimentScore > 0.7 && totalEngagement > 10000) {
        signal = 'strong_buy';
        confidence = 90;
        reasoning = 'Strong positive momentum with bullish sentiment and high engagement';
      } else if (priceChange < -5 && sentimentScore < 0.3 && totalEngagement > 10000) {
        signal = 'strong_sell';
        confidence = 85;
        reasoning = 'Strong negative momentum with bearish sentiment and high engagement';
      } else if (priceChange > 2 && sentimentScore > 0.6 && averageEngagement > 100) {
        signal = 'buy';
        confidence = 75;
        reasoning = 'Positive momentum with good sentiment and healthy engagement';
      } else if (priceChange < -2 && sentimentScore < 0.4 && averageEngagement > 100) {
        signal = 'sell';
        confidence = 70;
        reasoning = 'Negative momentum with poor sentiment and concerning engagement';
      } else if (postsInLast24h > 20 && averageEngagement > 50) {
        signal = 'hold';
        confidence = 65;
        reasoning = 'Mixed price signals but active community engagement';
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
        totalEngagement: totalEngagement,
        postsInLast24h: postsInLast24h,
        averageEngagement: averageEngagement,
        trendingPosts: sentiment.trendingPosts || [],
        signal,
        confidence,
        reasoning
      });
    } else {
      // For coins without sentiment data, create a basic signal based on price only
      const priceChange = market.price_change_percentage_24h;
      let signal = 'hold';
      let confidence = 40;
      let reasoning = 'No sentiment data available, analysis based on price movement only';
      
      if (priceChange > 5) {
        signal = 'buy';
        confidence = 60;
        reasoning = 'Strong positive momentum (no sentiment data available)';
      } else if (priceChange < -5) {
        signal = 'sell';
        confidence = 55;
        reasoning = 'Strong negative momentum (no sentiment data available)';
      }
      
      analysis.signals.push({
        coin: market.symbol,
        name: market.name,
        price: market.current_price,
        priceChange24h: priceChange,
        sentimentScore: 0.5, // Neutral when no sentiment data
        totalEngagement: 0,
        postsInLast24h: 0,
        averageEngagement: 0,
        trendingPosts: [],
        signal,
        confidence,
        reasoning
      });
    }
  });

  // Generate enhanced summary
  const buySignals = analysis.signals.filter(s => s.signal.includes('buy')).length;
  const sellSignals = analysis.signals.filter(s => s.signal.includes('sell')).length;
  const holdSignals = analysis.signals.filter(s => s.signal === 'hold').length;
  
  const totalEngagement = analysis.signals.reduce((sum, s) => sum + (s.totalEngagement || 0), 0);
  const avgEngagement = analysis.signals.length > 0 ? totalEngagement / analysis.signals.length : 0;
  
  analysis.summary = `Market Analysis: ${buySignals} buy signals, ${sellSignals} sell signals, ${holdSignals} hold recommendations. Overall market sentiment is ${buySignals > sellSignals ? 'bullish' : sellSignals > buySignals ? 'bearish' : 'neutral'}. Total community engagement: ${totalEngagement.toLocaleString()}, average engagement per coin: ${Math.round(avgEngagement).toLocaleString()}.`;

  return analysis;
}
