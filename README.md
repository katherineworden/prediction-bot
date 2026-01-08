# Slack Prediction Market Bot

> **Note**: This bot is functional but may have minor bugs. Report issues at the GitHub repository.

A Slack bot that enables prediction market trading within Slack workspaces. Students can trade on outcomes of questions, creating an interactive way to learn about market mechanisms and probability.

## Features

- **Market Creation**: Create prediction markets with multiple outcomes
- **Trading**: Buy and sell shares with limit orders or market orders
- **Bundle Trading**: Buy/sell complete sets of outcomes for arbitrage
- **Order Management**: Place, view, and cancel limit orders with unique IDs
- **Real-time Pricing**: Dynamic pricing based on supply and demand
- **Privacy Controls**: Financial information shown privately to users
- **Data Persistence**: Market data saves automatically with backup
- **Leaderboard**: View rankings of traders by profit
- **Winner Display**: See winners after market resolution
- **Admin Controls**: Market resolution and data export

## Quick Start

### For Instructors (Deployment)

1. **Clone the repository**
   ```bash
   git clone https://github.com/katherineworden/prediction-bot.git
   cd prediction-bot
   ```

2. **Create Slack App** (see detailed instructions below)

3. **Deploy to Oracle Cloud** (recommended - free tier with persistent storage)

4. **Configure environment variables**

5. **Install bot to workspace and invite to channel**

---

## Slack App Setup (Detailed)

### Step 1: Create the Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "Prediction Market Bot")
4. Select your workspace
5. Click **"Create App"**

### Step 2: Configure Bot Token Scopes

1. In the left sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Add these scopes:
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

### Step 3: Enable Event Subscriptions

1. In the left sidebar, click **"Event Subscriptions"**
2. Toggle **"Enable Events"** to ON
3. For **"Request URL"**, enter: `https://YOUR_SERVER_URL/slack/events`
   - You'll need your server URL from deployment first
   - The URL must be verified (Slack will send a challenge)
4. Under **"Subscribe to bot events"**, add:
   - `app_mention` - When bot is mentioned
   - `message.channels` - Channel messages
   - `message.im` - Direct messages
5. Click **"Save Changes"**

### Step 4: Install to Workspace

1. In the left sidebar, click **"Install App"**
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-`)

### Step 5: Get Signing Secret

1. In the left sidebar, click **"Basic Information"**
2. Under **"App Credentials"**, find **"Signing Secret"**
3. Click **"Show"** and copy the value

### Step 6: Get Your Admin User ID

1. In Slack, click on your profile picture
2. Click **"Profile"**
3. Click the **"..."** menu → **"Copy member ID"**
4. This is your admin user ID (starts with `U`)

---

## Deployment to Oracle Cloud (Recommended)

Oracle Cloud offers a **free forever** tier with persistent storage, making it ideal for this bot.

### Step 1: Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Sign up for a free account (requires credit card for verification, but won't be charged)
3. Wait for account activation (can take up to 30 minutes)

### Step 2: Create a Compute Instance

1. Log into Oracle Cloud Console
2. Click **"Create a VM instance"** or navigate to **Compute → Instances → Create Instance**
3. Configure the instance:
   - **Name**: `prediction-bot`
   - **Image**: Ubuntu 22.04 (or latest)
   - **Shape**: VM.Standard.E2.1.Micro (Always Free eligible)
   - **Networking**: Accept defaults (creates VCN)
   - **Add SSH keys**: Upload your public SSH key or generate new
4. Click **"Create"**
5. Wait for instance to be **RUNNING**
6. Note the **Public IP Address**

### Step 3: Configure Security Rules

1. Go to **Networking → Virtual Cloud Networks**
2. Click on your VCN
3. Click on your subnet's **Security List**
4. Click **"Add Ingress Rules"**
5. Add a rule:
   - **Source CIDR**: `0.0.0.0/0`
   - **Destination Port Range**: `3000`
   - **Description**: `Slack bot webhook`
6. Click **"Add Ingress Rules"**

### Step 4: Connect to Your Instance

```bash
ssh -i /path/to/your/private-key ubuntu@YOUR_PUBLIC_IP
```

### Step 5: Install Node.js and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version

# Install PM2 for process management
sudo npm install -g pm2

# Install git
sudo apt install -y git
```

### Step 6: Clone and Configure the Bot

```bash
# Clone the repository
cd ~
git clone https://github.com/katherineworden/prediction-bot.git
cd prediction-bot

# Install dependencies
npm install

# Create environment file
nano .env
```

Add the following to `.env`:
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
ADMIN_USER_IDS=U12345678,U87654321
PORT=3000
DATA_DIR=/home/ubuntu/prediction-bot
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

### Step 7: Configure Firewall (Inside the Instance)

```bash
# Open port 3000
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

### Step 8: Start the Bot

```bash
# Test run first
node index.js

# If it works, stop with Ctrl+C and start with PM2
pm2 start index.js --name prediction-bot

# Save PM2 configuration to survive reboots
pm2 save
pm2 startup
# Follow the instructions it gives you
```

### Step 9: Verify Slack Webhook

1. Go back to your Slack App settings
2. Navigate to **Event Subscriptions**
3. Enter your Request URL: `http://YOUR_PUBLIC_IP:3000/slack/events`
4. Slack should verify the URL with a green checkmark
5. Save changes

### Step 10: Test the Bot

1. In Slack, invite the bot to a channel: `/invite @YourBotName`
2. Test with: `@YourBotName help`
3. The bot should respond with the help message

### Managing the Bot

```bash
# View logs
pm2 logs prediction-bot

# Restart bot
pm2 restart prediction-bot

# Stop bot
pm2 stop prediction-bot

# View status
pm2 status
```

