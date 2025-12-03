# Binance US Multi-Strategy Trading Bot v2.1 (WebSocket Edition)

**Production-ready automated cryptocurrency trading bot with 4 proven technical analysis strategies and WebSocket support for real-time price updates**

---

## 🎯 Features

### 4 Proven Trading Strategies
1. ✅ **RSI + Momentum** - Catch oversold bounces with momentum confirmation
2. ✅ **MACD Crossover** - Ride trends with moving average convergence/divergence
3. ✅ **Bollinger Bands** - Profit from mean reversion in range-bound markets
4. ✅ **EMA Crossover** - Catch trend changes with moving average crossovers

### Advanced Features
- ✅ **WebSocket Price Streaming** - Real-time price updates, no API rate limits
- ✅ **Multi-Strategy Execution** - Run all strategies simultaneously
- ✅ **Per-Strategy Performance Tracking** - Monitor each strategy's win rate and P&L
- ✅ **Flexible Configuration** - Enable/disable strategies individually
- ✅ **Position Limits** - Control max positions per strategy
- ✅ **Comprehensive Safety Features** - Multiple layers of risk protection

### Safety & Risk Management
- ✅ **Emergency Stop** - Automatic halt on excessive losses
- ✅ **Daily Loss Limit** - Stops trading if daily loss exceeds $100
- ✅ **Consecutive Loss Protection** - Stops after 3 losses in a row
- ✅ **Per-Strategy Profit Targets** - Each strategy has optimal exit points
- ✅ **Per-Strategy Stop Losses** - Customized risk management per strategy
- ✅ **Position Size Limits** - Max 95% of balance per trade
- ✅ **Minimum Trade Size** - $10 minimum to avoid dust trades

### Monitoring & Logging
- ✅ **Detailed Trade Logs** - CSV format with strategy attribution
- ✅ **Strategy Performance Stats** - Real-time win rate and P&L per strategy
- ✅ **System Logs** - JSON format for debugging
- ✅ **Real-time Console Output** - Live trading activity
- ✅ **PM2 Process Management** - Auto-restart, log rotation

### Error Handling
- ✅ **API Retry Logic** - Automatic retry with exponential backoff
- ✅ **Timeout Protection** - 10-second request timeouts
- ✅ **Graceful Shutdown** - Clean exit on SIGINT/SIGTERM
- ✅ **Rate Limiting** - 500ms delays between API calls

---

## 📋 Requirements

- **Node.js** 18.0.0 or higher
- **PM2** (for process management)
- **Binance US Account** with API keys
- **VPS** (recommended: Ubuntu 22.04, 2GB RAM)

---

## 🚀 Quick Start

### 1. Configure API Keys

Edit `config.js` and add your Binance US API credentials:

```javascript
apiKey: "YOUR_API_KEY_HERE",
apiSecret: "YOUR_API_SECRET_HERE",
```

### 2. Select Strategies

Enable/disable strategies in `config.js`:

```javascript
enabledStrategies: {
  rsiMomentum: true,      // RSI + Momentum
  macd: true,             // MACD Crossover
  bollingerBands: true,   // Bollinger Bands
  emaCrossover: true,     // EMA Crossover
}
```

### 3. Deploy to VPS

From your local machine:

```bash
chmod +x deploy.sh
./deploy.sh 209.38.153.21
```

This will:
- Create deployment package
- Transfer to VPS
- Backup existing installation
- Deploy new version
- Start bot with PM2

### 4. Monitor Bot

SSH to VPS:

```bash
ssh root@209.38.153.21
```

Check bot status:

```bash
pm2 status trading-bot
```

View live logs:

```bash
pm2 logs trading-bot
```

View strategy performance:

```bash
pm2 logs trading-bot | grep "trades,"
```

---

## ⚙️ Configuration

### Trading Pairs
```javascript
tradingPairs: ["BTCUSD", "ETHUSD", "SOLUSD", "AVAXUSD"]
```

