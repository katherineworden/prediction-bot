# Managing Market Data Persistence

The Slack prediction market bot automatically saves all market data to disk. This guide explains how persistence works and how to manage your data.

## How Data Persistence Works

### Automatic Saving
- Data is automatically saved to `market_data.json` after every trade
- A backup is created before each save (keeps last 5 backups)
- Data is written atomically (temp file + rename) to prevent corruption
- If saving fails, data is dumped to the console log as emergency backup

### On Startup
- The bot loads data from `market_data.json` in the data directory
- If a `complete_transaction_history.json` file exists, it replays transactions
- Order IDs are preserved to prevent collisions after restart

### Configuration
Set the `DATA_DIR` environment variable to specify where data is stored:
```bash
DATA_DIR=/home/ubuntu/prediction-bot
```

If not set, defaults to the project root directory.

## Backup Files

The bot automatically creates backup files:
- `market_data_backup_[timestamp].json` - Created before each save
- Only the last 5 backups are kept
- Backups are in the same directory as `market_data.json`

### Manual Backup
You can also use the admin command:
```
@bot export-data
```

This returns:
- A summary of all markets (visible to everyone)
- Complete JSON data as a private message (only to you)

## Data Structure

The `market_data.json` file contains:

```json
{
  "markets": {
    "LECTURE": {
      "id": "LECTURE",
      "description": "Which lecture will be voted most popular?",
      "outcomes": {
        "1": {
          "name": "Lecture 1",
          "orderBook": {
            "bids": [...],
            "asks": [...],
            "lastPrice": 0.45,
            "volume": 100,
            "nextOrderId": 50
          }
        },
        ...
      },
      "created": 1704067200000,
      "resolved": false,
      "winningOutcome": null
    }
  },
  "userBalances": {
    "U12345678": 1050.50,
    "U87654321": 925.00
  },
  "userPositions": {
    "U12345678": {
      "LECTURE": {
        "1": 10,
        "5": 25
      }
    }
  },
  "bundlePrice": 1
}
```

## Restoring from Backup

### From Automatic Backup
```bash
cd ~/prediction-bot
cp market_data_backup_[timestamp].json market_data.json
pm2 restart prediction-bot
```

### From Export Data
1. Copy the JSON from the export-data private message
2. Save to `market_data.json`
3. Restart the bot

## Best Practices

1. **Regular Exports**
   - Export data before resolving markets
   - Export data at the end of active trading sessions
   - Keep copies of important market states

2. **Monitor Backups**
   - Check that backups are being created
   - Verify backup file sizes are reasonable
   - Test restoration occasionally

3. **Server Maintenance**
   - Before server updates, export data
   - After updates, verify data loaded correctly
   - Check `pm2 logs` for any loading errors

## Troubleshooting

### Data Not Saving
1. Check `DATA_DIR` environment variable
2. Verify write permissions: `ls -la ~/prediction-bot/`
3. Check disk space: `df -h`
4. Look for errors in logs: `pm2 logs prediction-bot`

### Data Not Loading
1. Verify `market_data.json` exists and is valid JSON
2. Check file permissions
3. Look for parse errors in logs
4. Try loading a backup file

### Emergency Recovery
If the bot crashes and data wasn't saved:
1. Check logs for "EMERGENCY DATA DUMP"
2. Copy the JSON from the logs
3. Save to `market_data.json`
4. Restart the bot

## Oracle Cloud Persistence

Oracle Cloud VMs have persistent storage, so data is automatically preserved:
- Data survives bot restarts
- Data survives VM reboots
- Data is stored on the VM's boot volume

To ensure data survives VM termination:
1. Create regular backups
2. Consider attaching a block volume for data
3. Use `export-data` before major changes
