# 🌅 5AM Club Discord Bot

A Discord bot for tracking early morning presence. Members can check in between 3:00 AM - 6:00 AM on weekdays to build their consecutive day streak!

## Features

- **Admin Setup** - Admins configure channel + timezone per server (nothing in .env!)
- **Message Presence** - Any message in the 5AM channel counts as presence!
- **`/present`** - Manual presence command (also works)
- **`/leaderboard`** - View all-time total leaderboard
- **`/stats`** - View your streak and personal statistics
- **`/setup`** - Admin command to configure the bot
- **`/setup test`** - Test mode to verify setup anytime!
- **Streak Tracking** - Counts consecutive weekdays you've been present
- **Auto Announcements** - Daily streak leaderboard in configured channel at 6 AM
- **50 Motivational Quotes** - Random feedback when you check in

## Quick Start for Admins

After inviting the bot, an administrator needs to configure it:

```
/setup channel #5am-club
/setup timezone Asia/Jakarta
```

That's it! The bot will now:
- Track presence in that channel (3:00-5:59 AM, Mon-Fri)
- Post streak leaderboard there at 6:00 AM
- Use your server's timezone

## Testing the Bot (Preview Mode)

Want to test without waiting until 3 AM? Admins can use:

```
/setup test Presence         → Preview what presence looks like
/setup test Leaderboard      → Preview the 6 AM announcement
```

✅ **Safe:** Preview mode doesn't record any data — test as many times as you want!

## How Presence Works

| Action | Result |
|--------|--------|
| Send any message in 5AM channel | ✅ Counted as present (bot reacts with ✅) |
| Use `/present` command | ✅ Counted as present (bot reacts with ✅) |
| Send 2nd message (already present) | ❌ Not double counted (silent) |
| Use `/present` after message | ❌ Not double counted (shows current streak) |
| Message after `/present` | ❌ Not double counted (silent) |

**Key:** Only ONE presence per day, whether by message or command!

## Two Leaderboards

| Leaderboard | When | What it shows |
|-------------|------|---------------|
| 🔥 **Streak** | Auto at 6 AM (Mon-Fri) | Consecutive day streaks |
| 👑 **Total** | `/leaderboard` command | All-time total days present |

## Commands

### `/setup` (Admin only)
Configure the 5AM Club bot for your server.

| Subcommand | Description |
|------------|-------------|
| `/setup channel #channel` | Set the 5AM Club channel |
| `/setup timezone America/New_York` | Set server timezone |
| `/setup test Presence` | Preview presence message (no data saved) |
| `/setup test Leaderboard` | Preview 6 AM announcement |
| `/setup status` | View current configuration |
| `/setup remove` | Remove configuration (disable bot) |

### `/present`
Record your presence for the 5AM Club.

- ⏰ Only works between **3:00 AM - 5:59 AM**
- 📅 Only available **Monday - Friday**
- 📍 Only works in the configured **5AM Club channel**
- ✅ One check-in per day
- ✅ Bot reacts with ✅ emoji to confirm

### `/leaderboard`
View the all-time total leaderboard (top 10).

### `/stats [user]`
View your statistics or another user's stats.

## Multi-Server Support ✅

This bot works on **ALL servers** that invite it! Each server is independent:

| Feature | Per Server? |
|---------|-------------|
| 5AM Channel | ✅ Each server sets their own |
| Timezone | ✅ Each server sets their own |
| Presence Records | ✅ Separate per server |
| Leaderboards | ✅ Separate per server |
| Streak Tracking | ✅ Separate per server |

Just invite the bot → Admin runs `/setup channel #5am-club` → Done!

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
cp env.example .env
```

Edit `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_application_client_id
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

> **That's it!** Channel and timezone are configured per-server via `/setup` command.
>
> Each server's admin will run `/setup channel #5am-club` after inviting the bot.

#### Development Mode (Optional)

For faster testing during development, add your test server:

```env
DISCORD_GUILD_ID=your_test_server_id  # Optional: instant command updates
```

| Mode | GUILD_ID | Command Deploy | Use Case |
|------|----------|----------------|----------|
| **Production** | Not set | Global (all servers) | Multi-server bot |
| Development | Set | Single server only | Testing |

### 5. Install & Run

```bash
npm install
npm run build
npm run migrate
npm run deploy-commands   # Deploys commands globally (takes ~1 hour to appear everywhere)
npm start
```

> ⏳ **Global commands** take up to 1 hour to appear in all servers.
> For instant testing, set `DISCORD_GUILD_ID` temporarily.

### 6. Configure in Discord

Have an admin run:
```
/setup channel #your-5am-channel
/setup timezone Asia/Jakarta
```

**Preview to verify it works:**
```
/setup test Presence      ← See what presence looks like
/setup test Leaderboard   ← See what 6 AM announcement looks like
```

## Database Schema

```sql
-- Presence records
presence_records
├── id (PRIMARY KEY)
├── user_id (VARCHAR)
├── username (VARCHAR)
├── guild_id (VARCHAR)
├── present_at (TIMESTAMP)
├── present_date (DATE)
└── created_at (TIMESTAMP)
UNIQUE(user_id, guild_id, present_date)

-- Guild settings (per-server configuration)
guild_settings
├── id (PRIMARY KEY)
├── guild_id (VARCHAR, UNIQUE)
├── fiveam_channel_id (VARCHAR)
├── timezone (VARCHAR, default: Asia/Jakarta)
├── setup_by_user_id (VARCHAR)
├── setup_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## Auto Start/Stop with PM2

The bot is configured to:
- **Auto-shutdown** at 6:05 AM (built into the bot)
- **Auto-start** at 2:55 AM (via PM2)

### Setup PM2

```bash
npm install -g pm2
npm run pm2:start
pm2 save
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
| 2:55 AM | Bot starts (PM2 cron) |
| 3:00 - 5:59 AM | Presence window open |
| 6:00 AM | Streak leaderboard in configured channel |
| 6:05 AM | Bot shuts down |

## Project Structure

```
src/
├── index.ts              # Main bot entry
├── scheduler.ts          # Cron jobs
├── deploy-commands.ts    # Deploy slash commands
├── commands/
│   ├── present.ts        # /present command
│   ├── leaderboard.ts    # /leaderboard command
│   ├── stats.ts          # /stats command
│   └── setup.ts          # /setup command (admin + test)
├── handlers/
│   └── messagePresence.ts # Message-based presence
├── db/
│   ├── connection.ts     # Database connection
│   ├── migrate.ts        # Migrations
│   ├── queries.ts        # Presence queries
│   └── guildSettings.ts  # Guild settings queries
├── utils/
│   ├── time.ts           # Time utilities
│   ├── emoji.ts          # Emoji formatting
│   ├── quotes.ts         # 50 motivational quotes
│   └── embedBuilders.ts  # Shared embed builders (SRP)
└── types/
    └── index.ts          # TypeScript types
```

## Per-Server Timezone

Each server can have its own timezone! Configure with:

```
/setup timezone Asia/Jakarta
```

Available timezones (use autocomplete for full list):
- `Asia/Jakarta` - WIB (UTC+7)
- `Asia/Makassar` - WITA (UTC+8)
- `Asia/Jayapura` - WIT (UTC+9)
- `Asia/Singapore` - SGT (UTC+8)
- `Asia/Tokyo` - JST (UTC+9)
- `America/New_York` - EST/EDT
- `Europe/London` - GMT/BST
- `America/Los_Angeles` - PST/PDT

## License

MIT

