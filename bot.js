#!/usr/bin/env node

/**
 * Binance US Multi-Strategy Trading Bot - WebSocket Edition
 * Strategies: RSI+Momentum, MACD, Bollinger Bands, EMA Crossover
 * Uses WebSocket for real-time price updates to avoid API rate limits
 */

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const WebSocket = require("ws");
const config = require("./config");

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
  positions: {},
  dailyPnL: 0,
  consecutiveLosses: 0,
  lastResetDate: new Date().toDateString(),
  isEmergencyStopped: false,
  strategyStats: {
    rsiMomentum: { trades: 0, wins: 0, pnl: 0 },
    macd: { trades: 0, wins: 0, pnl: 0 },
    bollingerBands: { trades: 0, wins: 0, pnl: 0 },
    emaCrossover: { trades: 0, wins: 0, pnl: 0 },
  },
  prices: {},              // Real-time prices from WebSocket
  priceHistory: {},        // Historical prices for indicators
  websockets: {},          // WebSocket connections
  symbolInfo: {},          // Exchange info for lot sizes
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...data };
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console.log(logLine);

  if (config.safety.enableTradeLogging) {
    fs.appendFileSync(config.logging.logFile, JSON.stringify(logEntry) + "\n");
  }
}

function logTrade(trade) {
  const timestamp = new Date().toISOString();
  const csvLine = `${timestamp},${trade.type},${trade.symbol},${trade.quantity},${trade.price},${trade.usdValue},${trade.orderId || "N/A"},${trade.strategy},${trade.pnl || 0}\n`;

  if (!fs.existsSync(config.logging.tradeLogFile)) {
    fs.writeFileSync(
      config.logging.tradeLogFile,
      "Timestamp,Type,Symbol,Quantity,Price,USD_Value,Order_ID,Strategy,PnL\n"
    );
  }

  fs.appendFileSync(config.logging.tradeLogFile, csvLine);
  log("info", `Trade logged: ${trade.type} ${trade.symbol} (${trade.strategy})`, trade);
}

// ============================================================================
// BINANCE API CLIENT
// ============================================================================

function apiRequest(endpoint, params = {}, method = "GET") {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };
    const queryString = new URLSearchParams(queryParams).toString();
    const signature = crypto
      .createHmac("sha256", config.apiSecret)
      .update(queryString)
      .digest("hex");

    const fullQuery = `${queryString}&signature=${signature}`;
    const path = `${endpoint}?${fullQuery}`;

    const options = {
      hostname: "api.binance.us",
      path,
      method,
      headers: { "X-MBX-APIKEY": config.apiKey },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code && parsed.code < 0) {
            reject(new Error(`API Error: ${parsed.msg}`));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}`));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

async function apiWithRetry(endpoint, params = {}, method = "GET", retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiRequest(endpoint, params, method);
    } catch (err) {
      log("warn", `API call failed (attempt ${i + 1}/${retries}): ${err.message}`);
      if (i === retries - 1) throw err;
      await sleep(1000 * (i + 1));
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// WEBSOCKET PRICE STREAMING
// ============================================================================

function connectWebSocket(symbol) {
  const wsSymbol = symbol.toLowerCase();
  const wsUrl = `wss://stream.binance.us:9443/ws/${wsSymbol}@trade`;

  log("info", `Connecting WebSocket for ${symbol}...`);

  const ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    log("info", `✅ WebSocket connected: ${symbol}`);
  });

  ws.on("message", (data) => {
    try {
      const trade = JSON.parse(data);
      const price = parseFloat(trade.p);

      // Update current price
      state.prices[symbol] = price;

      // Update price history (keep last 100 prices)
      if (!state.priceHistory[symbol]) {
        state.priceHistory[symbol] = [];
      }
      state.priceHistory[symbol].push(price);
      if (state.priceHistory[symbol].length > 100) {
        state.priceHistory[symbol].shift();
      }
    } catch (err) {
      log("error", `WebSocket message error for ${symbol}: ${err.message}`);
    }
  });

  ws.on("error", (err) => {
    log("error", `WebSocket error for ${symbol}: ${err.message}`);
  });

  ws.on("close", () => {
    log("warn", `WebSocket closed for ${symbol}, reconnecting in ${config.websocket.reconnectDelay}ms...`);
    setTimeout(() => connectWebSocket(symbol), config.websocket.reconnectDelay);
  });

  state.websockets[symbol] = ws;
}

