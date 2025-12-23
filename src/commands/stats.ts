import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction, User } from 'discord.js';
import { getUserStats, getUserStreak } from '../db/queries.js';
import { getStreakEmoji, getStreakMotivation } from '../utils/emoji.js';
import type { UserStats } from '../types/index.js';

export const data = new SlashCommandBuilder()
  .setName('stats')
  .setDescription('View your 5AM Club statistics')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('User to view stats for (defaults to yourself)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser = interaction.options.getUser('user') || interaction.user;
  const guildId = interaction.guildId;
  
  if (!guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server!',
      ephemeral: true
    });
    return;
  }
  
  await interaction.deferReply();
  
  try {
    const stats = await getUserStats(targetUser.id, guildId);
    const currentStreak = await getUserStreak(targetUser.id, guildId);
    const embed = buildStatsEmbed(targetUser, stats, currentStreak);
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch stats. Please try again!'
    });
  }
}

function buildStatsEmbed(user: User, stats: UserStats | null, streak: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('📊 5AM Club Stats')
    .setColor(0x3498DB)
    .setThumbnail(user.displayAvatarURL())
    .setTimestamp()
    .setFooter({ text: '5AM Club • Rise & Grind' });

  if (!stats) {
    embed.setDescription(
      `<@${user.id}> hasn't recorded any presence yet!\n\n` +
      'Start your journey with `/present` at 3AM! 🌅'
    );
    return embed;
  }

  addStatsFields(embed, user, stats, streak);
  return embed;
}

function addStatsFields(embed: EmbedBuilder, user: User, stats: UserStats, streak: number): void {
  const firstPresent = formatDate(stats.first_present);
  const lastPresent = formatDate(stats.last_present);
  const streakEmoji = getStreakEmoji(streak);
  const motivation = getStreakMotivation(streak);

  embed.setDescription(`Stats for <@${user.id}>`);
  embed.addFields(
    { name: '🔥 Current Streak', value: `**${streak}** days ${streakEmoji}`, inline: true },
    { name: '🔢 Total Days', value: `**${stats.total_presents}** days`, inline: true },
    { name: '\u200B', value: '\u200B', inline: true },
    { name: '📅 First Check-in', value: firstPresent, inline: true },
    { name: '🕐 Last Check-in', value: lastPresent, inline: true },
    { name: '\u200B', value: '\u200B', inline: true },
    { name: '\u200B', value: motivation }
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
