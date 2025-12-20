import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { recordPresence, hasRecordedToday, getUserStreak } from '../db/queries.js';
import { getFiveAmChannelId, getGuildTimezone } from '../db/guildSettings.js';
import { isPresenceTime } from '../utils/time.js';
import { getStreakEmoji, pluralizeDays } from '../utils/emoji.js';
import { getRandomPresenceQuote } from '../utils/quotes.js';

export const data = new SlashCommandBuilder()
  .setName('present')
  .setDescription('Record your presence for the 5AM Club!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const { user, guildId, channelId } = interaction;

  if (!guildId) {
    await replyError(interaction, '❌ This command can only be used in a server!');
    return;
  }

  // Check if 5AM channel is configured for this guild
  const fiveAmChannelId = await getFiveAmChannelId(guildId);
  
  if (!fiveAmChannelId) {
    await replyError(
      interaction,
      '❌ **5AM Club not configured!**\n\n' +
      'An administrator needs to set up the 5AM channel first.\n' +
      'Use `/setup channel #channel-name` to configure.'
    );
    return;
  }

  if (channelId !== fiveAmChannelId) {
    await replyError(
      interaction,
      `❌ **Wrong channel!**\n\nYou can only use \`/present\` in <#${fiveAmChannelId}>`
    );
    return;
  }

  // Get guild's timezone and check if it's the right time
  const timezone = await getGuildTimezone(guildId);
  const timeCheck = isPresenceTime(timezone);
  
  if (!timeCheck.isValid) {
    await replyError(interaction, buildTimeErrorMessage(timeCheck.reason, timeCheck.hint));
    return;
  }

  // Check if already recorded today (via message or /present)
  const alreadyPresent = await hasRecordedToday(user.id, guildId);
  if (alreadyPresent) {
    const currentStreak = await getUserStreak(user.id, guildId);
    await replyAlreadyPresent(interaction, currentStreak);
    return;
  }

  try {
    await recordPresence(user.id, user.username, guildId);
    const currentStreak = await getUserStreak(user.id, guildId);
    
    await interaction.reply({
      content: buildSuccessMessage(user.username, user.id, currentStreak),
      allowedMentions: { users: [user.id] },
    });
  } catch (error) {
    console.error('Error recording presence:', error);
    await replyError(
      interaction,
      '❌ Something went wrong while recording your presence. Please try again!'
    );
  }
}

async function replyError(interaction: ChatInputCommandInteraction, message: string): Promise<void> {
  await interaction.reply({
    content: message,
    ephemeral: true,
  });
}

async function replyAlreadyPresent(
  interaction: ChatInputCommandInteraction,
  streak: number
): Promise<void> {
  const quote = getRandomPresenceQuote();
  const streakEmoji = getStreakEmoji(streak);
  const dayWord = pluralizeDays(streak);

  await interaction.reply({
    content: (
      `✅ **You're already present today!**\n\n` +
      `${quote}\n\n` +
      `🔥 Current streak: **${streak}** ${dayWord} ${streakEmoji}\n\n` +
      `*Keep up the great work! See you tomorrow at 5AM!* 💪`
    ),
    ephemeral: true,
  });
}

function buildTimeErrorMessage(reason: string | undefined, hint: string | undefined): string {
  const hintText = hint || '';
  return `⏰ **Not the right time!**\n\n${reason}\n\n${hintText}`;
}

function buildSuccessMessage(username: string, userId: string, streak: number): string {
  const quote = getRandomPresenceQuote();
  const streakEmoji = getStreakEmoji(streak);
  const dayWord = pluralizeDays(streak);
  
  return (
    `🌅 **${username}** present today @5AM Club! <@${userId}>\n\n` +
    `${quote}\n\n` +
    `🔥 Current streak: **${streak}** ${dayWord} ${streakEmoji}`
  );
}
