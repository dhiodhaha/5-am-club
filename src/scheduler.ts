import cron from 'node-cron';
import { Client, EmbedBuilder } from 'discord.js';
import { getTodayPresence, getStreakLeaderboard } from './db/queries.js';
import { getLeaderboardCron, isWeekday } from './utils/time.js';
import { findAnnouncementChannel } from './utils/channel.js';
import { getMedalEmoji, getStreakEmoji, getRandomMotivation } from './utils/emoji.js';
import type { TodayPresenceEntry, StreakEntry } from './types/index.js';

const TIMEZONE = process.env.TIMEZONE || 'Asia/Jakarta';

/**
 * Start the scheduled tasks
 */
export function startScheduler(client: Client): void {
  scheduleLeaderboardAnnouncement(client);
  scheduleAutoShutdown(client);
  
  console.log('✅ Scheduler started successfully');
  console.log('💤 Auto-shutdown scheduled for 6:15 AM (Mon-Fri)');
}

function scheduleLeaderboardAnnouncement(client: Client): void {
  const cronExpression = getLeaderboardCron();
  console.log(`📅 Scheduling streak leaderboard announcements with cron: ${cronExpression}`);
  
  cron.schedule(cronExpression, async () => {
    console.log('⏰ Running scheduled streak leaderboard announcement...');
    
    if (!isWeekday()) {
      console.log('📅 Not a weekday, skipping announcement');
      return;
    }
    
    await announceToAllGuilds(client);
  }, { timezone: TIMEZONE });
}

function scheduleAutoShutdown(client: Client): void {
  cron.schedule('15 6 * * 1-5', () => {
    console.log('💤 Scheduled shutdown at 6:15 AM...');
    console.log('🌙 Going to sleep. See you tomorrow at 4:45 AM!');
    
    client.destroy();
    process.exit(0);
  }, { timezone: TIMEZONE });
}

async function announceToAllGuilds(client: Client): Promise<void> {
  const preferredChannelId = process.env.LEADERBOARD_CHANNEL_ID || process.env.FIVEAM_CHANNEL_ID;
  
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const todayPresence = await getTodayPresence(guildId);
      const streakLeaderboard = await getStreakLeaderboard(guildId);
      const embed = buildDailySummaryEmbed(todayPresence, streakLeaderboard);
      
      const channel = findAnnouncementChannel(guild, preferredChannelId);
      
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

function buildDailySummaryEmbed(
  todayPresence: TodayPresenceEntry[], 
  streakLeaderboard: StreakEntry[]
): EmbedBuilder {
  const today = formatTodayDate();
  
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

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-US', {
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
