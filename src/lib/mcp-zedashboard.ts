import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface ZeDashboardSentimentResponse {
  success: boolean;
  topic: string;
  summary: string;
  postsCount: number;
  cached: boolean;
  timestamp: number;
  dataSource: string;
  sentimentScore: number;
}

// Create a dedicated ZeDashboard MCP client instance
export const zeClient = new Client(
  { name: 'ze-client', version: '1.0.0' },
  { capabilities: {} }
);

let zeTransport: SSEClientTransport | null = null;
let isConnected = false;

export async function connectZE() {
  if (isConnected) return;
  
  try {
    console.log('🔌 Connecting to ZeDashboard MCP server...');
    
    // Close any existing connection first
    if (zeTransport) {
      try {
        await zeClient.close();
      } catch (error) {
        console.warn('Warning closing existing connection:', error);
      }
    }
    
    // Create new transport and connect
    zeTransport = new SSEClientTransport(new URL('https://mcp-server.looftaxyz.workers.dev/sse'));
    await zeClient.connect(zeTransport);
    
    isConnected = true;
    console.log('✅ Connected to ZeDashboard MCP server');
  } catch (error) {
    console.error('❌ Failed to connect to ZeDashboard MCP server:', error);
    isConnected = false;
    throw error;
  }
}

export async function disconnectZE() {
  if (zeTransport && isConnected) {
    try {
      await zeClient.close();
      zeTransport = null;
      isConnected = false;
      console.log('🔌 Disconnected from ZeDashboard MCP server');
    } catch (error) {
      console.warn('Warning disconnecting:', error);
    }
  }
}

export async function getSocialSentiment(topic: string): Promise<ZeDashboardSentimentResponse> {
  if (!isConnected) {
    await connectZE();
  }
  
  try {
    const response = await zeClient.callTool({
      name: 'get_social_sentiment',
      arguments: { topic }
    });

    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      throw new Error('No content received from ZeDashboard MCP server');
    }

    const rawText = response.content[0]?.text;
    if (!rawText) {
      throw new Error('No text content received from ZeDashboard MCP');
    }

    // Handle markdown response from ZeDashboard MCP
    let data;
    try {
      // Try to parse as JSON first
      data = JSON.parse(rawText);
    } catch (jsonError) {
      // If JSON parsing fails, parse the markdown response
      data = parseMarkdownResponse(rawText);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to get sentiment data from ZeDashboard');
    }

    return {
      success: data.success,
      topic: data.topic,
      summary: data.summary,
      postsCount: data.postsCount || 0,
      cached: data.cached || false,
      timestamp: data.timestamp || Date.now(),
      dataSource: data.dataSource || "ZeDashboard Social Sentiment",
      sentimentScore: data.sentimentScore || 0.5
    };
  } catch (error) {
    console.error(`Error fetching social sentiment for "${topic}":`, error);
    throw error;
  }
}

export async function getHealthStatus(): Promise<{ status: string; timestamp: number; server: string }> {
  try {
    if (!isConnected) {
      await connectZE();
    }
    return {
      status: isConnected ? 'connected' : 'disconnected',
      timestamp: Date.now(),
      server: 'https://mcp-server.looftaxyz.workers.dev/sse'
    };
  } catch (error) {
    return {
      status: 'error',
      timestamp: Date.now(),
      server: 'https://mcp-server.looftaxyz.workers.dev/sse'
    };
  }
}

export function isZEConnected(): boolean {
  return isConnected;
}

// Parse markdown response from ZeDashboard MCP
function parseMarkdownResponse(markdownText: string) {
  const lines = markdownText.split('\n');
  const data: any = {
    success: true,
    topic: '',
    summary: '',
    postsCount: 0,
    cached: false,
    timestamp: Date.now(),
    dataSource: 'ZeDashboard Social Sentiment',
    sentimentScore: 0.5
  };

  let currentSection = '';
  let summaryLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('# ')) {
      currentSection = trimmedLine.substring(2).toLowerCase();
      if (currentSection.includes('topic')) {
        data.topic = trimmedLine.substring(2);
      }
    } else if (trimmedLine.startsWith('## ')) {
      const subsection = trimmedLine.substring(3).toLowerCase();
      if (subsection.includes('sentiment')) {
        // Extract sentiment score from text like "Sentiment: 75%"
        const sentimentMatch = trimmedLine.match(/(\d+)%/);
        if (sentimentMatch) {
          data.sentimentScore = parseInt(sentimentMatch[1]) / 100;
        }
      } else if (subsection.includes('posts') || subsection.includes('volume')) {
        // Extract post count from text like "Posts: 1,234"
        const postsMatch = trimmedLine.match(/(\d+(?:,\d+)*)/);
        if (postsMatch) {
          data.postsCount = parseInt(postsMatch[1].replace(/,/g, ''));
        }
      }
    } else if (trimmedLine && !trimmedLine.startsWith('---')) {
      if (currentSection.includes('summary') || currentSection.includes('analysis')) {
        summaryLines.push(trimmedLine);
      }
    }
  }

  data.summary = summaryLines.join(' ').substring(0, 500);
  
  return data;
}
