# Portfolio Rebalancing Module - Design Document

## 🎯 Objective

Build a portfolio management system that:
1. Tracks ALL crypto holdings (not just bot-opened positions)
2. Applies trading strategies to existing holdings
3. Sells underperforming assets based on signals
4. Buys high-conviction assets
5. Maintains 20-30% cash reserve for opportunities

## 📊 Current State

### User's Holdings:
```
BTC:  0.03482 ($3,175)
ETH:  1.54158 ($4,607) - 0.143 ETH locked
SOL:  25.111 ($3,462)
AVAX: 55.662 ($760)
USD:  $28.21 free + $599.29 locked
USDT: $49.50

Total Value: $12,632
Cash: $77.71 (6.1%)
Crypto: $12,004 (93.9%)
```

### Problem:
- Bot only manages positions it opens
- Existing crypto sits idle
- No rebalancing based on signals
- Cash allocation too low (6% vs target 20-30%)

## 🏗️ Architecture

### Components:

1. **Portfolio Inventory Manager**
   - Fetches all balances from Binance
   - Calculates current values
   - Tracks allocation percentages

2. **Signal Analyzer**
   - Applies strategies to ALL holdings
   - Identifies sell signals on existing positions
   - Identifies buy signals for new positions

3. **Rebalancing Engine**
   - Decides what to sell/buy
   - Calculates optimal quantities
   - Executes rebalancing trades

4. **Cash Reserve Manager**
   - Ensures minimum cash reserve (20-30%)
   - Prevents over-allocation
   - Keeps dry powder for dips

## 🔄 Workflow

### Startup:
```
1. Load all holdings from Binance
2. Calculate portfolio allocation
3. Identify existing positions
4. Initialize portfolio state
```

### Every Scan (30 seconds):
```
1. Check existing holdings for sell signals
2. Check cash for buy opportunities
3. Rebalance if needed:
   a. Sell underperformers
   b. Buy strong signals
   c. Maintain cash reserve
```

### Rebalancing Logic:
```
IF holding has SELL signal:
  → Sell to cash
  
IF cash > 30% AND strong BUY signal:
  → Buy new position
  
IF cash < 20%:
  → Sell weakest holding to raise cash
  
IF cash > 40%:
  → Buy strongest signal
```

## 📝 Data Structures

### Portfolio State:
```javascript
state.portfolio = {
  holdings: {
    "BTC": {
      quantity: 0.03482,
      value: 3175,
      allocation: 25.1%,
      entryPrice: unknown,  // Can't know historical entry
      currentPrice: 91182,
      pnl: unknown,
      signal: "HOLD"  // Current strategy signal
    },
    "ETH": { ... },
    "SOL": { ... },
    "AVAX": { ... }
  },
  cash: {
    USD: 28.21,
    USDT: 49.50,
    total: 77.71,
    allocation: 6.1%
  },
  totalValue: 12632,
  lastRebalance: timestamp
}
```

## 🎯 Rebalancing Rules

### Rule 1: Maintain Cash Reserve
```
Target: 20-30% in cash
Current: 6.1%

Action: Sell weakest holdings to reach 20% cash
```

### Rule 2: Sell on Signals
```
For each holding:
  Apply all strategies
  If ANY strategy shows SELL signal:
    → Sell entire holding
    → Convert to cash
```

### Rule 3: Buy on Signals
```
If cash > 30%:
  Scan for BUY signals
  If strong signal found:
    → Buy with excess cash
    → Keep 20% minimum reserve
```

### Rule 4: Position Limits
```
Max per asset: 30% of portfolio
Min per asset: 5% of portfolio (or sell)
Max total crypto: 80% (keep 20% cash minimum)
```

## 🔧 Implementation

### File Structure:
```
bot.js                    # Main bot (existing)
portfolio-manager.js      # NEW: Portfolio management
config.js                 # Add portfolio config
```

### New Config:
```javascript
portfolio: {
  enabled: true,
  minCashReserve: 0.20,      // 20% minimum
  targetCashReserve: 0.25,   // 25% target
  maxCashReserve: 0.40,      // 40% maximum
  rebalanceInterval: 300,     // 5 minutes
  minPositionSize: 0.05,      // 5% minimum per asset
  maxPositionSize: 0.30,      // 30% maximum per asset
  sellOnSignal: true,         // Sell holdings on sell signals
  maintainReserve: true,      // Always keep cash reserve
}
```

### Key Functions:

