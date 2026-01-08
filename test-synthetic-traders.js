/**
 * Comprehensive Test Suite with Synthetic Traders
 * Simulates a class of 50+ students trading on the prediction market
 */

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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Test results tracking
let testsPassed = 0;
let testsFailed = 0;
const criticalIssues = [];

function assert(condition, message, critical = false) {
  if (condition) {
    log(`  ✓ ${message}`, 'green');
    testsPassed++;
    return true;
  } else {
    log(`  ✗ ${message}`, 'red');
    testsFailed++;
    if (critical) {
      criticalIssues.push(message);
    }
    return false;
  }
}

function assertThrows(fn, expectedError, message) {
  try {
    fn();
    log(`  ✗ ${message} - Expected error but none thrown`, 'red');
    testsFailed++;
    return false;
  } catch (e) {
    if (expectedError && !e.message.includes(expectedError)) {
      log(`  ✗ ${message} - Wrong error: ${e.message}`, 'red');
      testsFailed++;
      return false;
    }
    log(`  ✓ ${message}`, 'green');
    testsPassed++;
    return true;
  }
}

// Generate random user IDs
function generateUsers(count) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push(`U${String(i).padStart(4, '0')}`); // U0001, U0002, etc.
  }
  return users;
}

// Simulate realistic trading behavior
function simulateRealisticTrading(manager, users, marketId, rounds = 100) {
  const trades = [];

  for (let round = 0; round < rounds; round++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = Math.random();

    try {
      if (action < 0.2) {
        // 20% chance to buy bundle
        const quantity = Math.floor(Math.random() * 5) + 1;
        const result = manager.buyBundle(user, marketId, quantity);
        trades.push({ type: 'bundle-buy', user, quantity, success: true });
      } else if (action < 0.35) {
        // 15% chance to sell bundle (if they have shares)
        const positions = manager.getUserPosition(user, marketId);
        const minPosition = Math.min(...Object.values(positions).map(p => p || 0));
        if (minPosition > 0) {
          const quantity = Math.floor(Math.random() * minPosition) + 1;
          const result = manager.sellBundle(user, marketId, quantity);
          trades.push({ type: 'bundle-sell', user, quantity, success: true });
        }
      } else if (action < 0.6) {
        // 25% chance to place buy order
        const outcomeId = String(Math.floor(Math.random() * 18) + 1);
        const price = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100; // 0.10 - 0.90
        const quantity = Math.floor(Math.random() * 10) + 1;
        const result = manager.placeBuyOrder(user, marketId, outcomeId, price, quantity);
        trades.push({ type: 'buy', user, outcomeId, price, quantity, success: true, matched: result.matches.length > 0 });
      } else if (action < 0.85) {
        // 25% chance to place sell order (if they have shares)
        const outcomeId = String(Math.floor(Math.random() * 18) + 1);
        const position = manager.getUserPosition(user, marketId, outcomeId);
        if (position > 0) {
          const price = Math.round((Math.random() * 0.8 + 0.1) * 100) / 100;
          const quantity = Math.min(position, Math.floor(Math.random() * 10) + 1);
          const result = manager.placeSellOrder(user, marketId, outcomeId, price, quantity);
          trades.push({ type: 'sell', user, outcomeId, price, quantity, success: true, matched: result.matches.length > 0 });
        }
      } else {
        // 15% chance to cancel an order
        const orders = manager.getUserOrders(user, marketId);
        if (orders.length > 0) {
          const orderToCancel = orders[Math.floor(Math.random() * orders.length)];
          manager.cancelOrder(user, marketId, orderToCancel.outcomeId, orderToCancel.id);
          trades.push({ type: 'cancel', user, orderId: orderToCancel.id, success: true });
        }
      }
    } catch (e) {
      // Expected errors (insufficient balance, etc.)
      trades.push({ type: 'error', user, error: e.message });
    }
  }

  return trades;
}

