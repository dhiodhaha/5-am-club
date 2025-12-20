import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getAllTimeLeaderboard } from '../db/queries.js';
import { getMedalEmoji } from '../utils/emoji.js';
import type { LeaderboardEntry } from '../types/index.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the 5AM Club total leaderboard');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server!',
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  try {
    const leaderboard = await getAllTimeLeaderboard(guildId);
    const embed = buildLeaderboardEmbed(leaderboard);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch leaderboard. Please try again!',
    });
  }
}

function buildLeaderboardEmbed(leaderboard: LeaderboardEntry[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('👑 5AM Club - Total Leaderboard')
    .setDescription('All-time champions ranked by total days present')
    .setColor(0x9B59B6)
    .setTimestamp()
    .setFooter({ text: '5AM Club • Rise & Grind' });

  if (leaderboard.length === 0) {
    embed.addFields({
      name: '📊 Rankings',
      value: '*No presence records yet!*\n\nStart your journey with `/present` at 5AM! 🌅',
    });
  } else {
    const rankingText = formatLeaderboardRankings(leaderboard);
    embed.addFields({
      name: '📊 All-Time Rankings',
      value: rankingText,
    });
  }

  embed.addFields({
    name: '\u200B',
    value: '*💡 Streak leaderboard is announced automatically at 6:00 AM daily!*',
  });

  return embed;
}

function formatLeaderboardRankings(leaderboard: LeaderboardEntry[]): string {
  return leaderboard
    .map((entry, index) => {
      const medal = getMedalEmoji(index);
      const total = parseInt(entry.total_presents || '0');
      return `${medal} <@${entry.user_id}> — **${total}** total days`;
    })
    .join('\n');
}
