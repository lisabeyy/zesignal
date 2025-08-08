'use client';

import { useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import AnimatedBackground from '@/components/AnimatedBackground';

interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
}


interface SelectedToken {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  category?: string;
}

interface ComparisonToken {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  projected_price: number;
  multiplier: number;
  ratio: number;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [selectedToken, setSelectedToken] = useState<SelectedToken | null>(null);
  const [comparisonTokens, setComparisonTokens] = useState<ComparisonToken[]>([]);
  const [comparingLoading, setComparingLoading] = useState(false);
  const [mcpStatus, setMcpStatus] = useState<'idle' | 'connecting' | 'connected' | 'searching'>('idle');
  const [isSearching, setIsSearching] = useState(false);


  const searchCoins = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setMcpStatus('idle');
      return;
    }

    setIsSearching(true);
    setMcpStatus('connecting');
    
    // Clear search input and reset all states (like "Search New Token" button)
    setSearchQuery('');
    setSelectedToken(null);
    setComparisonTokens([]);
    setComparingLoading(false);
    
    try {
      // Show connecting status briefly
      await new Promise(resolve => setTimeout(resolve, 500));
      setMcpStatus('connected');
      
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      const results = data.results || [];
      
      // Sort by market cap (highest first, undefined at end)
      const sortedResults = results.sort((a: CoinSearchResult, b: CoinSearchResult) => {
        if (a.market_cap && b.market_cap) {
          return b.market_cap - a.market_cap;
        }
        if (a.market_cap && !b.market_cap) return -1;
        if (!a.market_cap && b.market_cap) return 1;
        return 0;
      });
      
      setSearchResults(sortedResults);
      setMcpStatus('idle');
    } catch (error) {
      console.error('Error searching coins:', error);
      setSearchResults([]);
      setMcpStatus('idle');
    } finally {
      setIsSearching(false);
    }
  };

  const selectToken = async (coinId: string) => {
    // Clear search results and show MCP status
    setSearchResults([]);
    setMcpStatus('connecting');
    setComparingLoading(true);
    
    try {
      // Show connecting status briefly
      await new Promise(resolve => setTimeout(resolve, 300));
      setMcpStatus('connected');
      
      // Show searching status for main token data
      setMcpStatus('searching');
      
      // Get detailed data for selected token
      const response = await fetch(`/api/coins?ids=${coinId}`);
      const data = await response.json();
      const tokenData = data.results?.[0];
      
      if (tokenData) {
        setSelectedToken({
          id: tokenData.id,
          name: tokenData.name,
          symbol: tokenData.symbol,
          current_price: tokenData.current_price,
          market_cap: tokenData.market_cap,
          market_cap_rank: tokenData.market_cap_rank,
        });

        // Clear MCP status before finding similar tokens
        setMcpStatus('idle');
        
        // Find similar tokens and calculate comparisons (silently in background)
        await findSimilarTokensAndCompare(tokenData);
      }
    } catch (error) {
      console.error('Error selecting token:', error);
    } finally {
      setComparingLoading(false);
      setMcpStatus('idle');
    }
  };

  const findSimilarTokensAndCompare = async (selectedTokenData: SelectedToken) => {
    try {
      // Use category-based approach to find similar projects
      const categoryResponse = await fetch('/api/similar-by-category', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coinId: selectedTokenData.id,
          marketCap: selectedTokenData.market_cap
        })
      });

      const categoryData = await categoryResponse.json();
      
      if (!categoryData.success || !categoryData.results) {
        console.error('Failed to get similar projects by category');
        setComparisonTokens([]);
        return;
      }

      const similarTokens = categoryData.results;

      // Create comparisons with the category-based results
      const comparisons = similarTokens
        .filter((token: SelectedToken) => token.id !== selectedTokenData.id)
        .slice(0, 3)
        .map((token: SelectedToken) => {
          const multiplier = token.market_cap / selectedTokenData.market_cap;
          const projectedPrice = selectedTokenData.current_price * multiplier;
          const ratio = selectedTokenData.market_cap / token.market_cap;
          
          return {
            id: token.id,
            name: token.name,
            symbol: token.symbol,
            current_price: token.current_price,
            market_cap: token.market_cap,
            market_cap_rank: token.market_cap_rank,
            projected_price: projectedPrice,
            multiplier: multiplier,
            ratio: ratio
          };
        });

      setComparisonTokens(comparisons);
      
      if (comparisons.length === 0) {
        console.log('No similar tokens found in same categories with higher market cap');
      }
    } catch (error) {
      console.error('Error finding similar tokens by category:', error);
      setComparisonTokens([]);
    }
  };

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchCoins(searchQuery);
    }
  };

  const resetSelection = () => {
    setSelectedToken(null);
    setComparisonTokens([]);
    setSearchResults([]);
    setMcpStatus('idle');
    setIsSearching(false);
  };

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 8,
        maximumFractionDigits: 8,
      }).format(price);
    } else if (price < 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 6,
      }).format(price);
    } else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(price);
    }
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen relative p-4">
      <AnimatedBackground />
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
              GeckoCap
            </h1>
          </div>
          <p className="text-xl text-gray-600">MarketCap Comparator</p>
        </div>
        
        {/* Search Section */}
        <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-1">Search Cryptocurrencies</h2>
          <p className="text-sm text-gray-600 mb-4">Search a token and compare its market cap with similar projects to see potential price gains</p>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={isSearching ? "Searching..." : "e.g. Bitcoin, Ethereum, Chainlink..."}
                value={searchQuery}
                onChange={handleSearchInput}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isSearching ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
              {isSearching && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
            <button
              onClick={() => searchCoins(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isSearching || !searchQuery.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Searching...
                </div>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>

        {/* MCP Connection Status */}
        {mcpStatus === 'connecting' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 mb-6 animate-fade-in">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div className="text-lg font-medium text-gray-900">Connecting to CoinGecko MCP</div>
              <div className="text-gray-500 mt-1">Establishing secure connection...</div>
            </div>
          </div>
        )}
        
        {mcpStatus === 'connected' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 mb-6 animate-fade-in">
            <div className="text-center py-4">
              <div className="text-green-600 text-lg font-medium">✓ Connected to CoinGecko MCP</div>
            </div>
          </div>
        )}
        
        {/* Search Results Cards */}
        {searchResults.length > 0 && mcpStatus === 'idle' && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 mb-6 animate-fade-in">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Search Results</h3>
              {searchResults.map((coin, index) => (
                <button
                  key={coin.id}
                  onClick={() => selectToken(coin.id)}
                  className="w-full text-left p-3 border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50/80 backdrop-blur-sm transition-all duration-200 animate-slide-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center mb-1">
                        <h4 className="font-semibold text-gray-900">{coin.name}</h4>
                        <span className="text-gray-500 ml-2 text-sm">({coin.symbol})</span>
                        {coin.market_cap_rank && (
                          <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded ml-2">#{coin.market_cap_rank}</span>
                        )}
                      </div>
                      {coin.current_price && coin.market_cap && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">{formatPrice(coin.current_price)}</span>
                          <span className="mx-2">•</span>
                          <span>{formatMarketCap(coin.market_cap)}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}


        {/* Selected Token Display */}
        {selectedToken && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 mb-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Selected Token</h2>
              <button
                onClick={resetSelection}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors text-sm"
              >
                Search New Token
              </button>
            </div>
            <div className="bg-blue-50 rounded p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-blue-900">{selectedToken.name}</h3>
                  <p className="text-blue-700 text-sm">({selectedToken.symbol})</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-900">
                    {formatPrice(selectedToken.current_price)}
                  </div>
                  <div className="text-sm text-blue-700">
                    Rank #{selectedToken.market_cap_rank} • {formatMarketCap(selectedToken.market_cap)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {comparingLoading && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 mb-6 text-center">
            <div className="animate-pulse">
              <div className="text-lg font-medium mb-2">Analyzing token and finding comparisons...</div>
              <div className="text-gray-500">Please wait while we fetch similar tokens and calculate projections.</div>
            </div>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonTokens.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-4 animate-fade-in">
            <h2 className="text-xl font-semibold mb-4">Market Cap Comparisons</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {comparisonTokens.map((token, index) => (
                <div key={token.id} className="border rounded p-3 animate-slide-in" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="mb-3">
                    <h3 className="font-semibold text-sm">{selectedToken?.symbol} → {token.symbol} Market Cap</h3>
                    <p className="text-xs text-gray-600">{selectedToken?.name} vs {token.name}</p>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span>Current:</span>
                      <span className="font-bold">{formatPrice(selectedToken?.current_price || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Projected:</span>
                      <span className="font-bold text-green-600">{formatPrice(token.projected_price)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gain:</span>
                      <span className="font-bold text-green-600">{token.multiplier.toFixed(2)}x</span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <div className="text-xs text-gray-600 mb-1">
                      {selectedToken?.symbol} is {(token.ratio * 100).toFixed(1)}% of {token.symbol}&apos;s cap
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(token.ratio * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-600">
                    <div>{token.name} #{token.market_cap_rank}</div>
                    <div>{formatMarketCap(token.market_cap)} • {formatPrice(token.current_price)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="max-w-5xl mx-auto relative z-10 p-4">
        <footer className="bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 p-6 mt-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span className="text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent">
                GeckoCap
              </span>
            </div>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 text-left rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Investment Disclaimer:</strong> This tool is for educational purposes only and should not be considered financial advice.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-600 space-y-4 md:space-y-0">
              <div>
                <p>&copy; 2025 GeckoCap. Powered by CoinGecko MCP Server.</p>
              </div>
              <div className="flex space-x-6">
                <span>Market Cap Comparator</span>
                <span>•</span>
                <span>Educational Tool</span>
                <span>•</span>
                <span>Not Financial Advice</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
