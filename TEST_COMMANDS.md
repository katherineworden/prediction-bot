# Prediction Market Bot - Test Commands

This file contains a comprehensive list of commands to test all bot functionality. Copy and paste these commands into Slack to verify everything is working correctly.

## Prerequisites

1. **Deploy bot to Oracle Cloud** (see README.md for detailed instructions)

2. **Set admin permissions:**
   Create a `.env` file with:
   ```
   ADMIN_USER_IDS=YOUR_SLACK_USER_ID_HERE
   ```

3. **Invite bot to channel:**
   ```
   /invite @Prediction Market Bot
   ```

---

## Quick Solo Testing Guide

### Solo Test Sequence (Single User)
This section lets you test all functionality by yourself without needing other users.

#### 1. Initial Setup
```
@Prediction Market Bot help
@Prediction Market Bot create market LECTURE "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18" "Which lecture will be voted most popular?"
@Prediction Market Bot list markets
```

#### 2. Check Starting State
```
@Prediction Market Bot balance
@Prediction Market Bot market LECTURE
@Prediction Market Bot leaderboard
```

#### 3. Bundle Trading to Get Shares
```
@Prediction Market Bot bundle-buy LECTURE 50
```
*Now you have 50 shares of each outcome to trade with*

#### 4. Create a Market with Buy Orders
```
@Prediction Market Bot buy LECTURE 1 10 0.15
@Prediction Market Bot buy LECTURE 2 15 0.20
@Prediction Market Bot buy LECTURE 3 20 0.25
@Prediction Market Bot buy LECTURE 4 10 0.30
@Prediction Market Bot buy LECTURE 5 25 0.35
```

#### 5. Create Sell Orders (These Will Match!)
```
@Prediction Market Bot sell LECTURE 1 5 0.10
@Prediction Market Bot sell LECTURE 2 10 0.15
@Prediction Market Bot sell LECTURE 3 15 0.20
```
*These should execute immediately against your buy orders*

#### 6. Check Leaderboard
```
@Prediction Market Bot leaderboard
@Prediction Market Bot leaderboard LECTURE 20
```

#### 7. Create Non-Matching Orders
```
@Prediction Market Bot buy LECTURE 6 10 0.40
@Prediction Market Bot buy LECTURE 7 15 0.45
@Prediction Market Bot buy LECTURE 8 20 0.50
@Prediction Market Bot sell LECTURE 9 10 0.60
@Prediction Market Bot sell LECTURE 10 15 0.65
@Prediction Market Bot sell LECTURE 11 20 0.70
```

#### 8. Check Order Book
```
@Prediction Market Bot market LECTURE
```
*You should see your open buy and sell orders*

#### 9. View Your Orders
```
@Prediction Market Bot orders LECTURE
```
*Note some order IDs for cancellation testing*

#### 10. Cancel Some Orders
```
@Prediction Market Bot cancel LECTURE 6 [ORDER_ID]
@Prediction Market Bot cancel LECTURE 9 [ORDER_ID]
```

#### 11. More Complex Trading
```
@Prediction Market Bot buy LECTURE 12 5 0.55
@Prediction Market Bot buy LECTURE 13 5 0.52
@Prediction Market Bot buy LECTURE 14 5 0.48
@Prediction Market Bot sell LECTURE 12 3 0.50
@Prediction Market Bot sell LECTURE 13 3 0.45
@Prediction Market Bot sell LECTURE 14 3 0.40
```
*Some of these should match*

#### 12. Test Market Orders
```
@Prediction Market Bot buy LECTURE 15 10
@Prediction Market Bot sell LECTURE 16 10
```
*These will likely fail with "Only 0 units could be filled" - expected!*

#### 13. Create Liquidity and Test Again
```
@Prediction Market Bot sell LECTURE 15 20 0.75
@Prediction Market Bot buy LECTURE 15 10
```
*Now the market order should work*

#### 14. Test Price Improvement
```
@Prediction Market Bot buy LECTURE 17 10 0.80
@Prediction Market Bot sell LECTURE 17 5 0.70
```
*Should execute at 0.70, not 0.80*

#### 15. Check Final State
```
@Prediction Market Bot balance
@Prediction Market Bot positions LECTURE
@Prediction Market Bot orders LECTURE
@Prediction Market Bot leaderboard
```

#### 16. Bundle Sell Test
```
@Prediction Market Bot bundle-sell LECTURE 5
```
*Should work if you still have complete sets*

---

## New Features Testing

### Leaderboard Commands
```
@Prediction Market Bot leaderboard
```
*Shows top 10 traders by balance*

```
@Prediction Market Bot leaderboard LECTURE
```
*Shows top 10 traders for LECTURE market*

```
@Prediction Market Bot leaderboard LECTURE 25
```
*Shows top 25 traders for LECTURE market*

### Winners Command (After Resolution)
```
@Prediction Market Bot winners LECTURE
```
*Should fail with "has not been resolved yet" until market is resolved*

### Test Resolution and Winners
```
@Prediction Market Bot resolve LECTURE 8
@Prediction Market Bot winners LECTURE
```
*Should show winning outcome and top traders*

