# 🚀 GeckoCap - MarketCap Comparator

A beautiful, modern web application that helps you compare cryptocurrency market capitalizations and visualize potential price projections. Built with Next.js and powered by CoinGecko's MCP (Model Context Protocol) Server.


![GeckoCap Preview](https://img.shields.io/badge/Status-Live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

![GeckoCap App Screenshot](https://lkrqcaxgingqjswmtdkw.supabase.co/storage/v1/object/public/images/Random/screencap-gecko.webp)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- CoinGecko MCP Server access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mdzor/geckocap.git
   cd geckocap
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)


## 📖 How It Works

### 1. **Search Phase**
- User searches for any cryptocurrency
- App connects to CoinGecko MCP server
- Results are sorted by market cap and displayed

### 2. **Selection Phase** 
- User selects a token from search results
- App fetches detailed token information
- Similar tokens are identified using smart market cap ranges:
  - **Large Cap** (>$10B): Compared with tokens >$5B
  - **Mid Cap** ($1B-$10B): Compared with tokens $500M-$50B  
  - **Small Cap** ($100M-$1B): Compared with tokens $50M-$10B
  - **Micro Cap** (<$100M): Compared with anything larger

## 🔧 Integration

The app uses CoinGecko's MCP (Model Context Protocol) server:

```typescript
// Example MCP client usage
import { mcpClient } from '@/lib/mcp-client';

// Search for coins
const results = await mcpClient.searchCoins('bitcoin');

// Get coin data  
const coinData = await mcpClient.getCoinData(['bitcoin']);

// Get trending coins
const trending = await mcpClient.getTrendingCoins();
```

## 📁 Project Structure

```
├── src/
│   ├── app/                    # Next.js 13+ app router
│   │   ├── api/               # API routes for MCP integration
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main application page
│   ├── components/            # Reusable components
│   │   └── AnimatedBackground.tsx  # WebGL background
│   └── lib/                   # Utilities and configurations
│       └── mcp-client.ts      # MCP client implementation
├── public/                    # Static assets
├── tailwind.config.ts         # Tailwind configuration
└── README.md                  # You are here!
```

---

**Built with ❤️ for the crypto community**

