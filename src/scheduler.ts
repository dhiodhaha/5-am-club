import cron from 'node-cron';
import { Client, TextChannel, ChannelType } from 'discord.js';
import { getTodayPresence, getStreakLeaderboard } from './db/queries.js';
import { getAllConfiguredGuilds } from './db/guildSettings.js';
import { isTodayHoliday } from './db/holidays.js';
import { isAnnouncementTime, isWeekday } from './utils/time.js';
import { buildDailySummaryEmbed } from './utils/embedBuilders.js';

/**
 * Start the scheduled tasks
 */
export function startScheduler(client: Client): void {
  scheduleLeaderboardCheck(client);
  scheduleAutoShutdown(client);
  
  console.log('✅ Scheduler started successfully');
  console.log('📅 Leaderboard check: Every minute (per-guild timezone)');
  console.log('💤 Auto-shutdown: 6:05 AM system time');
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
  // Shutdown at 6:05 AM system time (for PM2 setups)
  // This uses system timezone since PM2 restarts at system time
  const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  cron.schedule('5 6 * * 1-5', () => {
    console.log('💤 Scheduled shutdown at 6:05 AM...');
    console.log('🌙 Going to sleep. See you tomorrow at 2:55 AM!');
    
    client.destroy();
    process.exit(0);
  }, { timezone: systemTimezone });
  
  console.log(`💤 Auto-shutdown scheduled for 6:05 AM (${systemTimezone})`);
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
      
      // Check if today is a holiday
      const holidayCheck = await isTodayHoliday(guild_id);
      if (holidayCheck.isHoliday) {
        console.log(`🏖️ Skipping announcement for guild ${guild_id}: ${holidayCheck.holidayName}`);
        announcedToday.add(todayKey); // Mark as "announced" so we don't check again
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
        const embed = buildDailySummaryEmbed(todayPresence, streakLeaderboard, timezone, false);
        
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