### Strategy Parameters

Each strategy has its own configuration:

**RSI + Momentum:**
```javascript
rsiMomentum: {
  rsiPeriod: 14,
  rsiOversold: 40,
  rsiOverbought: 70,
  momentumPeriod: 10,
  momentumThreshold: 2.0,
  profitTarget: 3.0,
  stopLoss: 2.0,
}
```

**MACD:**
```javascript
macd: {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  profitTarget: 4.0,
  stopLoss: 2.5,
}
```

**Bollinger Bands:**
```javascript
bollingerBands: {
  period: 20,
  stdDev: 2,
  profitTarget: 2.5,
  stopLoss: 1.5,
}
```

**EMA Crossover:**
```javascript
emaCrossover: {
  fastPeriod: 9,
  slowPeriod: 21,
  profitTarget: 3.5,
  stopLoss: 2.0,
}
```

### Risk Management
```javascript
risk: {
  maxPositionSize: 0.95,         // Use 95% of balance per trade
  minTradeSize: 10,              // Minimum $10 per trade
  maxDailyLoss: 100,             // Stop if daily loss > $100
  maxOpenPositions: 4,           // Max 1 per pair
  maxPositionsPerStrategy: 2,    // Max 2 per strategy
}
```

---

## 📊 Strategy Performance Tracking

The bot tracks performance for each strategy separately:

```bash
# View strategy stats in logs
pm2 logs trading-bot

# Example output:
rsiMomentum: 15 trades, 60.0% win rate, $45.30 P&L
macd: 8 trades, 50.0% win rate, $12.80 P&L
bollingerBands: 12 trades, 66.7% win rate, $28.50 P&L
emaCrossover: 6 trades, 50.0% win rate, $8.20 P&L
```

### Analyzing Strategy Performance

**Good Performance Indicators:**
- Win rate > 50%
- Positive P&L
- Consistent with market conditions

**Poor Performance Indicators:**
- Win rate < 40%
- Negative P&L
- Consider disabling the strategy

---

## 🎯 Strategy Selection Guide

### Conservative Approach (Lower Risk)
```javascript
enabledStrategies: {
  rsiMomentum: true,
  bollingerBands: true,
  macd: false,
  emaCrossover: false,
}
```

### Aggressive Approach (Higher Risk)
```javascript
enabledStrategies: {
  rsiMomentum: true,
  macd: true,
  bollingerBands: false,
  emaCrossover: true,
}
```

### Balanced Approach (Diversified)
```javascript
enabledStrategies: {
  rsiMomentum: true,
  macd: true,
  bollingerBands: true,
  emaCrossover: true,
}
```

See `STRATEGIES.md` for detailed strategy descriptions and usage guidelines.

---

## 📁 File Structure

```
trading-bot-multi-strategy/
├── bot.js                  # Main trading bot (700+ lines)
├── config.js               # Configuration (all strategies)
├── package.json            # Dependencies
├── ecosystem.config.js     # PM2 configuration
├── deploy.sh               # Deployment script
├── README.md               # This file
├── STRATEGIES.md           # Detailed strategy guide
├── logs/                   # PM2 logs
│   ├── pm2-error.log
│   ├── pm2-out.log
│   └── pm2-combined.log
├── bot.log                 # Bot system log (JSON)
└── trades.csv              # Trade history (CSV)
```

---

## 🔧 PM2 Commands

```bash
# Start bot
pm2 start ecosystem.config.js

# Stop bot
pm2 stop trading-bot

# Restart bot
pm2 restart trading-bot

# View logs
pm2 logs trading-bot

# Monitor resources
pm2 monit

# View status
pm2 status

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup systemd
```

---

## 📈 Performance Tracking

### View Trade History
```bash
cat trades.csv
```

### Calculate Total P&L
```bash
awk -F',' 'NR>1 {sum+=$9} END {print "Total P&L: $" sum}' trades.csv
```

