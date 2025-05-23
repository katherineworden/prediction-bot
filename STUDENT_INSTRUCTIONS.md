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
@bot buy [market_id] [outcome_id] [shares]     - Buy shares in an outcome
@bot sell [market_id] [outcome_id] [shares]    - Sell shares you own
@bot bundle-buy [market_id] [shares]           - Buy 1 share of each outcome
@bot bundle-sell [market_id] [shares]          - Sell 1 share of each outcome
```

**Examples:**
```
@bot buy 1 1 10        - Buy 10 shares of outcome 1 in market 1
@bot sell 2 2 5        - Sell 5 shares of outcome 2 in market 2
@bot bundle-buy 1 3    - Buy 3 shares each of all outcomes in market 1
```

### Check Your Status
```
@bot balance     - See how many points you have (recommended: DM the bot)
@bot positions   - See all your current holdings (recommended: DM the bot)
@bot help        - Show all commands
```

**Privacy tip:** For `balance` and `positions` commands, we recommend DMing the bot directly instead of using @mentions in the channel to keep your financial info private!

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
   @bot buy 1 1 20
   ```
   (Buy 20 shares of outcome 1 in market 1)

4. **Check your position:**
   ```
   @bot positions
   ```

5. **Sell if price goes up:**
   ```
   @bot sell 1 1 10
   ```
   (Sell 10 shares for profit)

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