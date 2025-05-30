const { WebClient } = require('@slack/web-api');
const { createEventAdapter } = require('@slack/events-api');
const MarketManager = require('./marketManager');

class SlackBot {
  constructor(config) {
    this.web = new WebClient(config.token);
    this.signingSecret = config.signingSecret;
    this.marketManager = new MarketManager();
    this.slackEvents = createEventAdapter(this.signingSecret);
    this.adminUsers = config.adminUsers || []; // Array of admin user IDs
    this.botUserId = null; // Will be set on start
    
    // Register graceful shutdown handler to save data
    process.on('SIGINT', this.handleShutdown.bind(this));
    process.on('SIGTERM', this.handleShutdown.bind(this));
  }
  
  handleShutdown() {
    console.log('Received shutdown signal...');
    // In production, we don't save data on shutdown
    if (process.env.NODE_ENV !== 'production') {
      console.log('Backing up market data...');
      this.marketManager.saveData();
    }
    process.exit(0);
  }

  async start(port = 3000) {
    // Get bot user ID to prevent responding to self
    try {
      const authTest = await this.web.auth.test();
      this.botUserId = authTest.user_id;
      console.log(`Bot user ID: ${this.botUserId}`);
    } catch (error) {
      console.error('Failed to get bot user ID:', error);
    }
    
    this.slackEvents.on('app_mention', this.handleMention.bind(this));
    this.slackEvents.on('message', this.handleMessage.bind(this));
    
    // Add additional debugging
    this.slackEvents.on('error', (error) => {
      console.error('Slack events error:', error);
    });
    
    console.log('Registering event handlers for app_mention and message events');
    
    await this.slackEvents.start(port);
    console.log(`Slack bot listening on port ${port}`);
  }

  async handleMention(event) {
    try {
      const text = event.text;
      const userId = event.user;
      const channel = event.channel;
      const thread_ts = event.thread_ts || event.ts; // Use thread_ts if available, otherwise use the message ts
      
      // Extract command while preserving casing for the rest
      const mentionMatch = text.match(/^<@[^>]+>\s+(\S+)(.*)/i);
      if (!mentionMatch) return;
      
      const command = mentionMatch[1].toLowerCase();
      const argsText = mentionMatch[2].trim();
      
      switch (command) {
        case 'create':
          if (!this.isAdmin(userId)) {
            await this.sendMessage(channel, 'Sorry, only admins can create markets.', thread_ts);
            return;
          }
          await this.handleCreateMarket(channel, argsText, thread_ts, userId);
          break;
        case 'buy':
          await this.handleBuy(channel, userId, argsText, thread_ts);
          break;
        case 'sell':
          await this.handleSell(channel, userId, argsText, thread_ts);
          break;
        case 'market':
          await this.handleMarketInfo(channel, argsText, thread_ts);
          break;
        case 'list':
          await this.handleListMarkets(channel, thread_ts);
          break;
        case 'balance':
          await this.handleBalance(channel, userId, thread_ts);
          break;
        case 'position':
        case 'positions':
          await this.handlePosition(channel, userId, argsText, thread_ts);
          break;
        case 'bundle-buy':
          await this.handleBundleBuy(channel, userId, argsText, thread_ts);
          break;
        case 'bundle-sell':
          await this.handleBundleSell(channel, userId, argsText, thread_ts);
          break;
        case 'cancel':
          await this.handleCancel(channel, userId, argsText, thread_ts);
          break;
        case 'orders':
          await this.handleOrders(channel, userId, argsText, thread_ts);
          break;
        case 'resolve':
          if (!this.isAdmin(userId)) {
            await this.sendMessage(channel, 'Sorry, only admins can resolve markets.', thread_ts);
            return;
          }
          await this.handleResolve(channel, userId, argsText, thread_ts);
          break;
        case 'export-data':
          if (!this.isAdmin(userId)) {
            await this.sendMessage(channel, 'Sorry, only admins can export market data.', thread_ts);
            return;
          }
          await this.handleExportData(channel, userId, thread_ts);
          break;
        case 'help':
          await this.handleHelp(channel, userId, thread_ts);
          break;
        default:
          await this.handleHelp(channel, userId, thread_ts);
      }
    } catch (error) {
      console.error('Error handling mention:', error);
      await this.sendMessage(event.channel, `Error: ${error.message}`, event.thread_ts || event.ts);
    }
  }

