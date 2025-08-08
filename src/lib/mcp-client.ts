import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  market_cap?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
}

export interface CoinData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

interface CoinMarketData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
}

class MCPClient {
  private client: Client | null = null;
  private transport: SSEClientTransport | null = null;

  private logRequest(toolName: string, args: Record<string, unknown>, startTime: number, endTime: number, success: boolean, error?: Error) {
    const duration = endTime - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      toolName,
      arguments: args,
      duration: `${duration}ms`,
      success,
      error: error ? error.message : undefined
    };
    
    console.log('[MCP Request]', JSON.stringify(logData, null, 2));
  }

  async connect(): Promise<void> {
    if (this.client) return;

    try {
      // Close any existing connections first
      if (this.transport) {
        await this.disconnect();
      }
      
      this.transport = new SSEClientTransport(new URL('https://mcp.api.coingecko.com/sse'));
      this.client = new Client({
        name: 'gecko-mcp-client',
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await this.client.connect(this.transport);
      console.log('Connected to CoinGecko MCP server');
    } catch (error) {
      console.error('Failed to connect to MCP server:', error);
      this.client = null;
      this.transport = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  async searchCoins(query: string): Promise<CoinSearchResult[]> {
    if (!this.client) {
      await this.connect();
    }
    
    // Ensure we have a valid connection
    if (!this.client) {
      console.error('MCP client connection failed');
      return [];
    }

    const startTime = Date.now();
    const searchArguments = { query, include_platform: false, status: 'active' };

    try {
      // Try searching by symbol first (for tokens like COMP, MKR)
      let symbolResults = [];
      try {
        const symbolResponse = await this.client!.callTool({
          name: 'get_coins_markets',
          arguments: {
            vs_currency: 'usd',
            symbols: query.toLowerCase(),
            include_tokens: 'all',
            order: 'market_cap_desc',
            per_page: 10,
            page: 1,
            sparkline: false
          }
        });

        if (symbolResponse.content && Array.isArray(symbolResponse.content) && symbolResponse.content.length > 0) {
          const symbolData = JSON.parse(symbolResponse.content[0].text || '[]');
          symbolResults = symbolData.map((coin: any) => ({
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol.toUpperCase(),
            current_price: coin.current_price,
            market_cap: coin.market_cap,
            market_cap_rank: coin.market_cap_rank
          }));
        }
      } catch (symbolError) {
        console.log('Symbol search failed, continuing with name search');
      }

      // If symbol search found results, return them
      if (symbolResults.length > 0) {
        console.log(`[MCP Search] Query: "${query}" completed via symbol search in ${Date.now() - startTime}ms, found ${symbolResults.length} results`);
        return symbolResults;
      }

      // Fall back to name search using the full list method
      let response;
      try {
        response = await this.client!.callTool({
          name: 'get_coins_list',
          arguments: {
            include_platform: false,
            status: 'active'
          }
        });
      } catch (connectionError) {
        console.log('Connection lost, attempting to reconnect...');
        await this.disconnect();
        await this.connect();
        response = await this.client!.callTool({
          name: 'get_coins_list',
          arguments: {
            include_platform: false,
            status: 'active'
          }
        });
      }

      const listEndTime = Date.now();
      this.logRequest('get_coins_list', { include_platform: false, status: 'active' }, startTime, listEndTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return [];
      }

      const coins = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
      
      // Filter coins based on query with better matching
      const filteredCoins = coins.filter((coin: { name: string; symbol: string; id: string }) => {
        const queryLower = query.toLowerCase();
        const nameLower = coin.name.toLowerCase();
        const symbolLower = coin.symbol.toLowerCase();
        const idLower = coin.id.toLowerCase();
        
        // Exact matches get priority
        return nameLower === queryLower || 
               symbolLower === queryLower || 
               idLower === queryLower ||
               // Then partial matches
               nameLower.includes(queryLower) ||
               symbolLower.includes(queryLower) ||
               idLower.includes(queryLower);
      });

      // Sort filtered results to prioritize exact matches and main tokens
      filteredCoins.sort((a: any, b: any) => {
        const queryLower = query.toLowerCase();
        
        // Exact name match first
        if (a.name.toLowerCase() === queryLower && b.name.toLowerCase() !== queryLower) return -1;
        if (b.name.toLowerCase() === queryLower && a.name.toLowerCase() !== queryLower) return 1;
        
        // Exact symbol match second
        if (a.symbol.toLowerCase() === queryLower && b.symbol.toLowerCase() !== queryLower) return -1;
        if (b.symbol.toLowerCase() === queryLower && a.symbol.toLowerCase() !== queryLower) return 1;
        
        // Prefer tokens without hyphens or extra words (main tokens)
        const aSimple = !a.id.includes('-') && !a.name.includes(' ');
        const bSimple = !b.id.includes('-') && !b.name.includes(' ');
        if (aSimple && !bSimple) return -1;
        if (bSimple && !aSimple) return 1;
        
        return 0;
      });

      // Take top 20 filtered results and get their market data
      const topCoins = filteredCoins.slice(0, 20);
      const coinIds = topCoins.map((coin: { id: string }) => coin.id);
      
      if (coinIds.length === 0) {
        return [];
      }
      
      // Get market data for these coins
      const marketStartTime = Date.now();
      const marketArguments = {
        ids: coinIds.join(','),
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 20,
        page: 1,
        sparkline: false
      };
      
      const marketResponse = await this.client!.callTool({
        name: 'get_coins_markets',
        arguments: marketArguments
      });

      const marketEndTime = Date.now();
      this.logRequest('get_coins_markets', marketArguments, marketStartTime, marketEndTime, true);

      const marketData = marketResponse.content && Array.isArray(marketResponse.content) && marketResponse.content.length > 0
        ? JSON.parse(marketResponse.content[0].text || '[]')
        : [];

      // Merge the data
      const results = topCoins.map((coin: { id: string; name: string; symbol: string }) => {
        const marketInfo = marketData.find((m: { id: string; current_price?: number; market_cap?: number; market_cap_rank?: number }) => m.id === coin.id);
        return {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol.toUpperCase(),
          current_price: marketInfo?.current_price,
          market_cap: marketInfo?.market_cap,
          market_cap_rank: marketInfo?.market_cap_rank
        };
      });

      const finalEndTime = Date.now();
      console.log(`[MCP Search] Query: "${query}" completed in ${finalEndTime - startTime}ms, found ${results.length} results`);

      return results.slice(0, 10);
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('searchCoins', searchArguments, startTime, errorEndTime, false, error as Error);
      console.error('Error searching coins:', error);
      return [];
    }
  }

  async getCoinData(coinIds: string[], vsCurrency: string = 'usd'): Promise<CoinData[]> {
    if (!this.client) {
      await this.connect();
    }

    const startTime = Date.now();
    const arguments_obj = {
      ids: coinIds.join(','),
      vs_currency: vsCurrency,
      order: 'market_cap_desc',
      per_page: coinIds.length,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h'
    };

    try {
      const response = await this.client!.callTool({
        name: 'get_coins_markets',
        arguments: arguments_obj
      });

      const endTime = Date.now();
      this.logRequest('get_coins_markets', arguments_obj, startTime, endTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return [];
      }

      const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
      
      return data.map((coin: CoinMarketData) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        fully_diluted_valuation: coin.fully_diluted_valuation,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_24h: coin.price_change_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap_change_24h: coin.market_cap_change_24h,
        market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
        circulating_supply: coin.circulating_supply,
        total_supply: coin.total_supply,
        max_supply: coin.max_supply,
        ath: coin.ath,
        ath_change_percentage: coin.ath_change_percentage,
        ath_date: coin.ath_date,
        atl: coin.atl,
        atl_change_percentage: coin.atl_change_percentage,
        atl_date: coin.atl_date,
        last_updated: coin.last_updated
      }));
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('get_coins_markets', arguments_obj, startTime, errorEndTime, false, error as Error);
      console.error('Error fetching coin data:', error);
      return [];
    }
  }


  async getCoinsByCategory(category: string): Promise<CoinData[]> {
    if (!this.client) {
      await this.connect();
    }

    const startTime = Date.now();
    const arguments_obj = {
      vs_currency: 'usd',
      category: category,
      order: 'market_cap_desc',
      per_page: 10,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h'
    };

    try {
      const response = await this.client!.callTool({
        name: 'get_coins_markets',
        arguments: arguments_obj
      });

      const endTime = Date.now();
      this.logRequest('get_coins_markets', arguments_obj, startTime, endTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return [];
      }

      const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
      
      return data.map((coin: CoinMarketData) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        fully_diluted_valuation: coin.fully_diluted_valuation,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_24h: coin.price_change_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap_change_24h: coin.market_cap_change_24h,
        market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
        circulating_supply: coin.circulating_supply,
        total_supply: coin.total_supply,
        max_supply: coin.max_supply,
        ath: coin.ath,
        ath_change_percentage: coin.ath_change_percentage,
        ath_date: coin.ath_date,
        atl: coin.atl,
        atl_change_percentage: coin.atl_change_percentage,
        atl_date: coin.atl_date,
        last_updated: coin.last_updated
      }));
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('get_coins_markets', arguments_obj, startTime, errorEndTime, false, error as Error);
      console.error('Error fetching coins by category:', error);
      return [];
    }
  }

  async getCoinDetails(coinId: string): Promise<{ categories?: string[] } | null> {
    if (!this.client) {
      await this.connect();
    }

    const startTime = Date.now();
    const arguments_obj = {
      id: coinId,
      community_data: false,
      developer_data: false,
      localization: false,
      market_data: false,
      sparkline: false,
      tickers: false
    };

    try {
      const response = await this.client!.callTool({
        name: 'get_id_coins',
        arguments: arguments_obj
      });

      const endTime = Date.now();
      this.logRequest('get_id_coins', arguments_obj, startTime, endTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return null;
      }

      const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : null;
      return {
        categories: data?.categories || []
      };
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('get_id_coins', arguments_obj, startTime, errorEndTime, false, error as Error);
      console.error('Error fetching coin details:', error);
      return null;
    }
  }

  async findSimilarCoinsByCategory(coinId: string, currentMarketCap: number): Promise<CoinData[]> {
    try {
      // First get the coin's categories
      const coinDetails = await this.getCoinDetails(coinId);
      if (!coinDetails?.categories || coinDetails.categories.length === 0) {
        console.log(`No categories found for ${coinId}`);
        return [];
      }

      console.log(`Found categories for ${coinId}:`, coinDetails.categories);
      console.log(`Using first 3 categories:`, coinDetails.categories.slice(0, 3));

      // Map category display names to actual IDs used by the API
      const categoryNameToId: { [key: string]: string } = {
        "Decentralized Finance (DeFi)": "decentralized-finance-defi",
        "Yield Farming": "yield-farming",
        "BNB Chain Ecosystem": "binance-smart-chain",
        "Lending/Borrowing Protocols": "lending-borrowing",
        "Avalanche Ecosystem": "avalanche-ecosystem",
        "Polygon Ecosystem": "polygon-ecosystem", 
        "Near Protocol Ecosystem": "near-protocol-ecosystem",
        "Fantom Ecosystem": "fantom-ecosystem",
        "Harmony Ecosystem": "harmony-ecosystem",
        "Arbitrum Ecosystem": "arbitrum-ecosystem",
        "Ethereum Ecosystem": "ethereum-ecosystem",
        "Optimism Ecosystem": "optimism-ecosystem",
        "Base Ecosystem": "base-ecosystem",
        "Layer 1": "layer-1",
        "Smart Contract Platform": "smart-contract-platform",
        "DEX": "decentralized-exchange",
        "Centralized Exchange (CEX)": "centralized-exchange-token-cex",
        "Artificial Intelligence": "artificial-intelligence",
        "Meme Token": "meme-token",
        "Dog Themed Coins": "dog-themed-coins",
        "DePIN": "depin",
        "Infrastructure": "infrastructure",
        "Liquid Staking": "liquid-staking",
        "Proof of Stake (PoS)": "proof-of-stake-pos",
        "Proof of Work (PoW)": "proof-of-work-pow"
      };

      // Get coins from the first 3 categories only
      const categoryResults: { [category: string]: CoinData[] } = {};
      
      for (const categoryDisplayName of coinDetails.categories.slice(0, 3)) { // Only first 3 categories
        try {
          // Find the correct category ID by matching the display name or convert to expected format
          let categoryId = categoryNameToId[categoryDisplayName];
          
          if (!categoryId) {
            // Fallback: convert display name to expected format
            categoryId = categoryDisplayName
              .toLowerCase()
              .replace(/\s*\([^)]*\)/g, '') // Remove parentheses and content
              .replace(/\//g, '-') // Replace slashes with hyphens
              .replace(/\s+/g, '-') // Replace spaces with hyphens
              .replace(/-+/g, '-') // Remove multiple consecutive hyphens
              .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
          }
          
          console.log(`Trying category: "${categoryDisplayName}" -> "${categoryId}"`);
          
          const categoryCoins = await this.getCoinsByCategory(categoryId);
          // Filter for coins with higher market cap than selected coin
          const higherMarketCapCoins = categoryCoins.filter(coin => 
            coin.id !== coinId && coin.market_cap > currentMarketCap
          );
          
          if (higherMarketCapCoins.length > 0) {
            categoryResults[categoryDisplayName] = higherMarketCapCoins;
            console.log(`✓ Found ${higherMarketCapCoins.length} coins in category "${categoryDisplayName}" (${categoryId})`);
          } else {
            console.log(`✗ No coins with higher market cap found in category "${categoryDisplayName}" (${categoryId})`);
          }
        } catch (error) {
          console.error(`Error fetching coins for category ${categoryDisplayName}:`, error);
        }
      }

      // Collect all coins from all categories and then select 3 diverse ones
      const allCategoryCoins: CoinData[] = [];
      const categoryNames = Object.keys(categoryResults);
      
      console.log(`Categories with results: ${categoryNames.length}/${coinDetails.categories.slice(0, 3).length}`);
      
      // Combine all coins from all categories
      categoryNames.forEach(categoryName => {
        const categoryCoins = categoryResults[categoryName];
        categoryCoins.forEach(coin => {
          if (!allCategoryCoins.find(existing => existing.id === coin.id)) {
            allCategoryCoins.push(coin);
          }
        });
      });

      if (allCategoryCoins.length === 0) {
        console.log(`No coins found in any category`);
        return [];
      }

      // Sort all coins by market cap ascending (smallest to largest)
      const sortedAllCoins = allCategoryCoins.sort((a, b) => a.market_cap - b.market_cap);
      
      // Always select exactly 3 coins with good diversity
      const allSimilarCoins: CoinData[] = [];
      
      if (sortedAllCoins.length >= 3) {
        // Select from different tiers to ensure diversity
        const positions = [
          Math.floor(sortedAllCoins.length * 0.2),  // Bottom tier (20%)
          Math.floor(sortedAllCoins.length * 0.5),  // Middle tier (50%)  
          Math.floor(sortedAllCoins.length * 0.8)   // Top tier (80%)
        ];
        
        positions.forEach((position, index) => {
          const selectedCoin = sortedAllCoins[Math.min(position, sortedAllCoins.length - 1)];
          if (selectedCoin && !allSimilarCoins.find(existing => existing.id === selectedCoin.id)) {
            allSimilarCoins.push(selectedCoin);
            const multiplier = selectedCoin.market_cap / currentMarketCap;
            const tierName = index === 0 ? 'Conservative' : index === 1 ? 'Moderate' : 'Ambitious';
            console.log(`✓ Selected (${tierName}): ${selectedCoin.name} (#${selectedCoin.market_cap_rank}) ${multiplier.toFixed(1)}x`);
          }
        });
        
        // If we still don't have 3 unique coins, fill the remaining slots
        while (allSimilarCoins.length < 3 && allSimilarCoins.length < sortedAllCoins.length) {
          for (let i = 0; i < sortedAllCoins.length && allSimilarCoins.length < 3; i++) {
            const coin = sortedAllCoins[i];
            if (!allSimilarCoins.find(existing => existing.id === coin.id)) {
              allSimilarCoins.push(coin);
              const multiplier = coin.market_cap / currentMarketCap;
              console.log(`✓ Selected (Fill): ${coin.name} (#${coin.market_cap_rank}) ${multiplier.toFixed(1)}x`);
            }
          }
          break;
        }
      } else {
        // If we have fewer than 3 coins total, take all available
        allSimilarCoins.push(...sortedAllCoins);
        sortedAllCoins.forEach(coin => {
          const multiplier = coin.market_cap / currentMarketCap;
          console.log(`✓ Selected (All Available): ${coin.name} (#${coin.market_cap_rank}) ${multiplier.toFixed(1)}x`);
        });
      }

      // Sort by market cap ascending to show progression
      allSimilarCoins.sort((a, b) => a.market_cap - b.market_cap);
      
      console.log(`Final selection: ${allSimilarCoins.length} coins from first 3 categories:`, 
        allSimilarCoins.map(c => `${c.name} (#${c.market_cap_rank}) ${(c.market_cap / currentMarketCap).toFixed(1)}x`));
      
      return allSimilarCoins;

    } catch (error) {
      console.error('Error finding similar coins by category:', error);
      return [];
    }
  }

}

// Export a singleton instance
export const mcpClient = new MCPClient();