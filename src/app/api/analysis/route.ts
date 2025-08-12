
import { NextResponse } from 'next/server';
import { connectCG, getCoinData } from '@/lib/mcp-coingecko';
import { connectZE, getSocialSentiment } from '@/lib/mcp-zedashboard';
import Anthropic from '@anthropic-ai/sdk';

// Type definitions
interface MarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
}

interface TrendingPost {
  title: string;
  engagement: number;
  content: string;
  platform: string;
  date: string;
  url: string;
  id: string;
  creator?: {
    id: string;
    name: string;
    displayName: string;
    followers: number;
    avatar: string;
    rank: number;
    interactions24h: number;
  } | null;
}

interface SentimentData {
  coin: string;
  success: boolean;
  sentimentScore?: number;
  totalEngagement?: number;
  postsInLast24h?: number;
  averageEngagement?: number;
  trendingPosts?: TrendingPost[];
  error?: string;
}

interface AnalysisSignal {
  coin: string;
  name: string;
  price: number;
  priceChange24h: number;
  sentimentScore: number;
  totalEngagement: number;
  postsInLast24h: number;
  averageEngagement: number;
  trendingPosts: TrendingPost[];
  signal: string;
  confidence: number;
  reasoning: string;
  investorInsights: {
    shortTerm: string;
    mediumTerm: string;
    keyRisks: string;
    opportunities: string;
    technicalLevels: {
      support: number;
      resistance: number;
      keyLevel: number;
    };
  };
  divergence: string;
  priceDirection: string;
  divergenceStrength: number;
  riskLevel: string;
}

interface ParsedClaudeResponse {
  signal: string;
  confidence: number;
  reasoning: string;
  targetPrice: number;
  nearTermTarget: number;
  mediumTermTarget: number;
  priceDirection: string;
  divergence: string;
  divergenceStrength: number;
  riskLevel: string;
  investorInsights: {
    shortTerm: string;
    mediumTerm: string;
    keyRisks: string;
    opportunities: string;
    technicalLevels: {
      support: number;
      resistance: number;
      keyLevel: number;
    };
  };
}

interface Analysis {
  summary: string;
  signals: AnalysisSignal[];
  timestamp: string;
  marketOverview: {
    totalMarketCap: number;
    totalVolume: number;
    overallSentiment: string;
    priceSentimentDivergence: string;
  };
}

// NO Next.js caching - we'll implement simple in-memory caching for Claude only

