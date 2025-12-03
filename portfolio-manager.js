/**
 * Portfolio Rebalancing Manager
 * 
 * Manages entire portfolio including existing holdings
 * - Tracks all crypto + cash balances
 * - Applies strategies to existing holdings
 * - Sells underperformers on signals
 * - Maintains 20-30% cash reserve
 * - Rebalances based on allocation targets
 */

const config = require("./config");

// Portfolio state
const portfolioState = {
  holdings: {},      // All crypto holdings
  cash: {},          // USD + USDT balances
  totalValue: 0,     // Total portfolio value in USD
  lastRebalance: 0,  // Timestamp of last rebalance
  lastUpdate: 0,     // Timestamp of last portfolio update
};

/**
 * Load complete portfolio from Binance account
 */
async function loadPortfolio(getAccountBalanceFn, getCurrentPriceFn) {
  try {
    const account = await getAccountBalanceFn();
    
    // Get cash balances
    portfolioState.cash = {
      USD: account.usd || 0,
      USDT: account.usdt || 0,
      total: (account.usd || 0) + (account.usdt || 0),
    };
    
    // Get crypto holdings
    const cryptoAssets = ["BTC", "ETH", "SOL", "AVAX"];
    portfolioState.holdings = {};
    
    for (const asset of cryptoAssets) {
      // Get balance for each asset
      const usdPair = `${asset}USD`;
      const usdtPair = `${asset}USDT`;
      
      // Try to get quantity from account
      // Note: This requires extending getAccountBalance to return all assets
      const quantity = account[asset.toLowerCase()] || 0;
      
      if (quantity > 0) {
        // Get current price (try USDT pair first, fallback to USD)
        let price;
        try {
          price = await getCurrentPriceFn(usdtPair);
        } catch (err) {
          price = await getCurrentPriceFn(usdPair);
        }
        
        if (price) {
          portfolioState.holdings[asset] = {
            quantity,
            currentPrice: price,
            value: quantity * price,
            pair: usdtPair,  // Prefer USDT for trading
          };
        }
      }
    }
    
    // Calculate total value
    const cryptoValue = Object.values(portfolioState.holdings).reduce(
      (sum, h) => sum + h.value,
      0
    );
    portfolioState.totalValue = cryptoValue + portfolioState.cash.total;
    portfolioState.lastUpdate = Date.now();
    
    return portfolioState;
  } catch (err) {
    console.error(`[Portfolio] Failed to load portfolio: ${err.message}`);
    return null;
  }
}

/**
 * Calculate portfolio allocation percentages
 */
function calculateAllocation(portfolio) {
  if (!portfolio || portfolio.totalValue === 0) return null;
  
  const allocation = {
    cash: {
      value: portfolio.cash.total,
      percentage: (portfolio.cash.total / portfolio.totalValue) * 100,
    },
    holdings: {},
    totalValue: portfolio.totalValue,
  };
  
  for (const [asset, holding] of Object.entries(portfolio.holdings)) {
    allocation.holdings[asset] = {
      value: holding.value,
      percentage: (holding.value / portfolio.totalValue) * 100,
      quantity: holding.quantity,
    };
  }
  
  return allocation;
}

/**
 * Check if cash reserve is below minimum
 */
function needsCashRebalance(portfolio) {
  if (!portfolio) return false;
  
  const cashPercentage = (portfolio.cash.total / portfolio.totalValue) * 100;
  return cashPercentage < (config.portfolio.minCashReserve * 100);
}

/**
 * Check if cash reserve is above maximum
 */
function hasExcessCash(portfolio) {
  if (!portfolio) return false;
  
  const cashPercentage = (portfolio.cash.total / portfolio.totalValue) * 100;
  return cashPercentage > (config.portfolio.maxCashReserve * 100);
}

/**
 * Find weakest holding (for selling to raise cash)
 * Returns asset symbol or null
 */
