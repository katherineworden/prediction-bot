# Managing Market Data Persistence

The Slack prediction market bot keeps all market data in memory during its runtime. To persist market data across deployments and restarts, follow this guide.

## How Data Persistence Works

1. **In-Memory Storage**
   - All market data (markets, order books, user balances, positions) is kept in memory
   - Data remains available as long as the bot is running
   - If the bot restarts or is redeployed, it loads initial data from `market_data.json`

2. **Initial Loading**
   - On startup, the bot loads data from `market_data.json` in the project root
   - This file is included in the codebase and deployed with the bot

## Backing Up Current Market Data

To back up the current state of all markets and user data:

1. Use the admin command in any channel:
   ```
   @bot export-data
   ```

2. The bot will return:
   - A summary of all markets (visible to everyone in the channel)
   - The complete JSON data as a private message (only visible to you)

3. Copy the JSON data from the private message

## Updating market_data.json

To persist markets across deployments:

1. After exporting data, save the JSON to `market_data.json` in your local project:
   ```bash
   cd /Users/k/Downloads/269i/slackbot-prediction-market
   nano market_data.json  # Or use any text editor
   ```

2. Paste the exported JSON data and save the file

3. Deploy the updated file to Railway:
   ```bash
   railway up
   ```

4. The bot will now load this data on startup

## Important Notes

- If you don't update `market_data.json`, the bot will start with empty market data after redeployment
- For small changes or short-term markets, you can rely on in-memory storage
- For important/long-running markets, regularly export data and update the JSON file
- The bot doesn't automatically save data to a persistent store due to Railway filesystem limitations

## Best Practices

1. **Regular Backups**:
   - Export data after creating important markets
   - Export data before resolving markets
   - Export data at the end of active sessions

2. **Selective Persistence**:
   - You can edit the JSON to only include specific markets if needed
   - You can remove resolved markets from the JSON to keep the file smaller

3. **Market IDs**:
   - Use meaningful market IDs that are easy to identify
   - Consider including dates in market IDs for clarity (e.g., "ELECTION2024")