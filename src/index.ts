import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  ActivityType
} from 'discord.js';
import 'dotenv/config';

// Log process start immediately (helps track unexpected restarts)
const processStartTime = new Date();
const tz = process.env.TZ || 'Asia/Jakarta';
console.log('━'.repeat(50));
console.log('🚀 PROCESS STARTED');
console.log(`🕐 ${processStartTime.toLocaleString('en-US', {
  timeZone: tz,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
})} (${tz})`);
console.log(`📋 PID: ${process.pid}`);
console.log('━'.repeat(50));

import * as present from './commands/present.js';
import * as leaderboard from './commands/leaderboard.js';
import * as stats from './commands/stats.js';
import * as setup from './commands/setup.js';
import { startScheduler } from './scheduler.js';
import { handleMessagePresence } from './handlers/messagePresence.js';
import { getCommonTimezones, getTimezoneDisplay } from './utils/time.js';
import type { Command } from './types/index.js';

// Extend Client type to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Load commands into collection
client.commands = new Collection<string, Command>();
client.commands.set(present.data.name, present);
client.commands.set(leaderboard.data.name, leaderboard);
client.commands.set(stats.data.name, stats);
client.commands.set(setup.data.name, setup);

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  logStartupMessage(readyClient);
  startScheduler(client);
  setPresenceStatus(readyClient);
});

function logStartupMessage(readyClient: Client<true>): void {
  const guildCount = readyClient.guilds.cache.size;
  const guildText = pluralizeServers(guildCount);
  const now = new Date();
  const timezone = process.env.TZ || 'Asia/Jakarta';

  // Format timestamp in configured timezone
  const timestamp = now.toLocaleString('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  console.log('━'.repeat(50));
  console.log('🌅 5AM Club Bot is online!');
  console.log(`🕐 Started at: ${timestamp} (${timezone})`);
  console.log(`📛 Logged in as: ${readyClient.user.tag}`);
  console.log(`🌐 Serving ${guildCount} ${guildText}`);
  console.log('📨 Message presence detection: ENABLED');
  console.log('⚙️ Each server configures via /setup');
  console.log('━'.repeat(50));
}

function pluralizeServers(count: number): string {
  if (count === 1) {
    return 'server';
  }
  return 'servers';
}

function setPresenceStatus(readyClient: Client<true>): void {
  readyClient.user.setPresence({
    activities: [{
      name: 'for /present at 3AM',
      type: ActivityType.Watching
    }],
    status: 'online'
  });
}

// Message handler for presence detection
client.on(Events.MessageCreate, async (message) => {
  await handleMessagePresence(message);
});

// Interaction handler for slash commands and autocomplete
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
    return;
  }

  if (interaction.isChatInputCommand()) {
    await handleSlashCommand(interaction);
  }
});

async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`❌ Unknown command: ${interaction.commandName}`);
    return;
  }
  
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    await handleCommandError(interaction);
  }
}

async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  try {
    if (interaction.commandName !== 'setup') {
      return;
    }
    
    const focusedOption = interaction.options.getFocused(true);
    
    if (focusedOption.name !== 'timezone') {
      return;
    }

    const searchValue = focusedOption.value.toLowerCase();
    const timezones = getCommonTimezones();
    const filtered = filterTimezones(timezones, searchValue);
    
    await interaction.respond(filtered);
  } catch (error) {
    console.error('❌ Error handling autocomplete:', error);
  }
}

function filterTimezones(
  timezones: string[], 
  searchValue: string
): Array<{ name: string; value: string }> {
  return timezones
    .filter(tz => tz.toLowerCase().includes(searchValue))
    .slice(0, 25)
    .map(tz => ({
      name: getTimezoneDisplay(tz),
      value: tz
    }));
}

async function handleCommandError(interaction: ChatInputCommandInteraction): Promise<void> {
  const errorMessage = {
    content: '❌ There was an error executing this command!',
    ephemeral: true
  };
  
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(errorMessage);
    return;
  }
  
  await interaction.reply(errorMessage);
}

// Error handling
client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Validate and login
validateEnvironment();
client.login(process.env.DISCORD_TOKEN);

function validateEnvironment(): void {
  if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables!');
    process.exit(1);
  }
}
