// Multi-Strategy Trading Bot Configuration - WebSocket Edition
module.exports = {
  // Binance US API Credentials
  apiKey: "u3xWfmbbkcuouo2EfY416zzxDrARs6kJEfPx4y3Tq0lTPG0S1bjDb4o1UJnYGuRZ",
  apiSecret: "pJOUr8CkDHVKcf9dsG51Ca2xADZ2PlPOW10IV7y2fdC6bkhZQAlxTt2ZNsUyFnZA",

  // Trading Pairs to Monitor (both USD and USDT pairs)
  tradingPairs: [
    "BTCUSD", "ETHUSD", "SOLUSD", "AVAXUSD",      // USD pairs
    "BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT"   // USDT pairs
  ],

  // WebSocket Configuration
  websocket: {
    enabled: true,
    reconnectDelay: 5000,    // Reconnect after 5 seconds if disconnected
  },

  // ============================================================================
  // STRATEGY SELECTION - Enable/Disable Strategies
  // ============================================================================
  enabledStrategies: {
    rsiMomentum: true,      // RSI + Momentum (proven strategy)
    macd: true,             // MACD Crossover (trend following)
    bollingerBands: false,  // DISABLED - Was overtrading (204 trades in 1 hour!)
    emaCrossover: true,     // EMA Crossover (moving averages)
  },

  // ============================================================================
  // STRATEGY 1: RSI + MOMENTUM
  // ============================================================================
  rsiMomentum: {
    rsiPeriod: 14,
    rsiOversold: 40,        // Buy when RSI < 40
    rsiOverbought: 70,      // Sell when RSI > 70
    momentumPeriod: 10,
    momentumThreshold: 2.0, // Buy when momentum > 2%
    profitTarget: 3.0,      // Take profit at 3%
    stopLoss: 2.0,          // Stop loss at -2%
  },

  // ============================================================================
  // STRATEGY 2: MACD CROSSOVER
  // ============================================================================
  macd: {
    fastPeriod: 12,         // Fast EMA period
    slowPeriod: 26,         // Slow EMA period
    signalPeriod: 9,        // Signal line period
    profitTarget: 4.0,      // Take profit at 4%
    stopLoss: 2.5,          // Stop loss at -2.5%
  },

  // ============================================================================
  // STRATEGY 3: BOLLINGER BANDS
  // ============================================================================
  bollingerBands: {
    period: 20,             // Moving average period
    stdDev: 2,              // Standard deviations
    profitTarget: 2.5,      // Take profit at 2.5%
    stopLoss: 1.5,          // Stop loss at -1.5%
  },

  // ============================================================================
  // STRATEGY 4: EMA CROSSOVER
  // ============================================================================
  emaCrossover: {
    fastPeriod: 9,          // Fast EMA (short-term)
    slowPeriod: 21,         // Slow EMA (long-term)
    profitTarget: 3.5,      // Take profit at 3.5%
    stopLoss: 2.0,          // Stop loss at -2%
  },

  // ============================================================================
  // RISK MANAGEMENT
  // ============================================================================
  risk: {
    maxPositionSize: 0.35,     // Use 35% of available balance per trade - AGGRESSIVE (allows 2-3 positions per currency)
    minTradeSize: 10,          // Minimum $10 per trade
    maxDailyLoss: 100,         // Stop trading if daily loss exceeds $100
    maxOpenPositions: 12,      // Max 12 positions total (6 USD + 6 USDT pairs) - AGGRESSIVE
    maxPositionsPerStrategy: 6, // Max 6 positions per strategy (3 USD + 3 USDT) - AGGRESSIVE
    minHoldTime: 300,          // Minimum 5 minutes (300 seconds) before selling - prevents overtrading
  },

  // ============================================================================
  // TIMING
  // ============================================================================
  scanInterval: 30000,         // Check strategies every 30 seconds (WebSocket provides real-time prices)
  
  // ============================================================================
  // SAFETY FEATURES
  // ============================================================================
  safety: {
    enableEmergencyStop: true,
    enableDailyReports: true,
    enableTradeLogging: true,
    maxConsecutiveLosses: 3,   // Stop after 3 losses in a row
  },

  // ============================================================================
  // LOGGING
  // ============================================================================
  logging: {
    logLevel: "info",          // info, debug, warn, error
    logFile: "bot.log",
    tradeLogFile: "trades.csv",
  },

  // ============================================================================
  // PORTFOLIO REBALANCING
  // ============================================================================
  portfolio: {
    enabled: true,             // Enable portfolio management
    minCashReserve: 0.10,      // 10% minimum cash - AGGRESSIVE
    targetCashReserve: 0.12,   // 12% target cash - AGGRESSIVE
    maxCashReserve: 0.15,      // 15% maximum cash - AGGRESSIVE (deploy more)
    rebalanceInterval: 120,     // Rebalance every 2 minutes (120 seconds) - AGGRESSIVE
    minPositionSize: 0.05,      // 5% minimum per asset (sell if below)
    maxPositionSize: 0.30,      // 30% maximum per asset (rebalance if above)
    sellOnSignal: true,         // Sell existing holdings on sell signals
    maintainReserve: true,      // Always maintain minimum cash reserve
  },
};
