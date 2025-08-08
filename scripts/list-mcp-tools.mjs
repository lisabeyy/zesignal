import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function listMCPTools() {
  try {
    const transport = new SSEClientTransport(new URL('https://mcp.api.coingecko.com/sse'));
    const client = new Client({
      name: 'gecko-mcp-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);
    
    console.log('Connected to CoinGecko MCP server!');
    
    // List available tools
    const tools = await client.listTools();
    console.log('\nAvailable tools:');
    console.log(JSON.stringify(tools, null, 2));
    
    await client.close();
  } catch (error) {
    console.error('Error connecting to MCP:', error);
  }
}

listMCPTools();