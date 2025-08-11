import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface CoinData {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

export interface CoinSearchResult {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  market_cap?: number;
  price_change_24h?: number;
  price_change_percentage_24h?: number;
}

// Create a dedicated CoinGecko MCP client instance
export const cgClient = new Client(
  { name: 'cg-client', version: '1.0.0' },
  { capabilities: {} }
);

let cgTransport: SSEClientTransport | null = null;
let isConnected = false;

export async function connectCG() {
  if (isConnected) return;
  
  try {
    console.log('🔌 Connecting to CoinGecko MCP server...');
    
    // Close any existing connection first
    if (cgTransport) {
      try {
        await cgClient.close();
      } catch (error) {
        console.warn('Warning closing existing connection:', error);
      }
    }
    
    // Create new transport and connect
    cgTransport = new SSEClientTransport(new URL('https://mcp.api.coingecko.com/sse'));
    await cgClient.connect(cgTransport);
    
    isConnected = true;
    console.log('✅ Connected to CoinGecko MCP server');
  } catch (error) {
    console.error('❌ Failed to connect to CoinGecko MCP server:', error);
    isConnected = false;
    throw error;
  }
}

export async function disconnectCG() {
  if (cgTransport && isConnected) {
    try {
      await cgClient.close();
      cgTransport = null;
      isConnected = false;
      console.log('🔌 Disconnected from CoinGecko MCP server');
    } catch (error) {
      console.warn('Warning disconnecting:', error);
    }
  }
}

export async function getCoinData(coinIds: string[]): Promise<CoinData[]> {
  if (!isConnected) {
    await connectCG();
  }
  
  try {
    const response = await cgClient.callTool({
      name: 'get_coins_markets',
      arguments: {
        ids: coinIds.join(','),
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: coinIds.length,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h'
      }
    });

    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      return [];
    }

    const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
    
    return data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      market_cap_rank: coin.market_cap_rank,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      total_volume: coin.total_volume,
      high_24h: coin.high_24h,
      low_24h: coin.low_24h,
      last_updated: coin.last_updated
    }));
  } catch (error) {
    console.error('Error fetching coin data from CoinGecko MCP:', error);
    throw error;
  }
}

export async function searchCoins(query: string): Promise<CoinSearchResult[]> {
  if (!isConnected) {
    await connectCG();
  }
  
  try {
    const response = await cgClient.callTool({
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

    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      return [];
    }

    const data = response.content[0]?.text ? JSON.parse(response.content[0].text) : [];
    
    return data.map((coin: any) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_24h: coin.price_change_24h,
      price_change_percentage_24h: coin.price_change_percentage_24h
    }));
  } catch (error) {
    console.error('Error searching coins from CoinGecko MCP:', error);
    return [];
  }
}

export function isCGConnected(): boolean {
  return isConnected;
}
