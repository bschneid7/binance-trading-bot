# Trading Strategies Guide

This bot implements **4 proven technical analysis strategies** that can be used individually or combined for diversified trading.

---

## 📊 Strategy Overview

| Strategy | Type | Best For | Risk Level | Typical Win Rate |
|----------|------|----------|------------|------------------|
| **RSI + Momentum** | Momentum | Trending markets | Medium | 50-60% |
| **MACD Crossover** | Trend Following | Strong trends | Medium-High | 45-55% |
| **Bollinger Bands** | Mean Reversion | Range-bound markets | Low-Medium | 55-65% |
| **EMA Crossover** | Trend Following | Trending markets | Medium | 45-55% |

---

## 1️⃣ RSI + Momentum Strategy

### Description
Combines **Relative Strength Index (RSI)** with **price momentum** to identify oversold conditions with upward momentum.

### How It Works
- **Buy Signal:** RSI < 40 (oversold) AND momentum > 2% (upward trend)
- **Sell Signal:** RSI > 70 (overbought) OR profit target hit
- **Profit Target:** 3%
- **Stop Loss:** -2%

### Best Market Conditions
- ✅ Trending markets with pullbacks
- ✅ Volatile markets with clear swings
- ❌ Choppy sideways markets

### Configuration
```javascript
rsiMomentum: {
  rsiPeriod: 14,          // RSI calculation period
  rsiOversold: 40,        // Buy threshold
  rsiOverbought: 70,      // Sell threshold
  momentumPeriod: 10,     // Momentum lookback
  momentumThreshold: 2.0, // Minimum momentum %
  profitTarget: 3.0,      // Take profit %
  stopLoss: 2.0,          // Stop loss %
}
```

### Example Trade
```
BTC at $88,000
RSI = 35 (oversold)
Momentum = +2.5% (upward)
→ BUY signal

Price rises to $90,640 (+3%)
→ SELL at profit target
Profit: $2,640 (3%)
```

---

## 2️⃣ MACD Crossover Strategy

### Description
Uses **Moving Average Convergence Divergence (MACD)** to identify trend changes through crossovers.

### How It Works
- **Buy Signal:** MACD line crosses above signal line (bullish crossover)
- **Sell Signal:** MACD line crosses below signal line (bearish crossover)
- **Profit Target:** 4%
- **Stop Loss:** -2.5%

### Best Market Conditions
- ✅ Strong trending markets (bull or bear)
- ✅ Markets with clear momentum
- ❌ Choppy, range-bound markets

### Configuration
```javascript
macd: {
  fastPeriod: 12,         // Fast EMA period
  slowPeriod: 26,         // Slow EMA period
  signalPeriod: 9,        // Signal line period
  profitTarget: 4.0,      // Take profit %
  stopLoss: 2.5,          // Stop loss %
}
```

### Example Trade
```
ETH at $2,850
MACD crosses above signal line
→ BUY signal

Price rises to $2,964 (+4%)
→ SELL at profit target
Profit: $114 (4%)
```

---

## 3️⃣ Bollinger Bands Strategy

### Description
Uses **Bollinger Bands** to identify overbought/oversold conditions based on price deviation from moving average.

### How It Works
- **Buy Signal:** Price touches or breaks below lower band (oversold)
- **Sell Signal:** Price touches or breaks above upper band (overbought)
- **Profit Target:** 2.5%
- **Stop Loss:** -1.5%

### Best Market Conditions
- ✅ Range-bound, sideways markets
- ✅ Markets with mean-reverting behavior
- ❌ Strong trending markets (can stay outside bands)

### Configuration
```javascript
bollingerBands: {
  period: 20,             // Moving average period
  stdDev: 2,              // Standard deviations
  profitTarget: 2.5,      // Take profit %
  stopLoss: 1.5,          // Stop loss %
}
```

### Example Trade
```
SOL at $124.50
Lower band at $124.00
Price touches $124.10
→ BUY signal

Price bounces to $127.61 (+2.5%)
→ SELL at profit target
Profit: $3.11 (2.5%)
```

---

## 4️⃣ EMA Crossover Strategy

### Description
Uses **Exponential Moving Average (EMA)** crossovers to identify trend changes.

### How It Works
- **Buy Signal:** Fast EMA (9) crosses above Slow EMA (21) - "Golden Cross"
- **Sell Signal:** Fast EMA crosses below Slow EMA - "Death Cross"
- **Profit Target:** 3.5%
- **Stop Loss:** -2%

### Best Market Conditions
- ✅ Trending markets
- ✅ Markets transitioning from one trend to another
- ❌ Choppy markets with frequent false signals

### Configuration
```javascript
emaCrossover: {
  fastPeriod: 9,          // Fast EMA (short-term)
  slowPeriod: 21,         // Slow EMA (long-term)
  profitTarget: 3.5,      // Take profit %
  stopLoss: 2.0,          // Stop loss %
}
```

