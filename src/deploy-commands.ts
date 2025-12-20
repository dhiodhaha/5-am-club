import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import 'dotenv/config';

import * as present from './commands/present.js';
import * as leaderboard from './commands/leaderboard.js';
import * as stats from './commands/stats.js';
import * as setup from './commands/setup.js';

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  present.data.toJSON(),
  leaderboard.data.toJSON(),
  stats.data.toJSON(),
  setup.data.toJSON(),
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN and DISCORD_CLIENT_ID must be set!');
  process.exit(1);
}

const rest = new REST().setToken(token);

async function deployCommands(): Promise<void> {
  try {
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      await deployToGuild();
    } else {
      await deployGlobally();
    }
    
    logDeployedCommands();
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

async function deployToGuild(): Promise<void> {
  const data = await rest.put(
    Routes.applicationGuildCommands(clientId as string, guildId as string),
    { body: commands },
  ) as unknown[];
  
  console.log(`✅ Successfully deployed ${data.length} commands to guild: ${guildId}`);
  console.log('');
  console.log('⚡ DEV MODE: Commands available instantly in this server only.');
  console.log('💡 For production (all servers), remove DISCORD_GUILD_ID from .env');
}

async function deployGlobally(): Promise<void> {
  const data = await rest.put(
    Routes.applicationCommands(clientId as string),
    { body: commands },
  ) as unknown[];
  
  console.log(`✅ Successfully deployed ${data.length} commands GLOBALLY.`);
  console.log('');
  console.log('🌐 PRODUCTION MODE: Commands will work on ALL servers that invite the bot!');
  console.log('⏳ Note: Global commands take up to 1 hour to appear everywhere.');
}

function logDeployedCommands(): void {
  console.log('');
  console.log('🎉 Commands deployed successfully!');
  console.log('');
  console.log('Available commands:');
  commands.forEach(cmd => {
    console.log(`  /${cmd.name} - ${cmd.description}`);
  });
}

deployCommands();
