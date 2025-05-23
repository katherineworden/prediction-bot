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

### 7. DM Testing
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

### 8. Market Resolution (Admin Only)
```
@Prediction Market Bot resolve LECTURE 8
```

```
@Prediction Market Bot market LECTURE
```

### 9. Post-Resolution Testing
```
@Prediction Market Bot buy LECTURE 5 1 0.50
```
*Should get error: "Cannot trade on resolved market"*

```
@Prediction Market Bot balance
```
*Should show updated balance with winnings*

### 10. Data Export (Admin Only)
```
@Prediction Market Bot export-data
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