```javascript
// Load all holdings
async function loadPortfolio()

// Calculate allocation
function calculateAllocation(portfolio)

// Check holdings for signals
async function scanHoldingsForSignals()

// Execute rebalancing
async function rebalancePortfolio()

// Sell holding
async function sellHolding(asset, quantity, reason)

// Ensure cash reserve
async function ensureCashReserve()
```

## ⚠️ Safety Features

### 1. Minimum Hold Time
```
Don't sell holdings bought < 5 minutes ago
(Already implemented in bot)
```

### 2. Stop Loss Protection
```
If holding is down >10% from current price:
  → Don't sell on signal
  → Wait for recovery or stop loss
```

### 3. Gradual Rebalancing
```
Don't rebalance entire portfolio at once
Max 2-3 trades per rebalance cycle
Spread over multiple scans
```

### 4. Cash Reserve Lock
```
NEVER go below 15% cash
Even if strong buy signal
Safety buffer for emergencies
```

## 📊 Example Scenarios

### Scenario 1: Initial Rebalance
```
Current:
- Cash: $77 (6%)
- Crypto: $12,004 (94%)

Target:
- Cash: $2,526 (20%)
- Crypto: $10,106 (80%)

Action:
1. Scan holdings for weakest signal
2. Sell $2,449 of weakest assets
3. Convert to cash
4. Reach 20% cash reserve
```

### Scenario 2: Sell Signal on Holding
```
Current:
- ETH: $4,607 (36% of portfolio)
- ETH signal: SELL (MACD bearish)

Action:
1. Sell all 1.54158 ETH
2. Convert to $4,607 USDT
3. Cash reserve: $4,684 (37%)
4. Wait for buy signals
```

### Scenario 3: Buy Signal with Excess Cash
```
Current:
- Cash: $4,684 (37%)
- BTC signal: STRONG BUY (all strategies bullish)

Action:
1. Calculate excess cash: $4,684 - 20% = $2,158
2. Buy BTC with $2,158
3. New cash: $2,526 (20%)
4. New BTC holding: $2,158
```

### Scenario 4: Rebalance to Targets
```
Current allocation:
- BTC: 25%
- ETH: 36% ← Over max (30%)
- SOL: 27%
- AVAX: 6%
- Cash: 6% ← Under min (20%)

Actions:
1. Sell 6% of ETH → $758 to cash
2. Sell all AVAX (under 5% min) → $760 to cash
3. New cash: $1,595 (12.6%)
4. Sell 7.4% more (weakest signal) → $935
5. Final cash: $2,530 (20%)
```

## 🚀 Deployment Plan

### Phase 1: Build Core (30 min)
- [ ] Create portfolio-manager.js
- [ ] Implement loadPortfolio()
- [ ] Implement calculateAllocation()
- [ ] Test with real balances

### Phase 2: Signal Integration (30 min)
- [ ] Apply strategies to holdings
- [ ] Identify sell signals
- [ ] Implement sellHolding()
- [ ] Test sell logic

### Phase 3: Cash Management (15 min)
- [ ] Implement ensureCashReserve()
- [ ] Add rebalancing logic
- [ ] Test cash targets

### Phase 4: Integration (15 min)
- [ ] Integrate with main bot
- [ ] Add to scan cycle
- [ ] Update config
- [ ] Test end-to-end

### Phase 5: Deploy (10 min)
- [ ] Create v2.2.0 package
- [ ] Deploy to VPS
- [ ] Monitor first rebalance
- [ ] Verify behavior

## ✅ Success Criteria

After deployment:
- ✅ Bot tracks all holdings
- ✅ Cash reserve reaches 20-30%
- ✅ Holdings sold on sell signals
- ✅ New positions opened on buy signals
- ✅ Portfolio balanced according to rules
- ✅ No over-allocation
- ✅ Maintains minimum cash buffer

## 📈 Expected Outcome

### Before (Current):
```
Cash: $77 (6%)
Crypto: $12,004 (94%)
Idle assets: Yes
Rebalancing: No
Signal-based selling: No
```

### After (v2.2.0):
```
Cash: $2,526 (20%)
Crypto: $10,106 (80%)
Idle assets: No
Rebalancing: Yes (every 5 min)
Signal-based selling: Yes
Active management: Full portfolio
```

## 🎯 Next Steps

1. Build portfolio-manager.js
2. Test with user's actual holdings
3. Deploy as v2.2.0
4. Monitor for 24 hours
5. Optimize based on performance
