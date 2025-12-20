import { Message } from 'discord.js';
import { recordPresence, hasRecordedToday, getUserStreak } from '../db/queries.js';
import { isFiveAmChannel, getGuildTimezone } from '../db/guildSettings.js';
import { isPresenceTime } from '../utils/time.js';
import { getRandomPresenceQuote } from '../utils/quotes.js';
import { getStreakEmoji, pluralizeDays } from '../utils/emoji.js';

/**
 * Handle message-based presence recording
 * Any message in the 5AM channel during 5:00-5:59 AM counts as presence
 */
export async function handleMessagePresence(message: Message): Promise<void> {
  // Ignore bot messages
  if (message.author.bot) {
    return;
  }

  const { guildId, channelId, author } = message;

  if (!guildId) {
    return;
  }

  // Check if message is in the configured 5AM channel (from database)
  const isConfiguredChannel = await isFiveAmChannel(guildId, channelId);
  if (!isConfiguredChannel) {
    return;
  }

  // Get guild's timezone and check if it's the right time
  const timezone = await getGuildTimezone(guildId);
  const timeCheck = isPresenceTime(timezone);
  if (!timeCheck.isValid) {
    return; // Silently ignore messages outside presence window
  }

  // Check if already recorded today (via message or /present)
  const alreadyPresent = await hasRecordedToday(author.id, guildId);
  if (alreadyPresent) {
    return; // Silently ignore if already present
  }

  // Record the presence
  try {
    await recordPresence(author.id, author.username, guildId);
    const currentStreak = await getUserStreak(author.id, guildId);
    
    // Reply with motivational feedback
    await sendPresenceFeedback(message, currentStreak);
  } catch (error) {
    console.error('Error recording message presence:', error);
  }
}

async function sendPresenceFeedback(message: Message, streak: number): Promise<void> {
  const quote = getRandomPresenceQuote();
  const streakEmoji = getStreakEmoji(streak);
  const dayWord = pluralizeDays(streak);
  
  const feedbackMessage = buildFeedbackMessage(
    message.author.username,
    message.author.id,
    streak,
    dayWord,
    streakEmoji,
    quote
  );

  await message.reply({
    content: feedbackMessage,
    allowedMentions: { repliedUser: false }
  });
}

function buildFeedbackMessage(
  username: string,
  userId: string,
  streak: number,
  dayWord: string,
  streakEmoji: string,
  quote: string
): string {
  return (
    `✅ **${username}** is present! <@${userId}>\n\n` +
    `${quote}\n\n` +
    `🔥 Current streak: **${streak}** ${dayWord} ${streakEmoji}`
  );
}
