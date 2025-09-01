'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, BarChart3, Users, Activity, Clock, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';

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
  tweetSuggestions: string[];
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
  reasoning: string;
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
  tweetSuggestions?: string[];
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
  competitiveEdge?: {
    arbitrageOpportunity: string;
    arbitragePercentage: number;
    whaleRetailMismatch: string;
    hiddenLiquidity: string;
    marketMakerActivity: string;
    socialTechnicalConflict: string;
  };
  onChainMetrics?: {
    dexDominance: string;
    whaleActivity: string;
    liquidityHealth: string;
    networkActivity: string;
  };
  quantitativeInsights?: {
    volumeTrend: string;
    whaleConfidence: number;
    liquidityScore: number;
    networkGrowth: number;
    sentimentMomentum: number;
    technicalMomentum: number;
  };
  tradingStrategy?: {
    entryPrice: number;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    riskRewardRatio: string;
    positionSize: string;
  };
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
  const [selectedCrypto, setSelectedCrypto] = useState<string | null>(null);
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showTweetSuggestions, setShowTweetSuggestions] = useState(false);

  // Track viewport to adapt mobile/desktop behavior
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  // Handle escape key to close tweet suggestions modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTweetSuggestions) {
        setShowTweetSuggestions(false);
      }
    };

    if (showTweetSuggestions) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showTweetSuggestions]);

  // Scroll to top when analysis modal opens on mobile
  useEffect(() => {
    if (showAnalysisModal && isMobile) {
      const modal = document.querySelector('[data-modal="analysis"]');
      if (modal) {
        modal.scrollTop = 0;
      }
    }
  }, [showAnalysisModal, isMobile]);

  // Set default token from URL parameter only if provided
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

  // Fetch data when a token is selected
  useEffect(() => {
    if (selectedCrypto) {
      fetchData(selectedCrypto);
    }
  }, [selectedCrypto]);

  // Infinite scroll effect for trending posts carousel
  useEffect(() => {
    const carousel = document.getElementById('trending-carousel');
    if (!carousel) return;

    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      if (isScrolling) return;

      const scrollLeft = carousel.scrollLeft;
      const scrollWidth = carousel.scrollWidth;
      const clientWidth = carousel.clientWidth;

      // Only trigger loop if user has scrolled significantly
      const threshold = 50; // Increased threshold to prevent accidental triggers

      // If scrolled to the end, loop back to the beginning
      if (scrollLeft >= scrollWidth - clientWidth - threshold) {
        isScrolling = true;
        carousel.scrollLeft = 0;
        // Reset flag after animation completes
        setTimeout(() => {
          isScrolling = false;
        }, 500);
      }
      // If scrolled to the beginning, loop to the end
      else if (scrollLeft <= threshold) {
        isScrolling = true;
        carousel.scrollLeft = scrollWidth - clientWidth;
        // Reset flag after animation completes
        setTimeout(() => {
          isScrolling = false;
        }, 500);
      }
    };

    // Debounced scroll handler to prevent rapid firing
    const debouncedHandleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    };

    carousel.addEventListener('scroll', debouncedHandleScroll);

    return () => {
      carousel.removeEventListener('scroll', debouncedHandleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [sentimentData?.trendingPosts]);

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

  const fetchData = async (cryptoId: string | null) => {
    if (!cryptoId) return;

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

      // Debug logging
      console.log('🔍 Frontend Debug - API Response:', {
        success: result.success,
        marketDataCount: result.marketData?.length || 0,
        sentimentDataCount: result.sentimentData?.length || 0,
        sentimentDataDetails: result.sentimentData?.map(s => ({
          coin: s.coin,
          success: s.success,
          hasSummary: !!s.summary,
          summaryLength: s.summary?.length || 0,
          error: s.error
        })) || []
      });


      // Find the specific crypto data
      const crypto = cryptoOptions.find(c => c.id === cryptoId);
      const coinMarketData = result.marketData.find((coin: ApiMarketData) => coin.id === cryptoId);
      const coinSentimentData = result.sentimentData.find((sentiment: ApiSentimentData) => sentiment.coin === cryptoId);

      // Debug logging for data matching
      console.log('🔍 Frontend Debug - Data Matching:', {
        cryptoId,
        cryptoFound: !!crypto,
        coinMarketDataFound: !!coinMarketData,
        coinSentimentDataFound: !!coinSentimentData,
        coinSentimentData: coinSentimentData ? {
          coin: coinSentimentData.coin,
          success: coinSentimentData.success,
          hasSummary: !!coinSentimentData.summary,
          summaryLength: coinSentimentData.summary?.length || 0,
          error: coinSentimentData.error
        } : null
      });


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
        console.log('🔍 Frontend sentiment data debug:', {
          success: coinSentimentData.success,
          hasTweetSuggestions: !!coinSentimentData.tweetSuggestions,
          tweetSuggestionsCount: coinSentimentData.tweetSuggestions?.length || 0,
          tweetSuggestions: coinSentimentData.tweetSuggestions
        });

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
          tweetSuggestions: coinSentimentData.tweetSuggestions || [],
          model: coinSentimentData.model || "claude-sonnet-4-20250514",
          cacheStatus: coinSentimentData.cacheStatus || "Fresh Data"
        });

        // Debug the new state after setting it
        setTimeout(() => {
          console.log('🔍 Final sentimentData state after setState:', {
            hasTweetSuggestions: !!coinSentimentData.tweetSuggestions,
            tweetSuggestionsCount: coinSentimentData.tweetSuggestions?.length || 0,
            tweetSuggestions: coinSentimentData.tweetSuggestions
          });
        }, 100);
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
          reasoning: analysisSignal?.reasoning || 'No reasoning available',
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
            market: coinMarketData ? `Current price: ${formatPrice(coinMarketData.current_price || 0)} (${(coinMarketData.price_change_percentage_24h || 0).toFixed(2)}% 24h). Market cap rank: #${coinMarketData.market_cap_rank || 'N/A'}. Trading volume: $${((coinMarketData.total_volume || 0) / 1e9).toFixed(2)}B` : 'Market data loading...',
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

    // Split text into sections and process each one
    const sections = text.split(/(?=Overall Assessment:|Key Insights:|Market Sentiment:|Social Trends:|Risk Factors:|Opportunities:|Conclusion:)/);

    return sections.map((section, sectionIndex) => {
      if (!section.trim()) return null;

      const lines = section.split('\n').filter(line => line.trim());
      if (lines.length === 0) return null;

      // Process section header
      const header = lines[0].trim();
      const isSectionHeader = /^(Overall Assessment|Key Insights|Market Sentiment|Social Trends|Risk Factors|Opportunities|Conclusion):/.test(header);

      if (isSectionHeader) {
        // Return clean section header
        const cleanHeader = getCleanSectionHeader(header);
        return {
          text: cleanHeader,
          isBold: true,
          isSectionHeader: true,
          isListItem: false,
          key: `header-${sectionIndex}`
        };
      }

      // Process content lines
      return lines.map((line, lineIndex) => {
        if (!line.trim()) return null;

        let processedLine = line.replace(/^#{1,6}\s*/, '');
        if (!processedLine.trim()) return null;

        // Remove markdown formatting
        processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '$1');
        processedLine = processedLine.replace(/\*(.*?)\*/g, '$1');

        // Check if it's a list item
        const isListItem = /^[-•*]\s/.test(processedLine);
        const isNumberedList = /^\d+\.\s/.test(processedLine);

        return {
          text: processedLine.trim(),
          isBold: line.startsWith('#') || processedLine.includes('**'),
          isSectionHeader: false,
          isListItem: isListItem || isNumberedList,
          key: `section-${sectionIndex}-line-${lineIndex}`
        };
      }).filter(Boolean);
    }).filter(Boolean).flat();
  };

  // Helper function to get clean section headers
  const getCleanSectionHeader = (header: string): string => {
    return header.trim();
  };

  const cleanSummaryText = (text: string) => {
    if (!text) return '';
    // Return markdown text as-is without any formatting changes
    return text;
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

    // For very small prices (less than $0.01), show full precision
    if (price < 0.01) {
      return `$${price.toFixed(6).replace(/\.?0+$/, '')}`;
    }

    // For small prices (less than $1), show full precision
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
    <>
      {/* About Modal - Root Level */}
      {showAboutModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-gray-900 rounded-lg border border-gray-600/50 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-lime-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">About ZeSignal</h2>
              </div>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-gray-400 hover:text-white text-2xl font-bold px-2 py-1 rounded hover:bg-gray-800 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Demo Version Info */}
              <div className="text-center py-4 bg-lime-500/10 rounded-lg border border-lime-500/20">
                <div className="text-lime-400 text-lg font-bold mb-2">🚀 Demo Version</div>
                <div className="text-gray-300 text-sm">This is a demonstration of ZeSignal&apos;s capabilities</div>
                <div className="text-gray-400 text-xs mt-2">For daily alerts and full access, contact me directly</div>
              </div>

              {/* Builder Info */}
              <div className="space-y-4">
                <div className="text-white text-lg font-semibold flex items-center space-x-2">
                  <span>👨‍💻</span>
                  <span>Built by Lisa Bey</span>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <a href="https://t.me/lisabey" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 px-4 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.48.33-.913.49-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.178.164.174.213.408.227.573-.001.18-.022.378-.063.524z" />
                    </svg>
                    <span>Telegram</span>
                  </a>
                  <a href="https://x.com/lisabeyy" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-gray-400 hover:text-white px-4 py-2 bg-gray-500/10 rounded-lg border border-gray-500/20 hover:bg-gray-500/20 transition-all">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>X (Twitter)</span>
                  </a>
                </div>
              </div>

              {/* SocialFi Dashboard */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-white text-lg font-semibold mb-3">🔗 SocialFi Dashboard</div>
                <a href="https://zedashboard.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-lime-400 hover:text-lime-300 px-4 py-3 bg-lime-500/10 rounded-lg border border-lime-500/20 hover:bg-lime-500/20 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span className="text-lg font-medium">Visit ZeDashboard.xyz</span>
                </a>
              </div>

              {/* API Documentation */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-white text-lg font-semibold mb-3">📚 API Documentation</div>
                <div className="text-gray-300 text-sm mb-3">Integrate ZeSignal&apos;s capabilities into your own applications</div>
                <a href="https://zedashboard.xyz/api-docs" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-3 text-blue-400 hover:text-blue-300 px-4 py-3 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-lg font-medium">View API Documentation</span>
                </a>
                <div className="text-gray-400 text-xs mt-2 text-center">Access endpoints, authentication, and integration examples</div>
              </div>

              {/* Donation Section */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-white text-lg font-semibold mb-3">💝 Support the Project</div>
                <div className="text-gray-300 text-sm mb-4">Help cover AI costs by donating $TARA/Taraxa or $ETH (ERC-20)</div>
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-600/30">
                  <div className="text-xs text-gray-400 mb-2">Wallet Address:</div>
                  <div className="text-sm text-lime-300 font-mono break-all bg-gray-900 p-3 rounded border border-gray-700">
                    0xEC523839fd5Aa275115d382A996Db616A3a7465F
                  </div>
                  <div className="text-gray-500 text-xs mt-3 text-center">Copy this address to send your support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-lime-400/20">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Image src="/logo.png" alt="ZeSignal Logo" width={32} height={32} className="h-8 w-auto" />
                <div className="hidden sm:block text-sm text-gray-500 px-3 py-1 bg-gray-800/50 rounded-full">
                  AI-Powered Crypto Intelligence
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* API Documentation Button */}
                <a
                  href="https://zedashboard.xyz/api-docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all"
                >
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm text-blue-400 hidden sm:inline">API Docs</span>
                </a>

                {/* About Button */}
                <button
                  onClick={() => setShowAboutModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-600/50 transition-all"
                >
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-300 hidden sm:inline">About</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Crypto Selection - Compact & Modern */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-medium text-gray-300">Select Token</h2>
            </div>
            <div className="grid grid-cols-1 md:flex md:flex-wrap gap-2">
              {cryptoOptions.map((crypto) => (
                <button
                  key={crypto.id}
                  onClick={() => setSelectedCrypto(crypto.id)}
                  disabled={loading}
                  className={`group relative px-4 py-2.5 rounded-lg border transition-all duration-200 flex items-center space-x-2 transform hover:scale-105 ${selectedCrypto === crypto.id
                    ? 'border-lime-400 bg-lime-400/10 text-lime-300 shadow-sm'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50 text-gray-300'
                    } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className={`w-14 h-6 rounded-md flex items-center justify-center text-xs font-bold ${selectedCrypto === crypto.id ? 'bg-lime-400 text-black' : 'bg-gray-600 text-gray-300'
                    }`}>
                    {crypto.symbol}
                  </div>
                  <span className="font-medium text-sm">{crypto.name}</span>

                </button>
              ))}
            </div>
          </div>

          {!selectedCrypto ? (
            <div className="text-center py-12 animate-in fade-in duration-500">
              <div className="bg-gradient-to-r from-gray-900/60 to-gray-800/60 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300">
                {/* Hero Section */}
                <div className="mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-black" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Ready to Analyze?</h3>
                  <p className="text-gray-400 text-sm">Select a cryptocurrency to unlock comprehensive insights</p>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1">Market Data</h4>
                    <p className="text-xs text-gray-400">Real-time prices, volume & trends</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                    <div className="w-8 h-8 bg-lime-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-4 h-4 text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1">Social Sentiment</h4>
                    <p className="text-xs text-gray-400">Community mood & engagement</p>
                  </div>

                  <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-medium text-white mb-1">AI Analysis</h4>
                    <p className="text-xs text-gray-400">Smart insights & predictions</p>
                  </div>
                </div>

                {/* Developer Integration */}
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-blue-300 mb-1"> Developer Integration</h4>
                      <p className="text-xs text-blue-400/80">Integrate ZeSignal&apos;s AI-powered insights into your applications</p>
                    </div>
                    <a
                      href="https://zedashboard.xyz/api-docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 text-xs font-medium transition-all duration-200"
                    >
                      View API Docs
                    </a>
                  </div>
                </div>

                {/* CTA */}
                <div className="bg-gray-800/20 rounded-lg p-4 border border-gray-700/30">
                  <p className="text-sm text-gray-300 mb-3">💡 <strong>Pro tip:</strong> Start with Bitcoin for comprehensive market analysis</p>
                  <button
                    onClick={() => setSelectedCrypto('bitcoin')}
                    className="px-4 py-2 bg-lime-500/20 hover:bg-lime-500/30 border border-lime-400/30 rounded-lg text-lime-300 text-sm font-medium transition-all duration-200"
                  >
                    Try Bitcoin Analysis →
                  </button>
                </div>
              </div>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center max-w-md">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                    <BarChart3 className="w-8 h-8 text-black" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-lime-400 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 bg-black rounded-full animate-ping"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Analyzing {selectedCrypto?.charAt(0).toUpperCase() + selectedCrypto?.slice(1)}</h3>
                <p className="text-gray-400 text-sm mb-4">Gathering real-time market data and social sentiment</p>

                {/* Loading Steps */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-500">Connecting to CoinGecko MCP...</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-500">Fetching social sentiment data...</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse"></div>
                    <span className="text-gray-500">Generating AI analysis...</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Market Data Section - Full Width Above */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-5 md:p-6 border border-gray-700 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
                        <BarChart3 className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">Market Overview</h2>
                        <p className="text-sm text-gray-400">Real-time market data from CoinGecko MCP</p>
                      </div>
                    </div>
                    <div className="text-xs hidden md:block text-lime-300 px-3 py-2 bg-lime-500/20 rounded-full border border-lime-500/30">
                      CoinGecko MCP • Real-time Data
                    </div>
                  </div>

                  {marketData ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {/* Price Card */}
                      <div className="bg-black/40 rounded-lg p-4 border border-gray-600/50 ">
                        <div className="text-xs text-gray-400 mb-1">Current Price</div>
                        <div className="text-2xl font-bold text-white">
                          {marketData.price ? formatPrice(marketData.price) : 'N/A'}
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
              <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-xl p-5 md:p-6 border border-gray-700 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
                      <Users className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Social Sentiment Analysis</h2>
                      <p className="text-sm text-gray-400">Real-time sentiment powered by ZeDashboard MCP</p>
                    </div>
                  </div>
                  <div className="text-xs hidden md:block text-lime-300 px-3 py-2 bg-lime-500/20 rounded-full border border-lime-500/30">
                    ZeDashboard MCP • AI-Powered
                  </div>


                </div>

                {sentimentData ? (
                  <div className="space-y-8">
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
                        {sentimentData.averageEngagement > 0 && (
                          <div>
                            <div className="text-xs text-gray-500">Avg Engagement</div>
                            <div className="text-lg font-bold text-white">{formatNumber(sentimentData.averageEngagement)}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI Sentiment Analysis - Full Width */}
                    <div className="bg-black/40 rounded-lg p-4 md:p-5 border border-gray-600/50 md:border-gray-600/50">
                      <h5 className="text-base font-semibold text-gray-300 mb-4 flex items-center">
                        <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center mr-2">
                          <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                        </div>
                        AI Sentiment Analysis
                      </h5>
                      {!expandedAnalysis ? (
                        <>
                          <div className="bg-transparent md:bg-gray-800/30 rounded-lg p-3 md:p-4 border border-transparent md:border md:border-gray-600/30">
                            <div className="space-y-3">
                              {/* Show first section header if available */}
                              {(() => {
                                const sections = cleanSummaryText(sentimentData.summary);
                                const firstSection = sections[0];
                                if (firstSection && firstSection.length > 50) {
                                  return (
                                    <div className="text-base text-gray-200 leading-relaxed font-medium tracking-wide">
                                      {cleanSummaryText(firstSection.substring(0, 200)) + '...'}
                                    </div>
                                  );
                                }
                                return (
                                  <div className="markdown-content text-gray-200">
                                    <ReactMarkdown
                                      components={{
                                        h1: ({ children }) => <h1 className="text-2xl font-bold text-lime-300 mb-4">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-xl font-bold text-lime-300 mb-3">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-lg font-bold text-lime-300 mb-2">{children}</h3>,
                                        p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                                        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                        ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                                        li: ({ children }) => <li className="flex items-start"><span className="w-1.5 h-1.5 bg-lime-400 rounded-full mt-2 mr-2 flex-shrink-0"></span><span>{children}</span></li>,
                                        ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal">{children}</ol>
                                      }}
                                    >
                                      {(() => {
                                        // Smart truncation that preserves markdown structure
                                        const summary = sentimentData.summary;
                                        if (summary.length <= 300) return summary;

                                        // Find a good break point (end of sentence, paragraph, or section)
                                        let truncateAt = 300;
                                        const breakPoints = ['. ', '\n\n', '## ', '### '];

                                        for (const breakPoint of breakPoints) {
                                          const lastBreak = summary.lastIndexOf(breakPoint, 300);
                                          if (lastBreak > 200) { // Don't truncate too early
                                            truncateAt = lastBreak + (breakPoint === '. ' ? 1 : breakPoint.length);
                                            break;
                                          }
                                        }

                                        return summary.substring(0, truncateAt) + '...';
                                      })()}
                                    </ReactMarkdown>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <button
                            className="text-base hover:text-lime-300 mt-4 cursor-pointer font-medium text-lime-400 flex items-center"
                            onClick={() => (isMobile ? setShowAnalysisModal(true) : setExpandedAnalysis(true))}
                          >
                            <span>Read full analysis</span>
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="bg-transparent md:bg-gray-800/30 rounded-lg p-3 md:p-4 border border-transparent md:border md:border-gray-600/30 mb-4">
                            <div className="markdown-content text-gray-200">
                              <ReactMarkdown
                                components={{
                                  h1: ({ children }) => <h1 className="text-2xl font-bold text-lime-300 mb-4">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-xl font-bold text-lime-300 mb-3">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-lg font-bold text-lime-300 mb-2">{children}</h3>,
                                  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                  ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                                  li: ({ children }) => <li className="flex items-start"><span className="w-1.5 h-1.5 bg-lime-400 rounded-full mt-2 mr-2 flex-shrink-0"></span><span>{children}</span></li>,
                                  ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal">{children}</ol>
                                }}
                              >
                                {sentimentData.summary}
                              </ReactMarkdown>
                            </div>
                          </div>
                          <button
                            className="text-base hover:text-lime-300 cursor-pointer font-medium text-lime-400 flex items-center"
                            onClick={() => setExpandedAnalysis(false)}
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span>Show less</span>
                          </button>
                        </>
                      )}
                    </div>

                    {/* Mobile Fullscreen Modal for AI Analysis */}
                    {showAnalysisModal && isMobile && (
                      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
                        <div className="relative w-full max-h-screen overflow-y-auto" data-modal="analysis">
                          <div className="sticky top-0 z-10 bg-black/80 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center">
                                <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                              </div>
                              <span className="text-white font-medium">AI Sentiment Analysis</span>
                            </div>
                            <button
                              onClick={() => setShowAnalysisModal(false)}
                              className="text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded border border-gray-700 hover:border-gray-600"
                            >
                              Close
                            </button>
                          </div>

                          <div className="px-4 py-4">
                            <div className="rounded-lg">
                              <div className="markdown-content text-gray-200">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ children }) => <h1 className="text-2xl font-bold text-lime-300 mb-4">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-xl font-bold text-lime-300 mb-3">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-lg font-bold text-lime-300 mb-2">{children}</h3>,
                                    p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                                    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                    ul: ({ children }) => <ul className="mb-3 ml-4 space-y-1">{children}</ul>,
                                    li: ({ children }) => <li className="flex items-start"><span className="w-1.5 h-1.5 bg-lime-400 rounded-full mt-2 mr-2 flex-shrink-0"></span><span>{children}</span></li>,
                                    ol: ({ children }) => <ol className="mb-3 ml-4 space-y-1 list-decimal">{children}</ol>
                                  }}
                                >
                                  {sentimentData.summary}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}



                    {/* Tweet Suggestions Button - Full Width Below Everything */}
                    {(() => {
                      console.log('🔍 Tweet suggestions render check:', {
                        hasSentimentData: !!sentimentData,
                        hasTweetSuggestions: !!sentimentData?.tweetSuggestions,
                        isArray: Array.isArray(sentimentData?.tweetSuggestions),
                        length: sentimentData?.tweetSuggestions?.length || 0,
                        tweetSuggestions: sentimentData?.tweetSuggestions
                      });
                      return sentimentData && sentimentData.tweetSuggestions && Array.isArray(sentimentData.tweetSuggestions) && sentimentData.tweetSuggestions.length > 0;
                    })() && (
                        <div className="bg-black/40 rounded-lg p-3 md:p-4 border border-gray-600/50">
                          <button
                            onClick={() => setShowTweetSuggestions(true)}
                            className="w-full flex items-center justify-between p-3 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 hover:border-blue-500/50 transition-all duration-200 group"
                          >
                            <div className="flex items-center">
                              <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              </div>
                              <div className="text-left">
                                <h5 className="text-sm font-semibold text-gray-300 group-hover:text-blue-300 transition-colors">
                                  Tweet Suggestions
                                </h5>
                                <p className="text-xs text-gray-400 group-hover:text-blue-400 transition-colors">
                                  {sentimentData.tweetSuggestions.length} AI-generated tweet ideas
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-blue-400 font-medium">View</span>
                              <svg className="w-4 h-4 text-blue-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        </div>
                      )}

                    {/* Trending Posts - Full Width Below Everything */}
                    {sentimentData && sentimentData.trendingPosts && Array.isArray(sentimentData.trendingPosts) && sentimentData.trendingPosts.length > 0 && (
                      <div className="bg-black/40 rounded-lg p-3 md:p-4 border border-gray-600/50">
                        <h5 className="text-sm font-semibold text-gray-300 mb-3 flex items-center">
                          <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center mr-2">
                            <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                          </div>
                          Trending Posts
                        </h5>
                        <div className="relative">
                          {/* Carousel Container with Infinite Loop */}
                          <div className="flex space-x-4 overflow-x-auto scrollbar-hide pb-2" id="trending-carousel">
                            {/* First set of posts */}
                            {sentimentData.trendingPosts.slice(0, 6).map((post, index) => (
                              <div key={`first-${index}`} className="flex-shrink-0 w-80 bg-gray-800/50 rounded-lg p-2 md:p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all flex flex-col">
                                {/* Creator Info */}
                                {post.creator && (
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                      {post.creator.avatar ? (
                                        <Image
                                          src={post.creator.avatar}
                                          alt={post.creator.displayName || post.creator.name}
                                          width={40}
                                          height={40}
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
                            ))}

                            {/* Duplicate posts for infinite loop effect */}
                            {sentimentData.trendingPosts.slice(0, 6).map((post, index) => (
                              <div key={`duplicate-${index}`} className="flex-shrink-0 w-80 bg-gray-800/50 rounded-lg p-2 md:p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all flex flex-col">
                                {/* Creator Info */}
                                {post.creator && (
                                  <div className="flex items-center space-x-3 mb-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                                      {post.creator.avatar ? (
                                        <Image
                                          src={post.creator.avatar}
                                          alt={post.creator.displayName || post.creator.name}
                                          width={40}
                                          height={40}
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
                            ))}
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
              <div className="flex items-center mb-8">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-green-500 rounded-lg flex items-center justify-center mr-3">
                    <BarChart3 className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Enhanced AI Analysis</h3>
                    <p className="text-sm text-gray-400">Real-time insights powered by Claude AI</p>
                  </div>
                </div>
                <div className="ml-auto text-xs text-gray-300 px-3 py-2 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded-full border border-purple-500/20">
                  AI-Powered
                </div>
              </div>

              {/* AI Reasoning - Top Section */}
              <div className="bg-gradient-to-r from-lime-500/10 to-green-500/10 rounded-lg p-5 border border-lime-500/20 mb-6">
                <h5 className="text-base font-semibold text-lime-400 mb-3 flex items-center">
                  <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                    <BarChart3 className="w-4 h-4 text-lime-400" />
                  </div>
                  AI Analysis Reasoning
                </h5>
                <p className="text-base text-gray-200 leading-relaxed font-medium tracking-wide">
                  {analysis.reasoning}
                </p>
              </div>

              {/* Key Metrics Overview - Top Row */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
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
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-8">
                <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                  <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  </div>
                  Price Targets
                </h5>
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
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-8">
                <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                  <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  </div>
                  Technical Levels
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
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
              <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50 mb-8">
                <h5 className="text-base font-semibold text-gray-300 mb-4 flex items-center">
                  <div className="w-5 h-5 bg-lime-500/20 rounded-full flex items-center justify-center mr-2">
                    <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  </div>
                  Price-Sentiment Divergence
                </h5>

                {/* Compact Divergence Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                <div className="w-full hidden p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="text-xs text-blue-300 leading-relaxed">
                    <strong>Divergence:</strong> Price and sentiment moving in opposite directions often signal trend reversals.
                    Bullish divergence (price down, sentiment up) suggests oversold bounce potential.
                    Bearish divergence (price up, sentiment down) suggests overbought pullback potential.
                  </div>
                </div>
              </div>

              {/* Investor Insights - Fifth Row */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                  <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                    <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                      <Clock className="w-4 h-4 text-lime-400" />
                    </div>
                    Short Term Outlook (24-48h)
                  </h5>
                  <div className="text-base text-gray-300 leading-relaxed font-medium tracking-wide max-w-none">
                    {analysis.investorInsights.shortTerm}
                  </div>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                  <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                    <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                      <Calendar className="w-4 h-4 text-lime-400" />
                    </div>
                    Medium Term Outlook (1-2 weeks)
                  </h5>
                  <div className="text-base text-gray-300 leading-relaxed font-medium tracking-wide max-w-none">
                    {analysis.investorInsights.mediumTerm}
                  </div>
                </div>
              </div>

              {/* Risks & Opportunities - Sixth Row */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                  <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                    <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                      <AlertTriangle className="w-4 h-4 text-lime-400" />
                    </div>
                    Key Risks
                  </h5>
                  <div className="text-base text-gray-300 leading-relaxed font-medium tracking-wide max-w-none">
                    {fixSentenceSpacing(analysis.investorInsights.keyRisks)}
                  </div>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-gray-700/50">
                  <h5 className="text-base font-semibold text-gray-300 mb-3 flex items-center">
                    <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                      <TrendingUp className="w-4 h-4 text-lime-400" />
                    </div>
                    Opportunities
                  </h5>
                  <div className="text-base text-gray-300 leading-relaxed font-medium tracking-wide max-w-none">
                    {analysis.investorInsights.opportunities}
                  </div>
                </div>
              </div>

              {/* AI Recommendation - Final Row */}
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-lime-400/30 transition-all duration-300">
                <h4 className="font-semibold mb-3 flex items-center" style={{ color: '#D0FF80' }}>
                  <div className="w-6 h-6 bg-lime-500/20 rounded-full flex items-center justify-center mr-3">
                    <AlertTriangle className="w-4 h-4 text-lime-400" />
                  </div>
                  AI Trading Recommendation:
                </h4>
                <p className="text-gray-200 leading-relaxed text-base font-medium tracking-wide">{analysis.recommendation}</p>
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
                <span><a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer">Claude AI</a></span>
              </div>
            </div>
            <p>Real-time sentiment and market analysis • Cached for 4 hours</p>

          </div>
        </div>
      </div>

      {/* Tweet Suggestions Modal */}
      {showTweetSuggestions && sentimentData?.tweetSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-600">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center mr-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                </div>
                <h3 className="text-lg font-semibold text-white">Tweet Suggestions</h3>
              </div>
              <button
                onClick={() => setShowTweetSuggestions(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {sentimentData.tweetSuggestions.map((suggestion, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-sm font-bold text-blue-400">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-200 text-sm leading-relaxed font-medium mb-3">
                          {suggestion}
                        </p>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(suggestion);
                              setToastMessage('Tweet suggestion copied to clipboard!');
                              setTimeout(() => setToastMessage(null), 3000);
                            }}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 rounded-md transition-all text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Copy</span>
                          </button>
                          <button
                            onClick={() => {
                              const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(suggestion)}`;
                              window.open(twitterUrl, '_blank');
                            }}
                            className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-md transition-all text-sm font-medium"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span>Tweet</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  AI-generated suggestions based on current market sentiment
                </p>
                <button
                  onClick={() => setShowTweetSuggestions(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
          {toastMessage}
        </div>
      )}
    </>
  );
}
