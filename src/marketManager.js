const OrderBook = require('./orderBook');
const fs = require('fs');
const path = require('path');

class MarketManager {
  constructor() {
    this.markets = new Map();
    this.userBalances = new Map();
    this.userPositions = new Map();
    this.bundlePrice = 1; // Price for a complete set of all outcomes
    this.isRestoring = false; // Flag to disable saving during restoration
    
    // Use a fixed path to a file that's part of the codebase
    this.dataFile = path.join(__dirname, '../market_data.json');
    this.transactionHistoryFile = path.join(__dirname, '../complete_transaction_history.json');
    console.log(`Using data file at: ${this.dataFile}`);
    
    // Try to restore from transaction history first
    const restored = this.restoreFromTransactionHistory();
    
    if (!restored) {
      // If no transaction history, load saved data from the bundled file
      this.loadData();
    }
    
    // The file is now read-only in production, so we won't auto-save
    // State will be maintained in memory during the current session
  }

  createMarket(marketId, description, outcomes, initialBalance = 1000) {
    if (this.markets.has(marketId)) {
      throw new Error('Market already exists');
    }
    
    const orderBooks = new Map();
    outcomes.forEach((outcome, index) => {
      orderBooks.set(outcome.id || index.toString(), {
        name: outcome.name || outcome,
        orderBook: new OrderBook(outcome.id || index.toString())
      });
    });
    
    this.markets.set(marketId, {
      id: marketId,
      description,
      outcomes: orderBooks,
      created: Date.now(),
      resolved: false
    });
    
    // Save data after creating market
    this.saveData();
    
    return this.markets.get(marketId);
  }

  getMarket(marketId) {
    return this.markets.get(marketId);
  }

  initializeUser(userId) {
    if (!this.userBalances.has(userId)) {
      this.userBalances.set(userId, 1000); // Starting balance
      this.userPositions.set(userId, new Map());
    }
    // Ensure user position map exists even if balance already exists
    if (!this.userPositions.has(userId)) {
      this.userPositions.set(userId, new Map());
    }
  }

  buyBundle(userId, marketId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const cost = this.bundlePrice * quantity;
    const balance = this.getUserBalance(userId);
    
    if (balance < cost) {
      throw new Error('Insufficient balance');
    }
    
    // Deduct cost
    this.userBalances.set(userId, balance - cost);
    
    // Give user 1 share of each outcome
    const userPositions = this.userPositions.get(userId);
    let marketPositions = userPositions.get(marketId);
    if (!marketPositions) {
      marketPositions = new Map();
      userPositions.set(marketId, marketPositions);
    }
    
    for (const [outcomeId, _] of market.outcomes) {
      const currentPosition = marketPositions.get(outcomeId) || 0;
      marketPositions.set(outcomeId, currentPosition + quantity);
    }
    
    this.saveData();
    return { bundlesBought: quantity, cost };
  }

  sellBundle(userId, marketId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    // Check if user has enough of each outcome
    const userPositions = this.userPositions.get(userId);
    const marketPositions = userPositions.get(marketId);
    if (!marketPositions) {
      throw new Error('No positions in this market');
    }
    
    for (const [outcomeId, outcome] of market.outcomes) {
      const position = marketPositions.get(outcomeId) || 0;
      if (position < quantity) {
        throw new Error(`Insufficient shares of outcome ${outcomeId} (${outcome.name}). You have ${position} but need ${quantity}`);
      }
    }
    
    // Deduct shares and give money
    for (const [outcomeId, _] of market.outcomes) {
      const currentPosition = marketPositions.get(outcomeId);
      marketPositions.set(outcomeId, currentPosition - quantity);
    }
    
    const revenue = this.bundlePrice * quantity;
    const balance = this.getUserBalance(userId);
    this.userBalances.set(userId, balance + revenue);
    
    this.saveData();
    return { bundlesSold: quantity, revenue };
  }

  getUserBalance(userId) {
    this.initializeUser(userId);
    const balance = this.userBalances.get(userId) || 0;
    // Safety check: ensure balance never goes negative due to float precision
    return Math.max(0, Math.round(balance * 100) / 100);
  }

