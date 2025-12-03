# Risk Management Optimization Plan

**Focus:** Protect capital and reduce drawdowns  
**Approach:** Conservative, data-driven risk controls  
**Timeline:** 4-6 weeks (parallel with performance optimizations)

---

## 🎯 Optimization #1: Volatility-Adjusted Stop Losses

### Current Behavior
```javascript
// Fixed 2% stop loss for all assets
const stopLoss = entryPrice * 0.98; // Always 2%
```

### Problem
- BTC volatility: ~3-5% daily → 2% stop too tight
- AVAX volatility: ~8-12% daily → 2% stop WAY too tight
- Gets stopped out on normal price action

### Proposed Behavior
```javascript
// ATR-based stop losses
const atr = calculateATR(pair, 14);
const volatility = atr / currentPrice;

let stopLossPct;
if (volatility < 0.02) {
  stopLossPct = 0.015; // Low volatility: 1.5% stop
} else if (volatility < 0.04) {
  stopLossPct = 0.020; // Medium: 2% stop
} else if (volatility < 0.06) {
  stopLossPct = 0.025; // High: 2.5% stop
} else {
  stopLossPct = 0.030; // Very high: 3% stop
}

const stopLoss = entryPrice * (1 - stopLossPct);
```

### Implementation
```javascript
// Update executeBuy to use dynamic stops
async function executeBuy(pair, tradeSize, strategy) {
  const atr = calculateATR(state.priceHistory[pair]);
  const currentPrice = state.prices[pair];
  const volatility = atr / currentPrice;
  
  // Calculate volatility-adjusted stop
  let stopLossPct = 0.020; // Default 2%
  if (volatility < 0.02) stopLossPct = 0.015;
  else if (volatility > 0.04) stopLossPct = 0.025;
  else if (volatility > 0.06) stopLossPct = 0.030;
  
  const stopLoss = entryPrice * (1 - stopLossPct);
  
  state.positions[pair] = {
    ...state.positions[pair],
    stopLoss,
    stopLossPct,
    atr,
    volatility,
  };
  
  log('info', `Stop loss: ${stopLossPct * 100}% (volatility: ${(volatility * 100).toFixed(2)}%)`);
}
```

### Expected Impact
- **Premature stops:** -40-60% (fewer whipsaws)
- **Average loss per trade:** -10-20% (better stops)
- **Win rate:** +5-10% (positions have room to breathe)
- **Risk:** LOW (still conservative stops)

### Success Metrics
- Stop loss hit rate < 30%
- Average loss per trade < $3
- No increase in max loss per trade

---

## 🎯 Optimization #2: Trailing Stop Losses

### Current Behavior
```javascript
// Fixed stop loss, never moves
if (currentPrice <= position.stopLoss) {
  executeSell(); // ← Locks in loss
}
```

### Problem
- Profit turns to loss when price retraces
- No protection of unrealized gains
- All-or-nothing: hit target or hit stop

### Proposed Behavior
```javascript
// Trailing stop after 1% profit
if (currentPrice >= position.entryPrice * 1.01) {
  // In profit - activate trailing stop
  const trailingStopPct = 0.015; // 1.5% trailing
  const trailingStop = currentPrice * (1 - trailingStopPct);
  
  // Only move stop up, never down
  if (trailingStop > position.stopLoss) {
    position.stopLoss = trailingStop;
    position.trailingActive = true;
  }
}
```

