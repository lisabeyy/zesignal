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
  // New fields for enhanced response
  totalEngagement: number;
  postsInLast24h: number;
  averageEngagement: number;
  topEngagement: number;
  trendingPosts: TrendingPost[];
  model: string;
  cacheStatus: string;
}

export interface TrendingPost {
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
    console.log(`🚀 Calling get_social_sentiment for topic: ${topic}`);
    
    const response = await zeClient.callTool({
      name: 'get_social_sentiment',
      arguments: { topic }
    });

    console.log('📡 Raw MCP response object:', response);
    console.log('📝 Response content:', response.content);
    console.log('📊 Response content length:', Array.isArray(response.content) ? response.content.length : 'Not an array');

    if (!response.content || !Array.isArray(response.content) || response.content.length === 0) {
      throw new Error('No content received from ZeDashboard MCP server');
    }

    const rawText = response.content[0]?.text;
    if (!rawText) {
      throw new Error('No text content received from ZeDashboard MCP');
    }

    console.log('📝 Raw MCP response text:');
    console.log('Length:', rawText.length);
    console.log('First 200 chars:', rawText.substring(0, 200));
    console.log('Last 200 chars:', rawText.substring(rawText.length - 200));
    console.log('Full response text:');
    console.log('='.repeat(80));
    console.log(rawText);
    console.log('='.repeat(80));

    // Try to parse as JSON first
    let data;
    try {
      data = JSON.parse(rawText);
      console.log('✅ Successfully parsed as JSON response:');
      console.log(JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.log('❌ Failed to parse as JSON, trying markdown parsing...');
      console.log('JSON parse error:', jsonError);
      data = parseMarkdownResponse(rawText);
      console.log('📖 Markdown parsing result:', data);
      
      // Debug: Show what was extracted from markdown
      console.log('🔍 Markdown extraction debug:', {
        extractedTopic: data.topic,
        extractedPostsCount: data.postsCount,
        extractedSentimentScore: data.sentimentScore,
        extractedTotalEngagement: data.totalEngagement,
        extractedPostsInLast24h: data.postsInLast24h,
        extractedAverageEngagement: data.averageEngagement,
        extractedTopEngagement: data.topEngagement,
        extractedTrendingPostsCount: data.trendingPosts.length
      });
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'Failed to get sentiment data from ZeDashboard');
    }

    // Map the response to our interface - using the actual structure from your response
    const result = {
      success: data.success,
      topic: data.topic || topic.toUpperCase(),
      summary: data.summary || '',
      postsCount: data.postsCount || data.analytics?.posts24h || 0,
      cached: data.cached || false,
      timestamp: data.timestamp || Date.now(),
      dataSource: data.dataSource || "LunarCrush Social Sentiment",
      sentimentScore: (data.sentimentScore || 0) / 100, // Convert from 79 to 0.79
      totalEngagement: data.totalEngagement || data.engagement || data.analytics?.totalEngagement || 0,
      postsInLast24h: data.postsInLast24h || data.analytics?.posts24h || data.postsCount || 0,
      averageEngagement: data.averageEngagement || data.analytics?.averageEngagement || 0,
      topEngagement: data.topEngagement || data.analytics?.topEngagement || 0,
      trendingPosts: (data.trendingPosts || []).map((post: any) => ({
        title: post.title || '',
        engagement: post.interactions || post.engagement || 0,
        content: post.title || '', // Use title as content for now
        platform: post.platform || 'unknown',
        date: post.date || '',
        url: post.url || '',
        id: post.id || '',
        creator: post.creator || null
      })),
      model: data.model || "claude-sonnet-4-20250514",
      cacheStatus: data.cacheStatus || "Fresh Data"
    };

    console.log('🎯 Final parsed result:');
    console.log(JSON.stringify(result, null, 2));

    console.log('✅ Parsed sentiment data summary:', {
      topic: result.topic,
      postsCount: result.postsCount,
      sentimentScore: result.sentimentScore,
      totalEngagement: result.totalEngagement,
      trendingPostsCount: result.trendingPosts.length
    });

    // Log the field mapping for debugging
    console.log('🔍 Field mapping debug:', {
      originalSentimentScore: data.sentimentScore,
      convertedSentimentScore: result.sentimentScore,
      originalPostsCount: data.postsCount,
      mappedPostsCount: result.postsCount,
      originalEngagement: data.engagement,
      mappedTotalEngagement: result.totalEngagement,
      analyticsPosts24h: data.analytics?.posts24h,
      mappedPostsInLast24h: result.postsInLast24h,
      // Add engagement debugging
      dataTotalEngagement: data.totalEngagement,
      dataAverageEngagement: data.averageEngagement,
      dataTopEngagement: data.topEngagement,
      resultTotalEngagement: result.totalEngagement,
      resultAverageEngagement: result.averageEngagement,
      resultTopEngagement: result.topEngagement
    });

