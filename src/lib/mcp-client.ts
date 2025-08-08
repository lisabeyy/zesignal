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

    const startTime = Date.now();
    const searchArguments = { query, include_platform: false, status: 'active' };

    try {
      // Get all coins list to search through
      const response = await this.client!.callTool({
        name: 'get_coins_list',
        arguments: {
          include_platform: false,
          status: 'active'
        }
      });

      const listEndTime = Date.now();
      this.logRequest('get_coins_list', { include_platform: false, status: 'active' }, startTime, listEndTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return [];
      }

      const coins = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
      
      // Filter coins based on query
      const filteredCoins = coins.filter((coin: { name: string; symbol: string; id: string }) => 
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(query.toLowerCase()) ||
        coin.id.toLowerCase().includes(query.toLowerCase())
      );

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

  async getCoinCategories(): Promise<string[]> {
    if (!this.client) {
      await this.connect();
    }

    const startTime = Date.now();

    try {
      const response = await this.client!.callTool({
        name: 'get_list_coins_categories',
        arguments: {}
      });

      const endTime = Date.now();
      this.logRequest('get_list_coins_categories', {}, startTime, endTime, true);

      if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
        return [];
      }

      const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
      return data.map((category: { id: string }) => category.id);
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('get_list_coins_categories', {}, startTime, errorEndTime, false, error as Error);
      console.error('Error fetching coin categories:', error);
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

  async getCoinDetails(coinId: string): Promise<{ category?: string } | null> {
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
        category: data?.categories?.[0] || undefined
      };
    } catch (error) {
      const errorEndTime = Date.now();
      this.logRequest('get_id_coins', arguments_obj, startTime, errorEndTime, false, error as Error);
      console.error('Error fetching coin details:', error);
      return null;
    }
  }

  async getTrendingCoins(): Promise<CoinData[]> {
    if (!this.client) {
      await this.connect();
    }

    const startTime = Date.now();
    const arguments_obj = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 50,
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
      console.error('Error fetching trending coins:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const mcpClient = new MCPClient();