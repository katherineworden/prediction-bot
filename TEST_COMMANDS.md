# Prediction Market Bot - Test Commands

This file contains a comprehensive list of commands to test all bot functionality. Copy and paste these commands into Slack to verify everything is working correctly.

## Prerequisites

1. **Deploy bot:**
   ```bash
   railway up
   ```

2. **Set admin permissions in Railway:**
   ```bash
   railway variables set ADMIN_USER_IDS=YOUR_SLACK_USER_ID_HERE
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

#### 6. Create Non-Matching Orders
```
@Prediction Market Bot buy LECTURE 6 10 0.40
@Prediction Market Bot buy LECTURE 7 15 0.45
@Prediction Market Bot buy LECTURE 8 20 0.50
@Prediction Market Bot sell LECTURE 9 10 0.60
@Prediction Market Bot sell LECTURE 10 15 0.65
@Prediction Market Bot sell LECTURE 11 20 0.70
```

#### 7. Check Order Book
```
@Prediction Market Bot market LECTURE
```
*You should see your open buy and sell orders*

#### 8. View Your Orders
```
@Prediction Market Bot orders LECTURE
```
*Note some order IDs for cancellation testing*

#### 9. Cancel Some Orders
```
@Prediction Market Bot cancel LECTURE 6 [ORDER_ID]
@Prediction Market Bot cancel LECTURE 9 [ORDER_ID]
```

#### 10. More Complex Trading
```
@Prediction Market Bot buy LECTURE 12 5 0.55
@Prediction Market Bot buy LECTURE 13 5 0.52
@Prediction Market Bot buy LECTURE 14 5 0.48
@Prediction Market Bot sell LECTURE 12 3 0.50
@Prediction Market Bot sell LECTURE 13 3 0.45
@Prediction Market Bot sell LECTURE 14 3 0.40
```
*Some of these should match*

#### 11. Test Market Orders
```
@Prediction Market Bot buy LECTURE 15 10
@Prediction Market Bot sell LECTURE 16 10
```
*These will likely fail with "Only 0 units could be filled" - expected!*

#### 12. Create Liquidity and Test Again
```
@Prediction Market Bot sell LECTURE 15 20 0.75
@Prediction Market Bot buy LECTURE 15 10
```
*Now the market order should work*

#### 13. Test Price Improvement
```
@Prediction Market Bot buy LECTURE 17 10 0.80
@Prediction Market Bot sell LECTURE 17 5 0.70
```
*Should execute at 0.70, not 0.80*

#### 14. Check Final State
```
@Prediction Market Bot balance
@Prediction Market Bot positions LECTURE
@Prediction Market Bot orders LECTURE
```

#### 15. Bundle Sell Test
```
@Prediction Market Bot bundle-sell LECTURE 5
```
*Should work if you still have complete sets*

## Test Sequence

### 1. Admin Setup & Market Creation
```
@Prediction Market Bot help
```

```
@Prediction Market Bot list markets
```

```
@Prediction Market Bot create market LECTURE "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18" "Which lecture will be voted most popular?"
```

```
@Prediction Market Bot list markets
```

### 2. Basic Market Information
```
@Prediction Market Bot market LECTURE
```

### 3. Initial Trading (Public Channel)
```
@Prediction Market Bot bundle-buy LECTURE 5
```

```
@Prediction Market Bot buy LECTURE 8 10 0.45
```

```
@Prediction Market Bot sell LECTURE 8 5 0.55
```

```
@Prediction Market Bot buy LECTURE 15 3
```

```
@Prediction Market Bot sell LECTURE 5 2
```

### 4. Check Status (Public - should show privately)
```
@Prediction Market Bot balance
```

```
@Prediction Market Bot positions LECTURE
```

```
@Prediction Market Bot orders LECTURE
```

### 5. Order Management
Copy the order ID from previous buy/sell confirmations and use it here:
```
@Prediction Market Bot cancel LECTURE 8 [ORDER_ID_HERE]
```

### 6. More Trading
```
@Prediction Market Bot bundle-sell LECTURE 2
```

```
@Prediction Market Bot buy LECTURE 12 5 0.30
```

```
@Prediction Market Bot sell LECTURE 15 8 0.70
```

### 7. Case Sensitivity Tests
Test that market IDs are case-insensitive:
```
@Prediction Market Bot market lecture
```

```
@Prediction Market Bot positions Lecture
```

```
@Prediction Market Bot buy LeCTuRe 5 2 0.40
```

### 8. Testing "positions" plural command
Both should work:
```
@Prediction Market Bot position LECTURE
```

```
@Prediction Market Bot positions LECTURE
```

### 9. Testing Market Orders with No Liquidity
Should show helpful error about no matching orders:
```
@Prediction Market Bot buy LECTURE 1 10
```

```
@Prediction Market Bot sell LECTURE 1 5
```

```
@Prediction Market Bot market LECTURE
```

### 10. Edge Case Testing

#### Price Validation Tests
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

#### Quantity Validation Tests
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

#### Invalid Market/Outcome Tests
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

```
@Prediction Market Bot buy LECTURE 20 5 0.50
```
*Should fail: Outcome doesn't exist*

### 11. Order Book Testing

#### Create Multiple Orders at Different Prices
```
@Prediction Market Bot buy LECTURE 7 5 0.30
```

```
@Prediction Market Bot buy LECTURE 7 5 0.35
```

```
@Prediction Market Bot buy LECTURE 7 5 0.40
```

```
@Prediction Market Bot market LECTURE
```
*Should show all 3 buy orders in order book*

#### Test Price Improvement
Have another user place this:
```
@Prediction Market Bot sell LECTURE 7 10 0.32
```
*Should execute at 0.40, then 0.35, then 0.32*

### 12. Balance and Position Edge Cases

#### Try to Oversell
```
@Prediction Market Bot positions LECTURE
```
*Note how many shares of outcome 5 you have*

```
@Prediction Market Bot sell LECTURE 5 1000 0.60
```
*Should only sell what you have*

#### Try to Overspend
```
@Prediction Market Bot balance
```
*Note your balance*

```
@Prediction Market Bot buy LECTURE 10 10000 0.50
```
*Should fail: Insufficient balance*

### 13. Bundle Trading Edge Cases

#### Bundle Buy with Exact Balance
First check balance, then try to spend it all:
```
@Prediction Market Bot balance
```

If balance is 500:
```
@Prediction Market Bot bundle-buy LECTURE 500
```
*Should succeed and leave you with $0*

#### Bundle Sell Without Complete Set
```
@Prediction Market Bot sell LECTURE 1 1 0.50
```
*Sell one share away*

```
@Prediction Market Bot bundle-sell LECTURE 5
```
*Should fail or only sell what you can*

### 14. Concurrent Order Testing

#### Place Multiple Orders Quickly
```
@Prediction Market Bot buy LECTURE 3 5 0.20
@Prediction Market Bot buy LECTURE 4 5 0.25
@Prediction Market Bot buy LECTURE 5 5 0.30
@Prediction Market Bot buy LECTURE 6 5 0.35
```
*All should get unique order IDs*

### 15. Order Cancellation Edge Cases

#### Cancel Non-Existent Order
```
@Prediction Market Bot cancel LECTURE 5 99999
```
*Should fail: Order not found*

#### Cancel Another User's Order
Get an order ID from another user and try:
```
@Prediction Market Bot cancel LECTURE 5 [OTHER_USER_ORDER_ID]
```
*Should fail: Not your order*

#### Cancel After Partial Fill
Place a large order:
```
@Prediction Market Bot buy LECTURE 11 20 0.45
```

Have another user partially fill it:
```
@Prediction Market Bot sell LECTURE 11 5 0.45
```

Try to cancel the original order:
```
@Prediction Market Bot cancel LECTURE 11 [ORDER_ID]
```
*Should cancel remaining 15 shares*

### 16. Stress Testing

#### Rapid Fire Commands
```
@Prediction Market Bot balance
@Prediction Market Bot positions LECTURE
@Prediction Market Bot orders LECTURE
@Prediction Market Bot market LECTURE
@Prediction Market Bot balance
@Prediction Market Bot positions LECTURE
```
*All should respond correctly*

#### Large Order Book
Create many orders:
```
@Prediction Market Bot buy LECTURE 13 1 0.10
@Prediction Market Bot buy LECTURE 13 1 0.11
@Prediction Market Bot buy LECTURE 13 1 0.12
@Prediction Market Bot buy LECTURE 13 1 0.13
@Prediction Market Bot buy LECTURE 13 1 0.14
@Prediction Market Bot buy LECTURE 13 1 0.15
@Prediction Market Bot buy LECTURE 13 1 0.16
@Prediction Market Bot buy LECTURE 13 1 0.17
@Prediction Market Bot buy LECTURE 13 1 0.18
@Prediction Market Bot buy LECTURE 13 1 0.19
```

```
@Prediction Market Bot market LECTURE
```
*Should display order book correctly*

### 17. DM Testing
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
help
```