---

## Edge Case Testing

### Price Validation Tests
```
@Prediction Market Bot buy LECTURE 5 10 1.50
```
*Should fail: Price > $0.99*

```
@Prediction Market Bot buy LECTURE 5 10 0.00
```
*Should fail: Price < $0.01*

```
@Prediction Market Bot sell LECTURE 5 10 -0.50
```
*Should fail: Negative price*

### Quantity Validation Tests
```
@Prediction Market Bot buy LECTURE 5 -5 0.50
```
*Should fail: Negative quantity*

```
@Prediction Market Bot bundle-buy LECTURE -2
```
*Should fail: Negative quantity*

```
@Prediction Market Bot buy LECTURE 5 0 0.50
```
*Should fail: Zero quantity*

### Invalid Market/Outcome Tests
```
@Prediction Market Bot buy FAKE_MARKET 1 5 0.50
```
*Should fail: Market not found*

```
@Prediction Market Bot buy LECTURE 0 5 0.50
```
*Should fail: Invalid outcome (0-indexed)*

```
@Prediction Market Bot buy LECTURE 19 5 0.50
```
*Should fail: Invalid outcome (>18)*

### Balance and Position Edge Cases

#### Try to Oversell
```
@Prediction Market Bot positions LECTURE
```
*Note how many shares of outcome 5 you have*

```
@Prediction Market Bot sell LECTURE 5 1000 0.60
```
*Should fail: Insufficient position*

#### Try to Overspend
```
@Prediction Market Bot balance
```
*Note your balance*

```
@Prediction Market Bot buy LECTURE 10 10000 0.50
```
*Should fail: Insufficient balance*

---

## DM Testing
**Send these commands as Direct Messages to @Prediction Market Bot:**

```
balance
```

```
positions LECTURE
```

```
bundle-buy LECTURE 2
```

```
bundle-sell LECTURE 1
```

```
orders LECTURE
```

```
list
```

```
help
```

---

## Post-Resolution Testing

After resolving a market:
```
@Prediction Market Bot buy LECTURE 5 1 0.50
```
*Should get error: "Cannot trade on resolved market"*

```
@Prediction Market Bot bundle-buy LECTURE 5
```
*Should get error: "Cannot trade on resolved market"*

```
@Prediction Market Bot marketBuy LECTURE 5 10
```
*Should get error: "Cannot trade on resolved market"*

```
@Prediction Market Bot balance
```
*Should show updated balance with winnings*

```
@Prediction Market Bot winners LECTURE
```
*Should show winners with medals*

---

## Admin Commands (Admin Only)

### Create Market
```
@Prediction Market Bot create market LECTURE "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18" "Which lecture will be voted most popular?"
```

### Resolve Market
```
@Prediction Market Bot resolve LECTURE 8
```

### Export Data
```
@Prediction Market Bot export-data
```

---

## Expected Behaviors

### What Should Work:
- Order IDs appear in buy/sell confirmations
- Transaction notifications when orders match between users
- Balance/positions/orders show privately (ephemeral messages)
- Bundle operations work in DMs
- Market shows "RESOLVED" status after resolution
- Trading blocked after resolution with clear error message
- Balances update correctly with winnings from resolution
- Leaderboard shows all traders ranked by balance
- Winners command shows results after resolution

### Privacy Behaviors:
- `balance`, `positions`, `orders` commands show only to the user (ephemeral)
- Bundle buy/sell confirmations are private
- Buy/sell order confirmations are public (with Order ID)
- Transaction matches are public
- Leaderboard is public
- Error messages are private

### DM Behaviors:
- Balance checking works in DMs
- Position checking works in DMs
- Bundle operations work in DMs
- Orders checking works in DMs
- Help command works in DMs
- List command works in DMs

### What Should Fail:
- Trading commands after market resolution
- Selling more shares than you own
- Buying with insufficient balance
- Invalid price ranges (outside $0.01-$0.99)
- Canceling orders that don't exist or aren't yours
- Negative quantities

---

## Troubleshooting

If commands aren't working:

1. **Check server logs:**
   ```bash
   pm2 logs prediction-bot
   ```

2. **Verify bot permissions in Slack:**
   - Bot should have required OAuth scopes
   - Bot should be invited to the channel

3. **Check admin status:**
   - Run `@Prediction Market Bot help` and verify you see "Admin Commands" section

4. **Restart if needed:**
   ```bash
   pm2 restart prediction-bot
   ```

5. **Check data file:**
   ```bash
   cat ~/prediction-bot/market_data.json
   ```

---

## Sample Market Creation Commands

### For Course Use:
```
@Prediction Market Bot create market LECTURE "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18" "Which lecture will be voted most popular?"
```

### For General Testing:
```
@Prediction Market Bot create market TEST "Option1,Option2,Option3" "Test market for functionality"
```

### For Election Demo:
```
@Prediction Market Bot create market ELECTION2024 "Trump,Biden,Harris" "Who will win the 2024 election?"
```

---

*Copy commands from this file to test all bot functionality systematically.*