function initializeWebSockets() {
  if (!config.websocket.enabled) {
    log("info", "WebSocket disabled, using REST API only");
    return;
  }

  log("info", "Initializing WebSocket connections...");
  for (const pair of config.tradingPairs) {
    connectWebSocket(pair);
  }
}

// ============================================================================
// TECHNICAL INDICATORS
// ============================================================================

function calculateEMA(prices, period) {
  if (prices.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMomentum(prices, period = 10) {
  if (prices.length < period + 1) return null;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - period - 1];
  return ((current - past) / past) * 100;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) return null;

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  if (!fastEMA || !slowEMA) return null;
  
  const macdLine = fastEMA - slowEMA;
  
  const macdHistory = [];
  for (let i = slowPeriod; i < prices.length; i++) {
    const slicePrices = prices.slice(0, i + 1);
    const fEMA = calculateEMA(slicePrices, fastPeriod);
    const sEMA = calculateEMA(slicePrices, slowPeriod);
    if (fEMA && sEMA) {
      macdHistory.push(fEMA - sEMA);
    }
  }
  
  const signalLine = calculateEMA(macdHistory, signalPeriod);
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - (signalLine || 0),
  };
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) return null;

  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
  
  const squaredDiffs = recentPrices.map(price => Math.pow(price - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
  const stdDeviation = Math.sqrt(variance);

  return {
    upper: sma + stdDev * stdDeviation,
    middle: sma,
    lower: sma - stdDev * stdDeviation,
  };
}

// ============================================================================
// MARKET DATA
// ============================================================================

async function getHistoricalPrices(symbol, limit = 100) {
  try {
    // Use public endpoint (no auth required)
    const klines = await new Promise((resolve, reject) => {
      const url = `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=1h&limit=${limit}`;
      https.get(url, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.code && parsed.code < 0) {
              reject(new Error(`API Error: ${parsed.msg}`));
            } else {
              resolve(parsed);
            }
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      }).on("error", reject).setTimeout(10000, () => {
        reject(new Error("Request timeout"));
      });
    });
    return klines.map((k) => parseFloat(k[4]));
  } catch (err) {
    log("error", `Failed to get historical prices for ${symbol}: ${err.message}`);
    return null;
  }
}

function getCurrentPrice(symbol) {
  // Use WebSocket price if available
  if (state.prices[symbol]) {
    return state.prices[symbol];
  }
  
  // Fallback to public REST API (no auth)
  return new Promise((resolve, reject) => {
    const url = `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`;
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code && parsed.code < 0) {
            reject(new Error(`API Error: ${parsed.msg}`));
          } else {
            resolve(parseFloat(parsed.price));
          }
        } catch (err) {
          reject(new Error(`Parse error: ${err.message}`));
        }
      });
    }).on("error", reject).setTimeout(10000, () => {
      reject(new Error("Request timeout"));
    });
  }).catch(err => {
    log("error", `Failed to get current price for ${symbol}: ${err.message}`);
    return null;
  });
}

async function getSymbolInfo(symbol) {
  // Return cached info if available
  if (state.symbolInfo[symbol]) {
    return state.symbolInfo[symbol];
  }
  
  try {
    // Fetch exchange info (public endpoint)
    const data = await new Promise((resolve, reject) => {
      const url = `https://api.binance.us/api/v3/exchangeInfo?symbol=${symbol}`;
      https.get(url, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(`Parse error: ${err.message}`));
          }
        });
      }).on("error", reject).setTimeout(10000, () => {
        reject(new Error("Request timeout"));
      });
    });
    
    if (data.symbols && data.symbols.length > 0) {
      const symbolData = data.symbols[0];
      const lotSizeFilter = symbolData.filters.find(f => f.filterType === "LOT_SIZE");
      const marketLotSizeFilter = symbolData.filters.find(f => f.filterType === "MARKET_LOT_SIZE");
      const minNotionalFilter = symbolData.filters.find(f => f.filterType === "NOTIONAL");
      
      const info = {
        minQty: parseFloat(lotSizeFilter.minQty),
        maxQty: parseFloat(lotSizeFilter.maxQty),
        stepSize: parseFloat(lotSizeFilter.stepSize),
        marketMaxQty: marketLotSizeFilter ? parseFloat(marketLotSizeFilter.maxQty) : parseFloat(lotSizeFilter.maxQty),
        minNotional: minNotionalFilter ? parseFloat(minNotionalFilter.minNotional) : 10,
        baseAssetPrecision: symbolData.baseAssetPrecision,
        quotePrecision: symbolData.quotePrecision,
      };
      
      state.symbolInfo[symbol] = info;
      return info;
    }
    
    throw new Error("Symbol info not found");
  } catch (err) {
    log("error", `Failed to get symbol info for ${symbol}: ${err.message}`);
    // Return safe defaults
    return {
      minQty: 0.00001,
      maxQty: 9000000,
      stepSize: 0.00001,
      marketMaxQty: 1.0,  // Conservative default for market orders
      minNotional: 10,
      baseAssetPrecision: 8,
      quotePrecision: 8,
    };
  }
}

