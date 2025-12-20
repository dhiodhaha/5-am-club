import { EmbedBuilder } from 'discord.js';
import { getMedalEmoji, getStreakEmoji, getRandomMotivation } from './emoji.js';
import type { TodayPresenceEntry, StreakEntry } from '../types/index.js';

/**
 * Build the daily summary embed (used for 6 AM announcement and test preview)
 */
export function buildDailySummaryEmbed(
  todayPresence: TodayPresenceEntry[],
  streakLeaderboard: StreakEntry[],
  timezone: string,
  isTestMode: boolean = false
): EmbedBuilder {
  const today = formatTodayDate(timezone);
  const title = isTestMode ? '🧪 TEST - 5AM Club Daily Summary' : '🌅 5AM Club - Daily Summary';
  const footer = isTestMode ? '5AM Club • Rise & Grind • TEST MODE' : '5AM Club • Rise & Grind';
  
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0xF1C40F)
    .setTimestamp()
    .setFooter({ text: footer });

  setDescription(embed, today, isTestMode);
  addTodayAttendeesField(embed, todayPresence);
  addStreakLeaderboardField(embed, streakLeaderboard);
  addMotivationalQuoteField(embed);

  return embed;
}

function setDescription(embed: EmbedBuilder, today: string, isTestMode: boolean): void {
  const testNote = isTestMode ? '\n\n*This is how the 6 AM announcement looks!*' : '';
  embed.setDescription(`**${today}**\n\nThe early bird catches the worm! 🐦${testNote}`);
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

function addTodayAttendeesField(embed: EmbedBuilder, todayPresence: TodayPresenceEntry[]): void {
  if (todayPresence.length === 0) {
    embed.addFields({
      name: '📋 Today\'s Early Risers',
      value: '*No one showed up today!* 😴\n\nWhere were you, champs?',
      inline: false
    });
    return;
  }

  const attendeeList = formatAttendeeList(todayPresence);
  embed.addFields({
    name: `📋 Today's Early Risers (${todayPresence.length})`,
    value: attendeeList,
    inline: false
  });
}

function formatAttendeeList(todayPresence: TodayPresenceEntry[]): string {
  return todayPresence
    .map((entry, index) => {
      const time = formatTime(entry.present_at);
      return `${index + 1}. <@${entry.user_id}> at ${time}`;
    })
    .join('\n');
}

function addStreakLeaderboardField(embed: EmbedBuilder, streakLeaderboard: StreakEntry[]): void {
  if (streakLeaderboard.length === 0) {
    embed.addFields({
      name: '🔥 Streak Leaderboard',
      value: '*No active streaks yet!*\n\nStart your streak with `/present` tomorrow!',
      inline: false
    });
    return;
  }

  const leaderboardList = formatStreakLeaderboard(streakLeaderboard);
  embed.addFields({
    name: '🔥 Streak Leaderboard (Consecutive Days)',
    value: leaderboardList,
    inline: false
  });
}

function formatStreakLeaderboard(streakLeaderboard: StreakEntry[]): string {
  return streakLeaderboard
    .slice(0, 5)
    .map((entry, index) => {
      const medal = getMedalEmoji(index);
      const streakEmoji = getStreakEmoji(entry.current_streak);
      return `${medal} <@${entry.user_id}> — **${entry.current_streak}** day streak ${streakEmoji}`;
    })
    .join('\n');
}

function addMotivationalQuoteField(embed: EmbedBuilder): void {
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