### Count Trades by Strategy
```bash
grep "rsiMomentum" trades.csv | wc -l
grep "macd" trades.csv | wc -l
grep "bollingerBands" trades.csv | wc -l
grep "emaCrossover" trades.csv | wc -l
```

### View Recent Trades
```bash
tail -20 trades.csv
```

---

## 🐛 Troubleshooting

### Bot Not Starting
```bash
# Check PM2 logs
pm2 logs trading-bot --lines 100

# Check system log
cat bot.log | tail -50

# Verify API keys
node -e "const config = require('./config'); console.log('API Key:', config.apiKey.substring(0, 10) + '...');"
```

### API Errors
```bash
# Test API connection
curl -X GET "https://api.binance.us/api/v3/ping"

# Check API key permissions
# Ensure "Enable Trading" is checked in Binance US API settings
```

### No Trades Executing
```bash
# Check if bot is in emergency stop
grep "Emergency stop" bot.log

# Check which strategies are enabled
grep "Enabled Strategies" bot.log

# Check market conditions
pm2 logs trading-bot | grep "BUY SIGNAL"
```

### Strategy Underperforming
```bash
# Check strategy stats
pm2 logs trading-bot | grep "trades,"

# If win rate < 40%, consider:
# 1. Disabling the strategy
# 2. Adjusting parameters in config.js
# 3. Checking if market conditions suit the strategy
```

---

## 🔒 Security Best Practices

1. ✅ **API Key Restrictions**
   - Enable only "Enable Trading" permission
   - Restrict to your VPS IP address
   - Set withdrawal whitelist

2. ✅ **VPS Security**
   - Use SSH keys (disable password auth)
   - Enable UFW firewall
   - Keep system updated

3. ✅ **Monitoring**
   - Check logs daily
   - Review trade history weekly
   - Monitor balance regularly

---

## 📊 What's New in v2.0

### vs v1.0 (Single Strategy)
- ✅ **4 strategies** instead of 1
- ✅ **Per-strategy performance tracking**
- ✅ **Flexible strategy selection**
- ✅ **Position limits per strategy**
- ✅ **Strategy-specific profit targets and stop losses**
- ✅ **Comprehensive strategy documentation**

### Improvements
- Better risk management with per-strategy limits
- More trading opportunities with multiple strategies
- Diversification across different market conditions
- Detailed performance analytics per strategy

---

## 📞 Support

For issues or questions:
1. Check logs: `pm2 logs trading-bot`
2. Review strategy guide: `cat STRATEGIES.md`
3. Check trade history: `cat trades.csv`
4. Review configuration: `cat config.js`

---

## 📝 Changelog

### v2.1.0 (2025-12-02)
- Added WebSocket support for real-time price updates
- Reduced scan interval to 30 seconds
- Eliminated API rate limit issues
- Added automatic WebSocket reconnection
- Added ws dependency for WebSocket support

### v2.0.0 (2025-12-02)
- Added 3 new strategies (MACD, Bollinger Bands, EMA Crossover)
- Added per-strategy performance tracking
- Added flexible strategy enable/disable
- Added per-strategy position limits
- Added comprehensive strategy documentation
- Improved logging with strategy attribution

### v1.0.0 (2025-12-02)
- Initial production release
- RSI + Momentum strategy
- Basic safety features
- PM2 integration

---

## 📄 License

MIT License - Free to use and modify

---

## ⚠️ Disclaimer

**Trading cryptocurrency involves significant risk of loss. This bot is provided as-is with no guarantees of profit. Always:**
- Start with small amounts
- Monitor performance closely
- Understand each strategy before enabling
- Never invest more than you can afford to lose
- Test in paper trading mode first if possible

**Past performance does not guarantee future results.**

Different strategies perform better in different market conditions. Monitor performance and adjust accordingly.

---

**Happy Trading! 🚀📈**
