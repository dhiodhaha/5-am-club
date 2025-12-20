import { Client, Collection, Events, GatewayIntentBits, ChatInputCommandInteraction } from 'discord.js';
import 'dotenv/config';

import * as present from './commands/present.js';
import * as leaderboard from './commands/leaderboard.js';
import * as stats from './commands/stats.js';
import { startScheduler } from './scheduler.js';
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

// Ready event
client.once(Events.ClientReady, (readyClient) => {
  console.log('━'.repeat(50));
  console.log(`🌅 5AM Club Bot is online!`);
  console.log(`📛 Logged in as: ${readyClient.user.tag}`);
  console.log(`🏠 Serving ${readyClient.guilds.cache.size} guild(s)`);
  console.log(`⏰ Timezone: ${process.env.TIMEZONE || 'Asia/Jakarta'}`);
  console.log('━'.repeat(50));
  
  // Start the scheduler for daily leaderboard announcements
  startScheduler(client);
  
  // Set bot status
  readyClient.user.setPresence({
    activities: [{
      name: 'for /present at 5AM',
      type: 3 // Watching
    }],
    status: 'online'
  });
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  const command = client.commands.get(interaction.commandName);
  
  if (!command) {
    console.error(`❌ Unknown command: ${interaction.commandName}`);
    return;
  }
  
  try {
    await command.execute(interaction as ChatInputCommandInteraction);
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    
    const errorMessage = {
      content: '❌ There was an error executing this command!',
      ephemeral: true
    };
    
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN is not set in environment variables!');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