function roundQuantity(quantity, stepSize) {
  // Round quantity to match step size
  const precision = stepSize.toString().split('.')[1]?.length || 0;
  const factor = Math.pow(10, precision);
  return Math.floor(quantity * factor) / factor;
}

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

async function getAccountBalance() {
  try {
    const account = await apiWithRetry("/api/v3/account");
    const usd = account.balances.find((b) => b.asset === "USD");
    const usdt = account.balances.find((b) => b.asset === "USDT");
    
    return {
      usd: parseFloat(usd?.free || 0),
      usdt: parseFloat(usdt?.free || 0),
      total: parseFloat(usd?.free || 0) + parseFloat(usdt?.free || 0),
    };
  } catch (err) {
    log("error", `Failed to get account balance: ${err.message}`);
    return null;
  }
}

// ============================================================================
// TRADING EXECUTION
// ============================================================================

async function executeBuy(symbol, usdAmount, strategy) {
  try {
    const price = await getCurrentPrice(symbol);
    if (!price) throw new Error("Failed to get current price");
    
    // Get symbol info for lot size rules
    const symbolInfo = await getSymbolInfo(symbol);
    
    // Calculate quantity
    let quantity = usdAmount / price;
    
    // Round to step size
    quantity = roundQuantity(quantity, symbolInfo.stepSize);
    
    // Ensure minimum quantity
    if (quantity < symbolInfo.minQty) {
      quantity = symbolInfo.minQty;
    }
    
    // Ensure minimum notional value
    const notional = quantity * price;
    if (notional < symbolInfo.minNotional) {
      quantity = symbolInfo.minNotional / price;
      quantity = roundQuantity(quantity, symbolInfo.stepSize);
    }
    
    // Ensure maximum quantity (use marketMaxQty for market orders)
    if (quantity > symbolInfo.marketMaxQty) {
      log("warn", `Quantity ${quantity} exceeds MARKET_LOT_SIZE max ${symbolInfo.marketMaxQty}, reducing`);
      quantity = symbolInfo.marketMaxQty;
    }
    
    // Final rounding after all adjustments
    quantity = roundQuantity(quantity, symbolInfo.stepSize);
    
    log("info", `Executing BUY: ${symbol} - ${quantity} @ $${price.toFixed(2)} (${strategy})`);
    const order = await apiWithRetry("/api/v3/order", {
      symbol,
      side: "BUY",
      type: "MARKET",
      quantity: quantity.toString(),
    }, "POST");

    const trade = {
      type: "BUY",
      symbol,
      quantity,
      price,
      usdValue: usdAmount,
      orderId: order.orderId,
      strategy,
    };

    logTrade(trade);

    state.positions[symbol] = {
      strategy,
      quantity: parseFloat(quantity),
      avgPrice: price,
      entryTime: Date.now(),
    };

    return order;
  } catch (err) {
    log("error", `Buy order failed for ${symbol}: ${err.message}`);
    return null;
  }
}