function findWeakestHolding(portfolio, signalsFn) {
  if (!portfolio || !portfolio.holdings) return null;
  
  let weakest = null;
  let lowestScore = Infinity;
  
  for (const [asset, holding] of Object.entries(portfolio.holdings)) {
    // Skip if below minimum size
    const percentage = (holding.value / portfolio.totalValue) * 100;
    if (percentage < (config.portfolio.minPositionSize * 100)) {
      continue;
    }
    
    // Calculate "weakness score" (lower = weaker)
    // For now, use allocation percentage (sell smallest first)
    // TODO: Incorporate strategy signals
    const score = percentage;
    
    if (score < lowestScore) {
      lowestScore = score;
      weakest = asset;
    }
  }
  
  return weakest;
}

/**
 * Find strongest buy signal (for deploying excess cash)
 * Returns {pair, strategy, confidence} or null
 */
function findStrongestBuySignal(analyses) {
  if (!analyses || analyses.length === 0) return null;
  
  let strongest = null;
  let maxConfidence = 0;
  
  for (const analysis of analyses) {
    if (analysis.buySignal) {
      // Simple confidence: count how many strategies agree
      const confidence = 1;  // TODO: Improve confidence scoring
      
      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        strongest = analysis;
      }
    }
  }
  
  return strongest;
}

/**
 * Calculate how much cash to raise
 */
function calculateCashToRaise(portfolio) {
  if (!portfolio) return 0;
  
  const currentCash = portfolio.cash.total;
  const targetCash = portfolio.totalValue * config.portfolio.targetCashReserve;
  
  return Math.max(0, targetCash - currentCash);
}

/**
 * Calculate excess cash available for deployment
 */
function calculateExcessCash(portfolio) {
  if (!portfolio) return 0;
  
  const currentCash = portfolio.cash.total;
  const targetCash = portfolio.totalValue * config.portfolio.targetCashReserve;
  const minCash = portfolio.totalValue * config.portfolio.minCashReserve;
  
  // Only deploy cash above target, but keep minimum reserve
  const excess = currentCash - targetCash;
  const safeExcess = currentCash - minCash;
  
  return Math.min(excess, safeExcess);
}

/**
 * Check if holding should be sold based on signals
 */
async function shouldSellHolding(asset, holding, analyzeStrategiesFn) {
  if (!config.portfolio.sellOnSignal) return false;
  
  try {
    // Get strategy analyses for this asset's pair
    const analyses = await analyzeStrategiesFn(holding.pair);
    
    // Check if any strategy shows sell signal
    for (const analysis of analyses) {
      if (analysis && analysis.sellSignal) {
        return {
          shouldSell: true,
          reason: `${analysis.strategy} sell signal`,
          strategy: analysis.strategy,
        };
      }
    }
    
    return { shouldSell: false };
  } catch (err) {
    console.error(`[Portfolio] Error checking sell signal for ${asset}: ${err.message}`);
    return { shouldSell: false };
  }
}

/**
 * Log portfolio status
 */
function logPortfolioStatus(portfolio) {
  if (!portfolio) return;
  
  const allocation = calculateAllocation(portfolio);
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 PORTFOLIO STATUS");
  console.log("=".repeat(60));
  console.log(`Total Value: $${portfolio.totalValue.toFixed(2)}`);
  console.log(`Cash: $${portfolio.cash.total.toFixed(2)} (${allocation.cash.percentage.toFixed(1)}%)`);
  console.log(`  USD: $${portfolio.cash.USD.toFixed(2)}`);
  console.log(`  USDT: $${portfolio.cash.USDT.toFixed(2)}`);
  console.log("\nHoldings:");
  
  for (const [asset, data] of Object.entries(allocation.holdings)) {
    console.log(`  ${asset}: ${portfolio.holdings[asset].quantity.toFixed(6)} ($${data.value.toFixed(2)}, ${data.percentage.toFixed(1)}%)`);
  }
  
  console.log("=".repeat(60) + "\n");
}

module.exports = {
  portfolioState,
  loadPortfolio,
  calculateAllocation,
  needsCashRebalance,
  hasExcessCash,
  findWeakestHolding,
  findStrongestBuySignal,
  calculateCashToRaise,
  calculateExcessCash,
  shouldSellHolding,
  logPortfolioStatus,
};
