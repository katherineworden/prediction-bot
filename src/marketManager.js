const OrderBook = require('./orderBook');
const fs = require('fs');
const path = require('path');

class MarketManager {
  constructor() {
    this.markets = new Map();
    this.userBalances = new Map();
    this.userPositions = new Map();
    this.bundlePrice = 1; // Price for a complete set of all outcomes
    
    // Use a fixed path to a file that's part of the codebase
    this.dataFile = path.join(__dirname, '../market_data.json');
    console.log(`Using data file at: ${this.dataFile}`);
    
    // Load saved data from the bundled file
    this.loadData();
    
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
    
    // Market created - for backup purposes, you can call saveData() locally
    
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
  }

  buyBundle(userId, marketId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
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
    
    return { bundlesBought: quantity, cost };
  }

  sellBundle(userId, marketId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
    // Check if user has enough of each outcome
    const userPositions = this.userPositions.get(userId);
    const marketPositions = userPositions.get(marketId);
    if (!marketPositions) {
      throw new Error('No positions in this market');
    }
    
    for (const [outcomeId, _] of market.outcomes) {
      const position = marketPositions.get(outcomeId) || 0;
      if (position < quantity) {
        throw new Error(`Insufficient shares of outcome ${outcomeId}`);
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
    
    return { bundlesSold: quantity, revenue };
  }

  getUserBalance(userId) {
    return this.userBalances.get(userId) || 0;
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
        return { order, matches };
      }
      
      // Update the order for the remaining quantity
      order.quantity = remainingQuantity;
    }
    
    return { order, matches };
  }

  placeSellOrder(userId, marketId, outcomeId, price, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Cannot trade on resolved market');
    
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
        return { order, matches };
      }
      
      // Update the order for the remaining quantity
      order.quantity = remainingQuantity;
    }
    
    return { order, matches };
  }

  marketBuy(userId, marketId, outcomeId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    
    const outcome = market.outcomes.get(outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    
    // Calculate potential cost using available orders to ensure user has enough balance
    const availableAsks = outcome.orderBook.asks;
    let potentialCost = 0;
    let fillableQuantity = 0;
    
    for (const ask of availableAsks) {
      const fillQty = Math.min(quantity - fillableQuantity, ask.quantity);
      potentialCost += fillQty * ask.price;
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
    
    return { filled, totalCost: filled.reduce((sum, f) => sum + f.price * f.quantity, 0) };
  }

  marketSell(userId, marketId, outcomeId, quantity) {
    this.initializeUser(userId);
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    
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
    
    return { filled, totalRevenue: filled.reduce((sum, f) => sum + f.price * f.quantity, 0) };
  }

  processMatches(matches, marketId, outcomeId) {
    for (const match of matches) {
      // Update buyer position and balance
      const buyerPositions = this.userPositions.get(match.buyer);
      let buyerMarketPositions = buyerPositions.get(marketId);
      if (!buyerMarketPositions) {
        buyerMarketPositions = new Map();
        buyerPositions.set(marketId, buyerMarketPositions);
      }
      const currentBuyerPosition = buyerMarketPositions.get(outcomeId) || 0;
      buyerMarketPositions.set(outcomeId, currentBuyerPosition + match.quantity);
      
      // Update seller position and balance
      const sellerPositions = this.userPositions.get(match.seller);
      let sellerMarketPositions = sellerPositions.get(marketId);
      if (!sellerMarketPositions) {
        sellerMarketPositions = new Map();
        sellerPositions.set(marketId, sellerMarketPositions);
      }
      const currentSellerPosition = sellerMarketPositions.get(outcomeId) || 0;
      sellerMarketPositions.set(outcomeId, currentSellerPosition - match.quantity);
      
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

  resolveMarket(marketId, winningOutcomeId) {
    const market = this.getMarket(marketId);
    if (!market) throw new Error('Market not found');
    if (market.resolved) throw new Error('Market already resolved');
    
    market.resolved = true;
    market.winningOutcome = winningOutcomeId;
    
    // Process payouts
    for (const [userId, positions] of this.userPositions) {
      const marketPositions = positions.get(marketId);
      if (!marketPositions) continue;
      
      const winningShares = marketPositions.get(winningOutcomeId) || 0;
      if (winningShares > 0) {
        const payout = winningShares * 1; // $1 per winning share
        const balance = this.getUserBalance(userId);
        this.userBalances.set(userId, balance + payout);
      }
      
      // Clear all positions in this market
      positions.delete(marketId);
    }
    
    // Market resolved - data is kept in memory
    
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
  
  // This method is now only used for backing up data manually
  saveData() {
    try {
      const data = this.serializeData();
      console.log(`Current market state: ${Object.keys(data.markets).length} markets, ${Object.keys(data.userBalances).length} users`);
      
      // In production, we can't write to the filesystem, so we just log the data
      if (process.env.NODE_ENV === 'production') {
        console.log('In production mode, data backup is not available');
        return;
      }
      
      // For local development, we write to the data file
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
      console.log(`Market data backed up to ${this.dataFile}`);
    } catch (error) {
      console.error(`Error backing up market data: ${error.message}`);
    }
  }
  
  // Helper method to get the current state
  getState() {
    return this.serializeData();
  }
  
  // Load market data from JSON file
  loadData() {
    try {
      console.log(`Loading initial market data from: ${this.dataFile}`);
      
      const rawData = fs.readFileSync(this.dataFile, 'utf8');
      console.log(`Data file size: ${rawData.length} bytes`);
      
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