```
orders LECTURE
```

### 18. Multi-User Trading Scenarios

#### Order Matching Across Users
**User 1:**
```
@Prediction Market Bot buy LECTURE 14 10 0.40
```

**User 2:**
```
@Prediction Market Bot sell LECTURE 14 5 0.35
```
*Should match at 0.35 (price improvement for buyer)*

#### Competing for Same Liquidity
**User 1:**
```
@Prediction Market Bot sell LECTURE 16 20 0.60
```

**User 2:**
```
@Prediction Market Bot buy LECTURE 16 15 0.65
```

**User 3:**
```
@Prediction Market Bot buy LECTURE 16 10 0.70
```
*User 3 should get filled first at 0.60, then User 2*

### 19. Complex Order Book Scenarios

#### Build Deep Order Book
```
@Prediction Market Bot sell LECTURE 9 5 0.70
@Prediction Market Bot sell LECTURE 9 5 0.65
@Prediction Market Bot sell LECTURE 9 5 0.60
@Prediction Market Bot buy LECTURE 9 5 0.40
@Prediction Market Bot buy LECTURE 9 5 0.35
@Prediction Market Bot buy LECTURE 9 5 0.30
```

```
@Prediction Market Bot market LECTURE
```
*Should show bid-ask spread clearly*

#### Test Market Order Routing
```
@Prediction Market Bot buy LECTURE 9 12
```
*Should fill 5@0.60, 5@0.65, 2@0.70*

