import cron from 'node-cron';
import { Client, EmbedBuilder, TextChannel, ChannelType } from 'discord.js';
import { getTodayPresence, getStreakLeaderboard } from './db/queries.js';
import { getAllConfiguredGuilds } from './db/guildSettings.js';
import { isAnnouncementTime, isWeekday } from './utils/time.js';
import { getMedalEmoji, getStreakEmoji, getRandomMotivation } from './utils/emoji.js';
import type { TodayPresenceEntry, StreakEntry } from './types/index.js';

/**
 * Start the scheduled tasks
 */
export function startScheduler(client: Client): void {
  scheduleLeaderboardCheck(client);
  scheduleAutoShutdown(client);
  
  console.log('✅ Scheduler started successfully');
  console.log('📅 Leaderboard check: Every minute (per-guild timezone)');
  console.log('💤 Auto-shutdown: 6:15 AM system time');
}

/**
 * Check every minute if any guild needs their 6 AM announcement
 * This allows each guild to have their own timezone
 */
function scheduleLeaderboardCheck(client: Client): void {
  // Run every minute to check each guild's timezone
  cron.schedule('* * * * *', async () => {
    await checkAndAnnounceForGuilds(client);
  });
  
  console.log('📅 Scheduled per-guild timezone leaderboard checks');
}

function scheduleAutoShutdown(client: Client): void {
  // Shutdown at 6:15 AM system time (for PM2 setups)
  // This uses system timezone since PM2 restarts at system time
  const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  cron.schedule('15 6 * * 1-5', () => {
    console.log('💤 Scheduled shutdown at 6:15 AM...');
    console.log('🌙 Going to sleep. See you tomorrow at 4:45 AM!');
    
    client.destroy();
    process.exit(0);
  }, { timezone: systemTimezone });
  
  console.log(`💤 Auto-shutdown scheduled for 6:15 AM (${systemTimezone})`);
}

// Track which guilds have been announced today to avoid duplicates
const announcedToday = new Set<string>();

// Reset the set at midnight
cron.schedule('0 0 * * *', () => {
  announcedToday.clear();
  console.log('🔄 Reset daily announcement tracker');
});

async function checkAndAnnounceForGuilds(client: Client): Promise<void> {
  try {
    const configuredGuilds = await getAllConfiguredGuilds();
    
    for (const guildSettings of configuredGuilds) {
      const { guild_id, fiveam_channel_id, timezone } = guildSettings;
      
      // Skip if already announced today
      const todayKey = `${guild_id}-${new Date().toDateString()}`;
      if (announcedToday.has(todayKey)) {
        continue;
      }
      
      // Check if it's 6 AM in this guild's timezone
      if (!isAnnouncementTime(timezone)) {
        continue;
      }
      
      // Check if it's a weekday in this guild's timezone
      if (!isWeekday(timezone)) {
        continue;
      }
      
      // Get the guild from cache
      const guild = client.guilds.cache.get(guild_id);
      if (!guild) {
        continue;
      }
      
      // Get the channel
      if (!fiveam_channel_id) {
        continue;
      }
      
      const channel = guild.channels.cache.get(fiveam_channel_id);
      if (!channel || channel.type !== ChannelType.GuildText) {
        console.warn(`⚠️ Channel not found for guild: ${guild.name}`);
        continue;
      }
      
      // Announce!
      try {
        const todayPresence = await getTodayPresence(guild_id);
        const streakLeaderboard = await getStreakLeaderboard(guild_id);
        const embed = buildDailySummaryEmbed(todayPresence, streakLeaderboard, timezone);
        
        await (channel as TextChannel).send({ embeds: [embed] });
        console.log(`📢 Announced streak leaderboard in ${guild.name} #${channel.name} (${timezone})`);
        
        // Mark as announced
        announcedToday.add(todayKey);
      } catch (error) {
        console.error(`❌ Error announcing to guild ${guild.name}:`, error);
      }
    }
  } catch (error) {
    console.error('❌ Error checking guilds for announcements:', error);
  }
}

function buildDailySummaryEmbed(
  todayPresence: TodayPresenceEntry[], 
  streakLeaderboard: StreakEntry[],
  timezone: string
): EmbedBuilder {
  const today = formatTodayDate(timezone);
  
  const embed = new EmbedBuilder()
    .setTitle('🌅 5AM Club - Daily Summary')
    .setDescription(`**${today}**\n\nThe early bird catches the worm! 🐦`)
    .setColor(0xF1C40F)
    .setTimestamp()
    .setFooter({ text: '5AM Club • Rise & Grind' });
  
  addTodayAttendees(embed, todayPresence);
  addStreakLeaderboard(embed, streakLeaderboard);
  addMotivationalQuote(embed);
  
  return embed;
}

function formatTodayDate(timezone: string): string {
  return new Date().toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function addTodayAttendees(embed: EmbedBuilder, todayPresence: TodayPresenceEntry[]): void {
  if (todayPresence.length === 0) {
    embed.addFields({
      name: '📋 Today\'s Early Risers',
      value: '*No one showed up today!* 😴\n\nWhere were you, champs?',
      inline: false
    });
    return;
  }

  const attendeeList = todayPresence.map((entry, index) => {
    const time = formatTime(entry.present_at);
    return `${index + 1}. <@${entry.user_id}> at ${time}`;
  }).join('\n');
  
  embed.addFields({
    name: `📋 Today's Early Risers (${todayPresence.length})`,
    value: attendeeList,
    inline: false
  });
}

function addStreakLeaderboard(embed: EmbedBuilder, streakLeaderboard: StreakEntry[]): void {
  if (streakLeaderboard.length === 0) {
    embed.addFields({
      name: '🔥 Streak Leaderboard',
      value: '*No active streaks yet!*\n\nStart your streak with `/present` tomorrow!',
      inline: false
    });
    return;
  }

  const leaderboardList = streakLeaderboard.slice(0, 5).map((entry, index) => {
    const medal = getMedalEmoji(index);
    const streakEmoji = getStreakEmoji(entry.current_streak);
    return `${medal} <@${entry.user_id}> — **${entry.current_streak}** day streak ${streakEmoji}`;
  }).join('\n');
  
  embed.addFields({
    name: '🔥 Streak Leaderboard (Consecutive Days)',
    value: leaderboardList,
    inline: false
  });
}

function addMotivationalQuote(embed: EmbedBuilder): void {
  embed.addFields({
    name: '\u200B',
    value: getRandomMotivation(),
    inline: false
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
