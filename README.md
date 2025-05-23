# Slack Prediction Market Bot

> **⚠️ BETA SOFTWARE NOTICE**  
> This bot is currently in beta and has undergone limited testing with course staff. While functional, you may encounter bugs or unexpected behavior. Please be patient as issues are identified and resolved. We encourage you to report any bugs or problems you discover to help improve the system.

A Slack bot that enables prediction market trading within Slack workspaces. Students can trade on outcomes of questions, creating an interactive way to learn about market mechanisms and probability.

## Features

- **Market Creation**: Create prediction markets with multiple outcomes
- **Trading**: Buy and sell shares with limit orders or market orders
- **Bundle Trading**: Buy/sell complete sets of outcomes for arbitrage
- **Order Management**: Place, view, and cancel limit orders with unique IDs
- **Real-time Pricing**: Dynamic pricing based on supply and demand
- **Privacy Controls**: Financial information shown privately to users
- **Data Persistence**: Market data saves automatically
- **Admin Controls**: Market resolution and data export

## Quick Start

### For Instructors (Deployment)

1. **Clone the repository**
   ```bash
   git clone https://github.com/katherineworden/prediction-bot.git
   cd prediction-bot
   ```

2. **Create Slack App**
   - Go to https://api.slack.com/apps
   - Create new app → From scratch
   - Add required permissions (see setup guide below)

3. **Deploy to Railway**
   ```bash
   npm install -g @railway/cli
   railway login
   railway init
   railway up
   ```

4. **Configure Environment**
   ```bash
   railway variables set SLACK_BOT_TOKEN=xoxb-your-token
   railway variables set SLACK_SIGNING_SECRET=your-secret
   ```

5. **Install Bot to Workspace**
   - Configure Event Subscriptions URL: `https://your-app.railway.app/slack/events`
   - Install bot to workspace
   - Invite bot to channel: `/invite @YourBot`

### For Students (Usage)

See [STUDENT_INSTRUCTIONS.md](STUDENT_INSTRUCTIONS.md) for complete usage guide.

## Commands

### Public Commands
- `@bot create market "Question?" "Option1" "Option2"` - Create market (admin only)
- `@bot list markets` - Show all active markets
- `@bot market [market_id]` - Show market details
- `@bot buy [market_id] [outcome_id] [shares] [price]` - Buy shares (outcome_id starts from 1)
- `@bot sell [market_id] [outcome_id] [shares] [price]` - Sell shares (outcome_id starts from 1)
- `@bot help` - Show help message

### Private Commands (shown only to you)
- `@bot balance` - Check your balance
- `@bot positions [market_id]` - Check your positions
- `@bot orders [market_id]` - View your open orders
- `@bot bundle-buy [market_id] [quantity]` - Buy complete sets
- `@bot bundle-sell [market_id] [quantity]` - Sell complete sets
- `@bot cancel [market_id] [outcome_id] [order_id]` - Cancel order (outcome_id starts from 1)

### Admin Commands
- `@bot resolve [market_id] [outcome_id]` - Resolve market (outcome_id starts from 1)
- `@bot export-data` - Export market data
- `@bot update market [market_id] [field] [value]` - Update market data

## How It Works

### Market Mechanics
- Users start with $1000 when they first interact with the bot
- Prices represent probabilities and must be between $0.01-$0.99
- Outcome IDs start from 1 (not 0) - first outcome is 1, second is 2, etc.
- Orders are held in escrow until executed or cancelled
- Bundle trading keeps prices efficient (outcomes sum to ~$1)
- Winning shares pay $1 when markets resolve

### Privacy Design
- **Public**: Buy/sell confirmations, transaction notifications, market creation
- **Private**: Balances, positions, orders, bundle operations
- All financial information shown privately via ephemeral messages

### Data Persistence
- Market data automatically saved to JSON files
- State maintained across bot restarts
- Export functionality for data backup

## Architecture

```
├── index.js              # Express server and Slack integration
├── src/
│   ├── slackBot.js       # Bot command handling and responses  
│   ├── marketManager.js  # Market logic and user management
│   └── orderBook.js      # Order matching and price discovery
├── config/               # Configuration files
└── market_data.json     # Persistent data storage
```

## Deployment Options

### Railway (Recommended)
- Free tier available
- Automatic deployments
- Built-in environment variables
- Domain included

### Alternatives
- Heroku (paid)
- AWS EC2/Lambda
- Google Cloud Run
- Self-hosted VPS

## Environment Variables

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
PORT=3000
NODE_ENV=production
```

## Required Slack Permissions

### Bot Token Scopes
- `app_mentions:read` - Read mentions
- `channels:history` - Read channel messages  
- `channels:read` - View channel info
- `chat:write` - Send messages
- `chat:write.public` - Send to channels bot isn't in
- `commands` - Add slash commands
- `im:history` - Read DM history
- `im:read` - View DM info
- `im:write` - Send DMs
- `users:read` - View workspace users

### Event Subscriptions
- `app_mention` - When bot is mentioned
- `message.channels` - Channel messages
- `message.im` - Direct messages

## Security Notes

- Bot tokens are sensitive - never commit to version control
- Use environment variables for all secrets
- Admin permissions are user ID based
- All trades are final - no undo functionality
- Bundle trading prevents negative balances

## Educational Use

Perfect for:
- Economics courses (market mechanisms)
- Computer science (APIs, databases, distributed systems)
- Statistics (probability, prediction accuracy)
- Business (trading, risk management)

Students learn by:
- Making predictions and trading
- Seeing real-time price discovery
- Understanding market efficiency
- Experiencing risk and reward

## Example Usage

```bash
# Create a market (admin only)
@bot create market "ELECTION2024" "Trump,Biden,Harris" "Who will win the 2024 election?"

# Students trade
@bot bundle-buy ELECTION2024 5          # Buy 5 complete sets for $5
@bot sell ELECTION2024 1 3 0.60         # Sell 3 "Trump" shares at $0.60
@bot buy ELECTION2024 2 2 0.35          # Buy 2 "Biden" shares at $0.35

# Check status privately  
@bot balance                            # See your money
@bot positions ELECTION2024            # See your holdings
@bot orders ELECTION2024               # See pending orders

# Cancel an order
@bot cancel ELECTION2024 1 123         # Cancel order ID 123

# View market
@bot market ELECTION2024               # See current prices and order book
```

## Recent Updates

### v2.0 Features
- ✅ **Order Cancellation**: Cancel resting orders and get funds back
- ✅ **Order IDs**: Track orders with unique identifiers  
- ✅ **Price Validation**: Prices must be between $0.01-$0.99
- ✅ **Enhanced Privacy**: Balance, positions, orders shown privately
- ✅ **Bundle Privacy**: Bundle operations now completely private
- ✅ **DM Support**: Balance and positions work in direct messages
- ✅ **Case-Insensitive Markets**: Market IDs work regardless of case
- ✅ **1-Based Indexing**: Outcomes numbered from 1, not 0
- ✅ **Improved Error Messages**: Clear guidance when orders can't fill

## Troubleshooting

### Bot Not Responding
1. Check Railway logs: `railway logs`
2. Verify environment variables
3. Ensure proper Slack permissions

### Permission Errors
1. Reinstall bot to workspace
2. Check OAuth scopes
3. Verify bot is in channel

### Market Issues
1. Use `@bot export-data` to backup
2. Check user balances
3. Verify market hasn't been resolved

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details

---

*Built by Katherine Worden for educational purposes to demonstrate prediction markets and automated market makers.*