async function executeSell(symbol, quantity, reason, strategy) {
  try {
    const entryPrice = state.positions[symbol]?.avgPrice || 0;
    const currentPrice = await getCurrentPrice(symbol);
    if (!currentPrice) throw new Error("Failed to get current price");
    
    // Get symbol info for lot size rules
    const symbolInfo = await getSymbolInfo(symbol);
    
    // Round quantity to step size
    quantity = roundQuantity(quantity, symbolInfo.stepSize);
    
    const pnl = (currentPrice - entryPrice) * quantity;
    const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100;
    log("info", `Executing SELL: ${symbol} - ${quantity} @ $${currentPrice.toFixed(2)} (${strategy} - ${reason}) - P&L: $${pnl.toFixed(2)} (${pnlPct.toFixed(2)}%)`);
    const order = await apiWithRetry("/api/v3/order", {
      symbol,
      side: "SELL",
      type: "MARKET",
      quantity: quantity.toString(),
    }, "POST");

    const trade = {
      type: "SELL",
      symbol,
      quantity,
      price: currentPrice,
      usdValue: currentPrice * quantity,
      orderId: order.orderId,
      strategy: `${strategy}_${reason}`,
      pnl,
    };

    logTrade(trade);

    state.dailyPnL += pnl;
    state.strategyStats[strategy].trades++;
    if (pnl > 0) {
      state.strategyStats[strategy].wins++;
      state.consecutiveLosses = 0;
    } else {
      state.consecutiveLosses++;
    }
    state.strategyStats[strategy].pnl += pnl;

    delete state.positions[symbol];

    return order;
  } catch (err) {
    log("error", `Sell order failed for ${symbol}: ${err.message}`);
    return null;
  }
}

// ============================================================================
// TRADING STRATEGIES
// ============================================================================

async function analyzeRSIMomentum(symbol, prices) {
  if (!config.enabledStrategies.rsiMomentum) return null;

  const rsi = calculateRSI(prices, config.rsiMomentum.rsiPeriod);
  const momentum = calculateMomentum(prices, config.rsiMomentum.momentumPeriod);

  if (rsi === null || momentum === null) return null;

  return {
    strategy: "rsiMomentum",
    buySignal: rsi < config.rsiMomentum.rsiOversold && momentum > config.rsiMomentum.momentumThreshold,
    sellSignal: rsi > config.rsiMomentum.rsiOverbought,
    profitTarget: config.rsiMomentum.profitTarget,
    stopLoss: config.rsiMomentum.stopLoss,
    indicators: { rsi, momentum },
  };
}

async function analyzeMACD(symbol, prices) {
  if (!config.enabledStrategies.macd) return null;

  const macd = calculateMACD(
    prices,
    config.macd.fastPeriod,
    config.macd.slowPeriod,
    config.macd.signalPeriod
  );

  if (!macd) return null;

  const buySignal = macd.histogram > 0 && macd.macd > macd.signal;
  const sellSignal = macd.histogram < 0 && macd.macd < macd.signal;

  return {
    strategy: "macd",
    buySignal,
    sellSignal,
    profitTarget: config.macd.profitTarget,
    stopLoss: config.macd.stopLoss,
    indicators: macd,
  };
}

async function analyzeBollingerBands(symbol, prices) {
  if (!config.enabledStrategies.bollingerBands) return null;

  const bb = calculateBollingerBands(
    prices,
    config.bollingerBands.period,
    config.bollingerBands.stdDev
  );

  if (!bb) return null;

  const currentPrice = prices[prices.length - 1];

  const buySignal = currentPrice <= bb.lower * 1.01;
  const sellSignal = currentPrice >= bb.upper * 0.99;

  return {
    strategy: "bollingerBands",
    buySignal,
    sellSignal,
    profitTarget: config.bollingerBands.profitTarget,
    stopLoss: config.bollingerBands.stopLoss,
    indicators: { ...bb, currentPrice },
  };
}

async function analyzeEMACrossover(symbol, prices) {
  if (!config.enabledStrategies.emaCrossover) return null;

  const fastEMA = calculateEMA(prices, config.emaCrossover.fastPeriod);
  const slowEMA = calculateEMA(prices, config.emaCrossover.slowPeriod);

  if (!fastEMA || !slowEMA) return null;

  const buySignal = fastEMA > slowEMA;
  const sellSignal = fastEMA < slowEMA;

  return {
    strategy: "emaCrossover",
    buySignal,
    sellSignal,
    profitTarget: config.emaCrossover.profitTarget,
    stopLoss: config.emaCrossover.stopLoss,
    indicators: { fastEMA, slowEMA },
  };
}

