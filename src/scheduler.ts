import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { getTodayPresence, getStreakLeaderboard } from './db/queries.js';
import { getLeaderboardCron, isWeekday } from './utils/time.js';
import type { TodayPresenceEntry, StreakEntry } from './types/index.js';

const TIMEZONE = process.env.TIMEZONE || 'Asia/Jakarta';

/**
 * Start the scheduled leaderboard announcements
 */
export function startScheduler(client: Client): void {
  const cronExpression = getLeaderboardCron();
  
  console.log(`📅 Scheduling streak leaderboard announcements with cron: ${cronExpression}`);
  
  // Schedule for 6 AM every weekday - shows STREAK leaderboard
  cron.schedule(cronExpression, async () => {
    console.log('⏰ Running scheduled streak leaderboard announcement...');
    
    if (!isWeekday()) {
      console.log('📅 Not a weekday, skipping announcement');
      return;
    }
    
    await announceStreakLeaderboard(client);
  }, {
    timezone: TIMEZONE
  });
  
  // Schedule auto-shutdown at 6:15 AM every weekday
  // Bot will be restarted by PM2 at 4:45 AM
  cron.schedule('15 6 * * 1-5', () => {
    console.log('💤 Scheduled shutdown at 6:15 AM...');
    console.log('🌙 Going to sleep. See you tomorrow at 4:45 AM!');
    
    // Graceful shutdown
    client.destroy();
    
    // Exit with code 0 (clean exit - PM2 won't restart immediately)
    process.exit(0);
  }, {
    timezone: TIMEZONE
  });
  
  console.log('✅ Scheduler started successfully');
  console.log('💤 Auto-shutdown scheduled for 6:15 AM (Mon-Fri)');
}

/**
 * Announce the streak leaderboard to all guilds
 */
async function announceStreakLeaderboard(client: Client): Promise<void> {
  // Use LEADERBOARD_CHANNEL_ID if set, otherwise fall back to FIVEAM_CHANNEL_ID
  const channelId = process.env.LEADERBOARD_CHANNEL_ID || process.env.FIVEAM_CHANNEL_ID;
  
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      // Get today's presence records and streak leaderboard
      const todayPresence = await getTodayPresence(guildId);
      const streakLeaderboard = await getStreakLeaderboard(guildId);
      
      // Build the announcement embed
      const embed = buildStreakAnnouncementEmbed(todayPresence, streakLeaderboard);
      
      // Find the channel to post in
      let channel: TextChannel | undefined;
      
      if (channelId) {
        const foundChannel = guild.channels.cache.get(channelId);
        if (foundChannel?.type === ChannelType.GuildText) {
          channel = foundChannel as TextChannel;
        }
      }
      
      // If no specific channel set, try to find a general channel
      if (!channel) {
        channel = guild.channels.cache.find(
          (ch): ch is TextChannel => 
            ch.type === ChannelType.GuildText &&
            (ch.name.includes('general') || 
             ch.name.includes('5am') || 
             ch.name.includes('morning'))
        );
      }
      
      // Fallback to first text channel the bot can send in
      if (!channel && guild.members.me) {
        channel = guild.channels.cache.find(
          (ch): ch is TextChannel => 
            ch.type === ChannelType.GuildText && 
            ch.permissionsFor(guild.members.me!)?.has('SendMessages') === true
        );
      }
      
      if (channel) {
        await channel.send({ embeds: [embed] });
        console.log(`📢 Announced streak leaderboard in ${guild.name} #${channel.name}`);
      } else {
        console.warn(`⚠️ Could not find a channel to post in for guild: ${guild.name}`);
      }
      
    } catch (error) {
      console.error(`❌ Error announcing to guild ${guild.name}:`, error);
    }
  }
}

/**
 * Build the streak announcement embed
 */
function buildStreakAnnouncementEmbed(
  todayPresence: TodayPresenceEntry[], 
  streakLeaderboard: StreakEntry[]
): EmbedBuilder {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const embed = new EmbedBuilder()
    .setTitle('🌅 5AM Club - Daily Summary')
    .setDescription(`**${today}**\n\nThe early bird catches the worm! 🐦`)
    .setColor(0xF1C40F)
    .setTimestamp()
    .setFooter({ text: '5AM Club • Rise & Grind' });
  
  // Today's attendees
  if (todayPresence.length === 0) {
    embed.addFields({
      name: '📋 Today\'s Early Risers',
      value: '*No one showed up today!* 😴\n\nWhere were you, champs?',
      inline: false
    });
  } else {
    const attendeeList = todayPresence.map((entry, index) => {
      const time = new Date(entry.present_at).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      return `${index + 1}. <@${entry.user_id}> at ${time}`;
    }).join('\n');
    
    embed.addFields({
      name: `📋 Today's Early Risers (${todayPresence.length})`,
      value: attendeeList,
      inline: false
    });
  }
  
  // Streak leaderboard (consecutive days)
  if (streakLeaderboard.length > 0) {
    const medals = ['🥇', '🥈', '🥉'];
    const leaderboardList = streakLeaderboard.slice(0, 5).map((entry, index) => {
      const medal = medals[index] || `${index + 1}.`;
      const fireEmoji = '🔥'.repeat(Math.min(Math.ceil(entry.current_streak / 5), 5));
      return `${medal} <@${entry.user_id}> — **${entry.current_streak}** day streak ${fireEmoji}`;
    }).join('\n');
    
    embed.addFields({
      name: '🔥 Streak Leaderboard (Consecutive Days)',
      value: leaderboardList,
      inline: false
    });
  } else {
    embed.addFields({
      name: '🔥 Streak Leaderboard',
      value: '*No active streaks yet!*\n\nStart your streak with `/present` tomorrow!',
      inline: false
    });
  }
  
  // Motivational message
  const motivations = [
    '💪 *"The early morning has gold in its mouth."* - Benjamin Franklin',
    '🔥 *"Wake up determined, go to bed satisfied."*',
    '⭐ *"Your future is created by what you do today, not tomorrow."*',
    '🚀 *"The secret of getting ahead is getting started."* - Mark Twain',
    '🌟 *"It is well to be up before daybreak, for such habits contribute to health, wealth, and wisdom."* - Aristotle'
  ];
  
  const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
  embed.addFields({
    name: '\u200B',
    value: randomMotivation,
    inline: false
  });
  
  return embed;
}