### Updating the Bot

```bash
cd ~/prediction-bot
git pull
npm install
pm2 restart prediction-bot
```

---

## Commands

### Public Commands
- `@bot list markets` - Show all active markets
- `@bot market [market_id]` - Show market details
- `@bot buy [market_id] [outcome_id] [shares] [price]` - Buy shares
- `@bot sell [market_id] [outcome_id] [shares] [price]` - Sell shares
- `@bot leaderboard [market_id] [limit]` - Show top traders
- `@bot winners [market_id]` - Show winners (after resolution)
- `@bot help` - Show help message

### Private Commands (shown only to you)
- `@bot balance` - Check your balance
- `@bot positions [market_id]` - Check your positions
- `@bot orders [market_id]` - View your open orders
- `@bot bundle-buy [market_id] [quantity]` - Buy complete sets
- `@bot bundle-sell [market_id] [quantity]` - Sell complete sets
- `@bot cancel [market_id] [outcome_id] [order_id]` - Cancel order

### Admin Commands
- `@bot create market [market_id] "[outcomes]" "[description]"` - Create market
- `@bot resolve [market_id] [outcome_id]` - Resolve market
- `@bot export-data` - Export market data

### DM Commands
These work in direct messages to the bot:
- `balance` - Check your balance
- `positions [market_id]` - Check your positions
- `orders [market_id]` - View your open orders
- `bundle-buy [market_id] [quantity]` - Buy complete sets
- `bundle-sell [market_id] [quantity]` - Sell complete sets
- `list` - Show all markets
- `help` - Show help

---

## How It Works

### Market Mechanics
- Users start with $1000 when they first interact with the bot
- Prices represent probabilities and must be between $0.01-$0.99
- Outcome IDs start from 1 (not 0) - first outcome is 1, second is 2, etc.
- Orders are held in escrow until executed or cancelled
- Bundle trading keeps prices efficient (outcomes sum to ~$1)
- Winning shares pay $1 when markets resolve

### Leaderboard & Winners
- Use `@bot leaderboard` to see current rankings by balance
- After market resolution, use `@bot winners [market_id]` to see top performers
- Rankings show profit/loss from starting $1000

### Data Persistence
- Market data automatically saved to JSON files after every trade
- Automatic backups created before each save (keeps last 5)
- State maintained across bot restarts
- Use `@bot export-data` to backup data manually

---

## Environment Variables

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
ADMIN_USER_IDS=U12345678,U87654321
PORT=3000
DATA_DIR=/path/to/data/directory
```

| Variable | Description |
|----------|-------------|
| `SLACK_BOT_TOKEN` | Bot token from Slack app (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Signing secret from Slack app |
| `ADMIN_USER_IDS` | Comma-separated list of Slack user IDs for admins |
| `PORT` | Port to run the server on (default: 3000) |
| `DATA_DIR` | Directory to store market data (default: project root) |

---

## Example Usage

```bash
# Create a market (admin only)
@bot create market "LECTURE" "Lecture 1,Lecture 2,Lecture 3" "Which lecture will be most popular?"

# Students trade
@bot bundle-buy LECTURE 5          # Buy 5 complete sets for $5
@bot sell LECTURE 1 3 0.60         # Sell 3 "Lecture 1" shares at $0.60
@bot buy LECTURE 2 2 0.35          # Buy 2 "Lecture 2" shares at $0.35

# Check status privately
@bot balance                       # See your money
@bot positions LECTURE             # See your holdings
@bot orders LECTURE                # See pending orders

# View leaderboard
@bot leaderboard                   # See top traders
@bot leaderboard LECTURE 20        # See top 20 traders for LECTURE market

# Admin resolves market
@bot resolve LECTURE 2             # Lecture 2 won!

# See winners
@bot winners LECTURE               # See who made the most profit
```

---

## Troubleshooting

### Bot Not Responding
1. Check server logs: `pm2 logs prediction-bot`
2. Verify environment variables in `.env`
3. Ensure Slack app has correct permissions
4. Check that Event Subscriptions URL is verified
5. Verify firewall rules allow port 3000

### "URL verification failed" in Slack
1. Make sure your server is running: `pm2 status`
2. Check the URL is correct: `http://YOUR_IP:3000/slack/events`
3. Verify Oracle Cloud security rules allow port 3000
4. Check internal firewall: `sudo iptables -L`

### Data Not Persisting
1. Check `DATA_DIR` environment variable
2. Verify write permissions: `ls -la ~/prediction-bot/`
3. Check for error messages in logs: `pm2 logs prediction-bot`

### Permission Errors in Slack
1. Reinstall the app to workspace
2. Check all OAuth scopes are added
3. Verify bot is invited to the channel

---

## Running Tests

```bash
# Run basic tests
npm test

# Run comprehensive synthetic trader tests
node test-synthetic-traders.js

# Run critical bug tests
node test-critical-bugs.js
```

---

## Architecture

```
├── index.js                    # Express server entry point
├── src/
│   ├── slackBot.js             # Slack event handling and commands
│   ├── marketManager.js        # Market logic, trading, leaderboard
│   └── orderBook.js            # Order matching engine
├── market_data.json            # Persistent data storage
├── test-synthetic-traders.js   # Comprehensive test suite
└── .env                        # Environment variables (not in repo)
```

---

## Security Notes

- Bot tokens are sensitive - never commit to version control
- Use environment variables for all secrets
- Admin permissions are user ID based
- All trades are final - no undo functionality
- Bundle trading prevents negative balances
- Data is stored locally - back up regularly

---

## License

MIT License - see LICENSE file for details

---

*Built for educational purposes to demonstrate prediction markets and automated market makers.*
