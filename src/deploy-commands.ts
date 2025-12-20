import { REST, Routes, RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';
import 'dotenv/config';

import * as present from './commands/present.js';
import * as leaderboard from './commands/leaderboard.js';
import * as stats from './commands/stats.js';

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  present.data.toJSON(),
  leaderboard.data.toJSON(),
  stats.data.toJSON(),
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

    // Deploy to specific guild (faster for development)
    if (guildId) {
      const data = await rest.put(
        Routes.applicationGuildCommands(clientId as string, guildId),
        { body: commands },
      ) as unknown[];
      console.log(`✅ Successfully reloaded ${data.length} guild commands.`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      const data = await rest.put(
        Routes.applicationCommands(clientId as string),
        { body: commands },
      ) as unknown[];
      console.log(`✅ Successfully reloaded ${data.length} global commands.`);
    }
    
    console.log('🎉 Commands deployed successfully!');
    console.log('\nAvailable commands:');
    commands.forEach(cmd => {
      console.log(`  /${cmd.name} - ${cmd.description}`);
    });
    
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();

