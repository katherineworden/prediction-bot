const MarketManager = require('./src/marketManager');

console.log('Testing Critical Bug Fixes...\n');

const manager = new MarketManager();

// Test 1: Double-deduction bug
console.log('1. Testing position tracking (double-deduction fix)');
manager.createMarket('TEST1', 'Test Market 1', [
  { id: '1', name: 'Yes' },
  { id: '2', name: 'No' }
]);
manager.initializeUser('user1');
manager.buyBundle('user1', 'TEST1', 10);
console.log('Initial position:', manager.getUserPosition('user1', 'TEST1', '1'));
manager.placeSellOrder('user1', 'TEST1', '1', 0.50, 5);
console.log('After sell order:', manager.getUserPosition('user1', 'TEST1', '1'));
console.log('✓ Should be 5, not 0\n');

// Test 2: Float precision
console.log('2. Testing float precision');
manager.initializeUser('user2');
const startBalance = manager.getUserBalance('user2');
for (let i = 0; i < 100; i++) {
  manager.buyBundle('user2', 'TEST1', 1);
  manager.sellBundle('user2', 'TEST1', 1);
}
const endBalance = manager.getUserBalance('user2');
console.log(`Start: $${startBalance}, End: $${endBalance}`);
console.log(`✓ Should be exactly equal, difference: ${Math.abs(startBalance - endBalance)}\n`);

// Test 3: Negative validation
console.log('3. Testing input validation');
try {
  manager.buyBundle('user1', 'TEST1', -5);
  console.log('✗ ERROR: Negative quantity accepted!');
} catch (e) {
  console.log('✓ Correctly rejected negative quantity');
}

try {
  manager.placeBuyOrder('user1', 'TEST1', '1', 1.50, 5);
  console.log('✗ ERROR: Price > $0.99 accepted!');
} catch (e) {
  console.log('✓ Correctly rejected price > $0.99');
}

try {
  manager.placeBuyOrder('user1', 'TEST1', '1', -0.50, 5);
  console.log('✗ ERROR: Negative price accepted!');
} catch (e) {
  console.log('✓ Correctly rejected negative price\n');
}

// Test 4: Market resolution
console.log('4. Testing market resolution order cancellation');
manager.createMarket('TEST2', 'Test Market 2', [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' }
]);
manager.initializeUser('user3');
manager.initializeUser('user4');
manager.buyBundle('user4', 'TEST2', 10); // Get shares to sell
manager.placeBuyOrder('user3', 'TEST2', '1', 0.40, 10);
manager.placeSellOrder('user4', 'TEST2', '2', 0.60, 10);

const ordersBefore = manager.getUserOrders('user3', 'TEST2').length;
console.log(`Orders before resolution: ${ordersBefore}`);

manager.resolveMarket('TEST2', '1');
const ordersAfter = manager.getUserOrders('user3', 'TEST2').length;
console.log(`Orders after resolution: ${ordersAfter}`);
console.log('✓ Orders should be cancelled\n');

// Test 5: Price improvement refund
console.log('5. Testing price improvement refunds');
manager.createMarket('TEST3', 'Test Market 3', [
  { id: '1', name: 'X' },
  { id: '2', name: 'Y' }
]);
manager.initializeUser('user5');
manager.initializeUser('user6');
manager.buyBundle('user6', 'TEST3', 10); // Get shares to sell

// User5 places sell at 0.40
manager.placeSellOrder('user6', 'TEST3', '1', 0.40, 5);
const balanceBefore = manager.getUserBalance('user5');

// User5 buys at 0.50 but should execute at 0.40
manager.placeBuyOrder('user5', 'TEST3', '1', 0.50, 5);
const balanceAfter = manager.getUserBalance('user5');

const spent = balanceBefore - balanceAfter;
console.log(`Bought 5 shares, spent: $${spent.toFixed(2)}`);
console.log(`✓ Should be $2.00 (5 × $0.40), not $2.50\n`);

console.log('All critical bug fixes tested! ✅');