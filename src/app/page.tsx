'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, DollarSign, RefreshCw, Activity, Clock, Calendar } from 'lucide-react';

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
  content: string;
  engagement: number;
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
  };
}

interface AnalysisData {
  divergence: string;
  signal: string;
  confidence: number;
  sentimentScore: number;
  sentimentTrend: string;
  socialVolume: number;
  recommendation: string;
  targetPrice: number;
  nearTermTarget?: number;
  mediumTermTarget?: number;
  priceDirection: string;
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

// API response interfaces
interface ApiMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  total_volume: number;
  market_cap: number;
  market_cap_rank: number;
}

interface ApiSentimentData {
  coin: string;
  success: boolean;
  sentimentScore?: number;
  postsCount?: number;
  summary?: string;
  dataSource?: string;
  totalEngagement?: number;
  postsInLast24h?: number;
  averageEngagement?: number;
  topEngagement?: number;
  trendingPosts?: TrendingPost[];
  model?: string;
  cacheStatus?: string;
  error?: string;
}

interface ApiAnalysisSignal {
  coin: string;
  divergence?: string;
  signal?: string;
  confidence?: number;
  reasoning?: string;
  targetPrice?: number;
  priceDirection?: string;
  divergenceStrength?: number;
  riskLevel?: string;
  investorInsights?: {
    shortTerm?: string;
    mediumTerm?: string;
    keyRisks?: string;
    opportunities?: string;
    technicalLevels?: {
      support?: number;
      resistance?: number;
      keyLevel?: number;
    };
  };
}

interface ApiResponse {
  success: boolean;
  marketData: ApiMarketData[];
  sentimentData: ApiSentimentData[];
  analysis?: {
    signals: ApiAnalysisSignal[];
  };
  error?: string;
}