    return result;

  } catch (error) {
    console.error(`❌ Error fetching social sentiment for "${topic}":`, error);
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
  console.log('🔍 Starting markdown parsing...');
  
  const data: any = {
    success: true,
    topic: '',
    summary: '',
    postsCount: 0,
    cached: false,
    timestamp: Date.now(),
    dataSource: 'LunarCrush Social Sentiment',
    sentimentScore: 0.5,
    totalEngagement: 0,
    postsInLast24h: 0,
    averageEngagement: 0,
    topEngagement: 0,
    trendingPosts: [],
    model: 'claude-sonnet-4-20250514',
    cacheStatus: 'Fresh Data'
  };

  // First, try to extract the JSON data from the Raw API Response section
  const rawApiStart = markdownText.indexOf('## 🔍 Raw API Response');
  if (rawApiStart !== -1) {
    const rawApiSection = markdownText.substring(rawApiStart);
    const jsonStart = rawApiSection.indexOf('```json');
    const jsonEnd = rawApiSection.indexOf('```', jsonStart + 7);
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const jsonText = rawApiSection.substring(jsonStart + 7, jsonEnd);
      try {
        const jsonData = JSON.parse(jsonText);
        console.log('✅ Successfully parsed JSON from Raw API Response section');
        
        // Use the JSON data for trending posts and other fields
        if (jsonData.trendingPosts && Array.isArray(jsonData.trendingPosts)) {
          data.trendingPosts = jsonData.trendingPosts.map((post: any) => ({
            title: post.title || '',
            engagement: post.interactions || post.engagement || 0,
            content: post.title || '',
            platform: post.platform || 'unknown',
            date: post.date || '',
            url: post.url || '',
            id: post.id || '',
            creator: post.creator || null
          }));
          console.log('✅ Extracted trending posts from JSON:', data.trendingPosts.length);
        }
        
        // Also use other fields from JSON if available
        if (jsonData.sentimentScore !== undefined) {
          data.sentimentScore = jsonData.sentimentScore;
        }
        if (jsonData.postsCount !== undefined) {
          data.postsCount = jsonData.postsCount;
        }
        if (jsonData.engagement !== undefined) {
          data.totalEngagement = jsonData.engagement;
        }
        if (jsonData.analytics) {
          data.postsInLast24h = jsonData.analytics.posts24h || 0;
          data.totalEngagement = jsonData.analytics.totalEngagement || jsonData.engagement || 0;
          data.averageEngagement = jsonData.analytics.averageEngagement || 0;
          data.topEngagement = jsonData.analytics.topEngagement || 0;
          
          console.log('🔍 JSON Analytics extraction:', {
            posts24h: jsonData.analytics.posts24h,
            totalEngagement: jsonData.analytics.totalEngagement,
            averageEngagement: jsonData.analytics.averageEngagement,
            topEngagement: jsonData.analytics.topEngagement,
            fallbackEngagement: jsonData.engagement
          });
        }
        
      } catch (jsonError) {
        console.log('❌ Failed to parse JSON from Raw API Response:', jsonError);
      }
    }
  }

  // Extract topic from the first line
  const topicMatch = markdownText.match(/#\s*(\w+)\s+Social\s+Sentiment/i);
  if (topicMatch) {
    data.topic = topicMatch[1].toUpperCase();
    console.log('✅ Extracted topic:', data.topic);
  }

  // Extract metadata from the header section
  const dataSourceMatch = markdownText.match(/\*\*Data Source:\*\*\s*(.+?)(?:\n|$)/);
  if (dataSourceMatch) {
    data.dataSource = dataSourceMatch[1].trim();
  }

  const timestampMatch = markdownText.match(/\*\*Timestamp:\*\*\s*(\d+)/);
  if (timestampMatch) {
    data.timestamp = parseInt(timestampMatch[1]);
  }

  const modelMatch = markdownText.match(/\*\*Model:\*\*\s*(.+?)(?:\n|$)/);
  if (modelMatch) {
    data.model = modelMatch[1].trim();
  }

  const cacheStatusMatch = markdownText.match(/\*\*Cache Status:\*\*\s*(.+?)(?:\n|$)/);
  if (cacheStatusMatch) {
    data.cacheStatus = cacheStatusMatch[1].trim();
  }

  // Extract metrics from the Key Metrics section (only if not already set from JSON)
  if (!data.postsCount) {
    const postsCountMatch = markdownText.match(/\*\*Posts Count \(24h\):\*\*\s*(\d+(?:,\d+)*)/);
    if (postsCountMatch) {
      data.postsCount = parseInt(postsCountMatch[1].replace(/,/g, ''));
      console.log('✅ Extracted posts count:', data.postsCount);
    }
  }

  if (!data.sentimentScore) {
    const sentimentScoreMatch = markdownText.match(/\*\*Sentiment Score:\*\*\s*(\d+)/);
    if (sentimentScoreMatch) {
      data.sentimentScore = parseInt(sentimentScoreMatch[1]);
      console.log('✅ Extracted sentiment score:', data.sentimentScore);
    }
  }

  if (!data.totalEngagement) {
    const totalEngagementMatch = markdownText.match(/\*\*Total Engagement:\*\*\s*(\d+(?:,\d+)*)/);
    if (totalEngagementMatch) {
      data.totalEngagement = parseInt(totalEngagementMatch[1].replace(/,/g, ''));
      console.log('✅ Extracted total engagement:', data.totalEngagement);
    }
  }

  if (!data.postsInLast24h) {
    const postsInLast24hMatch = markdownText.match(/\*\*Posts in Last 24h:\*\*\s*(\d+(?:,\d+)*)/);
    if (postsInLast24hMatch) {
      data.postsInLast24h = parseInt(postsInLast24hMatch[1].replace(/,/g, ''));
    }
  }

  if (!data.averageEngagement) {
    const averageEngagementMatch = markdownText.match(/\*\*Average Engagement:\*\*\s*(\d+(?:,\d+)*)/);
    if (averageEngagementMatch) {
      data.averageEngagement = parseInt(averageEngagementMatch[1].replace(/,/g, ''));
    }
  }

  if (!data.topEngagement) {
    const topEngagementMatch = markdownText.match(/\*\*Top Engagement:\*\*\s*(\d+(?:,\d+)*)/);
    if (topEngagementMatch) {
      data.topEngagement = parseInt(topEngagementMatch[1].replace(/,/g, ''));
    }
  }

  // Extract summary - everything between "## 📝 AI-Generated Summary" and "## 🚀 Trending Posts"
  const summaryStart = markdownText.indexOf('## 📝 AI-Generated Summary');
  const summaryEnd = markdownText.indexOf('## 🚀 Trending Posts');
  
  if (summaryStart !== -1 && summaryEnd !== -1) {
    const summaryText = markdownText.substring(summaryStart, summaryEnd);
    // Clean up the summary by removing headers and extra formatting
    data.summary = summaryText
      .replace(/## 📝 AI-Generated Summary\n/, '')
      .replace(/^#\s*\w+.*\n/gm, '') // Remove # headers
      .replace(/^\*\*.*\*\*\n/gm, '') // Remove **bold** lines
      .trim();
    console.log('✅ Extracted summary length:', data.summary.length);
  }

  // Only parse trending posts from markdown if we didn't get them from JSON
  if (data.trendingPosts.length === 0) {
    const trendingPostsStart = markdownText.indexOf('## 🚀 Trending Posts');
    if (trendingPostsStart !== -1) {
      const trendingPostsSection = markdownText.substring(trendingPostsStart);
      
      // Split into individual posts and parse each one
      const postSections = trendingPostsSection.split(/\d+\.\s+\*\*/).slice(1); // Remove first empty section
      
      for (let i = 0; i < postSections.length; i++) {
        const postSection = postSections[i];
        
        // Extract title (everything until the first **)
        const titleMatch = postSection.match(/(.*?)\*\*/);
        if (!titleMatch) continue;
        
        const title = titleMatch[1].trim();
        
        // Extract engagement
        const engagementMatch = postSection.match(/\*\*Engagement:\*\*\s*(\d+(?:,\d+)*)/);
        const engagement = engagementMatch ? parseInt(engagementMatch[1].replace(/,/g, '')) : 0;
        
        // Extract platform
        const platformMatch = postSection.match(/\*\*Platform:\*\*\s*(.+?)(?:\n|$)/);
        const platform = platformMatch ? platformMatch[1].trim() : 'unknown';
        
        // Extract date
        const dateMatch = postSection.match(/\*\*Date:\*\*\s*(.+?)(?:\n|$)/);
        const date = dateMatch ? dateMatch[1].trim() : '';
        
        const post = {
          title: title,
          engagement: engagement,
          content: title, // Use title as content for now
          platform: platform,
          date: date,
          url: '',
          id: ''
        };
        
        data.trendingPosts.push(post);
        console.log('✅ Extracted trending post from markdown:', post.title, 'with', post.engagement, 'engagement');
      }
    }
  }

  console.log('🎯 Final parsed data:', {
    topic: data.topic,
    postsCount: data.postsCount,
    sentimentScore: data.sentimentScore,
    totalEngagement: data.totalEngagement,
    trendingPostsCount: data.trendingPosts.length,
    summaryLength: data.summary.length
  });

  return data;
}
