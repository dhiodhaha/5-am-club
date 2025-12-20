import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { recordPresence, hasRecordedToday, getUserStreak } from '../db/queries.js';
import { isPresenceTime } from '../utils/time.js';
import { getStreakEmoji, pluralizeDays } from '../utils/emoji.js';

const FIVEAM_CHANNEL_ID = process.env.FIVEAM_CHANNEL_ID;

export const data = new SlashCommandBuilder()
  .setName('present')
  .setDescription('Record your presence for the 5AM Club!');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const { user, guildId, channelId } = interaction;

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server!',
      ephemeral: true,
    });
    return;
  }

  if (!isCorrectChannel(channelId)) {
    await interaction.reply({
      content: `❌ **Wrong channel!**\n\nYou can only use \`/present\` in <#${FIVEAM_CHANNEL_ID}>`,
      ephemeral: true,
    });
    return;
  }

  const timeCheck = isPresenceTime();
  if (!timeCheck.isValid) {
    await interaction.reply({
      content: buildTimeErrorMessage(timeCheck.reason, timeCheck.hint),
      ephemeral: true,
    });
    return;
  }

  const alreadyPresent = await hasRecordedToday(user.id, guildId);
  if (alreadyPresent) {
    await interaction.reply({
      content: '✅ You\'ve already marked your presence today! Keep up the great work! 💪',
      ephemeral: true,
    });
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
    await interaction.reply({
      content: '❌ Something went wrong while recording your presence. Please try again!',
      ephemeral: true,
    });
  }
}

function isCorrectChannel(channelId: string): boolean {
  if (!FIVEAM_CHANNEL_ID) {
    return true; // No restriction if not configured
  }
  return channelId === FIVEAM_CHANNEL_ID;
}

function buildTimeErrorMessage(reason: string | undefined, hint: string | undefined): string {
  const hintText = hint || '';
  return `⏰ **Not the right time!**\n\n${reason}\n\n${hintText}`;
}

function buildSuccessMessage(username: string, oderId: string, streak: number): string {
  const streakEmoji = getStreakEmoji(streak);
  const dayWord = pluralizeDays(streak);
  
  return (
    `🌅 **${username}** present today @5AM Club! <@${oderId}>\n\n` +
    `Rise and grind! Another early morning conquered. 💪\n` +
    `🔥 Current streak: **${streak}** ${dayWord} ${streakEmoji}`
  );
}
