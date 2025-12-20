import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { recordPresence, hasRecordedToday, getUserStreak } from '../db/queries.js';
import { isPresenceTime } from '../utils/time.js';

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

  // Check if command is used in the correct channel
  if (FIVEAM_CHANNEL_ID && channelId !== FIVEAM_CHANNEL_ID) {
    await interaction.reply({
      content: `❌ **Wrong channel!**\n\nYou can only use \`/present\` in <#${FIVEAM_CHANNEL_ID}>`,
      ephemeral: true,
    });
    return;
  }

  // Check if it's the right time (5AM - 6AM, Monday to Friday)
  const timeCheck = isPresenceTime();

  if (!timeCheck.isValid) {
    await interaction.reply({
      content: `⏰ **Not the right time!**\n\n${timeCheck.reason}\n\n${timeCheck.hint || ''}`,
      ephemeral: true,
    });
    return;
  }

  // Check if already recorded today
  const alreadyPresent = await hasRecordedToday(user.id, guildId);

  if (alreadyPresent) {
    await interaction.reply({
      content: `✅ You've already marked your presence today! Keep up the great work! 💪`,
      ephemeral: true,
    });
    return;
  }

  // Record the presence
  try {
    await recordPresence(user.id, user.username, guildId);
    
    // Get user's current streak after recording
    const currentStreak = await getUserStreak(user.id, guildId);
    const streakEmoji = '🔥'.repeat(Math.min(Math.ceil(currentStreak / 5), 5));

    // Public announcement with streak info
    await interaction.reply({
      content:
        `🌅 **${user.username}** present today @5AM Club! <@${user.id}>\n\n` +
        `Rise and grind! Another early morning conquered. 💪\n` +
        `🔥 Current streak: **${currentStreak}** day${currentStreak !== 1 ? 's' : ''} ${streakEmoji}`,
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
