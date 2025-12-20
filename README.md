# 🌅 5AM Club Discord Bot

A Discord bot for tracking early morning presence. Members can check in between 5:00 AM - 6:00 AM on weekdays to build their consecutive day streak!

## Features

- **`/present`** - Record your presence (only works 5-6 AM, Mon-Fri, in designated channel)
- **`/leaderboard`** - View all-time total leaderboard
- **`/stats`** - View your streak and personal statistics
- **Streak Tracking** - Counts consecutive weekdays you've been present
- **Auto Announcements** - Daily streak leaderboard posted at 6 AM

## Two Leaderboards

| Leaderboard | When | What it shows |
|-------------|------|---------------|
| 🔥 **Streak** | Auto at 6 AM (Mon-Fri) | Consecutive day streaks |
| 👑 **Total** | `/leaderboard` command | All-time total days present |

## Prerequisites

- Node.js 18+
- A Discord Bot (with application commands enabled)
- Neon PostgreSQL database

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** section and create a bot
4. Enable these **Privileged Gateway Intents**:
   - Message Content Intent
5. Copy the bot token

### 2. Get Bot Permissions

Generate an invite URL with these permissions:
- `Send Messages`
- `Read Message History`
- `Use Slash Commands`
- `Embed Links`

OAuth2 URL scopes needed: `bot`, `applications.commands`

Permission integer: `277025442816`

### 3. Create Neon Database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

### 4. Configure Environment

```bash
# Copy the example environment file
cp env.example .env
```

Edit `.env` with your values:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_client_id
DISCORD_GUILD_ID=your_server_id

# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require

# Timezone (default: Asia/Jakarta / GMT+7)
TIMEZONE=Asia/Jakarta

# 5AM Club Channel (required - /present only works here)
FIVEAM_CHANNEL_ID=your_5am_club_channel_id

# Leaderboard announcements (optional - defaults to FIVEAM_CHANNEL_ID)
LEADERBOARD_CHANNEL_ID=your_channel_id
```

### 5. Install & Run

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run database migrations
npm run migrate

# Deploy slash commands to Discord
npm run deploy-commands

# Start the bot
npm start
```

## Commands

### `/present`
Record your presence for the 5AM Club.

- ⏰ Only works between **5:00 AM - 5:59 AM**
- 📅 Only available **Monday - Friday**
- 📍 Only works in the designated **5AM Club channel**
- ✅ One check-in per day
- 🔥 Shows your current streak when you check in

### `/leaderboard`
View the all-time total leaderboard.

Shows top 10 members ranked by total days present.

### `/stats [user]`
View your statistics or another user's stats.

- 🔥 Current streak (consecutive weekdays)
- 🔢 Total days present
- 📅 First and last check-in dates

## How Streaks Work

- Counts **consecutive weekdays** (Mon-Fri) you've been present
- Weekends are skipped automatically (won't break your streak)
- Miss one weekday = streak resets to 0
- Example: Present Mon, Tue, Wed = 3 day streak

## Automatic Features

### 6 AM Daily Summary
Every weekday at 6:00 AM, the bot automatically posts:
- 📋 Today's early risers (who checked in)
- 🔥 Streak leaderboard (consecutive days)
- 💬 Motivational quote

## Database Schema

```sql
presence_records
├── id (PRIMARY KEY)
├── user_id (VARCHAR)
├── username (VARCHAR)
├── guild_id (VARCHAR)
├── present_at (TIMESTAMP)
├── present_date (DATE)
└── created_at (TIMESTAMP)

UNIQUE(user_id, guild_id, present_date)
```

## Auto Start/Stop with PM2

The bot is configured to:
- **Auto-shutdown** at 6:15 AM (built into the bot)
- **Auto-start** at 4:45 AM (via PM2)

### Setup PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
npm run pm2:start

# Save PM2 process list (survives server reboot)
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### PM2 Commands

```bash
npm run pm2:start    # Start the bot
npm run pm2:stop     # Stop the bot
npm run pm2:restart  # Restart the bot
npm run pm2:logs     # View logs
npm run pm2:status   # Check status
```

### Schedule Summary

| Time | Action |
|------|--------|
| 4:45 AM | Bot starts (PM2 cron) |
| 5:00 - 5:59 AM | `/present` window open |
| 6:00 AM | Streak leaderboard announcement |
| 6:15 AM | Bot shuts down |

> **Note:** PM2 uses system timezone. Make sure your server's timezone matches `TIMEZONE` in `.env`, or set `TZ` environment variable.

## Development

```bash
# Run with auto-reload (TypeScript)
npm run dev

# Type check without building
npx tsc --noEmit
```

## Project Structure

```
src/
├── index.ts           # Main bot entry
├── scheduler.ts       # Cron jobs (6AM announcement, 6:15AM shutdown)
├── deploy-commands.ts # Deploy slash commands
├── commands/
│   ├── present.ts     # /present command
│   ├── leaderboard.ts # /leaderboard command
│   └── stats.ts       # /stats command
├── db/
│   ├── connection.ts  # Neon PostgreSQL connection
│   ├── migrate.ts     # Database migrations
│   └── queries.ts     # Database queries + streak calculation
├── utils/
│   └── time.ts        # Time utilities (5-6AM check, timezone)
└── types/
    └── index.ts       # TypeScript type definitions
```

## Timezone Configuration

The bot uses `TIMEZONE` environment variable for all time calculations. Default is `Asia/Jakarta` (WIB/UTC+7).

Common timezone values:
- `Asia/Jakarta` - WIB (UTC+7)
- `Asia/Singapore` - SGT (UTC+8)
- `America/New_York` - EST/EDT
- `Europe/London` - GMT/BST

## License

MIT
# 5-am-club
