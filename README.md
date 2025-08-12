# ZeSignal - AI-Powered Cryptocurrency Analysis Platform

A comprehensive cryptocurrency analysis platform that provides real-time market data, social sentiment analysis, and AI-powered trading insights. Built with Next.js and powered by multiple MCP (Model Context Protocol) servers and Claude AI.

## 🚀 Features

### **Real-Time Market Data**
- Live cryptocurrency prices, market cap, and trading volume
- 24-hour price change tracking
- Market cap rankings and volume analysis
- Support for Bitcoin, Ethereum, Solana, and Taraxa

### **Social Sentiment Analysis**
- Real-time social media sentiment scoring
- Engagement metrics and trending posts analysis
- Community sentiment trends and FOMO detection
- Powered by ZeDashboard MCP for social data

### **AI-Powered Trading Analysis**
- Claude AI-generated trading signals and recommendations
- Price-sentiment divergence analysis
- Technical support and resistance levels
- Risk assessment and opportunity identification
- Short-term and medium-term price targets

### **Advanced Analytics**
- Price-sentiment divergence strength scoring
- Investor insights for different time horizons
- Key risks and opportunities analysis
- Technical level calculations based on current prices

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS with modern UI components
- **AI Analysis**: Anthropic Claude AI (Claude Sonnet 4)
- **Data Sources**: 
  - CoinGecko MCP for market data
  - ZeDashboard MCP for social sentiment
- **Icons**: Lucide React for beautiful, consistent icons

## 🔌 MCP Integration

The platform leverages Model Context Protocol (MCP) servers to connect to external data sources:

- **CoinGecko MCP**: Provides real-time cryptocurrency market data
- **ZeDashboard MCP**: Delivers social sentiment and engagement metrics

## 🤖 AI Analysis Features

### **Trading Signals**
- Strong Buy, Buy, Hold, Sell, Strong Sell recommendations
- Confidence scoring (0-100%)
- Clear reasoning for each recommendation

### **Price Analysis**
- Near-term targets (24-48 hours)
- Medium-term projections (1-2 weeks)
- Technical support and resistance levels
- Price direction indicators (bullish/bearish/neutral)

### **Risk Assessment**
- Risk level classification (Low/Medium/High)
- Specific risk identification
- Opportunity analysis
- Market sentiment correlation

## 📱 User Experience

- **Responsive Design**: Works seamlessly on desktop and mobile
- **Real-Time Updates**: Live data refresh without page reloads
- **Interactive UI**: Hover effects, smooth transitions, and modern aesthetics
- **Token Selection**: Easy switching between different cryptocurrencies
- **Shareable Links**: URL parameters for direct token access

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Anthropic API key for Claude AI

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd zesignal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

# Run the development server
npm run dev
```

### Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-... # Your Claude AI API key
```

## 🔧 API Endpoints

- `GET /api/analysis?token={cryptocurrency}` - Comprehensive analysis endpoint
- Integrates CoinGecko and ZeDashboard MCP servers
- Returns market data, sentiment analysis, and AI insights

## 📊 Data Flow

1. **User Selection**: Choose cryptocurrency from supported tokens
2. **MCP Data Fetch**: Retrieve market data and social sentiment
3. **AI Analysis**: Claude AI processes data and generates insights
4. **UI Rendering**: Display comprehensive analysis with modern UI
5. **Real-Time Updates**: Continuous data refresh and analysis

## 🎯 Use Cases

- **Retail Investors**: Get AI-powered trading insights and risk assessment
- **Crypto Analysts**: Access comprehensive market and sentiment data
- **Traders**: Identify price-sentiment divergences and trading opportunities
- **Researchers**: Study cryptocurrency market dynamics and social sentiment

## 🔮 Future Enhancements

- Additional cryptocurrency support
- Advanced charting and technical analysis
- Portfolio tracking and performance metrics
- Mobile app development
- Enhanced AI models and analysis capabilities

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using Next.js, MCP, and Claude AI**