### 20. Arbitrage Testing

#### Check for Arbitrage Opportunity
```
@Prediction Market Bot market LECTURE
```
*Look at "Sum of best bids" and "Sum of best asks"*

If sum of best asks < $1.00:
```
@Prediction Market Bot bundle-buy LECTURE 1
```
*Then sell each outcome at ask price for profit*

If sum of best bids > $1.00:
*Buy each outcome at bid price, then:*
```
@Prediction Market Bot bundle-sell LECTURE 1
```

### 21. Error Recovery Testing

#### Place Order with Typo
```
@Prediction Market Bot buy LECTUR 5 10 0.50
```
*Should fail gracefully*

#### Missing Parameters
```
@Prediction Market Bot buy LECTURE 5
```
*Should show helpful error*

```
@Prediction Market Bot sell LECTURE
```
*Should show usage instructions*

### 22. Market Resolution (Admin Only)
```
@Prediction Market Bot resolve LECTURE 8
```

```
@Prediction Market Bot market LECTURE
```

### 23. Post-Resolution Testing
```
@Prediction Market Bot buy LECTURE 5 1 0.50
```
*Should get error: "Cannot trade on resolved market"*

```
@Prediction Market Bot balance
```
*Should show updated balance with winnings*

```
@Prediction Market Bot positions LECTURE
```
*Should show final positions*

### 24. Admin Commands (Admin Only)

#### Update Market Data
```
@Prediction Market Bot update market LECTURE description "Updated: Which lecture will be voted most popular in the final survey?"
```

#### Export All Data
```
@Prediction Market Bot export-data
```

#### Check Specific User (if implemented)
```
@Prediction Market Bot admin check-user [USER_ID]
```

### 25. Performance Testing

#### Rapid Order Placement
Place 20 orders as fast as possible:
```
@Prediction Market Bot buy LECTURE 17 1 0.01
@Prediction Market Bot buy LECTURE 17 1 0.02
@Prediction Market Bot buy LECTURE 17 1 0.03
@Prediction Market Bot buy LECTURE 17 1 0.04
@Prediction Market Bot buy LECTURE 17 1 0.05
@Prediction Market Bot buy LECTURE 17 1 0.06
@Prediction Market Bot buy LECTURE 17 1 0.07
@Prediction Market Bot buy LECTURE 17 1 0.08
@Prediction Market Bot buy LECTURE 17 1 0.09
@Prediction Market Bot buy LECTURE 17 1 0.10
```

#### Check System State
```
@Prediction Market Bot orders LECTURE
```
*All orders should have unique IDs*

### 26. Thread Testing

#### Start a Thread
```
@Prediction Market Bot market LECTURE
```

**In the thread:**
```
@Prediction Market Bot buy LECTURE 18 5 0.25
```
*Should work in thread context*

### 27. Final Validation Checklist

Run these commands to verify everything:
```
@Prediction Market Bot help
@Prediction Market Bot list markets
@Prediction Market Bot market LECTURE
@Prediction Market Bot balance
@Prediction Market Bot positions LECTURE
@Prediction Market Bot orders LECTURE
```

---

## Expected Behaviors

### ✅ What Should Work:
- Order IDs appear in buy/sell confirmations
- Transaction notifications when orders match between users
- Balance/positions/orders show privately (ephemeral messages)
- Bundle operations work in DMs
- Market shows "🏁 RESOLVED" status after resolution
- Trading blocked after resolution with clear error message
- Balances update correctly with winnings from resolution

### ✅ Privacy Behaviors:
- `balance`, `positions`, `orders` commands show only to the user (ephemeral)
- Bundle buy/sell confirmations are private
- Buy/sell order confirmations are public (with Order ID)
- Transaction matches are public
- Error messages are private

### ✅ DM Behaviors:
- Balance checking works in DMs
- Position checking works in DMs  
- Bundle operations work in DMs
- Help command works in DMs
- Other trading commands should redirect to public channel

### ❌ What Should Fail:
- Trading commands after market resolution
- Selling more shares than you own
- Buying with insufficient balance
- Invalid price ranges (outside $0.01-$0.99)
- Canceling orders that don't exist or aren't yours

---

## Troubleshooting

If commands aren't working:

1. **Check Railway logs:**
   ```bash
   railway logs
   ```

2. **Verify bot permissions in Slack:**
   - Bot should have required OAuth scopes
   - Bot should be invited to the channel

3. **Check admin status:**
   - Run `@Prediction Market Bot help` and verify you see "Admin Commands" section

4. **Restart if needed:**
   ```bash
   railway up
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