// Main test function
async function runTests() {
  log('\n🧪 COMPREHENSIVE PREDICTION MARKET TEST SUITE 🧪\n', 'magenta');
  log('Simulating a class with 50+ students trading on the market\n', 'yellow');

  // Create fresh manager (without loading existing data)
  const manager = new MarketManager();

  // Clear any loaded data for clean tests
  manager.markets.clear();
  manager.userBalances.clear();
  manager.userPositions.clear();

  // ============================================================
  logSection('TEST 1: Market Creation');
  // ============================================================

  const outcomes = [];
  for (let i = 1; i <= 18; i++) {
    outcomes.push({
      id: i.toString(),
      name: i <= 15 ? `Lecture ${i}` : `Guest Lecture ${i - 15}`
    });
  }

  manager.createMarket('LECTURE', 'Which lecture will be voted most popular?', outcomes);
  const market = manager.getMarket('LECTURE');

  assert(market !== undefined, 'Market created successfully', true);
  assert(market.outcomes.size === 18, 'Market has 18 outcomes');
  assert(market.resolved === false, 'Market is not resolved');

  // ============================================================
  logSection('TEST 2: User Initialization (50 Students)');
  // ============================================================

  const users = generateUsers(50);
  users.forEach(userId => manager.initializeUser(userId));

  assert(manager.userBalances.size === 50, '50 users initialized');

  let allStartAt1000 = true;
  for (const userId of users) {
    if (manager.getUserBalance(userId) !== 1000) {
      allStartAt1000 = false;
      break;
    }
  }
  assert(allStartAt1000, 'All users start with $1000', true);

  // ============================================================
  logSection('TEST 3: Bundle Trading');
  // ============================================================

  // User 1 buys 20 bundles
  const bundle1 = manager.buyBundle(users[0], 'LECTURE', 20);
  assert(bundle1.bundlesBought === 20, 'User 1 bought 20 bundles');
  assert(bundle1.cost === 20, 'Cost was $20');
  assert(manager.getUserBalance(users[0]) === 980, 'User 1 balance is $980');

  // Check positions
  const positions1 = manager.getUserPosition(users[0], 'LECTURE');
  let all20Shares = true;
  for (let i = 1; i <= 18; i++) {
    if (positions1[i.toString()] !== 20) {
      all20Shares = false;
      break;
    }
  }
  assert(all20Shares, 'User 1 has 20 shares of each outcome', true);

  // User 2 buys 10 bundles, then sells 5
  manager.buyBundle(users[1], 'LECTURE', 10);
  const bundleSell = manager.sellBundle(users[1], 'LECTURE', 5);
  assert(bundleSell.bundlesSold === 5, 'User 2 sold 5 bundles');
  assert(manager.getUserBalance(users[1]) === 995, 'User 2 balance is $995 (1000 - 10 + 5)');

  // ============================================================
  logSection('TEST 4: Limit Order Placement & Matching');
  // ============================================================

  // User 1 sells 10 shares of outcome 5 at $0.40
  const sellOrder = manager.placeSellOrder(users[0], 'LECTURE', '5', 0.40, 10);
  assert(sellOrder.order !== undefined, 'Sell order created');
  assert(sellOrder.order.id !== undefined, 'Sell order has ID');

  // User 2 buys 5 shares at $0.45 (should match at $0.40)
  const buyOrder = manager.placeBuyOrder(users[1], 'LECTURE', '5', 0.45, 5);
  assert(buyOrder.matches.length > 0, 'Orders matched');
  assert(buyOrder.matches[0].price === 0.40, 'Matched at seller price (price improvement)', true);
  assert(buyOrder.matches[0].quantity === 5, 'Matched quantity is 5');

  // Check that buyer got price improvement refund
  const user2Balance = manager.getUserBalance(users[1]);
  // User 2 paid $0.45 * 5 = $2.25 upfront, got refund of ($0.45 - $0.40) * 5 = $0.25
  // Starting: $995, paid $2.25, refund $0.25 = $993.00
  assert(Math.abs(user2Balance - 993.00) < 0.01, `User 2 balance correct after price improvement: $${user2Balance.toFixed(2)}`);

  // ============================================================
  logSection('TEST 5: Order Cancellation');
  // ============================================================

  // Place an order
  const cancelTestOrder = manager.placeBuyOrder(users[2], 'LECTURE', '10', 0.30, 10);
  const balanceBeforeCancel = manager.getUserBalance(users[2]);

  // Cancel it
  const cancelled = manager.cancelOrder(users[2], 'LECTURE', '10', cancelTestOrder.order.id);
  assert(cancelled.side === 'buy', 'Cancelled order was a buy');
  assert(cancelled.quantity === 10, 'Cancelled quantity is 10');

  const balanceAfterCancel = manager.getUserBalance(users[2]);
  assert(balanceAfterCancel === balanceBeforeCancel + 3.00, 'Escrowed funds returned on cancel', true);

  // ============================================================
  logSection('TEST 6: Input Validation');
  // ============================================================

  assertThrows(
    () => manager.placeBuyOrder(users[0], 'LECTURE', '1', 1.50, 5),
    'Price must be between',
    'Rejects price > $0.99'
  );

  assertThrows(
    () => manager.placeBuyOrder(users[0], 'LECTURE', '1', 0.00, 5),
    'Price must be between',
    'Rejects price $0.00'
  );

  assertThrows(
    () => manager.placeBuyOrder(users[0], 'LECTURE', '1', -0.50, 5),
    'Price must be between',
    'Rejects negative price'
  );

  assertThrows(
    () => manager.placeBuyOrder(users[0], 'LECTURE', '1', 0.50, -5),
    'positive integer',
    'Rejects negative quantity'
  );

  assertThrows(
    () => manager.placeBuyOrder(users[0], 'LECTURE', '1', 0.50, 0),
    'positive integer',
    'Rejects zero quantity'
  );

  assertThrows(
    () => manager.buyBundle(users[0], 'LECTURE', -10),
    'positive integer',
    'Rejects negative bundle quantity'
  );

  // ============================================================
  logSection('TEST 7: Balance & Position Constraints');
  // ============================================================

  // Try to buy more than balance allows
  assertThrows(
    () => manager.placeBuyOrder(users[5], 'LECTURE', '1', 0.99, 2000),
    'Insufficient balance',
    'Cannot buy more than balance allows'
  );

  // Try to sell more than you own
  assertThrows(
    () => manager.placeSellOrder(users[5], 'LECTURE', '1', 0.50, 100),
    'Insufficient position',
    'Cannot sell more than you own'
  );

  // ============================================================
  logSection('TEST 8: Float Precision');
  // ============================================================

  const precisionUser = users[10];
  const startBalance = manager.getUserBalance(precisionUser);

  // Do many small transactions
  for (let i = 0; i < 100; i++) {
    manager.buyBundle(precisionUser, 'LECTURE', 1);
    manager.sellBundle(precisionUser, 'LECTURE', 1);
  }

  const endBalance = manager.getUserBalance(precisionUser);
  const diff = Math.abs(startBalance - endBalance);
  assert(diff < 0.01, `Float precision maintained after 100 buy/sell cycles (diff: $${diff.toFixed(4)})`, true);

  // ============================================================
  logSection('TEST 9: Leaderboard Functionality');
  // ============================================================

  const leaderboard = manager.getLeaderboard('LECTURE');
  assert(leaderboard.length > 0, 'Leaderboard has entries');
  assert(leaderboard[0].rank === 1, 'Top trader has rank 1');
  assert(typeof leaderboard[0].balance === 'number', 'Leaderboard shows balance');
  assert(typeof leaderboard[0].profit === 'number', 'Leaderboard shows profit');

  log(`\n  Top 5 traders:`, 'blue');
  leaderboard.slice(0, 5).forEach(trader => {
    const profitSign = trader.profit >= 0 ? '+' : '';
    log(`    ${trader.rank}. ${trader.userId}: $${trader.balance.toFixed(2)} (${profitSign}$${trader.profit.toFixed(2)})`);
  });

  // ============================================================
  logSection('TEST 10: Simulated Class Trading (500 Transactions)');
  // ============================================================

  log('  Simulating 500 random trades...', 'yellow');
  const trades = simulateRealisticTrading(manager, users, 'LECTURE', 500);

  const successfulTrades = trades.filter(t => t.success);
  const errors = trades.filter(t => t.type === 'error');

  log(`  Completed: ${successfulTrades.length} successful trades, ${errors.length} expected errors`);
  assert(successfulTrades.length > 100, 'At least 100 successful trades');

  // Check market integrity
  const marketInfo = manager.getMarketInfo('LECTURE');
  assert(marketInfo !== null, 'Market still accessible after heavy trading');

  log(`\n  Sum of best bids: $${marketInfo.totalBestBids.toFixed(2)}`, 'blue');
  log(`  Sum of best asks: $${marketInfo.totalBestAsks.toFixed(2)}`, 'blue');

  // ============================================================
  logSection('TEST 11: Order Book Integrity');
  // ============================================================

  // Check that all bids are sorted (highest first)
  let bidsOrdered = true;
  let asksOrdered = true;

  for (const [outcomeId, outcome] of market.outcomes) {
    const bids = outcome.orderBook.bids;
    const asks = outcome.orderBook.asks;

    for (let i = 1; i < bids.length; i++) {
      if (bids[i].price > bids[i-1].price) {
        bidsOrdered = false;
        break;
      }
    }

    for (let i = 1; i < asks.length; i++) {
      if (asks[i].price < asks[i-1].price) {
        asksOrdered = false;
        break;
      }
    }
  }

  assert(bidsOrdered, 'All bids are sorted (highest first)', true);
  assert(asksOrdered, 'All asks are sorted (lowest first)', true);

  // ============================================================
  logSection('TEST 12: Unique Order IDs');
  // ============================================================

  const allOrderIds = new Set();
  let duplicateFound = false;

  for (const [outcomeId, outcome] of market.outcomes) {
    for (const bid of outcome.orderBook.bids) {
      const key = `${outcomeId}-${bid.id}`;
      if (allOrderIds.has(key)) {
        duplicateFound = true;
        break;
      }
      allOrderIds.add(key);
    }
    for (const ask of outcome.orderBook.asks) {
      const key = `${outcomeId}-${ask.id}`;
      if (allOrderIds.has(key)) {
        duplicateFound = true;
        break;
      }
      allOrderIds.add(key);
    }
  }

  assert(!duplicateFound, 'All order IDs are unique within their outcome', true);

  // ============================================================
  logSection('TEST 13: Market Resolution');
  // ============================================================

  // Create a test market for resolution
  manager.createMarket('TEST_RESOLVE', 'Test market for resolution', [
    { id: '1', name: 'Option A' },
    { id: '2', name: 'Option B' }
  ]);

  // Set up positions and orders
  manager.buyBundle(users[0], 'TEST_RESOLVE', 50);
  manager.buyBundle(users[1], 'TEST_RESOLVE', 30);

  // User 0 bets on option 1, user 1 bets on option 2
  manager.placeSellOrder(users[0], 'TEST_RESOLVE', '2', 0.40, 30); // Selling option 2
  manager.placeBuyOrder(users[1], 'TEST_RESOLVE', '2', 0.50, 20);  // Buying option 2

  const user0BalanceBefore = manager.getUserBalance(users[0]);
  const user1BalanceBefore = manager.getUserBalance(users[1]);

  // Resolve - option 1 wins
  const resolution = manager.resolveMarket('TEST_RESOLVE', '1');
  assert(resolution.winningOutcome === '1', 'Market resolved with correct outcome');

  const user0BalanceAfter = manager.getUserBalance(users[0]);
  const user1BalanceAfter = manager.getUserBalance(users[1]);

  // User 0 held 50 shares of option 1, should receive $50
  assert(user0BalanceAfter > user0BalanceBefore, 'Winner (user 0) received payout', true);

  // Check orders were cancelled
  const ordersAfter = manager.getUserOrders(users[0], 'TEST_RESOLVE');
  assert(ordersAfter.length === 0, 'All orders cancelled after resolution');

  // Cannot trade on resolved market
  assertThrows(
    () => manager.placeBuyOrder(users[0], 'TEST_RESOLVE', '1', 0.50, 5),
    'Cannot trade on resolved market',
    'Cannot trade on resolved market'
  );

  // ============================================================
  logSection('TEST 14: Winners Display');
  // ============================================================

  const winners = manager.getWinners('TEST_RESOLVE');
  assert(winners !== null, 'Winners returned for resolved market');
  assert(winners.winningOutcome === '1', 'Winning outcome is correct');
  assert(winners.topTraders.length > 0, 'Top traders list populated');

  log(`\n  Winners of TEST_RESOLVE:`, 'blue');
  winners.topTraders.slice(0, 5).forEach(trader => {
    const profitSign = trader.profit >= 0 ? '+' : '';
    log(`    ${trader.rank}. ${trader.userId}: $${trader.balance.toFixed(2)} (${profitSign}$${trader.profit.toFixed(2)})`);
  });

  // ============================================================
  logSection('TEST 15: Data Persistence');
  // ============================================================

  // Save data
  manager.saveData();

  // Get current state
  const savedState = manager.getState();
  assert(Object.keys(savedState.markets).length >= 2, 'Markets serialized');
  assert(Object.keys(savedState.userBalances).length >= 50, 'User balances serialized');
  assert(Object.keys(savedState.userPositions).length >= 1, 'User positions serialized');

  log(`\n  Saved state: ${Object.keys(savedState.markets).length} markets, ${Object.keys(savedState.userBalances).length} users`);

  // ============================================================
  logSection('TEST 16: Market Buy/Sell Functions');
  // ============================================================

  // Setup: Create orders for market buy test
  manager.buyBundle(users[20], 'LECTURE', 10);
  manager.placeSellOrder(users[20], 'LECTURE', '3', 0.50, 5);

  const marketBuyResult = manager.marketBuy(users[21], 'LECTURE', '3', 3);
  assert(marketBuyResult.filled.length > 0, 'Market buy executed');
  assert(marketBuyResult.totalCost > 0, 'Market buy cost calculated');

  // Market buy on resolved market should fail
  assertThrows(
    () => manager.marketBuy(users[0], 'TEST_RESOLVE', '1', 5),
    'Cannot trade on resolved market',
    'Market buy fails on resolved market'
  );

  // ============================================================
  // SUMMARY
  // ============================================================

  console.log('\n' + '='.repeat(60));
  log('TEST SUMMARY', 'magenta');
  console.log('='.repeat(60));

  log(`\nTests Passed: ${testsPassed}`, 'green');
  log(`Tests Failed: ${testsFailed}`, testsFailed > 0 ? 'red' : 'green');

  if (criticalIssues.length > 0) {
    log('\n⚠️  Critical Issues Found:', 'red');
    criticalIssues.forEach(issue => log(`    - ${issue}`, 'red'));
  }

  // Final leaderboard
  const finalLeaderboard = manager.getLeaderboard();
  log('\n📊 Final Leaderboard (Top 10):', 'cyan');
  finalLeaderboard.slice(0, 10).forEach(trader => {
    const profitSign = trader.profit >= 0 ? '+' : '';
    const icon = trader.profit >= 0 ? '📈' : '📉';
    log(`  ${trader.rank}. ${trader.userId}: $${trader.balance.toFixed(2)} (${profitSign}$${trader.profit.toFixed(2)}) ${icon}`);
  });

  if (testsFailed === 0) {
    log('\n✅ All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n❌ ${testsFailed} tests failed`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log(`\nTest suite crashed: ${error.message}`, 'red');
  console.error(error.stack);
  process.exit(1);
});
