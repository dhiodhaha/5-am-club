import { Message } from 'discord.js';
import { recordPresence, hasRecordedToday } from '../db/queries.js';
import { isFiveAmChannel, getGuildTimezone } from '../db/guildSettings.js';
import { isPresenceTime } from '../utils/time.js';
import { PRESENCE_EMOJI } from '../constants.js';

/**
 * Handle message-based presence recording
 * Any message in the 5AM channel during 3:00-5:59 AM counts as presence
 * Bot reacts with ✅ instead of replying
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

  // Record the presence and react
  try {
    await recordPresence(author.id, author.username, guildId);
    await message.react(PRESENCE_EMOJI);
  } catch (error) {
    console.error('Error recording message presence:', error);
  }
}