  async handleMessage(event) {
    // Add debugging for DM messages
    console.log('Received message event:', JSON.stringify({
      channel: event.channel,
      user: event.user,
      text: event.text,
      channel_type: event.channel_type
    }));
    
    // Only handle direct messages
    if (event.subtype || !event.text) return;
    
    // CRITICAL: Ignore messages from the bot itself to prevent loops
    if (event.bot_id || event.user === this.botUserId) return;
    
    // IMPORTANT: Ignore messages that mention the bot (these are handled by handleMention)
    // Check if the message contains a bot mention
    const botMentionPattern = new RegExp(`<@${this.botUserId}>`);
    if (botMentionPattern.test(event.text)) {
      console.log('Ignoring message event - contains bot mention, will be handled by app_mention');
      return;
    }
    
    // Only handle DMs - channels starting with 'D' are DMs
    if (!event.channel.startsWith('D')) {
      console.log('Ignoring message event - not a DM');
      return;
    }
    
    // We'll assume that direct messages to the bot are coming from an im channel type
    // This avoids needing extra permissions
    const userId = event.user;
    const text = event.text.toLowerCase().trim();
    const thread_ts = event.thread_ts || event.ts;
    
    if (text === 'balance') {
      console.log('Balance command detected in DM from user:', userId);
      try {
        // Initialize user if not already initialized
        this.marketManager.initializeUser(userId);
        // Handle balance check in DM - use direct send instead of ephemeral
        const balance = this.marketManager.getUserBalance(userId);
        await this.sendMessage(event.channel, `Your balance: $${balance.toFixed(2)}`, thread_ts);
      } catch (error) {
        console.error('Error handling balance command in DM:', error);
        await this.sendMessage(event.channel, `Error checking balance: ${error.message}`, thread_ts);
      }
    } else if (text.startsWith('position ') || text.startsWith('positions ')) {
      console.log('Position command detected in DM from user:', userId);
      try {
        // Handle position check in DM
        const parts = text.split(' ');
        const marketId = parts[1]?.toUpperCase(); // Normalize market ID to uppercase
        if (marketId) {
          // Initialize user if not already initialized
          this.marketManager.initializeUser(userId);
          // Get positions directly
          const positions = this.marketManager.getUserPosition(userId, marketId);
          const market = this.marketManager.getMarket(marketId);
          
          if (!market) {
            await this.sendMessage(event.channel, `Market '${marketId}' not found. Use 'list' to see available markets.`, thread_ts);
            return;
          }
          
          let positionText = `Your positions in ${marketId}:\n`;
          for (const [outcomeId, outcome] of market.outcomes) {
            const shares = positions[outcomeId] || 0;
            positionText += `${outcome.name} (ID: ${outcomeId}): ${shares} shares\n`;
          }
          
          await this.sendMessage(event.channel, positionText, thread_ts);
        } else {
          await this.sendMessage(event.channel, 'Please specify a market ID: `positions <market_id>`', thread_ts);
        }
      } catch (error) {
        console.error('Error handling position command in DM:', error);
        await this.sendMessage(event.channel, `Error checking positions: ${error.message}`, thread_ts);
      }
    } else if (text.startsWith('bundle-buy ')) {
      console.log('Bundle-buy command detected in DM from user:', userId);
      try {
        const args = text.split(' ');
        const marketId = args[1]?.toUpperCase(); // Normalize market ID to uppercase
        const quantity = parseInt(args[2]);
        
        if (!marketId || !quantity) {
          await this.sendMessage(event.channel, 'Usage: `bundle-buy <market_id> <quantity>`', thread_ts);
          return;
        }
        
        const result = this.marketManager.buyBundle(userId, marketId, quantity);
        await this.sendMessage(event.channel, `You bought ${result.bundlesBought} bundles for $${result.cost.toFixed(2)}`, thread_ts);
      } catch (error) {
        console.error('Error handling bundle-buy command in DM:', error);
        await this.sendMessage(event.channel, `Error: ${error.message}`, thread_ts);
      }
    } else if (text.startsWith('bundle-sell ')) {
      console.log('Bundle-sell command detected in DM from user:', userId);
      try {
        const args = text.split(' ');
        const marketId = args[1]?.toUpperCase(); // Normalize market ID to uppercase
        const quantity = parseInt(args[2]);
        
        if (!marketId || !quantity) {
          await this.sendMessage(event.channel, 'Usage: `bundle-sell <market_id> <quantity>`', thread_ts);
          return;
        }
        
        const result = this.marketManager.sellBundle(userId, marketId, quantity);
        await this.sendMessage(event.channel, `You sold ${result.bundlesSold} bundles for $${result.revenue.toFixed(2)}`, thread_ts);
      } catch (error) {
        console.error('Error handling bundle-sell command in DM:', error);
        await this.sendMessage(event.channel, `Error: ${error.message}`, thread_ts);
      }
    } else if (text === 'help') {
      // Handle help command in DM
      await this.handleHelp(event.channel, userId, thread_ts);
    } else if (text.startsWith('list')) {
      // Handle list command in DM
      await this.handleListMarkets(event.channel, thread_ts);
    } else if (text.startsWith('orders ')) {
      // Handle orders command in DM
      const marketId = text.split(' ')[1]?.toUpperCase();
      if (marketId) {
        await this.handleOrders(event.channel, userId, marketId, thread_ts);
      } else {
        await this.sendMessage(event.channel, 'Usage: `orders <market_id>`', thread_ts);
      }
    } else if ((text.startsWith('buy ') && /^buy \S+ \S+ \d+/.test(text)) || 
               (text.startsWith('sell ') && /^sell \S+ \S+ \d+/.test(text)) || 
               (text.startsWith('market ') && /^market \S+/.test(text)) || 
               (this.isAdmin(userId) && (text.startsWith('create ') || text.startsWith('resolve ')))) {
      // For other commands, tell users to use them in public channels with @mentions
      await this.sendMessage(event.channel, 'Please use this command in a channel by mentioning the bot: `@bot ' + text + '`', thread_ts);
    } else {
      // Unrecognized command in DM
      await this.sendMessage(event.channel, `I don't recognize that command. Available DM commands:\n• \`balance\`\n• \`positions <market_id>\`\n• \`bundle-buy <market_id> <quantity>\`\n• \`bundle-sell <market_id> <quantity>\`\n• \`orders <market_id>\`\n• \`list\`\n• \`help\`\n\nFor other commands, please use them in a channel by mentioning me.`, thread_ts);
    }
  }

