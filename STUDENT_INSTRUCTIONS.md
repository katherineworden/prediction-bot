# Slack Prediction Market Bot - How to Use

## What is this bot?
This bot lets you participate in prediction markets right in Slack. You can bet on outcomes of questions, trade with classmates, and see how good you are at predicting the future!

## Getting Started
- You start with **1000 points** when you first use the bot
- Tag the bot (@bot) to run commands
- All trades happen instantly at current market prices

## Commands You Can Use

### Viewing Markets
```
@bot list markets          - See all active markets
@bot market [market_id]    - Get details about a specific market
```

### Trading
```
@bot buy [market_id] [outcome_id] [shares] [price]  - Buy shares in an outcome
@bot sell [market_id] [outcome_id] [shares] [price] - Sell shares you own
@bot bundle-buy [market_id] [shares]                - Buy 1 share of each outcome (private)
@bot bundle-sell [market_id] [shares]               - Sell 1 share of each outcome (private)
@bot cancel [market_id] [outcome_id] [order_id]     - Cancel an open order
```

**Examples:**
```
@bot buy 1 1 10 0.45   - Buy 10 shares of outcome 1 at $0.45 each
@bot sell 2 2 5 0.60   - Sell 5 shares of outcome 2 at $0.60 each
@bot bundle-buy 1 3    - Buy 3 complete sets (private confirmation)
@bot cancel 1 1 123    - Cancel order ID 123
```

### Check Your Status
```
@bot balance     - See how many points you have (private - only you see this)
@bot positions   - See all your current holdings (private - only you see this)
@bot orders [market_id] - View your open orders (private - only you see this)
@bot help        - Show all commands
```

**Privacy note:** Balance, positions, and orders are automatically shown privately to you only - no one else in the channel can see your financial information!

## Privacy: What's Public vs Private

### 🔒 Private (Only You See)
- **Your balance** - How much money you have
- **Your positions** - What shares you own
- **Your open orders** - Your pending buy/sell orders
- **Bundle operations** - Your bundle buy/sell confirmations
- **Error messages** - When something goes wrong

### 🌐 Public (Everyone Sees)
- **Buy/sell confirmations** - When you place an order (with Order ID)
- **Transaction matches** - When orders execute between traders
- **Market information** - Current prices and order books
- **Market creation** - New markets being created

### 💬 Also Available in DMs
You can also DM the bot directly for:
- `balance` - Check your money privately
- `positions` - Check your holdings privately  
- `help` - Get help privately

## How Markets Work

### Pricing
- Prices change based on supply and demand
- Popular outcomes get more expensive
- Unpopular outcomes get cheaper
- Bundle buying/selling keeps prices fair

### Making Money
- Buy low, sell high
- If you're right about an outcome, you win points when the market resolves
- If you're wrong, you lose the points you spent

### Market Resolution
- Staff will resolve markets at the end of the quarter
- Winners get paid based on the final outcome
- Losers lose their investment

## Example Trading Session

1. **See what markets exist:**
   ```
   @bot list markets
   ```

2. **Check market details:**
   ```
   @bot market 1
   ```

3. **Buy some shares:**
   ```
   @bot buy 1 1 20 0.55
   ```
   (Buy 20 shares of outcome 1 at $0.55 each - public confirmation, you get Order ID)

4. **Check your position privately:**
   ```
   @bot positions 1
   ```
   (Only you see your holdings)

5. **Check your orders privately:**
   ```
   @bot orders 1
   ```
   (Only you see your pending orders)

6. **Cancel or sell if price moves:**
   ```
   @bot cancel 1 1 123    # Cancel order ID 123
   @bot sell 1 1 10 0.65  # Or sell at higher price
   ```

## Understanding the Numbers

When you see a market, prices show probability:
- **$0.70** = 70% chance of happening
- **$0.30** = 30% chance of happening  
- **$0.90** = 90% chance (very likely)
- **$0.10** = 10% chance (very unlikely)

All outcome prices in a market add up to $1.00.

## Common Questions

**Q: How do I make money?**
A: Buy shares when you think they're underpriced, sell when overpriced, or hold until market resolves if you're confident.

**Q: Can I lose more than I have?**
A: No! The bot prevents you from spending more points than you have.

**Q: Can I create my own markets?**
A: No, only staff can create and resolve markets.

**Q: When do markets close?**
A: Staff will resolve markets at the end of the quarter when the real outcome is known.

**Q: Can I cancel a trade?**
A: No, all trades are final. Think before you trade!

**Q: How do I see my trading history?**
A: Use `@bot positions` to see current holdings. Full history isn't shown but you can track your balance changes.

**Q: What happens if I run out of points?**
A: You can still participate in markets that resolve in your favor, but you won't be able to make new trades until your balance increases.

## Getting Help

- Use `@bot help` anytime to see available commands
- Ask questions in the channel - other students can help too!
- Check your balance regularly to track your performance

---

**Have fun predicting the future! 🔮📈**