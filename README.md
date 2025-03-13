# Discord Engagement Tracker Bot

A Discord bot that tracks message engagement in specified channels, including:
- Reaction tracking
- Channel member access tracking
- Message read/unread status tracking
- SQLite database persistence
- Scheduled reports
- Discord slash commands support
- Interactive components (buttons, modals)

## Features

- Tracks reactions on messages in specified channels
- Monitors who has access to the channel
- Determines who has read messages (based on reactions)
- Provides engagement statistics via commands
- Persists data in SQLite database for reliability
- Supports pagination for large servers
- Scheduled automated reports (daily, weekly, monthly)
- Discord slash commands with intuitive options
- Permission-based command access
- Memory management with automatic cleanup of old messages

## Setup

1. Create a new Discord application and bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Get your bot token from the Bot section
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
5. Configure your environment variables in `.env`:
   - `DISCORD_BOT_TOKEN`: Your Discord bot token
   - `TRACKED_CHANNEL_ID`: (Optional) ID of the channel you want to monitor (can be set via `/setup` command)
   - `ADMIN_CHANNEL_ID`: (Optional) Channel for admin notifications
   - `COMMAND_PREFIX`: (Optional) Legacy setting, no longer needed for slash commands
   - `ADMIN_ROLE_IDS`: (Optional) Comma-separated list of role IDs that can use admin commands
   - `MOD_ROLE_IDS`: (Optional) Comma-separated list of role IDs that can use mod commands
   - `DATABASE_PATH`: Path to SQLite database file
6. Build the TypeScript code:
   ```bash
   npm run build
   ```
7. Start the bot:
   ```bash
   npm start
   ```

## Development

- Run in development mode with auto-reloading:
  ```bash
  npm run dev
  ```
- Clean build files:
  ```bash
  npm run clean
  ```

## Required Bot Permissions

The bot needs the following permissions:
- Read Messages/View Channels
- Send Messages
- Read Message History
- View Channel
- Add Reactions
- Manage Messages
- Use Application Commands (for slash commands)

## Commands

The bot now uses Discord's slash commands system for improved user experience and security.

### Engagement Tracking

- `/check-engagement [messageId]` - Shows engagement statistics for messages:
  - Without messageId: Shows statistics for all tracked messages
  - With messageId: Shows statistics for the specific message

### Activity Ranking

- `/most-active [count] [page]` - Shows the most active users, sorted by activity score:
  - Lists users with highest engagement (default: top 10, max 100)
  - Shows channel statistics (total members, active members)
  - Shows detailed engagement metrics:
    * Messages read count
    * Total reactions given
    * Early reader count (first 25% to read)
    * Weighted activity score
  - Includes scoring system explanation
  - Interactive pagination buttons
  - Optional count parameter to show more/less users
  - Optional page parameter for pagination
  - Warns if channel has low overall engagement

- `/most-inactive [count] [page]` - Shows the least active users, sorted by activity score:
  - Lists users with lowest engagement (default: top 10, max 100)
  - Shows channel statistics (total members, active members)
  - Shows messages read count
  - Shows total reactions count
  - Displays overall activity score
  - Includes engagement metrics explanation
  - Interactive pagination buttons
  - Optional count parameter to show more/less users
  - Optional page parameter for pagination
  - Warns if channel has low overall engagement

### Admin Commands

- `/setup` - Interactive setup wizard with graphical interface:
  - Requires Administrator permission
  - Configure tracked channel
  - Configure role permissions
  - Test configuration

- `/schedule-report [frequency] [type]` - Schedules automated reports:
  - Requires Administrator permission
  - Frequencies: `daily`, `weekly`, `monthly`
  - Report types: `engagement`, `activity`
  - Subcommands:
    * `/schedule-report create` - Create a new scheduled report
    * `/schedule-report list` - List all scheduled reports
    * `/schedule-report delete` - Delete a scheduled report

### Example Outputs

1. Check Engagement Command:
  ```
  **Message ID: 123456789123456**
  Total Members: 5
  Reactions: 👍: 2, 🎉: 1

  **Users who have read:**
  Username            Reactions
  ────────────────────────────────
  john_doe            👍, 🎉
  jane_smith          👍

  **Users who have not read:**
  Username
  ────────────────
  alice_brown
  bob_wilson
  carol_white
  ```

2. Activity Ranking Commands:
  ```
  **Channel Statistics**
  Total Members: 50
  Members with Activity: 35
  Showing active users based on:
  - Number of messages read
  - Total reactions given
  - Combined activity score

  **Most Active Users (Page 1/5, Showing 10 of 50)**
  Username            Messages  Reactions  Early  Score
  ───────────────────────────────────────────────────
  john_doe            15       25         8      4.80
  jane_smith          12       20         5      3.70
  bob_wilson          10       15         3      2.80

  Messages: Number of messages read
  Reactions: Total reactions given
  Early: Times among first 25% to read
  Score: Weighted activity score

  ⚠️ Note: Less than 50% of members have activity. Rankings might not represent overall channel engagement.
  ```

3. Scheduled Report Example:
  ```
  📊 **Scheduled Activity Report**
  **Channel Activity Statistics**
  Total Members: 50
  Members with Activity: 35
  Activity ranking based on:
  - Number of messages read
  - Total reactions given
  - Combined activity score

  **Most Active Users (Page 1/5, Showing 10 of 50)**
  Username            Messages  Reactions  Early  Score
  ───────────────────────────────────────────────────
  john_doe            15       25         8      4.80
  jane_smith          12       20         5      3.70
  bob_wilson          10       15         3      2.80

  Messages: Number of messages read
  Reactions: Total reactions given
  Early: Times among first 25% to read
  Score: Weighted activity score
  📊 **End of Activity Report**
  ```