  async handleCreateMarket(channel, argsText, thread_ts, userId) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      // If the first capturing group matched, use that
      // Otherwise, use the second capturing group (quote-enclosed string)
      args.push(match[1] || match[2]);
    }
    
    console.log('Parsed args:', args); // Debug logging
    
    // Check if first arg is "market" keyword
    if (args[0] !== 'market') {
      await this.sendMessage(channel, 'Usage: @bot create market <market_id> "outcome1,outcome2,..." "description"', thread_ts);
      return;
    }
    
    const marketId = args[1]?.toUpperCase();
    const outcomesStr = args[2];
    const description = args[3];
    
    if (!marketId || !outcomesStr || !description) {
      await this.sendMessage(channel, 'Usage: @bot create market <market_id> "outcome1,outcome2,..." "description"', thread_ts);
      return;
    }
    
    try {
      const outcomeNames = outcomesStr.split(',').map(o => o.trim());
      const outcomes = outcomeNames.map((name, index) => ({ id: (index + 1).toString(), name }));
      
      const market = this.marketManager.createMarket(marketId, description, outcomes);
      
      // Format outcomes with IDs
      const outcomesWithIds = outcomeNames.map((name, index) => `${index + 1} (${name})`).join(', ');
      await this.sendMessage(channel, `Market created: ${marketId} - ${description}\nOutcomes (ID - Name): ${outcomesWithIds}`, thread_ts);
    } catch (error) {
      await this.sendMessage(channel, `Error creating market: ${error.message}`, thread_ts);
    }
  }

  async handleBuy(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    const outcomeId = args[1];
    const quantity = parseInt(args[2]);
    const priceStr = args[3];
    
    if (!marketId || !outcomeId || !quantity) {
      await this.sendMessage(channel, 'Usage: @bot buy <market_id> <outcome_id> <quantity> [price]', thread_ts);
      return;
    }
    
    try {
      let result;
      if (priceStr) {
        const price = parseFloat(priceStr);
        
        // Validate price is within valid range
        if (isNaN(price) || price <= 0 || price >= 1) {
          await this.sendMessage(channel, 'Error: Price must be between $0.01 and $0.99', thread_ts);
          return;
        }
        
        result = this.marketManager.placeBuyOrder(userId, marketId, outcomeId, price, quantity);
        await this.sendMessage(channel, `Buy order placed: ${quantity} shares of outcome ${outcomeId} @ $${price} (Order ID: ${result.order.id})`, thread_ts);
      } else {
        result = this.marketManager.marketBuy(userId, marketId, outcomeId, quantity);
        await this.sendMessage(channel, `Market buy executed: ${quantity} shares of outcome ${outcomeId} for $${result.totalCost.toFixed(2)}`, thread_ts);
      }
      
      if (result.matches && result.matches.length > 0) {
        // Tag both buyer and seller in the notification
        const matches = result.matches;
        for (const match of matches) {
          const buyerTag = `<@${match.buyer}>`;
          const sellerTag = `<@${match.seller}>`;
          await this.sendMessage(channel, 
            `Transaction completed: ${buyerTag} bought ${match.quantity} shares of outcome ${outcomeId} from ${sellerTag} @ $${match.price}`, 
            thread_ts
          );
        }
      }
    } catch (error) {
      let errorMessage = `Error: ${error.message}`;
      if (error.message.includes('Only 0 units could be filled')) {
        errorMessage += '\n\nNo matching orders available. Try:\n• Placing a limit order with a price: `@bot buy ' + marketId + ' ' + outcomeId + ' ' + quantity + ' 0.40`\n• Using bundle-buy to get shares: `@bot bundle-buy ' + marketId + ' 5`';
      }
      await this.sendMessage(channel, errorMessage, thread_ts);
    }
  }

  async handleSell(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    const outcomeId = args[1];
    const quantity = parseInt(args[2]);
    const priceStr = args[3];
    
    if (!marketId || !outcomeId || !quantity) {
      await this.sendMessage(channel, 'Usage: @bot sell <market_id> <outcome_id> <quantity> [price]', thread_ts);
      return;
    }
    
    try {
      let result;
      if (priceStr) {
        const price = parseFloat(priceStr);
        
        // Validate price is within valid range
        if (isNaN(price) || price <= 0 || price >= 1) {
          await this.sendMessage(channel, 'Error: Price must be between $0.01 and $0.99', thread_ts);
          return;
        }
        
        result = this.marketManager.placeSellOrder(userId, marketId, outcomeId, price, quantity);
        await this.sendMessage(channel, `Sell order placed: ${quantity} shares of outcome ${outcomeId} @ $${price} (Order ID: ${result.order.id})`, thread_ts);
      } else {
        result = this.marketManager.marketSell(userId, marketId, outcomeId, quantity);
        await this.sendMessage(channel, `Market sell executed: ${quantity} shares of outcome ${outcomeId} for $${result.totalRevenue.toFixed(2)}`, thread_ts);
      }
      
      if (result.matches && result.matches.length > 0) {
        // Tag both buyer and seller in the notification
        const matches = result.matches;
        for (const match of matches) {
          const buyerTag = `<@${match.buyer}>`;
          const sellerTag = `<@${match.seller}>`;
          await this.sendMessage(channel, 
            `Transaction completed: ${sellerTag} sold ${match.quantity} shares of outcome ${outcomeId} to ${buyerTag} @ $${match.price}`, 
            thread_ts
          );
        }
      }
    } catch (error) {
      let errorMessage = `Error: ${error.message}`;
      if (error.message.includes('Only 0 units could be filled')) {
        errorMessage += '\n\nNo matching orders available. Try:\n• Placing a limit order with a price: `@bot sell ' + marketId + ' ' + outcomeId + ' ' + quantity + ' 0.60`\n• Someone needs to place buy orders first';
      }
      await this.sendMessage(channel, errorMessage, thread_ts);
    }
  }

  async handleListMarkets(channel, thread_ts) {
    const markets = Array.from(this.marketManager.markets.keys());
    
    if (markets.length === 0) {
      await this.sendMessage(channel, 'No markets found. Use `@bot create market` to create one.', thread_ts);
      return;
    }
    
    let marketsList = '*Available Markets:*\n';
    for (const marketId of markets) {
      const market = this.marketManager.getMarket(marketId);
      const status = market.resolved ? '🏁 RESOLVED' : '📈 ACTIVE';
      marketsList += `• **${marketId}** - ${market.description} (${status})\n`;
    }
    
    await this.sendMessage(channel, marketsList, thread_ts);
  }

  async handleMarketInfo(channel, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    
    if (!marketId) {
      await this.sendMessage(channel, 'Usage: @bot market <market_id>', thread_ts);
      return;
    }
    
    const info = this.marketManager.getMarketInfo(marketId);
    if (!info) {
      await this.sendMessage(channel, 'Market not found', thread_ts);
      return;
    }
    
    try {
      // Split outcomes into multiple messages if needed
      const outcomeEntries = Object.entries(info.outcomes);
      const outcomesPerMessage = 9; // Each outcome uses ~4 blocks, plus headers
      
      if (outcomeEntries.length <= outcomesPerMessage) {
        // Single message for <= 9 outcomes
        const blocks = this.formatOrderBook(info, outcomeEntries, 0, outcomeEntries.length);
        await this.web.chat.postMessage({
          channel,
          blocks,
          thread_ts
        });
      } else {
        // Multiple messages for > 9 outcomes
        // First message: outcomes 1-9
        const blocks1 = this.formatOrderBook(info, outcomeEntries, 0, outcomesPerMessage, 1, 2);
        await this.web.chat.postMessage({
          channel,
          blocks: blocks1,
          thread_ts
        });
        
        // Second message: outcomes 10+
        const blocks2 = this.formatOrderBook(info, outcomeEntries, outcomesPerMessage, outcomeEntries.length, 2, 2);
        await this.web.chat.postMessage({
          channel,
          blocks: blocks2,
          thread_ts
        });
      }
    } catch (error) {
      console.error('Error sending blocks:', error);
      // Fallback to simple text message
      const fallbackText = this.formatOrderBookText(info);
      await this.sendMessage(channel, fallbackText, thread_ts);
    }
  }

  async handleBalance(channel, userId, thread_ts) {
    const balance = this.marketManager.getUserBalance(userId);
    // Send balance as an ephemeral message visible only to the user
    await this.web.chat.postEphemeral({
      channel,
      user: userId,
      text: `Your balance: $${balance.toFixed(2)}`,
      thread_ts
    });
  }

  async handlePosition(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    
    if (!marketId) {
      await this.sendMessage(channel, 'Usage: @bot position <market_id>', thread_ts);
      return;
    }
    
    const positions = this.marketManager.getUserPosition(userId, marketId);
    const market = this.marketManager.getMarket(marketId);
    
    if (!market) {
      await this.sendMessage(channel, 'Market not found', thread_ts);
      return;
    }
    
    let positionText = `Your positions in ${marketId}:\n`;
    for (const [outcomeId, outcome] of market.outcomes) {
      const shares = positions[outcomeId] || 0;
      positionText += `${outcome.name} (ID: ${outcomeId}): ${shares} shares\n`;
    }
    
    // Send positions as an ephemeral message visible only to the user
    await this.web.chat.postEphemeral({
      channel,
      user: userId,
      text: positionText,
      thread_ts
    });
  }

  async handleBundleBuy(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    const quantity = parseInt(args[1]);
    
    if (!marketId || !quantity) {
      await this.sendMessage(channel, 'Usage: @bot bundle-buy <market_id> <quantity>', thread_ts);
      return;
    }
    
    try {
      const result = this.marketManager.buyBundle(userId, marketId, quantity);
      
      // Check if we're in a DM or channel
      const channelInfo = await this.web.conversations.info({ channel }).catch(() => null);
      const isDM = channelInfo?.channel?.is_im || channel.startsWith('D');
      
      if (isDM) {
        // In DM, send regular message
        await this.sendMessage(channel, `You bought ${result.bundlesBought} bundles for $${result.cost.toFixed(2)}`, thread_ts);
      } else {
        // In channel, send confirmation and guide to DM
        await this.sendMessage(channel, `✅ Bundle purchase successful! Please use bundle commands in DM to reduce spam in the channel.`, thread_ts);
        // Send details privately
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: `You bought ${result.bundlesBought} bundles for $${result.cost.toFixed(2)}`,
          thread_ts
        });
      }
    } catch (error) {
      // Send errors privately in channels, directly in DMs
      const channelInfo = await this.web.conversations.info({ channel }).catch(() => null);
      const isDM = channelInfo?.channel?.is_im || channel.startsWith('D');
      
      if (isDM) {
        await this.sendMessage(channel, `Error: ${error.message}`, thread_ts);
      } else {
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: `Error: ${error.message}`,
          thread_ts
        });
      }
    }
  }

  async handleBundleSell(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    const quantity = parseInt(args[1]);
    
    if (!marketId || !quantity) {
      await this.sendMessage(channel, 'Usage: @bot bundle-sell <market_id> <quantity>', thread_ts);
      return;
    }
    
    try {
      const result = this.marketManager.sellBundle(userId, marketId, quantity);
      
      // Check if we're in a DM or channel
      const channelInfo = await this.web.conversations.info({ channel }).catch(() => null);
      const isDM = channelInfo?.channel?.is_im || channel.startsWith('D');
      
      if (isDM) {
        // In DM, send regular message
        await this.sendMessage(channel, `You sold ${result.bundlesSold} bundles for $${result.revenue.toFixed(2)}`, thread_ts);
      } else {
        // In channel, send confirmation and guide to DM
        await this.sendMessage(channel, `✅ Bundle sale successful! Please use bundle commands in DM to reduce spam in the channel.`, thread_ts);
        // Send details privately
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: `You sold ${result.bundlesSold} bundles for $${result.revenue.toFixed(2)}`,
          thread_ts
        });
      }
    } catch (error) {
      // Send errors privately in channels, directly in DMs
      const channelInfo = await this.web.conversations.info({ channel }).catch(() => null);
      const isDM = channelInfo?.channel?.is_im || channel.startsWith('D');
      
      if (isDM) {
        await this.sendMessage(channel, `Error: ${error.message}`, thread_ts);
      } else {
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: `Error: ${error.message}`,
          thread_ts
        });
      }
    }
  }

  async handleResolve(channel, userId, argsText, thread_ts) {
    // Parse arguments while respecting quotes
    const regex = /([^\s"]+)|"([^"]*)"/g;
    const args = [];
    let match;
    
    while ((match = regex.exec(argsText)) !== null) {
      args.push(match[1] || match[2]);
    }
    
    const marketId = args[0]?.toUpperCase();
    const outcomeId = args[1];
    
    if (!marketId || !outcomeId) {
      await this.sendMessage(channel, 'Usage: @bot resolve <market_id> <winning_outcome_id>', thread_ts);
      return;
    }
    
    try {
      const result = this.marketManager.resolveMarket(marketId, outcomeId);
      await this.sendMessage(channel, `Market ${marketId} resolved. Winning outcome: ${outcomeId}`, thread_ts);
    } catch (error) {
      await this.sendMessage(channel, `Error: ${error.message}`, thread_ts);
    }
  }
  
  async handleExportData(channel, userId, thread_ts) {
    try {
      // Get current market state
      const data = this.marketManager.getState();
      
      // Format market summary
      let summary = "Current Market Data Summary:\n";
      summary += `Total Markets: ${Object.keys(data.markets).length}\n`;
      summary += `Total Users: ${Object.keys(data.userBalances).length}\n\n`;
      
      // Add market details
      if (Object.keys(data.markets).length > 0) {
        summary += "Markets:\n";
        for (const [marketId, market] of Object.entries(data.markets)) {
          const outcomeCount = Object.keys(market.outcomes).length;
          const isResolved = market.resolved ? "Resolved" : "Active";
          summary += `- ${marketId}: ${market.description} (${outcomeCount} outcomes, ${isResolved})\n`;
        }
      }
      
      // Send the summary to the channel
      await this.sendMessage(channel, summary, thread_ts);
      
      // Send the full JSON data privately
      const jsonData = JSON.stringify(data, null, 2);
      
      // Check if the data is too large for a single message
      if (jsonData.length > 3000) {
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: "The complete market data is too large to display. Here's the first 3000 characters:\n```\n" + 
                jsonData.substring(0, 3000) + "\n...\n```\n(Data is truncated)",
          thread_ts
        });
      } else {
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: "Complete market data:\n```\n" + jsonData + "\n```\n" + 
                "Copy this data to your market_data.json file to persist markets across deployments.",
          thread_ts
        });
      }
    } catch (error) {
      await this.sendMessage(channel, `Error exporting market data: ${error.message}`, thread_ts);
    }
  }

  async handleCancel(channel, userId, argsText, thread_ts) {
    const args = argsText.trim().split(/\s+/);
    const marketId = args[0]?.toUpperCase();
    const outcomeId = args[1]; 
    const orderId = parseInt(args[2]);
    
    if (!marketId || !outcomeId || !orderId) {
      await this.sendMessage(channel, 'Usage: @bot cancel <market_id> <outcome_id> <order_id>', thread_ts);
      return;
    }
    
    try {
      const cancelledOrder = this.marketManager.cancelOrder(userId, marketId, outcomeId, orderId);
      const action = cancelledOrder.side === 'buy' ? 'Buy' : 'Sell';
      await this.sendMessage(channel, 
        `${action} order cancelled: ${cancelledOrder.quantity} shares of outcome ${outcomeId} @ $${cancelledOrder.price} (Order ID: ${cancelledOrder.id})`, 
        thread_ts
      );
    } catch (error) {
      await this.sendMessage(channel, `Error: ${error.message}`, thread_ts);
    }
  }

  async handleOrders(channel, userId, argsText, thread_ts) {
    const args = argsText.trim().split(/\s+/);
    const marketId = args[0]?.toUpperCase();
    
    if (!marketId) {
      await this.sendMessage(channel, 'Usage: @bot orders <market_id>', thread_ts);
      return;
    }
    
    try {
      const orders = this.marketManager.getUserOrders(userId, marketId);
      
      if (orders.length === 0) {
        await this.web.chat.postEphemeral({
          channel,
          user: userId,
          text: `You have no open orders in market ${marketId}\n\n_Please use orders command in DM to reduce spam in the channel._`,
          thread_ts
        });
        return;
      }
      
      let orderText = `Your open orders in market ${marketId}:\n`;
      for (const order of orders) {
        const side = order.side === 'buy' ? 'BUY' : 'SELL';
        const date = new Date(order.timestamp).toLocaleString();
        orderText += `• ${side} ${order.quantity} shares of "${order.outcomeName}" @ $${order.price} (ID: ${order.id}) - ${date}\n`;
      }
      
      await this.web.chat.postEphemeral({
        channel,
        user: userId,
        text: orderText + '\n_Please use orders command in DM to reduce spam in the channel._',
        thread_ts
      });
    } catch (error) {
      await this.sendMessage(channel, `Error: ${error.message}`, thread_ts);
    }
  }

  async handleHelp(channel, userId, thread_ts) {
    const isAdmin = this.isAdmin(userId);
    let helpText = `
*Prediction Market Commands:*
Market: **LECTURE** (outcomes 1-18: lectures 1-15 + guest lectures 16-18)

• \`@bot list markets\` - Show all markets
• \`@bot market <market_id>\` - Show market details
• \`@bot buy <market_id> <outcome_id> <quantity> [price]\` - Buy shares
• \`@bot sell <market_id> <outcome_id> <quantity> [price]\` - Sell shares
• \`@bot bundle-buy <market_id> <quantity>\` - Buy complete sets ($1 each)
• \`@bot bundle-sell <market_id> <quantity>\` - Sell complete sets
• \`@bot balance\` - Show your balance (private)
• \`@bot position <market_id>\` or \`@bot positions <market_id>\` - Show your positions (private)
• \`@bot orders <market_id>\` - Show your open orders (private)
• \`@bot cancel <market_id> <outcome_id> <order_id>\` - Cancel order

*DM Commands:* \`balance\`, \`positions LECTURE\`, \`bundle-buy\`, \`bundle-sell\``;
    
    if (isAdmin) {
      helpText += `

*Admin Commands:*
• \`@bot create market <market_id> "<outcomes>" "<description>"\` - Create market
• \`@bot resolve <market_id> <winning_outcome_id>\` - Resolve market
• \`@bot export-data\` - Export market data`;
    }
    
    await this.sendMessage(channel, helpText, thread_ts);
  }

  formatOrderBook(info, outcomeEntries, startIdx, endIdx, part = null, totalParts = null) {
    const blocks = [];
    
    // Add header only for first message or when not splitting
    if (!part || part === 1) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Market: ${info.description}`
        }
      });

      // Add resolution status if market is resolved
      if (info.resolved) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🏁 *RESOLVED* - Winning Outcome: ${info.winningOutcome}`
          }
        });
      } else {
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sum of Best Bids:* $${info.totalBestBids.toFixed(2)}`
            },
            {
              type: 'mrkdwn',
              text: `*Sum of Best Asks:* $${info.totalBestAsks.toFixed(2)}`
            }
          ]
        });
      }
      
      blocks.push({
        type: 'divider'
      });
    }
    
    // Add part indicator if splitting
    if (part && totalParts) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_Showing outcomes ${startIdx + 1}-${endIdx} (Part ${part} of ${totalParts})_`
        }
      });
      blocks.push({
        type: 'divider'
      });
    }
    
    // Add each outcome's order book
    const displayOutcomes = outcomeEntries.slice(startIdx, endIdx);
    for (const [outcomeId, outcome] of displayOutcomes) {
      // Limit orders shown per outcome
      const maxOrdersPerSide = 5;
      const limitedBids = outcome.bids.slice(0, maxOrdersPerSide);
      const limitedAsks = outcome.asks.slice(0, maxOrdersPerSide);
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${outcome.name}* (ID: ${outcomeId})`
        }
      });
      
      const bidText = limitedBids.map(b => `$${b.price} (${b.quantity})`).join('\n') || 'No bids';
      const askText = limitedAsks.map(a => `$${a.price} (${a.quantity})`).join('\n') || 'No asks';
      
      // Add note if orders were truncated
      const bidNote = outcome.bids.length > maxOrdersPerSide ? `\n_...and ${outcome.bids.length - maxOrdersPerSide} more_` : '';
      const askNote = outcome.asks.length > maxOrdersPerSide ? `\n_...and ${outcome.asks.length - maxOrdersPerSide} more_` : '';
      
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Bids:*\n${bidText}${bidNote}`
          },
          {
            type: 'mrkdwn',
            text: `*Asks:*\n${askText}${askNote}`
          },
          {
            type: 'mrkdwn',
            text: `*Last:* $${outcome.last || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Volume:* ${outcome.volume}`
          }
        ]
      });
      
      blocks.push({ type: 'divider' });
    }
    
    return blocks;
  }

  formatOrderBookText(info) {
    let text = `Market: ${info.description}\n`;
    
    if (info.resolved) {
      text += `🏁 RESOLVED - Winning Outcome: ${info.winningOutcome}\n`;
    } else {
      text += `Sum of Best Bids: $${info.totalBestBids.toFixed(2)}\n`;
      text += `Sum of Best Asks: $${info.totalBestAsks.toFixed(2)}\n`;
    }
    
    text += '\n';
    
    for (const [outcomeId, outcome] of Object.entries(info.outcomes)) {
      text += `${outcome.name} (ID: ${outcomeId})\n`;
      const bidText = outcome.bids.map(b => `$${b.price} (${b.quantity})`).join(', ') || 'No bids';
      const askText = outcome.asks.map(a => `$${a.price} (${a.quantity})`).join(', ') || 'No asks';
      text += `  Bids: ${bidText}\n`;
      text += `  Asks: ${askText}\n`;
      text += `  Last: $${outcome.last || 'N/A'} | Volume: ${outcome.volume}\n\n`;
    }
    
    return text;
  }

  async sendMessage(channel, text, thread_ts = null) {
    await this.web.chat.postMessage({
      channel,
      text,
      thread_ts: thread_ts
    });
  }

  isAdmin(userId) {
    return this.adminUsers.includes(userId);
  }
}

module.exports = SlackBot;