### Implementation
```javascript
// Add to checkExitConditions
async function checkExitConditions(symbol, position) {
  const currentPrice = state.prices[symbol];
  const profitPct = (currentPrice - position.entryPrice) / position.entryPrice;
  
  // Activate trailing stop after 1% profit
  if (profitPct >= 0.01 && !position.trailingActive) {
    position.trailingActive = true;
    log('info', `Trailing stop activated for ${symbol}`);
  }
  
  // Update trailing stop
  if (position.trailingActive) {
    const trailingStopPct = 0.015; // 1.5% from peak
    const newStop = currentPrice * (1 - trailingStopPct);
    
    if (newStop > position.stopLoss) {
      const oldStop = position.stopLoss;
      position.stopLoss = newStop;
      log('debug', `Trailing stop moved: $${oldStop.toFixed(2)} → $${newStop.toFixed(2)}`);
    }
  }
  
  // Check if stop hit
  if (currentPrice <= position.stopLoss) {
    const reason = position.trailingActive ? 'TRAILING_STOP' : 'STOP_LOSS';
    await executeSell(symbol, position.quantity, reason, position.strategy);
    return true;
  }
  
  // ... rest of exit logic
}
```

### Expected Impact
- **Profit capture:** +25-40% (lock in gains)
- **Average profit per trade:** +15-25% (protect winners)
- **Losing trades:** -5-10% (some stops become small wins)
- **Risk:** LOW (only protects profits)

### Success Metrics
- Trailing stops capture profit in 40%+ of trades
- Average winning trade increases by $3+
- No increase in average losing trade

---

## 🎯 Optimization #3: Position Sizing Based on Confidence

### Current Behavior
```javascript
// Fixed 20% position size for all trades
const tradeSize = balance * 0.20; // Always 20%
```

### Problem
- Weak signals get same size as strong signals
- No differentiation by confidence
- Suboptimal capital allocation

### Proposed Behavior
```javascript
// Variable position sizing: 10-30% based on signal strength
function calculatePositionSize(balance, signalStrength) {
  // signalStrength: 0.0 - 1.0
  // 0.5 = 1 strategy agrees (weak)
  // 0.75 = 2-3 strategies agree (medium)
  // 1.0 = all strategies agree (strong)
  
  const minSize = 0.10; // 10% minimum
  const maxSize = 0.30; // 30% maximum
  
  const sizePct = minSize + (signalStrength * (maxSize - minSize));
  return balance * sizePct;
}

// Example:
// 1 strategy agrees: 10% position
// 2 strategies agree: 20% position
// 3 strategies agree: 30% position
```

### Implementation
```javascript
// Update trading loop
for (const pair of config.tradingPairs) {
  const analyses = await analyzeAllStrategies(pair);
  const signalAgg = aggregateSignals(pair, analyses);
  
  if (signalAgg.strongBuy) {
    const tradeSize = calculatePositionSize(
      balance.total,
      signalAgg.buyConfidence
    );
    
    log('info', `Signal strength: ${(signalAgg.buyConfidence * 100).toFixed(0)}%, Size: ${(tradeSize / balance.total * 100).toFixed(0)}%`);
    
    await executeBuy(pair, tradeSize, signalAgg.strategies.join('+'));
  }
}
```

### Expected Impact
- **Risk-adjusted returns:** +20-30% (size by confidence)
- **Max drawdown:** -15-25% (smaller sizes on weak signals)
- **Profit factor:** +10-20% (compound strong signals)
- **Risk:** MEDIUM (requires good signal scoring)

### Success Metrics
- Strong signals (30% size) win rate > 70%
- Weak signals (10% size) win rate > 50%
- Overall Sharpe ratio improves by 0.3+

---

## 🎯 Optimization #4: Drawdown Protection

### Current Behavior
```javascript
// Only daily loss limit
if (dailyPnL <= -maxDailyLoss) {
  stopTrading(); // ← Too late, damage done
}
```

### Problem
- No protection until daily limit hit
- Can lose 10% in one day
- No reduction after losses
- No recovery period

