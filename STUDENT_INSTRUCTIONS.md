# Slack Prediction Market Bot - Student Guide

> **Note**: This prediction market bot may have minor bugs. If you find issues, please report them in the #help channel!

## What is this bot?
This bot lets you participate in prediction markets right in Slack. You can bet on outcomes of questions, trade with classmates, and see how good you are at predicting the future!

## About the LECTURE Market
The main market is called **LECTURE** and has 18 possible outcomes. You are betting on the most popular lecture.

**How this market resolves:** This market will resolve in favor of whichever lecture receives the most student votes on the poll "Which lecture was your favorite this quarter?"

- **Outcomes 1-15**: Regular course lectures
- **Outcomes 16-18**: Guest lectures
  - Lecture 16: Eric Neyman
  - Lecture 17: Kshipra Bhawalkar
  - Lecture 18: Geoff Ramseyer
- Outcomes are numbered starting from 1 (not 0) as they appear on Ed

## Getting Started
- You start with **$1000** when you first use the bot
- Tag the bot (@bot) to run commands
- All trades happen instantly at current market prices

---

## Commands Reference

### Viewing Markets
| Command | Description |
|---------|-------------|
| `@bot list markets` | See all active markets |
| `@bot market LECTURE` | Get details about a specific market |
| `@bot leaderboard` | See top traders ranked by balance |
| `@bot leaderboard LECTURE 20` | See top 20 traders for LECTURE market |
| `@bot winners LECTURE` | See winners after market resolves |

### Trading Commands
| Command | Description |
|---------|-------------|
| `@bot buy LECTURE 5 10 0.45` | Buy 10 shares of outcome 5 at $0.45 each |
| `@bot sell LECTURE 5 10 0.60` | Sell 10 shares of outcome 5 at $0.60 each |
| `@bot bundle-buy LECTURE 5` | Buy 5 complete sets ($5 total) |
| `@bot bundle-sell LECTURE 5` | Sell 5 complete sets (get $5 back) |
| `@bot cancel LECTURE 5 123` | Cancel order ID 123 for outcome 5 |

### Check Your Status (Private - Only You See)
| Command | Description |
|---------|-------------|
| `@bot balance` | See how much money you have |
| `@bot positions LECTURE` | See all your current holdings |
| `@bot orders LECTURE` | View your open orders |
| `@bot help` | Show all commands |

---

## DM Commands (Private)

You can message the bot directly (no @mention needed) for private operations:

```
balance                    - Check your money
positions LECTURE          - Check your holdings
orders LECTURE             - View your open orders
bundle-buy LECTURE 5       - Buy 5 bundles privately
bundle-sell LECTURE 5      - Sell 5 bundles privately
list                       - Show all markets
help                       - Get help
```

---

## Privacy: What's Public vs Private

### Private (Only You See)
- Your balance
- Your positions (what shares you own)
- Your open orders
- Bundle operations confirmations
- Error messages

### Public (Everyone Sees)
- Buy/sell order confirmations (with Order ID)
- Transaction matches between traders
- Market information and order books
- Leaderboard rankings

---

## Understanding Prices

Prices represent probability:
| Price | Meaning |
|-------|---------|
| $0.70 | 70% chance of happening |
| $0.30 | 30% chance of happening |
| $0.90 | Very likely (90%) |
| $0.10 | Very unlikely (10%) |

**Key insight:** All outcome prices in a market should add up to approximately $1.00. If they don't, there may be arbitrage opportunities through bundle trading!

---

## How to Trade

### Step 1: Get Shares
Before you can sell shares, you need to own them. Two ways to get shares:

**Option A: Buy a bundle** (recommended for beginners)
```
@bot bundle-buy LECTURE 5
```
This costs $5 and gives you 5 shares of EVERY outcome (5 x 18 = 90 total shares).

**Option B: Buy from another trader**
```
@bot buy LECTURE 8 10 0.50
```
This places a buy order for 10 shares of outcome 8 at $0.50 each.

### Step 2: Sell What You Don't Want
If you bought bundles, sell the outcomes you think WON'T win:
```
@bot sell LECTURE 3 5 0.40
```
Sell 5 shares of outcome 3 at $0.40 each.

### Step 3: Keep What You Think Will Win
Hold onto shares of outcomes you think will win. If correct, each share pays $1!

### Step 4: Check the Leaderboard
```
@bot leaderboard
```
See how you rank against other traders!

---

## Example Trading Session

```
# 1. Check your balance
@bot balance

# 2. See the market
@bot market LECTURE

# 3. Buy 10 complete sets ($10)
@bot bundle-buy LECTURE 10

# 4. You now have 10 shares of each outcome
@bot positions LECTURE

# 5. Sell outcomes you think won't win
@bot sell LECTURE 3 10 0.08    # Sell all Lecture 3 shares
@bot sell LECTURE 7 10 0.05    # Sell all Lecture 7 shares

# 6. Buy more of outcomes you like
@bot buy LECTURE 5 20 0.15     # Buy 20 more Lecture 5 shares

# 7. Check the leaderboard
@bot leaderboard

# 8. Check your orders
@bot orders LECTURE

# 9. Cancel an order if needed
@bot cancel LECTURE 5 123      # Cancel order ID 123
```

---

## Leaderboard & Winners

### During the Market
Use `@bot leaderboard` to see current rankings:
- Shows all traders sorted by balance
- Displays profit/loss from starting $1000
- Updates in real-time as trades happen

### After Market Resolves
Use `@bot winners LECTURE` to see final results:
- Shows the winning outcome
- Displays top traders with medals
- Shows final profit/loss for each trader

---

## Common Questions

**Q: How do I make money?**
A: Buy shares when you think they're underpriced, sell when overpriced. If your chosen outcome wins, each share pays $1!

**Q: Can I lose more than I have?**
A: No! The bot prevents you from spending more than your balance.

**Q: What's bundle trading?**
A: Buying a bundle gives you 1 share of EVERY outcome for $1. This guarantees you'll win $1 when the market resolves (since exactly one outcome wins). It's useful for getting initial shares to sell.

**Q: Can I cancel a trade?**
A: Yes! Cancel unfilled orders with `@bot cancel LECTURE [outcome_id] [order_id]`. Once an order matches with another trader, it's final.

**Q: How do I find my Order ID?**
A: When you place an order, you get a confirmation with the Order ID. Also use `@bot orders LECTURE` to see all your open orders with their IDs.

**Q: What does "Only 0 units could be filled" mean?**
A: There are no matching orders at market price. Place a limit order with a price instead:
```
@bot buy LECTURE 5 10 0.40   # Buy at $0.40 limit
```

**Q: How do I see my ranking?**
A: Use `@bot leaderboard` to see where you stand among all traders!

**Q: When do markets close?**
A: Staff will resolve markets at the end of the quarter when the real outcome is known.

---

## Strategy Tips

1. **Start with bundles** - Buy complete sets to get shares of every outcome
2. **Sell what you don't believe in** - Get rid of outcomes you think won't win
3. **Buy what others undervalue** - If you think an outcome is more likely than the market price suggests, buy!
4. **Watch the leaderboard** - See what strategies are working for top traders
5. **Check the order book** - Use `@bot market LECTURE` to see current bid/ask prices
6. **Arbitrage opportunities** - If sum of best bids or asks isn't close to $1, there may be profit opportunities

---

## Getting Help

- Use `@bot help` anytime to see available commands
- Check `@bot leaderboard` to see how you're doing
- Ask questions in the channel - other students can help too!
- DM the bot for private commands

---

**Have fun predicting the future! Good luck!**
