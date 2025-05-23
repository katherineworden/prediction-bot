// Test script to try out the market functionality
const MarketManager = require('./src/marketManager');

// Create market manager
const manager = new MarketManager();

console.log('=== Prediction Market Test ===\n');

// 1. Create a market
console.log('1. Creating market...');
const outcomes = [
  { id: '0', name: 'Trump' },
  { id: '1', name: 'Biden' },
  { id: '2', name: 'Harris' }
];
manager.createMarket('ELECTION2024', 'Who will win 2024?', outcomes);

// 2. Initialize users
const alice = 'alice123';
const bob = 'bob456';
manager.initializeUser(alice);
manager.initializeUser(bob);

console.log(`Alice balance: $${manager.getUserBalance(alice)}`);
console.log(`Bob balance: $${manager.getUserBalance(bob)}\n`);

// 3. Alice buys a bundle
console.log('2. Alice buys 10 bundles...');
const bundleResult = manager.buyBundle(alice, 'ELECTION2024', 10);
console.log(`Cost: $${bundleResult.cost}`);
console.log(`Alice balance: $${manager.getUserBalance(alice)}`);
console.log(`Alice positions:`, manager.getUserPosition(alice, 'ELECTION2024'));
console.log();

// 4. Alice sells Trump shares
console.log('3. Alice sells 5 Trump shares at $0.45...');
const sellResult = manager.placeSellOrder(alice, 'ELECTION2024', '0', 0.45, 5);
console.log('Order placed');

// 5. Bob buys Trump shares at market
console.log('\n4. Bob buys 3 Trump shares at market price...');
const buyResult = manager.marketBuy(bob, 'ELECTION2024', '0', 3);
console.log(`Total cost: $${buyResult.totalCost}`);
console.log(`Bob balance: $${manager.getUserBalance(bob)}`);

// 6. Show market info
console.log('\n5. Market info:');
const marketInfo = manager.getMarketInfo('ELECTION2024');
console.log('Outcomes:');
for (const [id, outcome] of Object.entries(marketInfo.outcomes)) {
  console.log(`  ${outcome.name}:`);
  console.log(`    Best bid: $${outcome.orderBook?.getBestBid() || 'none'}`);
  console.log(`    Best ask: $${outcome.orderBook?.getBestAsk() || 'none'}`);
  console.log(`    Last: $${outcome.last || 'none'}`);
  console.log(`    Volume: ${outcome.volume}`);
}
console.log(`\nSum of best bids: $${marketInfo.totalBestBids.toFixed(2)}`);
console.log(`Sum of best asks: $${marketInfo.totalBestAsks.toFixed(2)}`);

// 7. Show final positions
console.log('\n6. Final positions:');
console.log('Alice:', manager.getUserPosition(alice, 'ELECTION2024'));
console.log('Bob:', manager.getUserPosition(bob, 'ELECTION2024'));

// 8. Resolve market
console.log('\n7. Resolving market (Trump wins)...');
manager.resolveMarket('ELECTION2024', '0');
console.log(`Alice final balance: $${manager.getUserBalance(alice)}`);
console.log(`Bob final balance: $${manager.getUserBalance(bob)}`);

console.log('\n=== Test Complete ===');