export default function Home() {
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState(false);

  // Set default token from URL parameter or default to bitcoin
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      const validToken = cryptoOptions.find(crypto =>
        crypto.id === tokenParam.toLowerCase() ||
        crypto.symbol.toLowerCase() === tokenParam.toLowerCase()
      );
      if (validToken) {
        setSelectedCrypto(validToken.id);
      }
    }
  }, []);

  // Helper function to fix sentence spacing in AI-generated text
  const fixSentenceSpacing = (text: string): string => {
    if (!text) return '';

    try {
      let result = text;

      // Add space after periods that are followed by capital letters
      result = result.replace(/\.([A-Z])/g, '. $1');

      // Add period + space between any word ending and capital letter (sentence breaks)
      // This catches cases like "potentialSocial" -> "potential. Social"
      result = result.replace(/([a-zA-Z])([A-Z])/g, '$1. $2');

      // Normalize multiple spaces to single spaces
      result = result.replace(/\s+/g, ' ');

      return result.trim();
    } catch (error) {
      console.warn('Error fixing sentence spacing:', error);
      return text; // Return original text if there's an error
    }
  };

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

    // Update URL with selected token
    const url = new URL(window.location.href);
    url.searchParams.set('token', cryptoId);
    window.history.replaceState({}, '', url);

    // Clear existing data to force refresh
    setSentimentData(null);
    setMarketData(null);
    setAnalysis(null);

    try {

      // Call the analysis API which connects to both MCPs
      const apiUrl = `/api/analysis?token=${cryptoId}`;

      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch data');
      }


      // Find the specific crypto data
      const crypto = cryptoOptions.find(c => c.id === cryptoId);
      const coinMarketData = result.marketData.find((coin: ApiMarketData) => coin.id === cryptoId);
      const coinSentimentData = result.sentimentData.find((sentiment: ApiSentimentData) => sentiment.coin === cryptoId);


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
          trend: getSentimentTrend(coinSentimentData.sentimentScore || 0.5),
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
        // Find the analysis signal using multiple matching strategies
        const analysisSignal = result.analysis.signals.find((s: ApiAnalysisSignal) =>
          s.coin === crypto?.symbol || // Try exact symbol match (BTC, ETH, SOL, TARA)
          s.coin === crypto?.id || // Try ID match (bitcoin, ethereum, solana, taraxa)
          s.coin === cryptoId || // Try the selected crypto ID
          s.coin?.toLowerCase() === cryptoId?.toLowerCase() // Try case-insensitive match
        );




        setAnalysis({
          divergence: analysisSignal?.divergence || 'neutral',
          signal: analysisSignal?.signal || 'neutral',
          confidence: analysisSignal?.confidence || 50,
          sentimentScore: coinSentimentData?.sentimentScore || 0.5,
          sentimentTrend: getSentimentTrend(coinSentimentData?.sentimentScore || 0.5),
          socialVolume: coinSentimentData?.postsCount || 0,
          recommendation: analysisSignal?.reasoning || 'No recommendation available',
          targetPrice: analysisSignal?.targetPrice || 0,
          priceDirection: analysisSignal?.priceDirection || 'neutral',
          divergenceStrength: analysisSignal?.divergenceStrength || 0,
          riskLevel: analysisSignal?.riskLevel || 'medium',
          investorInsights: {
            shortTerm: analysisSignal?.investorInsights?.shortTerm || 'Limited data available',
            mediumTerm: analysisSignal?.investorInsights?.mediumTerm || 'Monitor price action',
            keyRisks: analysisSignal?.investorInsights?.keyRisks || 'Data availability risk',
            opportunities: analysisSignal?.investorInsights?.opportunities || 'Wait for sentiment data',
            technicalLevels: {
              support: analysisSignal?.investorInsights?.technicalLevels?.support || (coinMarketData?.current_price || 0) * 0.95,
              resistance: analysisSignal?.investorInsights?.technicalLevels?.resistance || (coinMarketData?.current_price || 0) * 1.05,
              keyLevel: analysisSignal?.investorInsights?.technicalLevels?.keyLevel || coinMarketData?.current_price || 0
            }
          },
          analysis: {
            social: coinSentimentData?.summary?.substring(0, 200) + '...' || 'Social sentiment data processing...',
            market: coinMarketData ? `Current price: $${(coinMarketData.current_price || 0).toLocaleString()} (${(coinMarketData.price_change_percentage_24h || 0).toFixed(2)}% 24h). Market cap rank: #${coinMarketData.market_cap_rank || 'N/A'}. Trading volume: $${((coinMarketData.total_volume || 0) / 1e9).toFixed(2)}B` : 'Market data loading...',
            signal: analysisSignal?.signal || 'neutral',
            divergence: analysisSignal?.divergence || 'neutral'
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

  const formatPrice = (price: number): string => {
    if (price === 0) return '$0';
    if (!price || isNaN(price)) return '$0';

    // For very small prices (less than $0.01), show more decimal places
    if (price < 0.01) {
      return `$${price.toFixed(6).replace(/\.?0+$/, '')}`;
    }

    // For small prices (less than $1), show up to 4 decimal places
    if (price < 1) {
      return `$${price.toFixed(4).replace(/\.?0+$/, '')}`;
    }

    // For regular prices, show up to 2 decimal places
    const formatted = price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });

    // Remove trailing .00 if the price is a whole number
    return formatted.replace(/\.00$/, '');
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

        {/* Crypto Selection */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-300 mb-3">Pick a token</h2>
        </div>
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
              <div className="w-16 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center text-white font-bold text-sm bg-gray-700">
                ${crypto.symbol}
              </div>
              <div className="font-semibold text-base">{crypto.name}</div>
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
          <>
            {/* Market Data Section - Full Width Above */}
            <div className="mb-8">
              <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <BarChart3 className="w-7 h-7 mr-3" style={{ color: '#D0FF80' }} />
                    <h2 className="text-2xl font-bold">Market Overview</h2>
                  </div>
                  <div className="text-xs text-gray-400 px-3 py-2 bg-blue-500/20 rounded-full border border-blue-500/30">
                    CoinGecko MCP • Real-time Data
                  </div>
                </div>

                {marketData ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {/* Price Card */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-xs text-gray-400 mb-1">Current Price</div>
                      <div className="text-2xl font-bold text-white">
                        ${marketData.price?.toLocaleString() || 'N/A'}
                      </div>
                    </div>

                    {/* 24h Change Card */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-xs text-gray-400 mb-1">24h Change</div>
                      <div className={`text-xl font-bold flex items-center ${(marketData.change24h || 0) >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
                        {(marketData.change24h || 0) >= 0 ? <TrendingUp className="w-5 h-5 mr-2" /> : <TrendingDown className="w-5 h-5 mr-2" />}
                        {marketData.change24h?.toFixed(2) || '0.00'}%
                      </div>
                    </div>

                    {/* Volume Card */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-xs text-gray-400 mb-1">24h Volume</div>
                      <div className="text-xl font-bold text-white">
                        ${formatNumber(marketData.volume)}
                      </div>
                    </div>

                    {/* Market Cap Card */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-xs text-gray-400 mb-1">Market Cap</div>
                      <div className="text-xl font-bold text-white">
                        ${formatNumber(marketData.marketCap)}
                      </div>
                    </div>

                    {/* Rank Card */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-xs text-gray-400 mb-1">Market Rank</div>
                      <div className="text-xl font-bold" style={{ color: '#D0FF80' }}>
                        #{marketData.marketCapRank || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-12">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Market data loading...</p>
                    <p className="text-sm text-gray-600">Connecting to CoinGecko MCP</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Sentiment Section - Full Width Below */}
            <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="w-7 h-7 mr-3" style={{ color: '#D0FF80' }} />
                  <h2 className="text-2xl font-bold">Social Sentiment Analysis</h2>
                </div>
                <div className="text-xs text-gray-400 px-3 py-2 bg-lime-500/20 rounded-full border border-lime-500/30">
                  ZeDashboard MCP • AI-Powered
                </div>
              </div>

              {sentimentData ? (
                <div className="space-y-6">
                  {/* Left Column - Sentiment Metrics */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Sentiment Score */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-sm text-gray-400 mb-2">Sentiment Score</div>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="w-full h-3 bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-lime-400 rounded-full transition-all duration-500"
                              style={{ width: `${sentimentData.score * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-white">{Math.round(sentimentData.score * 100)}%</span>
                      </div>
                    </div>

                    {/* Overall Sentiment */}
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <div className="text-sm text-gray-400 mb-2">Overall Sentiment</div>
                      <div className="text-xl font-bold text-lime-400">
                        {sentimentData.score > 0.7 ? 'BULLISH' :
                          sentimentData.score < 0.4 ? 'BEARISH' :
                            sentimentData.score > 0.6 ? 'MIXED BULLISH' : 'NEUTRAL'}
                      </div>
                    </div>
                  </div>

                  {/* Engagement Metrics - Full Width */}
                  <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                    <div className="text-sm text-gray-400 mb-3">Engagement Metrics</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-gray-500">Total Engagement</div>
                        <div className="text-lg font-bold text-white">{formatNumber(sentimentData.totalEngagement)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Posts (24h)</div>
                        <div className="text-lg font-bold text-white">{formatNumber(sentimentData.postsInLast24h)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Avg Engagement</div>
                        <div className="text-lg font-bold text-white">{formatNumber(sentimentData.averageEngagement)}</div>
                      </div>
                    </div>
                  </div>

                  {/* AI Sentiment Analysis - Full Width */}
                  <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                    <h5 className="text-base font-semibold text-gray-400 mb-4">AI SENTIMENT ANALYSIS</h5>
                    {!expandedAnalysis ? (
                      <>
                        <p className="text-base text-gray-300 leading-relaxed">
                          {cleanSummaryText(sentimentData.summary).substring(0, 300)}...
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
                        <div className="max-h-64 overflow-y-auto">
                          {formatSentimentText(cleanSummaryText(sentimentData.summary)).map((line) => (
                            <div key={line?.key} className={`mb-4 ${line?.isBold ? 'font-bold text-white text-lg' : 'text-gray-300 text-base'} leading-relaxed`}>
                              {line?.text}
                            </div>
                          ))}
                        </div>
                        <button
                          className="text-base hover:text-lime-300 mt-4 cursor-pointer font-medium"
                          style={{ color: '#D0FF80' }}
                          onClick={() => setExpandedAnalysis(false)}
                        >
                          ← Show less
                        </button>
                      </>
                    )}
                  </div>



                  {/* Trending Posts - Full Width Below Everything */}
                  {sentimentData && sentimentData.trendingPosts && Array.isArray(sentimentData.trendingPosts) && sentimentData.trendingPosts.length > 0 && (
                    <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50">
                      <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                        <span>TRENDING POSTS</span>
                        <svg className="w-4 h-4 ml-2 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                      </h5>
                      <div className="relative">
                        {/* Carousel Container */}
                        <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2">
                          {sentimentData.trendingPosts.slice(0, 6).map((post, index) => {

                            return (
                              <div key={index} className="flex-shrink-0 w-80 bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all flex flex-col">
                                {/* Creator Info */}
                                {post.creator && (
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                      {post.creator.avatar ? (
                                        <img
                                          src={post.creator.avatar}
                                          alt={post.creator.displayName || post.creator.name}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.style.display = 'none';
                                            const fallback = target.nextElementSibling as HTMLElement;
                                            if (fallback) {
                                              fallback.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      ) : null}
                                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm" style={{ display: post.creator.avatar ? 'none' : 'flex' }}>
                                        {(post.creator.displayName || post.creator.name).charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-semibold text-white truncate">
                                        {post.creator.displayName || post.creator.name}
                                      </div>
                                      <div className="text-xs text-gray-400 truncate">
                                        @{post.creator.name}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex-1">
                                  <div className="text-sm font-medium text-white mb-2 whitespace-pre-line">
                                    {post.content.trim().slice(0, 100) || post.title || 'No content available'} {post.content.trim().length > 100 && '...'}
                                  </div>
                                </div>

                                <div className="flex justify-between items-center mt-auto pt-3">

                                  <span className="text-lime-400 font-medium text-sm">{formatNumber(post.engagement)} Views</span>

                                  <div className="flex items-center space-x-2">
                                    {post.url && (
                                      <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-full flex items-center space-x-1 text-xs text-gray-300 hover:text-white transition-colors">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                        <span>View on X</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Carousel Navigation Dots */}
                        {
                          sentimentData.trendingPosts.length > 3 && (
                            <div className="flex justify-center space-x-2 mt-4">
                              {Array.from({ length: Math.ceil(sentimentData.trendingPosts.length / 3) }, (_, i) => (
                                <div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-gray-600 hover:bg-gray-500 transition-colors cursor-pointer"
                                  title={`Page ${i + 1}`}
                                ></div>
                              ))}
                            </div>
                          )
                        }

                        {/* Scroll Hint */}
                        <div className="text-xs text-gray-500 text-center mt-2">
                          ← Scroll to see more trending posts →
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Social sentiment data loading...</p>
                  <p className="text-sm text-gray-600">Connecting to ZeDashboard MCP</p>
                </div>
              )}
            </div>
          </>
        )}

        {analysis && (
          <div className="mt-8 bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-lime-400/30">
            <div className="flex items-center mb-6">
              <BarChart3 className="w-6 h-6 mr-2" style={{ color: '#D0FF80' }} />
              <h3 className="text-xl font-semibold">ENHANCED AI ANALYSIS</h3>
              <div className="ml-auto text-xs text-gray-500 px-2 py-1 bg-purple-500/20 rounded">
                AI-Powered
              </div>
            </div>

            {/* Key Metrics Overview - Top Row */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 text-center">
                <div className="text-sm text-gray-400 mb-1">Confidence</div>
                <div className="text-lg font-bold" style={{ color: '#D0FF80' }}>{analysis.confidence}%</div>
                <div className="text-xs text-gray-600 mt-1">Signal Strength</div>
              </div>

              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 text-center">
                <div className="text-sm text-gray-400 mb-1">Signal</div>
                <div className={`flex items-center justify-center font-semibold ${getSignalColor(analysis.signal)}`}>
                  {getSignalIcon(analysis.signal)}
                  <span className="ml-2 capitalize text-lg">{analysis.signal.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">Trading Direction</div>
              </div>



              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 text-center">
                <div className="text-sm text-gray-400 mb-1">Risk Level</div>
                <div className={`px-2 py-1 rounded-full text-lg font-medium mx-auto inline-block ${analysis.riskLevel === 'low' ? 'bg-green-500/20 text-green-400' :
                  analysis.riskLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    analysis.riskLevel === 'high' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                  }`}>
                  {analysis.riskLevel.toUpperCase()}
                </div>
                <div className="text-xs text-gray-600 mt-1">Risk Assessment</div>
              </div>

              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 text-center">
                <div className="text-sm text-gray-400 mb-1">Price Direction</div>
                <div className={`font-semibold capitalize text-lg ${analysis.priceDirection === 'bullish' ? 'text-lime-400' :
                  analysis.priceDirection === 'bearish' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                  {analysis.priceDirection}
                </div>
                <div className="text-xs text-gray-600 mt-1">Trend Analysis</div>
              </div>
            </div>



            {/* Simple Target Price Overview */}
            <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-6">
              <h5 className="text-sm font-semibold text-gray-400 mb-3">Price Targets</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg p-3 border border-blue-500/30">
                  <div className="text-xs text-blue-400 mb-1">Near-term Target</div>
                  <div className="text-lg font-bold text-blue-300">
                    {marketData ? `$${formatPrice(marketData.price * 1.05)}` : 'N/A'}
                  </div>
                  <div className="text-sm text-blue-400">+5% upside</div>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-green-600/20 rounded-lg p-3 border border-green-500/30">
                  <div className="text-xs text-green-400 mb-1">Medium-term Target</div>
                  <div className="text-lg font-bold text-green-300">
                    {marketData ? `$${formatPrice(marketData.price * 1.15)}` : 'N/A'}
                  </div>
                  <div className="text-sm text-green-400">+15% upside</div>
                </div>
              </div>
            </div>





            {/* Simple Technical Levels */}
            <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-6">
              <h5 className="text-sm font-semibold text-gray-400 mb-3">Technical Levels</h5>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Support</div>
                  <div className="text-lg font-bold text-red-400">
                    {marketData ? `$${formatPrice(marketData.price * 0.95)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Current</div>
                  <div className="text-lg font-bold text-white">
                    {marketData ? `$${formatPrice(marketData.price)}` : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Resistance</div>
                  <div className="text-lg font-bold text-lime-400">
                    {marketData ? `$${formatPrice(marketData.price * 1.05)}` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Price-Sentiment Divergence Analysis */}
            <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-6">
              <h5 className="text-sm font-semibold text-gray-400 mb-4">Price-Sentiment Divergence</h5>

              {/* Compact Divergence Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30 text-center">
                  <div className="text-sm text-gray-400 mb-2">Divergence Type</div>
                  <div className={`font-semibold capitalize text-lg ${analysis.divergence.includes('aligned') ? 'text-lime-400' :
                    analysis.divergence.includes('divergence') ? 'text-orange-400' :
                      'text-gray-400'
                    }`}>
                    {analysis.divergence.replace('_', ' ')}
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30 text-center">
                  <div className="text-sm text-gray-400 mb-2">Price Direction</div>
                  <div className={`font-semibold capitalize text-lg ${analysis.priceDirection === 'bullish' ? 'text-lime-400' :
                    analysis.priceDirection === 'bearish' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                    {analysis.priceDirection}
                  </div>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30 text-center">
                  <div className="text-sm text-gray-400 mb-2">Strength</div>
                  <div className="font-semibold text-white text-lg">{analysis.divergenceStrength}%</div>
                </div>
              </div>

              {/* Compact Divergence Explanation */}
              <div className="w-full p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-xs text-blue-300 leading-relaxed">
                  <strong>Divergence:</strong> Price and sentiment moving in opposite directions often signal trend reversals.
                  Bullish divergence (price down, sentiment up) suggests oversold bounce potential.
                  Bearish divergence (price up, sentiment down) suggests overbought pullback potential.
                </div>
              </div>
            </div>

            {/* Investor Insights - Fifth Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-400" />
                  Short Term Outlook (24-48h)
                </h5>
                <div className="text-base text-gray-300 leading-relaxed">{analysis.investorInsights.shortTerm}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-green-400" />
                  Medium Term Outlook (1-2 weeks)
                </h5>
                <div className="text-base text-gray-300 leading-relaxed">{analysis.investorInsights.mediumTerm}</div>
              </div>
            </div>

            {/* Risks & Opportunities - Sixth Row */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-2 text-orange-400" />
                  Key Risks
                </h5>
                <div className="text-base text-gray-300 leading-relaxed">{fixSentenceSpacing(analysis.investorInsights.keyRisks)}</div>
              </div>
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-lime-400" />
                  Opportunities
                </h5>
                <div className="text-base text-gray-300 leading-relaxed">{fixSentenceSpacing(analysis.investorInsights.opportunities)}</div>
              </div>
            </div>

            {/* AI Recommendation - Final Row */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-4 border border-gray-600/50">
              <h4 className="font-semibold mb-3 flex items-center" style={{ color: '#D0FF80' }}>
                <AlertTriangle className="w-4 h-4 mr-2" />
                AI Trading Recommendation:
              </h4>
              <p className="text-gray-200 leading-relaxed text-base">{analysis.recommendation}</p>
            </div>
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
              <span><a href="https://www.zedashboard.xyz" target="_blank" rel="noopener noreferrer">ZeDashboard MCP</a></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span><a href="https://www.coingecko.com" target="_blank" rel="noopener noreferrer">CoinGecko MCP</a></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>AI Analysis</span>
            </div>
          </div>
          <p>Real-time sentiment and market analysis • Updated every refresh</p>

        </div>
      </div>
    </div >
  );
}
