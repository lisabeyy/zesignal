'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, DollarSign, RefreshCw, Activity } from 'lucide-react';

interface MarketData {
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  marketCapRank: number;
  symbol: string;
  name: string;
}

interface SentimentData {
  score: number;
  volume: number;
  trend: string;
  summary: string;
  postsAnalyzed: number;
  dataSource: string;
  // New fields for enhanced response
  totalEngagement: number;
  postsInLast24h: number;
  averageEngagement: number;
  topEngagement: number;
  trendingPosts: TrendingPost[];
  model: string;
  cacheStatus: string;
}

interface TrendingPost {
  title: string;
  engagement: number;
  content: string;
  platform: string;
  date: string;
  url: string;
  id: string;
}

interface AnalysisData {
  divergence: string;
  signal: string;
  confidence: number;
  sentimentScore: number;
  sentimentTrend: string;
  socialVolume: number;
  recommendation: string;
  analysis: {
    social: string;
    market: string;
    signal: string;
    divergence: string;
  };
}

interface CryptoOption {
  id: string;
  name: string;
  symbol: string;
  color: string;
  sentimentKey: string;
}

export default function Home() {
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState(false);

  const cryptoOptions: CryptoOption[] = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: 'from-orange-400 to-orange-600', sentimentKey: 'bitcoin' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: 'from-blue-400 to-blue-600', sentimentKey: 'ethereum' },
    { id: 'solana', name: 'Solana', symbol: 'SOL', color: 'from-purple-400 to-purple-600', sentimentKey: 'solana' },
    { id: 'taraxa', name: 'Taraxa', symbol: 'TARA', color: 'from-lime-400 to-lime-600', sentimentKey: 'taraxa' }
  ];

  const fetchData = async (cryptoId: string) => {
    setLoading(true);
    setError(null);
    setExpandedAnalysis(false);

    // Clear existing data to force refresh
    setSentimentData(null);
    setMarketData(null);
    setAnalysis(null);

    try {
      console.log('🎯 Fetching data for:', cryptoId);

      // Call the analysis API which connects to both MCPs
      const apiUrl = `/api/analysis?token=${cryptoId}`;
      console.log('📡 Calling API:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      console.log('Analysis API result:', result);

      // Find the specific crypto data
      const crypto = cryptoOptions.find(c => c.id === cryptoId);
      const coinMarketData = result.marketData.find((coin: any) => coin.id === cryptoId);
      const coinSentimentData = result.sentimentData.find((sentiment: any) => sentiment.coin === cryptoId);

      console.log('🔍 Found data:', {
        cryptoId,
        coinMarketData: coinMarketData ? 'Found' : 'Not found',
        coinSentimentData: coinSentimentData ? 'Found' : 'Not found',
        sentimentDataLength: result.sentimentData?.length || 0
      });

      if (coinSentimentData) {
        console.log('📊 Sentiment data details:', {
          success: coinSentimentData.success,
          topic: coinSentimentData.topic,
          postsCount: coinSentimentData.postsCount,
          sentimentScore: coinSentimentData.sentimentScore,
          totalEngagement: coinSentimentData.totalEngagement,
          trendingPostsCount: coinSentimentData.trendingPosts?.length || 0
        });

        // Log the full sentiment data object
        console.log('🔍 Full sentiment data object:', coinSentimentData);
      }

      if (coinMarketData) {
        setMarketData({
          price: coinMarketData.current_price,
          change24h: coinMarketData.price_change_percentage_24h,
          volume: coinMarketData.total_volume,
          marketCap: coinMarketData.market_cap,
          marketCapRank: coinMarketData.market_cap_rank,
          symbol: coinMarketData.symbol,
          name: coinMarketData.name
        });
      }

      if (coinSentimentData && coinSentimentData.success) {
        setSentimentData({
          score: coinSentimentData.sentimentScore || 0.5,
          volume: coinSentimentData.postsCount || 0,
          trend: getSentimentTrend(coinSentimentData.sentimentScore),
          summary: coinSentimentData.summary || 'No sentiment summary available',
          postsAnalyzed: coinSentimentData.postsCount || 0,
          dataSource: coinSentimentData.dataSource || "LunarCrush Social Sentiment",
          totalEngagement: coinSentimentData.totalEngagement || 0,
          postsInLast24h: coinSentimentData.postsInLast24h || 0,
          averageEngagement: coinSentimentData.averageEngagement || 0,
          topEngagement: coinSentimentData.topEngagement || 0,
          trendingPosts: coinSentimentData.trendingPosts || [],
          model: coinSentimentData.model || "claude-sonnet-4-20250514",
          cacheStatus: coinSentimentData.cacheStatus || "Fresh Data"
        });
      } else if (coinSentimentData && !coinSentimentData.success) {
        // Show error message for failed sentiment fetch
        setError(`Sentiment analysis failed for ${cryptoId}: ${coinSentimentData.error || 'Unknown error'}`);
        setSentimentData(null);
      } else {
        // No sentiment data available
        setSentimentData(null);
      }

      // Set the AI analysis
      if (result.analysis) {
        setAnalysis({
          divergence: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.signal || 'neutral',
          signal: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.signal || 'neutral',
          confidence: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.confidence || 50,
          sentimentScore: coinSentimentData?.sentimentScore || 0.5,
          sentimentTrend: getSentimentTrend(coinSentimentData?.sentimentScore),
          socialVolume: coinSentimentData?.postsCount || 0,
          recommendation: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.reasoning || 'No recommendation available',
          analysis: {
            social: coinSentimentData?.summary?.substring(0, 200) + '...' || 'Social sentiment data processing...',
            market: coinMarketData ? `Current price: $${coinMarketData.current_price?.toLocaleString()} (${coinMarketData.price_change_percentage_24h?.toFixed(2)}% 24h). Market cap rank: #${coinMarketData.market_cap_rank}. Trading volume: $${(coinMarketData.total_volume / 1e9).toFixed(2)}B` : 'Market data loading...',
            signal: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.signal || 'neutral',
            divergence: result.analysis.signals.find((s: any) => s.coin === crypto?.symbol)?.signal || 'neutral'
          }
        });
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSentimentTrend = (score: number): string => {
    if (score > 0.7) return 'bullish';
    if (score < 0.4) return 'bearish';
    if (score > 0.6) return 'mixed bullish';
    return 'neutral';
  };

  const formatSentimentText = (text: string) => {
    if (!text) return [];

    return text.split('\n').map((line, index) => {
      if (!line.trim()) return null;

      let processedLine = line.replace(/^#{1,6}\s*/, '');
      if (!processedLine.trim()) return null;

      const isBold = line.startsWith('#') || processedLine.includes('**');
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '$1');
      processedLine = processedLine.replace(/\*(.*?)\*/g, '$1');

      return {
        text: processedLine.trim(),
        isBold: isBold,
        key: index
      };
    }).filter(Boolean);
  };

  const cleanSummaryText = (text: string) => {
    if (!text) return '';
    // Remove markdown headers and clean up the text
    return text
      .replace(/^#{1,6}\s*.*$/gm, '') // Remove header lines
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
      .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
      .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
      .trim();
  };

  useEffect(() => {
    fetchData(selectedCrypto);
  }, [selectedCrypto]);

  const getSignalColor = (signal: string): string => {
    switch (signal) {
      case 'strong_buy':
      case 'buy':
        return 'text-lime-400';
      case 'strong_sell':
      case 'sell':
        return 'text-red-400';
      case 'hold':
        return 'text-blue-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'strong_buy':
      case 'buy':
        return <TrendingUp className="w-5 h-5" />;
      case 'strong_sell':
      case 'sell':
        return <TrendingDown className="w-5 h-5" />;
      case 'hold':
        return <Activity className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const getDivergenceColor = (divergence: string): string => {
    switch (divergence) {
      case 'strong': return 'text-red-400';
      case 'aligned': return 'text-lime-400';
      case 'building': return 'text-orange-400';
      case 'weak': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num?.toFixed(0) || '0';
  };



  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-lime-400/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/logo.svg" alt="ZeSignal Logo" className="h-8 w-auto" />
              <div className="hidden sm:block text-sm text-gray-500 px-3 py-1 bg-gray-800/50 rounded-full">
                AI-Powered Crypto Intelligence
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => fetchData(selectedCrypto)}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-lime-500/20 hover:bg-lime-500/30 rounded-lg border border-lime-500/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#D0FF80' }} />
                <span className="text-sm hidden sm:inline" style={{ color: '#D0FF80' }}>Refresh</span>
              </button>
              <div className="text-sm text-gray-400 hidden md:block">
                Live Sentiment × Market Data
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cryptoOptions.map((crypto) => (
            <button
              key={crypto.id}
              onClick={() => setSelectedCrypto(crypto.id)}
              disabled={loading}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${selectedCrypto === crypto.id
                ? 'border-lime-400 bg-lime-400/10 shadow-lg shadow-lime-400/25'
                : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm bg-gray-700">
                {crypto.symbol}
              </div>
              <div className="font-semibold text-base">{crypto.name}</div>
              <div className="text-sm text-gray-400">${crypto.symbol}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Analyzing real-time data...</p>
              <p className="text-xs text-gray-600 mt-2">Connecting to ZeDashboard & CoinGecko MCPs</p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 mr-2" style={{ color: '#D0FF80' }} />
                  <h3 className="text-xl font-semibold">Market Data</h3>
                </div>
                <div className="text-xs text-gray-400 px-2 py-1 bg-blue-500/20 rounded">CoinGecko MCP</div>
              </div>

              {marketData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Price</span>
                    <span className="text-2xl font-bold text-white">
                      ${marketData.price?.toLocaleString() || 'N/A'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">24h Change</span>
                    <span className={`font-semibold flex items-center ${(marketData.change24h || 0) >= 0 ? 'text-lime-400' : 'text-red-400'
                      }`}>
                      {(marketData.change24h || 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                      {marketData.change24h?.toFixed(2) || '0.00'}%
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Volume</span>
                    <span className="font-semibold">
                      ${formatNumber(marketData.volume)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Market Cap</span>
                    <span className="font-semibold">
                      ${formatNumber(marketData.marketCap)}
                    </span>
                  </div>

                  {marketData.marketCapRank && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Rank</span>
                      <span className="font-semibold" style={{ color: '#D0FF80' }}>#{marketData.marketCapRank}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No market data available</p>
                </div>
              )}
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-2" style={{ color: '#D0FF80' }} />
                  <h3 className="text-xl font-semibold">Social Sentiment (Twitter)</h3>
                </div>
                <div className="text-xs text-gray-400 px-2 py-1 bg-lime-500/20 rounded">LunarCrush MCP</div>
              </div>

              {sentimentData ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Sentiment Score</span>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-600 rounded-full mr-3">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-lime-400 rounded-full transition-all duration-500"
                          style={{ width: `${sentimentData.score * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold">{Math.round(sentimentData.score * 100)}%</span>
                    </div>
                  </div>

                  {/* Sentiment Summary */}
                  {sentimentData.summary && (
                    <div className="mt-3 p-2 bg-gray-800/30 rounded border border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Overall Sentiment</div>
                      <div className="text-sm font-semibold text-lime-400">
                        {sentimentData.score > 0.7 ? 'BULLISH' :
                          sentimentData.score < 0.4 ? 'BEARISH' :
                            sentimentData.score > 0.6 ? 'MIXED BULLISH' : 'NEUTRAL'}
                      </div>
                    </div>
                  )}

                  {sentimentData.volume > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Social Volume</span>
                      <span className="font-semibold">{formatNumber(sentimentData.volume)} posts</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Trend</span>
                    <span className={`font-semibold capitalize px-3 py-1 rounded-full text-sm ${sentimentData.trend === 'bullish' ? 'bg-lime-400/20 text-lime-400' :
                      sentimentData.trend === 'bearish' ? 'bg-red-400/20 text-red-400' :
                        sentimentData.trend === 'mixed bullish' ? 'bg-orange-400/20 text-orange-400' :
                          'bg-yellow-400/20 text-yellow-400'
                      }`}>
                      {sentimentData.trend}
                    </span>
                  </div>

                  {sentimentData.summary && (
                    <div className="mt-4 p-3 bg-black/50 rounded-lg border border-gray-800">
                      <h5 className="text-xs font-semibold text-gray-400 mb-2">AI SENTIMENT ANALYSIS</h5>

                      {!expandedAnalysis ? (
                        <>
                          <p className="text-base text-gray-300 leading-relaxed">
                            {cleanSummaryText(sentimentData.summary).substring(0, 400)}...
                          </p>
                          <button
                            className="text-base hover:text-lime-300 mt-4 cursor-pointer font-medium"
                            style={{ color: '#D0FF80' }}
                            onClick={() => setExpandedAnalysis(true)}
                          >
                            View full analysis →
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="max-h-96 overflow-y-auto max-w-4xl">
                            {formatSentimentText(cleanSummaryText(sentimentData.summary)).map((line) => (
                              <div key={line?.key} className={`mb-4 ${line?.isBold ? 'font-bold text-white text-lg' : 'text-gray-300 text-base'} leading-relaxed`}>
                                {line?.text}
                              </div>
                            ))}
                          </div>
                          <button
                            className="text-base hover:text-lime-300 mt-5 cursor-pointer font-medium"
                            style={{ color: '#D0FF80' }}
                            onClick={() => setExpandedAnalysis(false)}
                          >
                            ← Show less
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Enhanced Metrics Section */}
                  {(sentimentData.totalEngagement > 0 || sentimentData.postsInLast24h > 0) && (
                    <div className="mt-4 p-3 bg-black/50 rounded-lg border border-gray-800">
                      <h5 className="text-xs font-semibold text-gray-400 mb-3">ENGAGEMENT METRICS</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {sentimentData.totalEngagement > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Total Engagement:</span>
                            <span className="font-semibold text-lime-400">{formatNumber(sentimentData.totalEngagement)}</span>
                          </div>
                        )}
                        {sentimentData.postsInLast24h > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Posts (24h):</span>
                            <span className="font-semibold">{sentimentData.postsInLast24h}</span>
                          </div>
                        )}
                        {sentimentData.averageEngagement > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Avg Engagement:</span>
                            <span className="font-semibold">{formatNumber(sentimentData.averageEngagement)}</span>
                          </div>
                        )}
                        {sentimentData.topEngagement > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Top Engagement:</span>
                            <span className="font-semibold text-orange-400">{formatNumber(sentimentData.topEngagement)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Trending Posts Section */}
                  {sentimentData.trendingPosts && sentimentData.trendingPosts.length > 0 && (
                    <div className="mt-4 p-3 bg-black/50 rounded-lg border border-gray-800">
                      <h5 className="text-xs font-semibold text-gray-400 mb-3">🚀 TRENDING POSTS</h5>
                      <div className="space-y-3">
                        {sentimentData.trendingPosts.slice(0, 3).map((post, index) => (
                          <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
                            <div className="flex justify-between items-start mb-2">
                              <h6 className="font-semibold text-sm text-white leading-tight flex-1 mr-3">
                                {post.title.length > 100 ? `${post.title.substring(0, 100)}...` : post.title}
                              </h6>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-lime-400 font-medium">
                                  {formatNumber(post.engagement)} engagement
                                </span>
                                {post.url && (
                                  <a
                                    href={post.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                    title="View on X (Twitter)"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-500">
                              <div className="flex items-center space-x-2">
                                {post.platform && (
                                  <span className="px-2 py-1 bg-gray-700/50 rounded flex items-center space-x-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                    <span>{post.platform}</span>
                                  </span>
                                )}
                                {post.date && (
                                  <span>{new Date(post.date).toLocaleDateString()}</span>
                                )}
                              </div>
                              {post.url && (
                                <span className="text-blue-400 text-xs">Click X icon to view</span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500 text-center italic">
                          Showing top {Math.min(sentimentData.trendingPosts.length, 3)} trending posts
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Data Source Info */}
                  <div className="mt-4 p-2 bg-gray-800/30 rounded border border-gray-700">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Model: {sentimentData.model}</span>
                      <span className={`px-2 py-1 rounded text-xs ${sentimentData.cacheStatus === 'Fresh Data'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                        {sentimentData.cacheStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sentiment data available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {analysis && (
          <div className="mt-8 bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-lime-400/30">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 mr-2" style={{ color: '#D0FF80' }} />
              <h3 className="text-xl font-semibold">AI Trading Analysis</h3>
              <div className="ml-auto text-xs text-gray-500 px-2 py-1 bg-purple-500/20 rounded">
                AI-Powered
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Confidence</div>
                <div className="text-2xl font-bold" style={{ color: '#D0FF80' }}>{analysis.confidence}%</div>
                <div className="text-xs text-gray-600 mt-1">Signal Strength</div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Signal</div>
                <div className={`flex items-center justify-center font-semibold ${getSignalColor(analysis.signal)}`}>
                  {getSignalIcon(analysis.signal)}
                  <span className="ml-2 capitalize text-sm">{analysis.signal.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Trading Direction</div>
              </div>

              <div className="text-center">
                <div className="text-sm text-gray-400 mb-1">Sentiment</div>
                <div className="text-xl font-semibold capitalize text-lime-400">
                  {analysis.sentimentTrend}
                </div>
                <div className="text-xs text-gray-600 mt-1">Social Sentiment</div>
              </div>
            </div>

            {/* Enhanced Metrics Display */}
            {sentimentData && (sentimentData.totalEngagement > 0 || sentimentData.postsInLast24h > 0) && (
              <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-black/30 rounded-lg border border-gray-700">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Total Engagement</div>
                  <div className="text-lg font-bold text-lime-400">{formatNumber(sentimentData.totalEngagement)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Posts (24h)</div>
                  <div className="text-lg font-bold text-blue-400">{sentimentData.postsInLast24h}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Avg Engagement</div>
                  <div className="text-lg font-bold text-orange-400">{formatNumber(sentimentData.averageEngagement)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Top Engagement</div>
                  <div className="text-lg font-bold text-purple-400">{formatNumber(sentimentData.topEngagement)}</div>
                </div>
              </div>
            )}

            <div className="bg-black/50 rounded-lg p-5 border border-gray-800 mb-6">
              <h4 className="font-semibold mb-3 flex items-center" style={{ color: '#D0FF80' }}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Trading Recommendation:
              </h4>
              <p className="text-gray-200 leading-relaxed text-sm">{analysis.recommendation}</p>
            </div>

            {analysis.analysis && (
              <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
                <h5 className="font-semibold text-blue-400 mb-2 flex items-center">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Market Analysis Summary
                </h5>
                <p className="text-gray-300 text-sm leading-relaxed">{analysis.analysis.market}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-100">
              <p className="font-semibold mb-1">Investment Disclaimer:</p>
              <p>This analysis is for informational purposes only and not financial advice. Cryptocurrency investments carry high risk. Always conduct your own research and consider your risk tolerance before making investment decisions.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-gray-500 text-sm space-y-2">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#D0FF80' }}></div>
              <span>LunarCrush MCP</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>CoinGecko MCP</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>AI Analysis</span>
            </div>
          </div>
          <p>Real-time sentiment and market analysis • Updated every refresh</p>
        </div>
      </div>
    </div>
  );
}
