#!/usr/bin/env node

const readline = require('readline');
const MarketManager = require('./src/marketManager');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'market> '
});

const manager = new MarketManager();
const currentUser = 'cli-user';
manager.initializeUser(currentUser);

console.log('Prediction Market CLI');
console.log('Type "help" for commands\n');

rl.prompt();

rl.on('line', (line) => {
  const args = line.trim().split(' ');
  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case 'create':
        const marketId = args[1];
        const outcomes = args[2].split(',').map((name, i) => ({ id: i.toString(), name }));
        const description = args.slice(3).join(' ');
        manager.createMarket(marketId, description, outcomes);
        console.log(`Created market: ${marketId}`);
        break;

      case 'buy':
        const buyMarket = args[1];
        const buyOutcome = args[2];
        const buyQty = parseInt(args[3]);
        const buyPrice = args[4] ? parseFloat(args[4]) : null;
        
        if (buyPrice) {
          manager.placeBuyOrder(currentUser, buyMarket, buyOutcome, buyPrice, buyQty);
          console.log(`Buy order placed: ${buyQty} @ $${buyPrice}`);
        } else {
          const result = manager.marketBuy(currentUser, buyMarket, buyOutcome, buyQty);
          console.log(`Market buy: ${buyQty} shares for $${result.totalCost.toFixed(2)}`);
        }
        break;

      case 'sell':
        const sellMarket = args[1];
        const sellOutcome = args[2];
        const sellQty = parseInt(args[3]);
        const sellPrice = args[4] ? parseFloat(args[4]) : null;
        
        if (sellPrice) {
          manager.placeSellOrder(currentUser, sellMarket, sellOutcome, sellPrice, sellQty);
          console.log(`Sell order placed: ${sellQty} @ $${sellPrice}`);
        } else {
          const result = manager.marketSell(currentUser, sellMarket, sellOutcome, sellQty);
          console.log(`Market sell: ${sellQty} shares for $${result.totalRevenue.toFixed(2)}`);
        }
        break;

      case 'bundle-buy':
        const bbMarket = args[1];
        const bbQty = parseInt(args[2]);
        const bbResult = manager.buyBundle(currentUser, bbMarket, bbQty);
        console.log(`Bought ${bbResult.bundlesBought} bundles for $${bbResult.cost}`);
        break;

      case 'bundle-sell':
        const bsMarket = args[1];
        const bsQty = parseInt(args[2]);
        const bsResult = manager.sellBundle(currentUser, bsMarket, bsQty);
        console.log(`Sold ${bsResult.bundlesSold} bundles for $${bsResult.revenue}`);
        break;

      case 'market':
        const infoMarket = args[1];
        const info = manager.getMarketInfo(infoMarket);
        console.log(`\nMarket: ${info.description}`);
        for (const [id, outcome] of Object.entries(info.outcomes)) {
          console.log(`\n${outcome.name} (ID: ${id}):`);
          console.log(`  Bids: ${outcome.bids.map(b => `$${b.price}(${b.quantity})`).join(', ') || 'none'}`);
          console.log(`  Asks: ${outcome.asks.map(a => `$${a.price}(${a.quantity})`).join(', ') || 'none'}`);
          console.log(`  Last: $${outcome.last || 'N/A'}, Volume: ${outcome.volume}`);
        }
        console.log(`\nSum of best bids: $${info.totalBestBids.toFixed(2)}`);
        console.log(`Sum of best asks: $${info.totalBestAsks.toFixed(2)}`);
        break;

      case 'balance':
        console.log(`Balance: $${manager.getUserBalance(currentUser)}`);
        break;

      case 'position':
        const posMarket = args[1];
        const positions = manager.getUserPosition(currentUser, posMarket);
        console.log(`Positions in ${posMarket}:`);
        for (const [id, qty] of Object.entries(positions)) {
          console.log(`  Outcome ${id}: ${qty} shares`);
        }
        break;

      case 'help':
        console.log(`
Commands:
  create <market_id> <outcome1,outcome2,...> <description>
  buy <market_id> <outcome_id> <quantity> [price]
  sell <market_id> <outcome_id> <quantity> [price]
  bundle-buy <market_id> <quantity>
  bundle-sell <market_id> <quantity>
  market <market_id>
  balance
  position <market_id>
  help
  quit
        `);
        break;

      case 'quit':
      case 'exit':
        process.exit(0);

      default:
        console.log('Unknown command. Type "help" for available commands.');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }

  rl.prompt();
});

console.log('Ready! Try: create RAIN "Yes,No" "Will it rain tomorrow?"');
rl.prompt();