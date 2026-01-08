class OrderBook {
  constructor(outcomeId) {
    this.outcomeId = outcomeId;
    this.bids = []; // Buy orders (highest price first)
    this.asks = []; // Sell orders (lowest price first)
    this.lastPrice = null;
    this.volume = 0;
    this.changePercent = 0;
    this.nextOrderId = 1;
  }

  // Serialize for JSON storage
  toJSON() {
    return {
      outcomeId: this.outcomeId,
      bids: this.bids,
      asks: this.asks,
      lastPrice: this.lastPrice,
      volume: this.volume,
      changePercent: this.changePercent,
      nextOrderId: this.nextOrderId
    };
  }

  // Restore nextOrderId to prevent collisions after reload
  setNextOrderId(id) {
    if (id > this.nextOrderId) {
      this.nextOrderId = id;
    }
  }

  addBid(price, quantity, userId) {
    // Validate inputs
    if (price <= 0 || price >= 1) {
      throw new Error('Price must be between 0 and 1 (exclusive)');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const order = { id: this.nextOrderId++, price, quantity, userId, side: 'buy', timestamp: Date.now() };
    this.bids.push(order);
    this.bids.sort((a, b) => b.price - a.price);
    return order;
  }

  addAsk(price, quantity, userId) {
    // Validate inputs
    if (price <= 0 || price >= 1) {
      throw new Error('Price must be between 0 and 1 (exclusive)');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    
    const order = { id: this.nextOrderId++, price, quantity, userId, side: 'sell', timestamp: Date.now() };
    this.asks.push(order);
    this.asks.sort((a, b) => a.price - b.price);
    return order;
  }

  matchOrders() {
    const matches = [];
    
    while (this.bids.length > 0 && this.asks.length > 0) {
      const topBid = this.bids[0];
      const topAsk = this.asks[0];
      
      if (topBid.price >= topAsk.price) {
        const matchQuantity = Math.min(topBid.quantity, topAsk.quantity);
        const matchPrice = topAsk.price;
        
        matches.push({
          buyer: topBid.userId,
          seller: topAsk.userId,
          price: matchPrice,
          buyerPrice: topBid.price,  // Store buyer's limit price for refund calculation
          quantity: matchQuantity,
          timestamp: Date.now()
        });
        
        this.lastPrice = matchPrice;
        this.volume += matchQuantity;
        
        topBid.quantity -= matchQuantity;
        topAsk.quantity -= matchQuantity;
        
        if (topBid.quantity === 0) this.bids.shift();
        if (topAsk.quantity === 0) this.asks.shift();
      } else {
        break;
      }
    }
    
    return matches;
  }

  marketBuy(quantity, userId) {
    const filled = [];
    let remainingQuantity = quantity;
    
    while (remainingQuantity > 0 && this.asks.length > 0) {
      const topAsk = this.asks[0];
      const fillQuantity = Math.min(remainingQuantity, topAsk.quantity);
      
      filled.push({
        buyer: userId,
        seller: topAsk.userId,
        price: topAsk.price,
        quantity: fillQuantity,
        timestamp: Date.now()
      });
      
      this.lastPrice = topAsk.price;
      this.volume += fillQuantity;
      
      remainingQuantity -= fillQuantity;
      topAsk.quantity -= fillQuantity;
      
      if (topAsk.quantity === 0) this.asks.shift();
    }
    
    return { filled, remainingQuantity };
  }

  marketSell(quantity, userId) {
    const filled = [];
    let remainingQuantity = quantity;
    
    while (remainingQuantity > 0 && this.bids.length > 0) {
      const topBid = this.bids[0];
      const fillQuantity = Math.min(remainingQuantity, topBid.quantity);
      
      filled.push({
        buyer: topBid.userId,
        seller: userId,
        price: topBid.price,
        quantity: fillQuantity,
        timestamp: Date.now()
      });
      
      this.lastPrice = topBid.price;
      this.volume += fillQuantity;
      
      remainingQuantity -= fillQuantity;
      topBid.quantity -= fillQuantity;
      
      if (topBid.quantity === 0) this.bids.shift();
    }
    
    return { filled, remainingQuantity };
  }

  getBestBid() {
    return this.bids.length > 0 ? this.bids[0].price : null;
  }

  getBestAsk() {
    return this.asks.length > 0 ? this.asks[0].price : null;
  }

  cancelOrder(orderId, userId) {
    // Look for the order in bids
    const bidIndex = this.bids.findIndex(order => order.id === orderId && order.userId === userId);
    if (bidIndex !== -1) {
      const cancelledOrder = this.bids.splice(bidIndex, 1)[0];
      return { cancelled: true, order: cancelledOrder };
    }
    
    // Look for the order in asks
    const askIndex = this.asks.findIndex(order => order.id === orderId && order.userId === userId);
    if (askIndex !== -1) {
      const cancelledOrder = this.asks.splice(askIndex, 1)[0];
      return { cancelled: true, order: cancelledOrder };
    }
    
    return { cancelled: false, error: 'Order not found or not owned by user' };
  }

  getUserOrders(userId) {
    const userBids = this.bids.filter(order => order.userId === userId);
    const userAsks = this.asks.filter(order => order.userId === userId);
    return [...userBids, ...userAsks];
  }

  getOrderBookDisplay(depth = 5) {
    const topBids = this.bids.slice(0, depth);
    const topAsks = this.asks.slice(0, depth);
    
    return {
      bids: topBids.map(o => ({ price: o.price, quantity: o.quantity })),
      asks: topAsks.map(o => ({ price: o.price, quantity: o.quantity })),
      last: this.lastPrice,
      volume: this.volume,
      change: this.changePercent
    };
  }
}

module.exports = OrderBook;