async function analyzeAllStrategies(symbol) {
  try {
    // Use WebSocket price history if available, otherwise fetch from API
    let prices = state.priceHistory[symbol];
    
    if (!prices || prices.length < 50) {
      prices = await getHistoricalPrices(symbol, 100);
      if (!prices || prices.length < 50) {
        log("warn", `Insufficient price data for ${symbol}`);
        return [];
      }
      // Initialize price history
      state.priceHistory[symbol] = prices;
    }

    const analyses = await Promise.all([
      analyzeRSIMomentum(symbol, prices),
      analyzeMACD(symbol, prices),
      analyzeBollingerBands(symbol, prices),
      analyzeEMACrossover(symbol, prices),
    ]);

    return analyses.filter(a => a !== null);
  } catch (err) {
    log("error", `Strategy analysis failed for ${symbol}: ${err.message}`);
    return [];
  }
}

// ============================================================================
// POSITION MANAGEMENT
// ============================================================================

async function checkExitConditions(symbol, position) {
  try {
    const currentPrice = await getCurrentPrice(symbol);
    if (!currentPrice) return false;

    // Check minimum hold time (prevents overtrading)
    const holdTimeSeconds = (Date.now() - position.entryTime) / 1000;
    if (holdTimeSeconds < config.risk.minHoldTime) {
      // Only allow exit if stop loss is hit during min hold time
      const pnlPct = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;
      const strategyConfig = config[position.strategy];
      if (pnlPct <= -strategyConfig.stopLoss) {
        log("warn", `Stop loss triggered for ${symbol} (${position.strategy}) during min hold time: ${pnlPct.toFixed(2)}%`);
        await executeSell(symbol, position.quantity, "STOP_LOSS", position.strategy);
        return true;
      }
      return false; // Don't exit yet, haven't held long enough
    }

    const pnlPct = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;
    const strategyConfig = config[position.strategy];

    if (pnlPct >= strategyConfig.profitTarget) {
      log("info", `Profit target hit for ${symbol} (${position.strategy}): ${pnlPct.toFixed(2)}%`);
      await executeSell(symbol, position.quantity, "PROFIT_TARGET", position.strategy);
      return true;
    }

    if (pnlPct <= -strategyConfig.stopLoss) {
      log("warn", `Stop loss triggered for ${symbol} (${position.strategy}): ${pnlPct.toFixed(2)}%`);
      await executeSell(symbol, position.quantity, "STOP_LOSS", position.strategy);
      return true;
    }

    const analyses = await analyzeAllStrategies(symbol);
    const strategyAnalysis = analyses.find(a => a.strategy === position.strategy);
    
    if (strategyAnalysis && strategyAnalysis.sellSignal) {
      log("info", `Sell signal for ${symbol} (${position.strategy})`);
      await executeSell(symbol, position.quantity, "SIGNAL", position.strategy);
      return true;
    }

    return false;
  } catch (err) {
    log("error", `Exit check failed for ${symbol}: ${err.message}`);
    return false;
  }
}

// ============================================================================
// MAIN TRADING LOOP
// ============================================================================