export async function GET() {
  try {
    console.log('🚀 Starting dual MCP analysis...');
    
    // Get the selected token from query parameters
    const selectedToken = 'bitcoin'; // Default token for now
    
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

    // 4. Generate AI analysis
    console.log('🤖 Generating Claude AI analysis...');
    const analysis = await generateAnalysis(marketData, sentimentData);
    console.log('✅ Claude AI analysis generated');

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

// Claude AI-powered analysis function
async function generateAnalysis(marketData: MarketData[], sentimentData: SentimentData[]): Promise<Analysis> {
  const analysis: Analysis = {
    summary: '',
    signals: [],
    timestamp: new Date().toISOString(),
    marketOverview: {
      totalMarketCap: 0,
      totalVolume: 0,
      overallSentiment: 'neutral',
      priceSentimentDivergence: 'aligned'
    }
  };

  // Calculate basic market overview
  const totalMarketCap = marketData.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
  const totalVolume = marketData.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);
  analysis.marketOverview.totalMarketCap = totalMarketCap;
  analysis.marketOverview.totalVolume = totalVolume;

  // Analyze each coin with Claude AI
  for (const market of marketData) {
    const sentiment = sentimentData.find(s => s.coin === market.id || s.coin === market.symbol?.toLowerCase());
    
    if (sentiment && sentiment.success) {
      // Generate Claude AI analysis prompt
      const claudePrompt = generateClaudePrompt(market, sentiment);
      
      try {
        // Call Claude AI for analysis (you'll need to implement this)
        const claudeAnalysis = await callClaudeAI(claudePrompt);
        
        // Parse Claude's response
        const parsedAnalysis = parseClaudeResponse(claudeAnalysis);
        
        analysis.signals.push({
          coin: market.id, // Use market.id (bitcoin, ethereum, solana, taraxa) instead of market.symbol
          name: market.name,
          price: market.current_price,
          priceChange24h: market.price_change_percentage_24h,
          sentimentScore: sentiment.sentimentScore,
          totalEngagement: sentiment.totalEngagement || 0,
          postsInLast24h: sentiment.postsInLast24h || 0,
          averageEngagement: sentiment.averageEngagement || 0,
          trendingPosts: sentiment.trendingPosts || [],
          ...parsedAnalysis
        });
      } catch (error) {
        console.warn(`Failed to get Claude analysis for ${market.symbol}:`, error);
        // Fallback to basic analysis
        const fallbackAnalysis = generateFallbackAnalysis(market, sentiment);
        analysis.signals.push({
          coin: market.id, // Use market.id for consistency
          name: market.name,
          price: market.current_price,
          priceChange24h: market.price_change_percentage_24h,
          sentimentScore: sentiment.sentimentScore,
          totalEngagement: sentiment.totalEngagement || 0,
          postsInLast24h: sentiment.postsInLast24h || 0,
          averageEngagement: sentiment.averageEngagement || 0,
          trendingPosts: sentiment.trendingPosts || [],
          ...fallbackAnalysis
        });
      }
    } else {
      // For coins without sentiment data, create basic signal
      const basicAnalysis = generateBasicAnalysis(market);
      analysis.signals.push({
        coin: market.id, // Use market.id for consistency
        name: market.name,
        price: market.current_price,
        priceChange24h: market.price_change_percentage_24h,
        sentimentScore: 0.5,
        totalEngagement: 0,
        postsInLast24h: 0,
        averageEngagement: 0,
        trendingPosts: [],
        ...basicAnalysis
      });
    }
  }

  // Generate market overview summary
  const buySignals = analysis.signals.filter(s => s.signal.includes('buy')).length;
  const sellSignals = analysis.signals.filter(s => s.signal.includes('sell')).length;
  const holdSignals = analysis.signals.filter(s => s.signal === 'hold').length;
  
  if (buySignals > sellSignals * 1.5) {
    analysis.marketOverview.overallSentiment = 'bullish';
  } else if (sellSignals > buySignals * 1.5) {
    analysis.marketOverview.overallSentiment = 'bearish';
  } else {
    analysis.marketOverview.overallSentiment = 'neutral';
  }
  
  analysis.summary = `Market Analysis: ${buySignals} buy signals, ${sellSignals} sell signals, ${holdSignals} hold recommendations. Overall market sentiment is ${analysis.marketOverview.overallSentiment}. Market cap: $${(totalMarketCap / 1e9).toFixed(2)}B, 24h volume: $${(totalVolume / 1e9).toFixed(2)}B.`;

  return analysis;
}

// Generate Claude AI prompt for comprehensive analysis
function generateClaudePrompt(market: MarketData, sentiment: SentimentData): string {
  return `You are a professional cryptocurrency analyst providing clear, actionable investment insights. Analyze the following data and provide a comprehensive trading analysis.

MARKET DATA:
- Cryptocurrency: ${market.name} (${market.symbol})
- Current Price: $${market.current_price}
- 24h Change: ${market.price_change_percentage_24h}%
- Market Cap: $${(market.market_cap / 1e9).toFixed(2)}B
- 24h Volume: $${(market.total_volume / 1e9).toFixed(2)}B
- Market Rank: #${market.market_cap_rank}

SENTIMENT DATA:
- Sentiment Score: ${Math.round((sentiment.sentimentScore || 0.5) * 100)}%
- Total Engagement: ${sentiment.totalEngagement?.toLocaleString() || 0}
- Posts in Last 24h: ${sentiment.postsInLast24h || 0}
- Average Engagement: ${sentiment.averageEngagement?.toLocaleString() || 0}
- Trending Posts: ${sentiment.trendingPosts?.length || 0} posts

CRITICAL REQUIREMENTS:
1. Provide ONLY concrete, actionable data - NO placeholder values like $0
2. Use actual current price for calculations
3. Make analysis easy for retail investors to understand
4. Focus on practical trading decisions

Please provide your analysis in the following JSON format:
{
  "signal": "strong_buy|buy|hold|sell|strong_sell",
  "confidence": 0-100,
  "reasoning": "Clear, concise explanation of your recommendation in 1-2 sentences",
  "targetPrice": ${market.current_price * 1.1},
  "nearTermTarget": ${market.current_price * 1.05},
  "mediumTermTarget": ${market.current_price * 1.15},
  "priceDirection": "bullish|bearish|neutral",
  "divergence": "aligned|bullish_divergence|bearish_divergence|neutral",
  "divergenceStrength": 0-100,
  "riskLevel": "low|medium|high",
  "investorInsights": {
    "shortTerm": "24-48 hour outlook in 1-2 clear sentences",
    "mediumTerm": "1-2 week outlook in 1-2 clear sentences", 
    "keyRisks": "Top 2-3 specific risks in simple terms",
    "opportunities": "Top 2-3 specific opportunities in simple terms",
    "technicalLevels": {
      "support": ${market.current_price * 0.95},
      "resistance": ${market.current_price * 1.05},
      "keyLevel": ${market.current_price}
    }
  }
}

ANALYSIS FOCUS:
1. Price-sentiment divergence: Is sentiment aligned with price action?
2. Technical levels: Clear support/resistance based on current price
3. Risk assessment: Specific, quantifiable risks
4. Price targets: Realistic targets based on current price
5. Actionable advice: What should investors do now?

IMPORTANT: All numerical values must be calculated from the current price. Do not use $0 or placeholder values. Be specific and actionable.`;
}

// Call Claude AI using Anthropic SDK
async function callClaudeAI(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set. Please add your Claude API key to .env.local');
  }

  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error('Invalid ANTHROPIC_API_KEY format. API key should start with "sk-ant-"');
  }

  try {
    console.log('🤖 Calling Claude AI API using Anthropic SDK...');
    console.log('📝 Prompt length:', prompt.length, 'characters');
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    console.log('✅ Claude AI API call successful');
    console.log('🤖 Claude AI Response structure:', {
      hasContent: !!response.content,
      contentLength: response.content?.length || 0
    });
    
    if (response.content && response.content[0] && 'text' in response.content[0]) {
      const responseText = response.content[0].text;
      console.log('📊 Claude AI Response preview:', responseText.substring(0, 200) + '...');
      return responseText;
    } else {
      console.error('❌ Invalid Claude API response format:', response);
      throw new Error('Invalid response format from Claude API - missing text content');
    }
  } catch (error) {
    console.error('❌ Claude AI API call failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ANTHROPIC_API_KEY')) {
        throw error; // Re-throw configuration errors
      }
    }
    
    throw new Error(`Failed to get Claude AI analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Parse Claude's JSON response
function parseClaudeResponse(claudeResponse: string): ParsedClaudeResponse {
  try {
    // Extract JSON content from markdown code blocks if present
    let jsonContent = claudeResponse;
    
    // Check if response is wrapped in markdown code blocks
    if (claudeResponse.includes('```json')) {
      const jsonMatch = claudeResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        jsonContent = jsonMatch[1].trim();
        console.log('📝 Extracted JSON from markdown blocks:', jsonContent.substring(0, 200) + '...');
      }
    } else if (claudeResponse.includes('```')) {
      // Handle generic code blocks without language specification
      const codeMatch = claudeResponse.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch && codeMatch[1]) {
        jsonContent = codeMatch[1].trim();
        console.log('📝 Extracted content from generic code blocks:', jsonContent.substring(0, 200) + '...');
      }
    }
    
    const parsed = JSON.parse(jsonContent);
    return {
      signal: parsed.signal || 'hold',
      confidence: parsed.confidence || 50,
      reasoning: parsed.reasoning || 'Analysis unavailable',
      targetPrice: parsed.targetPrice || 0,
      priceDirection: parsed.priceDirection || 'neutral',
      divergence: parsed.divergence || 'neutral',
      divergenceStrength: parsed.divergenceStrength || 50,
      riskLevel: parsed.riskLevel || 'medium',
      investorInsights: parsed.investorInsights || {
        shortTerm: 'Limited data available',
        mediumTerm: 'Monitor price action',
        keyRisks: 'Data availability risk',
        opportunities: 'Wait for clearer signals',
        technicalLevels: {
          support: 0,
          resistance: 0,
          keyLevel: 0
        }
      }
    };
  } catch (error) {
    console.error('Failed to parse Claude response:', error);
    console.error('Raw response content:', claudeResponse);
    return generateFallbackAnalysis(null, null);
  }
}