### Slash Command Examples

```
/check-engagement                    # Check all messages
/check-engagement messageId:123456789123456    # Check specific message
/most-active                         # Show top 10 most active users
/most-active count:20                # Show top 20 most active users
/most-active count:20 page:2         # Show second page of top 20 most active users
/most-inactive                       # Show top 10 least active users
/most-inactive count:5               # Show top 5 least active users
/schedule-report create frequency:daily type:activity    # Schedule daily activity report
/schedule-report create frequency:weekly type:engagement # Schedule weekly engagement report
/schedule-report list                # List all scheduled reports
/schedule-report delete reportId:1   # Delete scheduled report with ID 1
```

## How It Works

1. On startup, the bot:
   - Initializes the SQLite database
   - Loads existing tracked messages from the database
   - Processes the last 100 messages in the tracked channel
   - Initializes the report scheduler

2. For message tracking, the bot:
   - Tracks reactions in real-time
   - Updates read status when users react
   - Maintains a list of all members with access to the channel
   - Periodically syncs data to the SQLite database

3. For scheduled reports:
   - Reports run at the scheduled time (daily, weekly, or monthly)
   - Reports are sent to the channel where they were scheduled
   - Activity reports show the most active users
   - Engagement reports show statistics for all tracked messages

4. Data persistence:
   - All tracked messages, reactions, and read statuses are stored in SQLite
   - Data is synced to the database every 15 minutes (configurable)
   - Old messages are automatically cleaned up based on configuration

## Configuration Options

The bot can be configured through the `config.ts` file:

- **Engagement Metrics**:
  - `readWeight`: Weight for reading a message (default: 1)
  - `reactionWeight`: Weight for adding a reaction (default: 1)
  - `firstReadBonus`: Bonus for being among first readers (default: 2)
  - `earlyReaderPercentage`: Percentage threshold for early readers (default: 25%)

- **Cleanup Settings**:
  - `enabled`: Whether to clean up old messages (default: true)
  - `maxMessageAgeInDays`: Maximum age of messages to keep (default: 30)
  - `runIntervalHours`: How often to run cleanup (default: 24)

- **Database Settings**:
  - `path`: Path to SQLite database file
  - `syncInterval`: Minutes between memory and DB syncs (default: 15)

## Interactive Features

The bot now supports interactive components for better user experience:

- **Pagination Buttons**: Activity ranking commands have interactive Previous/Next buttons for easy navigation through pages of results
- **Delete Buttons**: Most command responses include a Delete button to clean up the chat
- **Setup Wizard**: The setup process uses interactive components including buttons and modals for a streamlined configuration experience

## Notes

- The bot is built with Discord.js v14.18.0, supporting the latest Discord features
- Data is persisted in SQLite (using better-sqlite3 v11.8.1), so it will retain tracking data across restarts
- A user is considered to have "read" a message when they react to it
- The bot can track up to 100 previous messages due to Discord API limitations
- New messages are automatically tracked as they are sent
- Commands require appropriate permissions:
  - Admin commands require Administrator permission OR an admin role specified in `ADMIN_ROLE_IDS`
  - Mod commands require Manage Messages permission OR a mod role specified in `MOD_ROLE_IDS`
- The bot handles graceful shutdown to ensure data is saved

## Troubleshooting

### Installation Issues

#### better-sqlite3 Installation Errors

If you encounter errors when installing dependencies related to `better-sqlite3` and Python's `distutils` module:

```
ModuleNotFoundError: No module named 'distutils'
```

This is because `better-sqlite3` requires native compilation and Python's `distutils` module, which was removed in Python 3.12. Here are several solutions:

1. **Install Python setuptools package**:
   ```bash
   # For Debian/Ubuntu-based systems
   sudo apt-get update
   sudo apt-get install python3-setuptools

   # For CentOS/RHEL-based systems
   sudo yum install python3-setuptools
   ```

2. **Use an older Python version**:
   ```bash
   # Set Python path to an older version if available
   export PYTHON=/usr/bin/python3.10  # Adjust path to your available Python version
   npm install
   ```

3. **Use a Docker container for development**:
   ```bash
   # Create a Dockerfile
   cat > Dockerfile << 'EOF'
   FROM node:18
   WORKDIR /app
   COPY package*.json ./
   RUN apt-get update && apt-get install -y python3-setuptools
   RUN npm install
   COPY . .
   CMD ["npm", "start"]
   EOF

   # Build and run
   docker build -t discord-tracker .
   docker run -it discord-tracker
   ```

4. **Switch to sqlite3 package**:
   ```bash
   # Edit package.json to replace better-sqlite3 with sqlite3
   sed -i 's/"better-sqlite3".*/"sqlite3": "^5.1.6",/' package.json

   # Remove node_modules and package-lock.json
   rm -rf node_modules package-lock.json

   # Install dependencies again
   npm install
   ```
   Note: This will require some code changes in the database service.

### Runtime Issues

#### Bot Not Responding to Commands

1. **Check your bot token**: Ensure your Discord bot token in the `.env` file is correct.
2. **Verify permissions**: Make sure the bot has the necessary permissions in your Discord server.
3. **Check the tracked channel**: Use the `/setup` command to configure the tracked channel if not set.
4. **Check logs**: Look for error messages in the console output.

#### Database Errors

If you encounter database-related errors:

1. **Check database path**: Ensure the `DATABASE_PATH` in your `.env` file points to a valid directory.
2. **Check permissions**: Make sure the bot has write permissions to the database directory.
3. **Reset database**: If the database is corrupted, you can delete the database file and let the bot recreate it.