### Proposed Behavior
```javascript
// Multi-layered drawdown protection
const drawdownProtection = {
  maxDailyLoss: 500,        // $500 daily limit
  maxWeeklyLoss: 1500,      // $1,500 weekly limit
  maxMonthlyLoss: 4000,     // $4,000 monthly limit
  
  // Reduce size after losses
  consecutiveLosses: 0,
  sizeReduction: {
    2: 0.75,  // After 2 losses: 75% size
    3: 0.50,  // After 3 losses: 50% size
    4: 0.25,  // After 4 losses: 25% size
    5: 0.00,  // After 5 losses: stop trading
  },
  
  // Recovery period
  recoveryMode: false,
  recoveryTarget: 0,        // Need to recover X before normal trading
};

function getPositionSizeMultiplier() {
  const losses = drawdownProtection.consecutiveLosses;
  return drawdownProtection.sizeReduction[losses] || 1.0;
}

function checkDrawdownLimits() {
  // Daily limit
  if (state.dailyPnL <= -drawdownProtection.maxDailyLoss) {
    log('error', 'Daily loss limit reached');
    state.isEmergencyStopped = true;
    return false;
  }
  
  // Weekly limit
  if (state.weeklyPnL <= -drawdownProtection.maxWeeklyLoss) {
    log('error', 'Weekly loss limit reached');
    state.isEmergencyStopped = true;
    return false;
  }
  
  // Consecutive losses
  if (drawdownProtection.consecutiveLosses >= 5) {
    log('error', '5 consecutive losses - stopping');
    state.isEmergencyStopped = true;
    return false;
  }
  
  return true;
}
```

### Implementation
```javascript
// Update executeSell to track consecutive losses
async function executeSell(symbol, quantity, reason, strategy) {
  // ... execute sell ...
  
  const pnl = sellValue - position.cost;
  
  if (pnl < 0) {
    drawdownProtection.consecutiveLosses++;
    log('warn', `Consecutive losses: ${drawdownProtection.consecutiveLosses}`);
  } else {
    drawdownProtection.consecutiveLosses = 0; // Reset on win
  }
  
  // Update weekly/monthly tracking
  state.weeklyPnL += pnl;
  state.monthlyPnL += pnl;
}

// Update executeBuy to apply size reduction
async function executeBuy(pair, tradeSize, strategy) {
  const sizeMultiplier = getPositionSizeMultiplier();
  const adjustedSize = tradeSize * sizeMultiplier;
  
  if (sizeMultiplier < 1.0) {
    log('warn', `Position size reduced to ${(sizeMultiplier * 100).toFixed(0)}% due to ${drawdownProtection.consecutiveLosses} consecutive losses`);
  }
  
  // ... rest of buy logic with adjustedSize ...
}
```

### Expected Impact
- **Max drawdown:** -40-60% (from -20% to -8-12%)
- **Recovery time:** -50% (smaller losses = faster recovery)
- **Psychological:** Better (prevents tilt/revenge trading)
- **Risk:** LOW (conservative protection)

### Success Metrics
- Max daily loss < $400
- Max weekly loss < $1,200
- Never hit 5 consecutive losses
- Faster recovery after drawdowns

---

## 🎯 Optimization #5: Correlation-Based Position Limits

### Current Behavior
```javascript
// Can hold all 4 pairs simultaneously
// BTC + ETH + SOL + AVAX all at once
```

### Problem
- All crypto is correlated (0.7-0.9)
- When BTC drops, everything drops
- 4 positions = 4x the same bet
- Portfolio volatility too high

### Proposed Behavior
```javascript
// Limit correlated positions
const correlationGroups = {
  highCap: ['BTC', 'ETH'],      // Correlation: 0.85
  midCap: ['SOL', 'AVAX'],      // Correlation: 0.75
};

const correlationLimits = {
  maxPerGroup: 1,    // Max 1 from each group
  maxTotal: 2,       // Max 2 correlated positions total
};

function canOpenPosition(pair) {
  const asset = pair.replace('USD', '').replace('USDT', '');
  
  // Find which group this asset belongs to
  let assetGroup = null;
  for (const [group, assets] of Object.entries(correlationGroups)) {
    if (assets.includes(asset)) {
      assetGroup = group;
      break;
    }
  }
  
  if (!assetGroup) return true; // Not in any group, allow
  
  // Count positions in same group
  const groupPositions = Object.keys(state.positions).filter(p => {
    const a = p.replace('USD', '').replace('USDT', '');
    return correlationGroups[assetGroup].includes(a);
  }).length;
  
  if (groupPositions >= correlationLimits.maxPerGroup) {
    log('debug', `Max positions reached for ${assetGroup} group`);
    return false;
  }
  
  // Count total correlated positions
  const totalCorrelated = Object.keys(state.positions).filter(p => {
    const a = p.replace('USD', '').replace('USDT', '');
    return Object.values(correlationGroups).some(g => g.includes(a));
  }).length;
  
  if (totalCorrelated >= correlationLimits.maxTotal) {
    log('debug', 'Max correlated positions reached');
    return false;
  }
  
  return true;
}
```