// Fallback analysis when Claude fails
function generateFallbackAnalysis(market: MarketData | null, sentiment: SentimentData | null): ParsedClaudeResponse {
  const currentPrice = market?.current_price || 0;
  
  return {
    signal: 'hold',
    confidence: 40,
    reasoning: 'AI analysis temporarily unavailable. Using technical analysis based on current price levels.',
    targetPrice: currentPrice * 1.1,
    nearTermTarget: currentPrice * 1.05,
    mediumTermTarget: currentPrice * 1.15,
    priceDirection: 'neutral',
    divergence: 'neutral',
    divergenceStrength: 50,
    riskLevel: 'medium',
    investorInsights: {
      shortTerm: 'Limited analysis available. Monitor price action around current levels.',
      mediumTerm: 'Wait for AI analysis to resume for detailed outlook.',
      keyRisks: 'Analysis system temporarily unavailable. Use standard risk management.',
      opportunities: 'Current price may present entry opportunity, but verify with additional analysis.',
      technicalLevels: {
        support: currentPrice * 0.95,
        resistance: currentPrice * 1.05,
        keyLevel: currentPrice
      }
    }
  };
}

// Basic analysis for coins without sentiment data
function generateBasicAnalysis(market: MarketData): ParsedClaudeResponse {
  const priceChange = market.price_change_percentage_24h;
  const currentPrice = market.current_price;
  let signal = 'hold';
  let confidence = 40;
  let reasoning = 'No sentiment data available. Analysis based on price movement only.';
  
  if (priceChange > 5) {
    signal = 'buy';
    confidence = 60;
    reasoning = 'Strong positive momentum detected. Consider accumulation on pullbacks.';
  } else if (priceChange < -5) {
    signal = 'sell';
    confidence = 55;
    reasoning = 'Strong negative momentum. Wait for stabilization before entry.';
  }
  
  return {
    signal,
    confidence,
    reasoning,
    targetPrice: currentPrice * 1.1,
    nearTermTarget: currentPrice * 1.05,
    mediumTermTarget: currentPrice * 1.15,
    priceDirection: priceChange > 0 ? 'bullish' : priceChange < 0 ? 'bearish' : 'neutral',
    divergence: 'no_data',
    divergenceStrength: 0,
    riskLevel: 'medium',
    investorInsights: {
      shortTerm: 'Monitor price action around current levels. No sentiment data available.',
      mediumTerm: 'Price momentum suggests direction, but sentiment confirmation needed.',
      keyRisks: 'Limited data increases uncertainty. Use tight stop losses.',
      opportunities: 'Price movements may present entry/exit opportunities.',
      technicalLevels: {
        support: currentPrice * 0.95,
        resistance: currentPrice * 1.05,
        keyLevel: currentPrice
      }
    }
  };
}