async function scanMarkets() {
  if (state.isEmergencyStopped) {
    log("warn", "Emergency stop active, skipping scan");
    return;
  }

  const today = new Date().toDateString();
  if (today !== state.lastResetDate) {
    log("info", `New day started. Yesterday's P&L: $${state.dailyPnL.toFixed(2)}`);
    state.dailyPnL = 0;
    state.consecutiveLosses = 0;
    state.lastResetDate = today;
  }

  if (state.dailyPnL <= -config.risk.maxDailyLoss) {
    log("error", `Daily loss limit reached: $${state.dailyPnL.toFixed(2)}. Stopping trading for today.`);
    state.isEmergencyStopped = true;
    return;
  }

  if (state.consecutiveLosses >= config.safety.maxConsecutiveLosses) {
    log("error", `${state.consecutiveLosses} consecutive losses. Stopping trading.`);
    state.isEmergencyStopped = true;
    return;
  }

  log("info", "Scanning markets with all strategies...");

  for (const symbol of Object.keys(state.positions)) {
    await checkExitConditions(symbol, state.positions[symbol]);
    await sleep(500);
  }

  const balance = await getAccountBalance();
  if (!balance || balance.total < config.risk.minTradeSize) {
    log("warn", `Insufficient balance: $${balance?.total || 0}`);
    return;
  }

  for (const pair of config.tradingPairs) {
    if (state.positions[pair]) {
      continue;
    }

    const analyses = await analyzeAllStrategies(pair);
    
    for (const analysis of analyses) {
      if (!analysis.buySignal) continue;

      const strategyPositions = Object.values(state.positions).filter(
        p => p.strategy === analysis.strategy
      ).length;
      
      if (strategyPositions >= config.risk.maxPositionsPerStrategy) {
        log("debug", `Max positions reached for ${analysis.strategy}`);
        continue;
      }

      // Determine which currency this pair uses
      const isUSDT = pair.endsWith('USDT');
      const availableBalance = isUSDT ? balance.usdt : balance.usd;
      
      // Count positions using this currency
      const currencyPositions = Object.keys(state.positions).filter(
        p => isUSDT ? p.endsWith('USDT') : p.endsWith('USD')
      ).length;
      
      // Calculate trade size based on currency-specific balance
      const maxPositionsForCurrency = 4; // 4 USD pairs + 4 USDT pairs
      const tradeSize = Math.min(
        availableBalance * config.risk.maxPositionSize,
        availableBalance / (maxPositionsForCurrency - currencyPositions)
      );

      if (tradeSize >= config.risk.minTradeSize && availableBalance >= config.risk.minTradeSize) {
        log("info", `BUY SIGNAL: ${pair} (${analysis.strategy}) - ${JSON.stringify(analysis.indicators)}`);
        await executeBuy(pair, tradeSize, analysis.strategy);
        break;
      }
    }

    await sleep(500);
  }

  log("info", `Scan complete. Positions: ${Object.keys(state.positions).length}, Daily P&L: $${state.dailyPnL.toFixed(2)}`);
  for (const [strategy, stats] of Object.entries(state.strategyStats)) {
    if (stats.trades > 0) {
      const winRate = (stats.wins / stats.trades * 100).toFixed(1);
      log("info", `  ${strategy}: ${stats.trades} trades, ${winRate}% win rate, $${stats.pnl.toFixed(2)} P&L`);
    }
  }
}

// ============================================================================
// STARTUP & MAIN LOOP
// ============================================================================

async function startup() {
  console.log("=".repeat(60));
  console.log("🚀 BINANCE US MULTI-STRATEGY TRADING BOT v2.1 (WebSocket)");
  console.log("=".repeat(60));

  try {
    const balance = await getAccountBalance();
    if (!balance) {
      throw new Error("Failed to connect to Binance API");
    }

    log("info", `✅ Connected to Binance US`);
    log("info", `💰 Balance: $${balance.total.toFixed(2)} USD`);
    log("info", `📊 Monitoring pairs: ${config.tradingPairs.join(", ")}`);
    log("info", `⏱️  Scan interval: ${config.scanInterval / 1000} seconds`);
    
    console.log("\n📈 Enabled Strategies:");
    for (const [strategy, enabled] of Object.entries(config.enabledStrategies)) {
      if (enabled) {
        console.log(`  ✅ ${strategy}`);
      }
    }

    // Pre-load historical data for all pairs
    console.log("\n📊 Loading historical price data...");
    for (const pair of config.tradingPairs) {
      try {
        const prices = await getHistoricalPrices(pair, 100);
        if (prices && prices.length >= 50) {
          state.priceHistory[pair] = prices;
          log("info", `✅ Loaded ${prices.length} candles for ${pair}`);
        } else {
          log("warn", `⚠️  Failed to load sufficient data for ${pair}`);
        }
      } catch (err) {
        log("error", `Failed to load historical data for ${pair}: ${err.message}`);
      }
      await sleep(500); // Rate limit protection
    }

    // Initialize WebSocket connections
    if (config.websocket.enabled) {
      console.log("\n🔌 Initializing WebSocket connections...");
      initializeWebSockets();
      await sleep(2000); // Wait for WebSocket connections
    }

    console.log("=".repeat(60));
    log("info", "Bot started successfully!");
    log("info", `Historical data loaded for ${Object.keys(state.priceHistory).length} pairs`);

    setInterval(scanMarkets, config.scanInterval);
    scanMarkets();

  } catch (err) {
    log("error", `Startup failed: ${err.message}`);
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  log("info", "Received SIGINT, shutting down gracefully...");
  log("info", `Final daily P&L: $${state.dailyPnL.toFixed(2)}`);
  log("info", `Open positions: ${Object.keys(state.positions).length}`);
  
  // Close WebSocket connections
  for (const [symbol, ws] of Object.entries(state.websockets)) {
    ws.close();
  }
  
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("info", "Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

startup();
