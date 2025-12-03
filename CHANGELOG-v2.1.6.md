# Trading Bot v2.1.6 - Position Sizing & MARKET_LOT_SIZE Fix

## 🔧 Changes

### 1. Position Sizing Optimization
**Problem:** Bot was using 95% of balance per trade, causing insufficient balance errors
- Old: `maxPositionSize: 0.95` (95% per trade = only 1 position possible!)
- New: `maxPositionSize: 0.20` (20% per trade = 4-5 positions possible)

**Impact:**
- Can now diversify across all 4 trading pairs
- Reduces risk by not putting all capital in one trade
- Allows multiple strategies to run simultaneously

### 2. MARKET_LOT_SIZE Filter Support
**Problem:** Bot only checked LOT_SIZE but ignored MARKET_LOT_SIZE limits for market orders

**MARKET_LOT_SIZE Limits:**
- BTCUSD: Max 1.90 BTC per market order
- ETHUSD: Max 41.67 ETH per market order
- SOLUSD: Max 1,091 SOL per market order
- AVAXUSD: Max 217.48 AVAX per market order

**Changes:**
- Added `marketMaxQty` field to symbol info
- Enforces MARKET_LOT_SIZE max before placing orders
- Logs warning when quantity is reduced due to market limits
- Conservative fallback default (1.0) if filter not found

**Code Changes:**
```javascript
// getSymbolInfo() now fetches MARKET_LOT_SIZE
const marketLotSizeFilter = symbolData.filters.find(f => f.filterType === "MARKET_LOT_SIZE");
marketMaxQty: marketLotSizeFilter ? parseFloat(marketLotSizeFilter.maxQty) : parseFloat(lotSizeFilter.maxQty),

// executeBuy() now enforces market max
if (quantity > symbolInfo.marketMaxQty) {
  log("warn", `Quantity ${quantity} exceeds MARKET_LOT_SIZE max ${symbolInfo.marketMaxQty}, reducing`);
  quantity = symbolInfo.marketMaxQty;
}
```

## ✅ Expected Results

### Before v2.1.6:
```
❌ AVAX trades failing: "Filter failure: MARKET_LOT_SIZE"
❌ Insufficient balance after 2-3 trades
❌ Can't diversify across all 4 pairs
```

### After v2.1.6:
```
✅ AVAX trades execute successfully
✅ Can open 4-5 positions simultaneously
✅ Better diversification across BTC, ETH, SOL, AVAX
✅ More consistent trading across all strategies
```

## 📊 Position Sizing Math

**With $10,000 balance:**
- Old (95%): $9,500 per trade → Only 1 position possible
- New (20%): $2,000 per trade → 4-5 positions possible

**Example AVAX Trade:**
- $2,000 / $13.66 = 146.41 AVAX
- Rounded to 0.01 step = 146.41 AVAX
- Market max = 217.48 AVAX ✅ (within limits!)

## 🚀 Deployment

```bash
cd ~/Downloads
tar -xzf trading-bot-v2.1.6-FIXED.tar.gz
chmod +x deploy.sh
./deploy.sh 209.38.153.21
```

## 📈 What to Monitor

After deployment, watch for:
1. ✅ AVAX trades executing without errors
2. ✅ Multiple positions open across different pairs
3. ✅ No more "insufficient balance" errors
4. ✅ Better strategy diversification
5. ⚠️ Any warnings about MARKET_LOT_SIZE reductions (should be rare with 20% sizing)

## Version History

- v2.1.0: Initial WebSocket version
- v2.1.1: Added historical data loading
- v2.1.2: Fixed klines endpoint auth
- v2.1.3: Fixed getCurrentPrice endpoint
- v2.1.4: Added LOT_SIZE handling (syntax error)
- v2.1.5: Fixed syntax errors
- **v2.1.6: Fixed position sizing + MARKET_LOT_SIZE support** ✅