  getUserPosition(userId, marketId, outcomeId = null) {
    const positions = this.userPositions.get(userId);
    if (!positions) return outcomeId ? 0 : {};
    
    const marketPositions = positions.get(marketId);
    if (!marketPositions) return outcomeId ? 0 : {};
    
    if (outcomeId) {
      return marketPositions.get(outcomeId) || 0;
    } else {
      const result = {};
      for (const [id, quantity] of marketPositions) {
        result[id] = quantity;
      }
      return result;
    }
  }

  placeBuyOrder(userId, marketId, outcomeId, price, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
    // Validate inputs
    if (price <= 0 || price >= 1) {
      throw new Error('Price must be between 0 and 1 (exclusive)');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    const cost = price * quantity;
    const balance = this.getUserBalance(userId);
    
    if (balance < cost) {
      throw new Error(`Insufficient balance. Need $${cost.toFixed(2)} but you only have $${balance.toFixed(2)}`);
    }
    
    // Hold the funds in escrow by deducting from balance
    this.userBalances.set(userId, balance - cost);
    
    // Add the bid to the order book
    const order = outcome.orderBook.addBid(price, quantity, userId);
    
    // Try to match orders
    const matches = outcome.orderBook.matchOrders();
    
    // If matches occurred, process them
    if (matches.length > 0) {
      this.processMatches(matches, marketId, outcomeId);
      
      // Calculate how much was matched and how much remains in escrow
      const matchedQuantity = matches.reduce((sum, match) => sum + match.quantity, 0);
      const remainingQuantity = quantity - matchedQuantity;
      
      // If everything was matched, there's no need to update the order
      if (remainingQuantity === 0) {
        this.saveData();
        return { order, matches };
      }
      
      // Update the order for the remaining quantity
      order.quantity = remainingQuantity;
    }
    
    this.saveData();
    return { order, matches };
  }

  placeSellOrder(userId, marketId, outcomeId, price, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
    // Validate inputs
    if (price <= 0 || price >= 1) {
      throw new Error('Price must be between 0 and 1 (exclusive)');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    const position = this.getUserPosition(userId, marketId, outcomeId);
    if (position < quantity) {
      throw new Error(`Insufficient position. Need ${quantity} shares but you only have ${position}`);
    }
    
    // Hold the shares in escrow by updating user position
    const userPositions = this.userPositions.get(userId);
    const marketPositions = userPositions.get(marketId);
    marketPositions.set(outcomeId, position - quantity);
    
    // Add the ask to the order book
    const order = outcome.orderBook.addAsk(price, quantity, userId);
    
    // Try to match orders
    const matches = outcome.orderBook.matchOrders();
    
    // If matches occurred, process them
    if (matches.length > 0) {
      this.processMatches(matches, marketId, outcomeId);
      
      // Calculate how much was matched and how much remains in escrow
      const matchedQuantity = matches.reduce((sum, match) => sum + match.quantity, 0);
      const remainingQuantity = quantity - matchedQuantity;
      
      // If everything was matched, there's no need to update anything
      if (remainingQuantity === 0) {
        this.saveData();
        return { order, matches };
      }
      
      // Update the order for the remaining quantity
      order.quantity = remainingQuantity;
    }
    
    this.saveData();
    return { order, matches };
  }

  marketBuy(userId, marketId, outcomeId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    // Calculate potential cost using available orders to ensure user has enough balance
    const availableAsks = outcome.orderBook.asks;
    let potentialCost = 0;
    let fillableQuantity = 0;
    
    for (const ask of availableAsks) {
      const fillQty = Math.min(quantity - fillableQuantity, ask.quantity);
      potentialCost = Math.round((potentialCost + fillQty * ask.price) * 100) / 100;
      fillableQuantity += fillQty;
      
      if (fillableQuantity === quantity) break;
    }
    
    // Check if user has enough balance for the potential transaction
    const balance = this.getUserBalance(userId);
    if (balance < potentialCost) {
      throw new Error(`Insufficient balance. Need at least $${potentialCost.toFixed(2)} but you only have $${balance.toFixed(2)}`);
    }
    
    const { filled, remainingQuantity } = outcome.orderBook.marketBuy(quantity, userId);
    this.processMatches(filled, marketId, outcomeId);
    
    if (remainingQuantity > 0) {
      throw new Error(`Only ${quantity - remainingQuantity} units could be filled`);
    }
    
    this.saveData();
    return { filled, totalCost: filled.reduce((sum, f) => sum + f.price * f.quantity, 0) };
  }

  marketSell(userId, marketId, outcomeId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    const position = this.getUserPosition(userId, marketId, outcomeId);
    if (position < quantity) {
      throw new Error('Insufficient position');
    }
    
    const { filled, remainingQuantity } = outcome.orderBook.marketSell(quantity, userId);
    this.processMatches(filled, marketId, outcomeId);
    
    if (remainingQuantity > 0) {
      throw new Error(`Only ${quantity - remainingQuantity} units could be filled`);
    }
    
    this.saveData();
    return { filled, totalRevenue: filled.reduce((sum, f) => sum + f.price * f.quantity, 0) };
  }

  processMatches(matches, marketId, outcomeId) {
    for (const match of matches) {
      // Update buyer position
      const buyerPositions = this.userPositions.get(match.buyer);
      let buyerMarketPositions = buyerPositions.get(marketId);
      if (!buyerMarketPositions) {
        buyerMarketPositions = new Map();
        buyerPositions.set(marketId, buyerMarketPositions);
      }
      const currentBuyerPosition = buyerMarketPositions.get(outcomeId) || 0;
      buyerMarketPositions.set(outcomeId, currentBuyerPosition + match.quantity);
      
      // Refund buyer if they got a better price than their limit
      // The buyer paid match.buyerPrice * match.quantity upfront
      // But only needs to pay match.price * match.quantity
      if (match.buyerPrice && match.buyerPrice > match.price) {
        const refund = (match.buyerPrice - match.price) * match.quantity;
        const buyerBalance = this.getUserBalance(match.buyer);
        this.userBalances.set(match.buyer, buyerBalance + refund);
      }
      
      // Update seller balance only (position already deducted when order was placed)
      const sellerBalance = this.getUserBalance(match.seller);
      this.userBalances.set(match.seller, sellerBalance + match.price * match.quantity);
    }
  }

  getMarketInfo(marketId) {
    const market = this.getMarket(marketId);
    if (!market) return null;
    
    const outcomes = {};
    let totalBestBids = 0;
    let totalBestAsks = 0;
    
    for (const [outcomeId, outcome] of market.outcomes) {
      const orderBook = outcome.orderBook.getOrderBookDisplay();
      outcomes[outcomeId] = {
        name: outcome.name,
        ...orderBook
      };
      
      // Calculate sum of best bids and asks
      const bestBid = outcome.orderBook.getBestBid();
      const bestAsk = outcome.orderBook.getBestAsk();
      if (bestBid) totalBestBids += bestBid;
      if (bestAsk) totalBestAsks += bestAsk;
    }
    
    return {
      id: marketId,
      description: market.description,
      outcomes,
      totalBestBids,
      totalBestAsks,
      bundlePrice: this.bundlePrice,
      resolved: market.resolved,
      winningOutcome: market.winningOutcome
    };
  }

  cancelOrder(userId, marketId, outcomeId, orderId) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    const result = outcome.orderBook.cancelOrder(orderId, userId);
    if (!result.cancelled) {
      throw new Error(result.error);
    }
    
    const cancelledOrder = result.order;
    
    // Return escrowed funds/shares to user
    if (cancelledOrder.side === 'buy') {
      // Return escrowed money
      const escrowedCost = cancelledOrder.price * cancelledOrder.quantity;
      const balance = this.getUserBalance(userId);
      this.userBalances.set(userId, balance + escrowedCost);
    } else {
      // Return escrowed shares
      const userPositions = this.userPositions.get(userId);
      const marketPositions = userPositions.get(marketId);
      const currentPosition = marketPositions.get(outcomeId) || 0;
      marketPositions.set(outcomeId, currentPosition + cancelledOrder.quantity);
    }
    
    this.saveData();
    return cancelledOrder;
  }

  getUserOrders(userId, marketId) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    
    const allOrders = [];
    for (const [outcomeId, outcome] of market.outcomes) {
      const orders = outcome.orderBook.getUserOrders(userId);
      orders.forEach(order => {
        allOrders.push({
          ...order,
          outcomeId,
          outcomeName: outcome.name
        });
      });
    }
    
    return allOrders.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get leaderboard showing all users ranked by balance
  getLeaderboard(marketId = null) {
    const leaderboard = [];

    for (const [userId, balance] of this.userBalances) {
      const userData = {
        userId,
        balance: Math.round(balance * 100) / 100,
        profit: Math.round((balance - 1000) * 100) / 100, // Profit from starting $1000
        positions: {}
      };

      // Get positions for the specified market or all markets
      const userPositions = this.userPositions.get(userId);
      if (userPositions) {
        if (marketId) {
          const marketPositions = userPositions.get(marketId);
          if (marketPositions) {
            for (const [outcomeId, quantity] of marketPositions) {
              if (quantity > 0) {
                userData.positions[outcomeId] = quantity;
              }
            }
          }
        } else {
          // All markets
          for (const [mktId, marketPositions] of userPositions) {
            userData.positions[mktId] = {};
            for (const [outcomeId, quantity] of marketPositions) {
              if (quantity > 0) {
                userData.positions[mktId][outcomeId] = quantity;
              }
            }
          }
        }
      }

      // Calculate total shares held
      let totalShares = 0;
      if (marketId && userPositions) {
        const marketPositions = userPositions.get(marketId);
        if (marketPositions) {
          for (const [_, quantity] of marketPositions) {
            totalShares += quantity;
          }
        }
      }
      userData.totalShares = totalShares;

      // Calculate escrowed funds (in open orders)
      let escrowedFunds = 0;
      let escrowedShares = 0;
      if (marketId) {
        const market = this.getMarket(marketId);
        if (market) {
          for (const [outcomeId, outcome] of market.outcomes) {
            const userOrders = outcome.orderBook.getUserOrders(userId);
            for (const order of userOrders) {
              if (order.side === 'buy') {
                escrowedFunds += order.price * order.quantity;
              } else {
                escrowedShares += order.quantity;
              }
            }
          }
        }
      }
      userData.escrowedFunds = Math.round(escrowedFunds * 100) / 100;
      userData.escrowedShares = escrowedShares;
      userData.totalValue = Math.round((balance + escrowedFunds) * 100) / 100;

      leaderboard.push(userData);
    }

    // Sort by balance (or total value) descending
    leaderboard.sort((a, b) => b.balance - a.balance);

    // Add rank
    leaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    return leaderboard;
  }

  // Get top winners after market resolution
  getWinners(marketId) {
    const market = this.getMarket(marketId);
    if (!market || !market.resolved) {
      return null;
    }

    const leaderboard = this.getLeaderboard();
    return {
      marketId,
      winningOutcome: market.winningOutcome,
      resolved: true,
      topTraders: leaderboard.slice(0, 10) // Top 10
    };
  }

  resolveMarket(marketId, winningOutcomeId) {
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Market already resolved');
    
    // First, cancel all outstanding orders and return escrowed funds/shares
    for (const [outcomeId, outcome] of market.outcomes) {
      // Cancel all buy orders (return escrowed money)
      for (const bid of outcome.orderBook.bids) {
        const escrowedCost = Math.round(bid.price * bid.quantity * 100) / 100;
        const balance = this.getUserBalance(bid.userId);
        this.userBalances.set(bid.userId, Math.round((balance + escrowedCost) * 100) / 100);
      }
      
      // Cancel all sell orders (return escrowed shares)
      for (const ask of outcome.orderBook.asks) {
        const userPositions = this.userPositions.get(ask.userId);
        if (userPositions) {
          const marketPositions = userPositions.get(marketId);
          if (marketPositions) {
            const currentPosition = marketPositions.get(outcomeId) || 0;
            marketPositions.set(outcomeId, currentPosition + ask.quantity);
          }
        }
      }
      
      // Clear the order book
      outcome.orderBook.bids = [];
      outcome.orderBook.asks = [];
    }
    
    market.resolved = true;
    market.winningOutcome = winningOutcomeId;
    
    // Process payouts
    for (const [userId, positions] of this.userPositions) {
      const marketPositions = positions.get(marketId);
      if (!marketPositions) continue;
      
      const winningShares = marketPositions.get(winningOutcomeId) || 0;
      if (winningShares > 0) {
        const payout = Math.round(winningShares * 1 * 100) / 100; // $1 per winning share
        const balance = this.getUserBalance(userId);
        this.userBalances.set(userId, Math.round((balance + payout) * 100) / 100);
      }
      
      // Clear all positions in this market
      positions.delete(marketId);
    }
    
    // Market resolved - data is kept in memory
    
    this.saveData();
    return { winningOutcome: winningOutcomeId };
  }
  
  // Serialize Maps and Sets to JSON
  serializeData() {
    // Serialize markets
    const serializedMarkets = {};
    for (const [marketId, market] of this.markets) {
      const serializedOutcomes = {};
      for (const [outcomeId, outcome] of market.outcomes) {
        serializedOutcomes[outcomeId] = {
          name: outcome.name,
          orderBook: outcome.orderBook // OrderBook will be serialized with toJSON
        };
      }
      
      serializedMarkets[marketId] = {
        id: market.id,
        description: market.description,
        outcomes: serializedOutcomes,
        created: market.created,
        resolved: market.resolved,
        winningOutcome: market.winningOutcome
      };
    }
    
    // Serialize user balances
    const serializedBalances = {};
    for (const [userId, balance] of this.userBalances) {
      serializedBalances[userId] = balance;
    }
    
    // Serialize user positions
    const serializedPositions = {};
    for (const [userId, markets] of this.userPositions) {
      const serializedMarkets = {};
      for (const [marketId, outcomes] of markets) {
        const serializedOutcomes = {};
        for (const [outcomeId, quantity] of outcomes) {
          serializedOutcomes[outcomeId] = quantity;
        }
        serializedMarkets[marketId] = serializedOutcomes;
      }
      serializedPositions[userId] = serializedMarkets;
    }
    
    return {
      markets: serializedMarkets,
      userBalances: serializedBalances,
      userPositions: serializedPositions,
      bundlePrice: this.bundlePrice
    };
  }
  
  // Save market data to JSON file
  // This works on Oracle Cloud VMs which have persistent storage
  saveData() {
    // Skip saving during restoration to avoid spam
    if (this.isRestoring) return;

    try {
      const data = this.serializeData();
      console.log(`Current market state: ${Object.keys(data.markets).length} markets, ${Object.keys(data.userBalances).length} users`);

      // Determine the data directory - use DATA_DIR env var if set, otherwise use default
      const dataDir = process.env.DATA_DIR || path.join(__dirname, '..');
      const dataFile = path.join(dataDir, 'market_data.json');

      // Create backup before saving
      if (fs.existsSync(dataFile)) {
        const backupFile = path.join(dataDir, `market_data_backup_${Date.now()}.json`);
        try {
          fs.copyFileSync(dataFile, backupFile);
          // Keep only the last 5 backups
          const backups = fs.readdirSync(dataDir)
            .filter(f => f.startsWith('market_data_backup_'))
            .sort()
            .reverse();
          backups.slice(5).forEach(f => {
            try {
              fs.unlinkSync(path.join(dataDir, f));
            } catch (e) { /* ignore cleanup errors */ }
          });
        } catch (e) {
          console.log('Could not create backup:', e.message);
        }
      }

      // Write data with atomic write (write to temp file, then rename)
      const tempFile = dataFile + '.tmp';
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
      fs.renameSync(tempFile, dataFile);
      console.log(`Market data saved to ${dataFile}`);
    } catch (error) {
      console.error(`Error saving market data: ${error.message}`);
      // Log the data to console as a last resort backup
      console.log('=== EMERGENCY DATA DUMP ===');
      console.log(JSON.stringify(this.serializeData()));
      console.log('=== END EMERGENCY DATA DUMP ===');
    }
  }
  
  // Helper method to get the current state
  getState() {
    return this.serializeData();
  }
  
  // Restore market state from transaction history
  restoreFromTransactionHistory() {
    try {
      console.log('=== Attempting to restore from transaction history ===');
      
      if (!fs.existsSync(this.transactionHistoryFile)) {
        console.log('No transaction history found');
        return false;
      }

      const historyData = JSON.parse(fs.readFileSync(this.transactionHistoryFile, 'utf8'));
      const transactions = historyData.transactions;
      
      console.log(`Found ${transactions.length} transactions to replay`);
      
      // First, create the LECTURE market
      const outcomes = [];
      for (let i = 1; i <= 18; i++) {
        outcomes.push({
          id: i.toString(),
          name: i <= 15 ? `Lecture ${i}` : `Guest Lecture ${i}`
        });
      }
      
      try {
        this.createMarket('LECTURE', 'Which lecture will be voted most popular?', outcomes);
      } catch (e) {
        console.log('Market already exists');
      }

      // Initialize all users from metadata
      if (historyData.metadata && historyData.metadata.allUsers) {
        historyData.metadata.allUsers.forEach(userId => {
          this.userBalances.set(userId, 1000); // Starting balance
          this.userPositions.set(userId, new Map());
        });
      }

      // Process transactions
      let successCount = 0;
      let failCount = 0;

      // Set restoration flag to disable saving
      this.isRestoring = true;

      for (const tx of transactions) {
        try {
          this.processHistoricalTransaction(tx);
          successCount++;
        } catch (error) {
          failCount++;
          // Only log unexpected errors
          if (!error.message.includes('Insufficient') && 
              !error.message.includes('No positions') &&
              !error.message.includes('not found')) {
            console.log(`Error on tx ${tx.line}: ${error.message}`);
          }
        }
      }

      // Clear restoration flag
      this.isRestoring = false;

      console.log(`Restoration complete: ${successCount} successful, ${failCount} failed`);
      console.log(`Active users: ${this.userBalances.size}`);
      
      // Show market summary
      const marketInfo = this.getMarketInfo('LECTURE');
      if (marketInfo) {
        console.log(`Market has ${Object.keys(marketInfo.outcomes).length} outcomes`);
        console.log(`Sum of best bids: $${marketInfo.totalBestBids.toFixed(2)}`);
        console.log(`Sum of best asks: $${marketInfo.totalBestAsks.toFixed(2)}`);
      }
      
      // Save the restored state
      this.saveData();
      
      return true;
    } catch (error) {
      console.error('Failed to restore from transaction history:', error);
      return false;
    }
  }

  processHistoricalTransaction(tx) {
    switch (tx.action) {
      case 'BUNDLE_BUY':
        this.buyBundle(tx.user, 'LECTURE', tx.bundles);
        break;
        
      case 'BUNDLE_SELL':
      case 'BUNDLE_SELL_ATTEMPT':
        if (tx.success !== false) {
          try {
            this.sellBundle(tx.user, 'LECTURE', tx.bundles || 1);
          } catch (e) {
            // Expected failures
          }
        }
        break;
        
      case 'BUY_ORDER':
        this.placeBuyOrder(tx.user, 'LECTURE', tx.outcome.toString(), tx.price, tx.shares);
        break;
        
      case 'SELL_ORDER':
        this.placeSellOrder(tx.user, 'LECTURE', tx.outcome.toString(), tx.price, tx.shares);
        break;
        
      case 'CANCEL_ORDER':
        try {
          const market = this.getMarket('LECTURE');
          const outcome = market.outcomes.get(tx.outcome.toString());
          if (outcome) {
            outcome.orderBook.cancelOrder(tx.orderId, tx.user);
          }
        } catch (e) {
          // Order might be already executed
        }
        break;
        
      case 'MARKET_BUY':
        this.marketBuy(tx.user, 'LECTURE', tx.outcome.toString(), tx.shares);
        break;
        
      case 'TRANSACTION':
        // These happen automatically when orders match
        break;
    }
  }

  // Load market data from JSON file
  loadData() {
    try {
      console.log(`Loading initial market data from: ${this.dataFile}`);
      
      // Check if file exists
      if (!fs.existsSync(this.dataFile)) {
        console.log(`Data file doesn't exist, starting with fresh data`);
        return;
      }
      
      const rawData = fs.readFileSync(this.dataFile, 'utf8');
      console.log(`Data file size: ${rawData.length} bytes`);
      
      // Handle empty file
      if (!rawData.trim()) {
        console.log(`Data file is empty, starting with fresh data`);
        return;
      }
      
      const data = JSON.parse(rawData);
      console.log(`Parsed JSON data successfully`);
      
      // Load markets
      if (data.markets) {
        console.log(`Loading ${Object.keys(data.markets).length} markets...`);
        for (const [marketId, marketData] of Object.entries(data.markets)) {
          const market = {
            id: marketData.id,
            description: marketData.description,
            outcomes: new Map(),
            created: marketData.created,
            resolved: marketData.resolved,
            winningOutcome: marketData.winningOutcome
          };
          
          // Load outcomes
          for (const [outcomeId, outcomeData] of Object.entries(marketData.outcomes)) {
            const orderBook = new OrderBook(outcomeId);
            
            // Restore orderBook properties
            if (outcomeData.orderBook) {
              orderBook.bids = outcomeData.orderBook.bids || [];
              orderBook.asks = outcomeData.orderBook.asks || [];
              orderBook.lastPrice = outcomeData.orderBook.lastPrice;
              orderBook.volume = outcomeData.orderBook.volume || 0;
              orderBook.changePercent = outcomeData.orderBook.changePercent || 0;
              // Restore nextOrderId to prevent ID collisions after restart
              if (outcomeData.orderBook.nextOrderId) {
                orderBook.nextOrderId = outcomeData.orderBook.nextOrderId;
              } else {
                // Calculate nextOrderId from existing orders
                const maxBidId = orderBook.bids.reduce((max, o) => Math.max(max, o.id || 0), 0);
                const maxAskId = orderBook.asks.reduce((max, o) => Math.max(max, o.id || 0), 0);
                orderBook.nextOrderId = Math.max(maxBidId, maxAskId) + 1;
              }
            }
            
            market.outcomes.set(outcomeId, {
              name: outcomeData.name,
              orderBook
            });
          }
          
          this.markets.set(marketId, market);
        }
        
        // Load user balances
        if (data.userBalances) {
          for (const [userId, balance] of Object.entries(data.userBalances)) {
            this.userBalances.set(userId, balance);
          }
        }
        
        // Load user positions
        if (data.userPositions) {
          for (const [userId, marketsData] of Object.entries(data.userPositions)) {
            const userMarkets = new Map();
            
            for (const [marketId, outcomesData] of Object.entries(marketsData)) {
              const marketOutcomes = new Map();
              
              for (const [outcomeId, quantity] of Object.entries(outcomesData)) {
                marketOutcomes.set(outcomeId, quantity);
              }
              
              userMarkets.set(marketId, marketOutcomes);
            }
            
            this.userPositions.set(userId, userMarkets);
          }
        }
        
        // Load bundle price
        if (data.bundlePrice) {
          this.bundlePrice = data.bundlePrice;
        }
        
        console.log(`Initial market data loaded successfully. Current state: ${this.markets.size} markets, ${this.userBalances.size} user balances`);
      }
    } catch (error) {
      console.error(`Error loading market data: ${error.message}`);
      console.error(error.stack);
      console.log('Starting with empty state');
    }
  }
}

module.exports = MarketManager;