### Implementation
```javascript
// Add to trading loop
for (const pair of config.tradingPairs) {
  if (state.positions[pair]) continue;
  if (!canOpenPosition(pair)) continue; // ← Add correlation check
  
  const analyses = await analyzeAllStrategies(pair);
  // ... rest of logic ...
}
```

### Expected Impact
- **Portfolio volatility:** -25-35% (less correlation)
- **Max drawdown:** -20-30% (diversification)
- **Sharpe ratio:** +0.2-0.4 (better risk-adjusted returns)
- **Risk:** MEDIUM (reduces opportunities)

### Success Metrics
- Portfolio beta < 0.8 (vs. BTC)
- Max drawdown < 10%
- Smoother equity curve

---

## 📊 Combined Risk Management Impact

### Current Risk Profile:
- Max drawdown: 15-20%
- Sharpe ratio: 0.8-1.2
- Win/loss ratio: 1.5:1
- Stop loss hit rate: 40-50%

### Projected Risk Profile (after optimizations):
- Max drawdown: 6-10% (-50-67%)
- Sharpe ratio: 1.8-2.5 (+125-108%)
- Win/loss ratio: 3.0:1 (+100%)
- Stop loss hit rate: 20-30% (-40-50%)

---

## 🔄 Implementation Order

### Week 1: Foundation
1. Volatility-adjusted stop losses
2. Trailing stop losses
3. Test for 5 days

### Week 2: Protection
4. Drawdown protection
5. Consecutive loss handling
6. Monitor results

### Week 3: Advanced
7. Position sizing by confidence
8. Correlation limits
9. Fine-tune parameters

### Week 4: Validation
10. Stress test with volatile markets
11. Compare to baseline
12. Document learnings

---

## ⚠️ Risk Management Rules

### Never:
- Remove stop losses
- Increase position size after losses
- Override emergency stop
- Trade without capital protection

### Always:
- Use stop losses on every trade
- Reduce size after consecutive losses
- Respect daily/weekly limits
- Monitor drawdown metrics

### Red Flags:
- Max drawdown > 12%
- 3+ consecutive losses
- Daily loss > $400
- Sharpe ratio < 1.0

---

## 📈 Measurement Plan

### Risk Metrics to Track:
1. Max drawdown (daily, weekly, monthly)
2. Sharpe ratio
3. Sortino ratio
4. Win/loss ratio
5. Average loss per trade
6. Stop loss hit rate
7. Trailing stop effectiveness
8. Correlation between positions
9. Portfolio beta
10. Recovery time after losses

### Tools:
- Real-time drawdown monitoring
- Risk dashboard
- Weekly risk reports
- Monthly portfolio review

---

## 🎯 Success Criteria

### Minimum Acceptable Risk (MAR):
- Max drawdown: <12%
- Sharpe ratio: >1.2
- Win/loss ratio: >2.0:1

### Target Risk Profile:
- Max drawdown: <10%
- Sharpe ratio: >1.8
- Win/loss ratio: >2.5:1

### Stretch Goal:
- Max drawdown: <8%
- Sharpe ratio: >2.2
- Win/loss ratio: >3.0:1

---

**Next:** Phased Rollout Plan