### Example Trade
```
AVAX at $12.80
Fast EMA crosses above Slow EMA
→ BUY signal

Price rises to $13.25 (+3.5%)
→ SELL at profit target
Profit: $0.45 (3.5%)
```

---

## 🎯 Strategy Selection Guide

### Use RSI + Momentum When:
- ✅ Market is trending but has pullbacks
- ✅ You want medium-risk, medium-reward trades
- ✅ You want to catch oversold bounces

### Use MACD When:
- ✅ Market is in a strong trend
- ✅ You want to ride longer trends
- ✅ You're comfortable with higher risk for higher reward

### Use Bollinger Bands When:
- ✅ Market is range-bound
- ✅ You want lower-risk trades
- ✅ You want to profit from mean reversion

### Use EMA Crossover When:
- ✅ Market is transitioning trends
- ✅ You want simple, clear signals
- ✅ You want to catch major trend changes

---

## 🔧 Enabling/Disabling Strategies

Edit `config.js`:

```javascript
enabledStrategies: {
  rsiMomentum: true,      // Enable/disable
  macd: true,
  bollingerBands: true,
  emaCrossover: true,
}
```

### Recommended Combinations

**Conservative (Low Risk):**
```javascript
enabledStrategies: {
  rsiMomentum: true,
  bollingerBands: true,
  macd: false,
  emaCrossover: false,
}
```

**Aggressive (High Risk):**
```javascript
enabledStrategies: {
  rsiMomentum: true,
  macd: true,
  bollingerBands: false,
  emaCrossover: true,
}
```

**Balanced (Diversified):**
```javascript
enabledStrategies: {
  rsiMomentum: true,
  macd: true,
  bollingerBands: true,
  emaCrossover: true,
}
```

---

## 📈 Performance Expectations

### Realistic Expectations
- **Win Rate:** 45-65% depending on strategy and market
- **Average Profit per Trade:** 2-4%
- **Average Loss per Trade:** 1.5-2.5%
- **Monthly Return:** 5-15% (highly variable)

### Important Notes
- ⚠️ Past performance does not guarantee future results
- ⚠️ All strategies can have losing streaks
- ⚠️ Market conditions greatly affect performance
- ⚠️ Always start with small amounts

---

## 🛡️ Risk Management

The bot includes multiple safety features:

1. **Profit Targets** - Automatic profit taking
2. **Stop Losses** - Limit losses on bad trades
3. **Daily Loss Limit** - Stop trading if daily loss > $100
4. **Consecutive Loss Protection** - Stop after 3 losses in a row
5. **Position Size Limits** - Max 95% of balance per trade
6. **Max Positions** - Limit total open positions

---

## 📊 Monitoring Strategy Performance

The bot tracks performance per strategy:

```bash
# View logs
pm2 logs trading-bot

# You'll see output like:
rsiMomentum: 15 trades, 60.0% win rate, $45.30 P&L
macd: 8 trades, 50.0% win rate, $12.80 P&L
bollingerBands: 12 trades, 66.7% win rate, $28.50 P&L
emaCrossover: 6 trades, 50.0% win rate, $8.20 P&L
```

### Analyzing Results

**Good Performance:**
- Win rate > 50%
- Positive P&L
- Consistent with market conditions

**Poor Performance:**
- Win rate < 40%
- Negative P&L
- Consider disabling strategy

---

## 🔄 Adjusting Strategy Parameters

### If Too Many Trades:
- Increase RSI thresholds (e.g., 35/75 instead of 40/70)
- Increase momentum threshold (e.g., 3% instead of 2%)
- Increase Bollinger Bands std dev (e.g., 2.5 instead of 2)

### If Too Few Trades:
- Decrease RSI thresholds (e.g., 45/65 instead of 40/70)
- Decrease momentum threshold (e.g., 1.5% instead of 2%)
- Decrease Bollinger Bands std dev (e.g., 1.5 instead of 2)

### If Too Many Losses:
- Tighten stop losses (e.g., -1.5% instead of -2%)
- Increase profit targets (e.g., 4% instead of 3%)
- Disable underperforming strategies

---

## ⚠️ Important Disclaimers

1. **No Guarantees** - Trading involves risk of loss
2. **Test First** - Start with small amounts
3. **Monitor Regularly** - Check performance daily
4. **Adjust as Needed** - Markets change, strategies should too
5. **Don't Over-Optimize** - Simple often works better

---

## 📚 Further Reading

- **RSI:** https://www.investopedia.com/terms/r/rsi.asp
- **MACD:** https://www.investopedia.com/terms/m/macd.asp
- **Bollinger Bands:** https://www.investopedia.com/terms/b/bollingerbands.asp
- **EMA:** https://www.investopedia.com/terms/e/ema.asp

---

**Happy Trading! 🚀📈**
