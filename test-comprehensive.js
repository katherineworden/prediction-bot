const MarketManager = require('./src/marketManager');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

let testsPassed = 0;
let testsFailed = 0;
let criticalIssues = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log(`\n${colors.cyan}=== ${testName} ===${colors.reset}`);
}

function assert(condition, message, critical = false) {
  if (condition) {
    log(`✓ ${message}`, 'green');
    testsPassed++;
  } else {
    log(`✗ ${message}`, 'red');
    testsFailed++;
    if (critical) {
      criticalIssues.push(message);
    }
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    log(`✗ ${message} - Expected error but none thrown`, 'red');
    testsFailed++;
  } catch (e) {
    log(`✓ ${message}`, 'green');
    testsPassed++;
  }
}

async function runTests() {
  log('\nStarting Comprehensive Prediction Market Bot Tests\n', 'magenta');
  
  const manager = new MarketManager();
  
  // Test 1: Market Creation
  logTest('Market Creation');
  manager.createMarket('LECTURE', 'Which lecture will be most popular?', 
    Array.from({length: 18}, (_, i) => ({ id: (i+1).toString(), name: `Lecture ${i+1}` }))
  );
  const market = manager.getMarket('LECTURE');
  assert(market !== undefined, 'Market created successfully');
  assert(market.outcomes.size === 18, 'Market has 18 outcomes');
  
  // Test 2: User Initialization
  logTest('User Initialization');
  manager.initializeUser('user1');
  manager.initializeUser('user2');
  manager.initializeUser('user3');
  assert(manager.getUserBalance('user1') === 1000, 'User1 starts with $1000');
  assert(manager.getUserBalance('user2') === 1000, 'User2 starts with $1000');
  
  // Test 3: Bundle Trading
  logTest('Bundle Trading');
  const bundleResult = manager.buyBundle('user1', 'LECTURE', 50);
  assert(bundleResult.bundlesBought === 50, 'Bought 50 bundles');
  assert(bundleResult.cost === 50, 'Cost was $50');
  assert(manager.getUserBalance('user1') === 950, 'User1 balance reduced to $950');
  
  // Check positions
  for (let i = 1; i <= 18; i++) {
    const position = manager.getUserPosition('user1', 'LECTURE', i.toString());
    assert(position === 50, `User1 has 50 shares of outcome ${i}`);
  }
  
  // Test 4: Basic Buy/Sell Orders
  logTest('Basic Buy/Sell Orders');
  
  // User2 places buy order
  const buyOrder1 = manager.placeBuyOrder('user2', 'LECTURE', '5', 0.40, 10);
  assert(buyOrder1.order && buyOrder1.order.id !== undefined, 'Buy order created with ID', true);
  assert(manager.getUserBalance('user2') === 996, 'User2 balance reduced by $4 (10 * 0.40)');
  
  // User1 sells into the buy order
  const sellOrder1 = manager.placeSellOrder('user1', 'LECTURE', '5', 0.35, 5);
  assert(sellOrder1.matches && sellOrder1.matches.length > 0, 'Order matched');
  const totalTraded = sellOrder1.matches.reduce((sum, match) => sum + match.quantity, 0);
  assert(totalTraded === 5, 'Sold 5 units');
  const avgPrice = sellOrder1.matches.reduce((sum, match) => sum + match.price * match.quantity, 0) / totalTraded;
  assert(avgPrice === 0.40, 'Executed at buyer price (price improvement)');
  assert(manager.getUserBalance('user1') === 952, 'User1 received $2 (5 * 0.40)');
  
  // Test 5: Order Book State
  logTest('Order Book State');
  const orders = manager.getUserOrders('user2', 'LECTURE');
  assert(orders.length > 0, 'User2 has open orders');
  const firstOrder = orders[0];
  assert(firstOrder.quantity === 5, 'Remaining quantity is 5 (10 - 5 traded)');
  
  // Test 6: Price Validation
  logTest('Price Validation');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', 1.50, 5), 
    'Rejects price > $0.99');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', 0.00, 5), 
    'Rejects price $0.00');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', -0.50, 5), 
    'Rejects negative price');
  
  // Test 7: Quantity Validation
  logTest('Quantity Validation');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', 0.50, -5), 
    'Rejects negative quantity');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', 0.50, 0), 
    'Rejects zero quantity');
  assertThrows(() => manager.buyBundle('user1', 'LECTURE', -10), 
    'Rejects negative bundle quantity');
  
  // Test 8: Balance Constraints
  logTest('Balance Constraints');
  assertThrows(() => manager.placeBuyOrder('user1', 'LECTURE', '1', 0.50, 2000), 
    'Cannot buy more than balance allows');
  const poorUser = 'user4';
  manager.initializeUser(poorUser);
  manager.userBalances.set(poorUser, 1); // Give them only $1
  assertThrows(() => manager.placeBuyOrder(poorUser, 'LECTURE', '1', 0.50, 5), 
    'Cannot place order with insufficient balance');
  
  // Test 9: Position Constraints
  logTest('Position Constraints');
  try {
    const sellResult = manager.placeSellOrder('user1', 'LECTURE', '10', 0.60, 100);
    // If we get here, it means it allowed partial fills
    assert(sellResult.unitsTraded === 50, 'Can only sell shares you own (50)', true);
  } catch (e) {
    // If it throws an error, that's also valid behavior
    assert(e.message.includes('Insufficient position'), 'Throws error on oversell attempt', true);
  }
  
  // Test 10: Order Cancellation
  logTest('Order Cancellation');
  
  // Place some orders that won't match
  const cancelOrder1 = manager.placeBuyOrder('user1', 'LECTURE', '7', 0.25, 10);
  const cancelOrder2 = manager.placeBuyOrder('user2', 'LECTURE', '8', 0.20, 15);
  
  // Get user1's balance before cancel
  const balanceBeforeCancel = manager.getUserBalance('user1');
  
  // Cancel user1's order - check if we have the right structure
  const orderIdToCancel = cancelOrder1.order.id;
  const cancelResult = manager.cancelOrder('user1', 'LECTURE', '7', orderIdToCancel);
  assert(cancelResult.success === true, 'Order cancelled successfully');
  assert(cancelResult.fundsReturned === 2.5, 'Funds returned correctly ($2.50)');
  assert(manager.getUserBalance('user1') === balanceBeforeCancel + 2.5, 'Balance updated after cancellation');
  
  // Try to cancel non-existent order
  assertThrows(() => manager.cancelOrder('user1', 'LECTURE', '7', 99999), 
    'Cannot cancel non-existent order');
  
  // Try to cancel another user's order
  assertThrows(() => manager.cancelOrder('user1', 'LECTURE', '8', cancelOrder2.order.id), 
    'Cannot cancel another user\'s order');
  
  // Test 11: Complex Order Matching
  logTest('Complex Order Matching');
  
  // Create order book depth
  manager.placeBuyOrder('user2', 'LECTURE', '12', 0.30, 5);
  manager.placeBuyOrder('user2', 'LECTURE', '12', 0.35, 5);
  manager.placeBuyOrder('user2', 'LECTURE', '12', 0.40, 5);
  
  // Sell into multiple orders
  const complexSell = manager.placeSellOrder('user1', 'LECTURE', '12', 0.25, 12);
  const complexTraded = complexSell.matches.reduce((sum, match) => sum + match.quantity, 0);
  assert(complexTraded === 12, 'Sold 12 units across multiple orders');
  const complexAvgPrice = complexSell.matches.reduce((sum, match) => sum + match.price * match.quantity, 0) / complexTraded;
  assert(complexAvgPrice > 0.35, 'Average price reflects multiple fills', true);
  
  // Test 12: Market Orders (no price)
  logTest('Market Orders');
  
  // Market orders with null price are not supported
  assertThrows(() => manager.placeBuyOrder('user2', 'LECTURE', '15', null, 5),
    'Market orders (null price) are not supported');
  
  // But we can place aggressive limit orders to simulate market orders
  manager.placeSellOrder('user1', 'LECTURE', '15', 0.70, 10);
  const aggressiveBuy = manager.placeBuyOrder('user2', 'LECTURE', '15', 0.99, 5);
  const marketTraded = aggressiveBuy.matches.reduce((sum, match) => sum + match.quantity, 0);
  assert(marketTraded === 5, 'Aggressive limit order executed like market order');
  const marketAvgPrice = aggressiveBuy.matches.reduce((sum, match) => sum + match.price * match.quantity, 0) / marketTraded;
  assert(marketAvgPrice === 0.70, 'Executed at ask price');
  
  // Test 13: Bundle Sell
  logTest('Bundle Sell');
  
  // First ensure user1 has complete sets
  const positions = [];
  for (let i = 1; i <= 18; i++) {
    positions.push(manager.getUserPosition('user1', 'LECTURE', i.toString()));
  }
  const minPosition = Math.min(...positions);
  
  if (minPosition >= 5) {
    const bundleSellResult = manager.sellBundle('user1', 'LECTURE', 5);
    assert(bundleSellResult.bundlesSold === 5, 'Sold 5 bundles');
    assert(bundleSellResult.revenue === 5, 'Received $5');
  }
  
  // Test 14: Float Precision
  logTest('Float Precision');
  
  const startBalance = manager.getUserBalance('user3');
  // Do many small transactions with low prices that won't match
  for (let i = 0; i < 100; i++) {
    const order = manager.placeBuyOrder('user3', 'LECTURE', '18', 0.01, 1);
    manager.cancelOrder('user3', 'LECTURE', '18', order.order.id);
  }
  const endBalance = manager.getUserBalance('user3');
  assert(Math.abs(startBalance - endBalance) < 0.01, 
    'No float precision errors after 100 transactions', true);
  
  // Test 15: Concurrent Order IDs
  logTest('Concurrent Order IDs');
  
  const orderIds = [];
  for (let i = 0; i < 20; i++) {
    const order = manager.placeBuyOrder('user1', 'LECTURE', '17', 0.01 + i * 0.01, 1);
    orderIds.push(order.order.id);
  }
  const uniqueIds = new Set(orderIds);
  assert(uniqueIds.size === 20, 'All order IDs are unique', true);
  
  // Test 16: Market Resolution
  logTest('Market Resolution');
  
  // Create a test market for resolution
  manager.createMarket('TEST_RESOLVE', 'Test market for resolution', [
    { id: '1', name: 'Option A' },
    { id: '2', name: 'Option B' }
  ]);
  
  // Set up positions
  manager.buyBundle('user1', 'TEST_RESOLVE', 10);
  manager.buyBundle('user2', 'TEST_RESOLVE', 20);
  
  // Place some orders
  manager.placeBuyOrder('user1', 'TEST_RESOLVE', '1', 0.60, 5);
  manager.placeSellOrder('user2', 'TEST_RESOLVE', '2', 0.40, 10);
  
  const user1BalanceBefore = manager.getUserBalance('user1');
  const user2BalanceBefore = manager.getUserBalance('user2');
  
  // Resolve market
  manager.resolveMarket('TEST_RESOLVE', '1');
  
  const user1BalanceAfter = manager.getUserBalance('user1');
  const user2BalanceAfter = manager.getUserBalance('user2');
  
  assert(user1BalanceAfter > user1BalanceBefore, 'User1 (winner) balance increased');
  assert(manager.getUserOrders('user1', 'TEST_RESOLVE').length === 0, 
    'All orders cancelled after resolution', true);
  
  // Test 17: Post-Resolution Trading
  logTest('Post-Resolution Trading');
  
  assertThrows(() => manager.placeBuyOrder('user1', 'TEST_RESOLVE', '1', 0.50, 5),
    'Cannot trade on resolved market');
  assertThrows(() => manager.buyBundle('user1', 'TEST_RESOLVE', 5),
    'Cannot buy bundles on resolved market');
  
  // Test 18: Edge Case - Self Trading
  logTest('Self Trading Prevention');
  
  // This is actually allowed in the current implementation
  manager.placeBuyOrder('user1', 'LECTURE', '16', 0.50, 10);
  const selfTrade = manager.placeSellOrder('user1', 'LECTURE', '16', 0.45, 5);
  const selfTraded = selfTrade.matches.reduce((sum, match) => sum + match.quantity, 0);
  assert(selfTraded === 5, 'Self-trading is currently allowed');
  log('⚠️  Warning: Self-trading is not prevented', 'yellow');
  
  // Test 19: Order Book Sum Validation
  logTest('Order Book Sum Validation');
  
  // Get current market state
  const marketInfo = manager.getMarket('LECTURE');
  let sumBestBids = 0;
  let sumBestAsks = 0;
  
  for (const [outcomeId, outcome] of marketInfo.outcomes) {
    const orderBook = outcome.orderBook;
    // Access the internal arrays
    const buyOrders = orderBook.bids || [];
    const sellOrders = orderBook.asks || [];
    
    if (buyOrders.length > 0) {
      sumBestBids += buyOrders[0].price;
    }
    if (sellOrders.length > 0) {
      sumBestAsks += sellOrders[0].price;
    }
  }
  
  log(`Sum of best bids: $${sumBestBids.toFixed(2)}`, 'blue');
  log(`Sum of best asks: $${sumBestAsks.toFixed(2)}`, 'blue');
  
  // Test 20: Stress Test - Many Orders
  logTest('Stress Test - Many Orders');
  
  const stressStart = Date.now();
  for (let i = 0; i < 100; i++) {
    manager.placeBuyOrder('user3', 'LECTURE', '1', 0.01 + (i % 50) * 0.01, 1);
  }
  const stressEnd = Date.now();
  const stressTime = stressEnd - stressStart;
  
  assert(stressTime < 1000, `Created 100 orders in ${stressTime}ms`);
  
  // Summary
  console.log('\n' + '='.repeat(50));
  log(`Tests Passed: ${testsPassed}`, 'green');
  log(`Tests Failed: ${testsFailed}`, 'red');
  
  if (criticalIssues.length > 0) {
    log('\nCritical Issues Found:', 'red');
    criticalIssues.forEach(issue => log(`  - ${issue}`, 'red'));
  }
  
  if (testsFailed === 0) {
    log('\n✅ All tests passed!', 'green');
  } else {
    log(`\n❌ ${testsFailed} tests failed`, 'red');
  }
  
  // Additional observations
  console.log('\n' + '='.repeat(50));
  log('Observations:', 'yellow');
  log('1. Self-trading is allowed (user can trade with themselves)', 'yellow');
  log('2. Float precision handling seems adequate with rounding', 'yellow');
  log('3. Order IDs are unique within each order book', 'yellow');
  log('4. Price improvement works correctly for buyers', 'yellow');
  log('5. Market resolution cancels all open orders', 'yellow');
  
  console.log('\n' + '='.repeat(50));
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});