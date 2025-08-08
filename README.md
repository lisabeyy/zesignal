# 🚀 GeckoCap - MarketCap Comparator

A beautiful, modern web application that helps you compare cryptocurrency market capitalizations and visualize potential price projections. Built with Next.js and powered by CoinGecko's MCP (Model Context Protocol) Server.

![GeckoCap Preview](https://img.shields.io/badge/Status-Live-brightgreen)
![Next.js](https://img.shields.io/badge/Next.js-15.4.6-black)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- CoinGecko MCP Server access

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/geckocap.git
   cd geckocap
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env.local file if needed for any configuration
   # Currently runs with public CoinGecko MCP endpoint
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

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

## 🎯 Use Cases

- **Educational Tool**: Learn about market cap relationships
- **Research Aid**: Quick comparison of similar projects  
- **Investment Research**: Understand potential upside (educational only)
- **Market Analysis**: Visualize market cap distributions

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


## 🎨 Design Philosophy

- **Minimalist**: Clean, focused interface without distractions
- **Educational**: Clear explanations and transparent calculations  
- **Professional**: Enterprise-grade UI suitable for research
- **Accessible**: Works on all devices and screen sizes
- **Performance**: Optimized loading and smooth animations

## ⚠️ Important Disclaimers

> **Educational Use Only**: This tool is designed for educational and informational purposes. The projections and comparisons are purely theoretical and should not be considered financial advice.

> **High Risk**: Cryptocurrency investments are highly volatile and risky. Always conduct your own research and consult with financial professionals.

> **Data Accuracy**: While we use reliable data sources, market data can change rapidly and calculations are approximate.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Maintain responsive design principles
4. Add proper error handling
5. Include appropriate disclaimers for financial data

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **CoinGecko** for providing comprehensive cryptocurrency data via MCP
- **Next.js Team** for the excellent React framework
- **Tailwind CSS** for the utility-first CSS framework
- **Lucide** for beautiful, consistent icons

## 📞 Support

If you have any questions or run into issues:

1. Check the [Issues](https://github.com/yourusername/geckocap/issues) page
2. Create a new issue with detailed information
3. Join our community discussions

---

<div align="center">

**Built with ❤️ for the crypto community**

[🌐 Live Demo](https://your-demo-url.com) • [📝 Report Bug](https://github.com/yourusername/geckocap/issues) • [✨ Request Feature](https://github.com/yourusername/geckocap/issues)

</div>
