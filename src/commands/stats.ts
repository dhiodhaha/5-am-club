import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getUserStats, getUserStreak } from '../db/queries.js';

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
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 5AM Club Stats`)
      .setColor(0x3498DB)
      .setThumbnail(targetUser.displayAvatarURL())
      .setTimestamp()
      .setFooter({ text: '5AM Club • Rise & Grind' });
    
    if (!stats) {
      embed.setDescription(`<@${targetUser.id}> hasn't recorded any presence yet!\n\nStart your journey with \`/present\` at 5AM! 🌅`);
    } else {
      const firstPresent = new Date(stats.first_present).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const lastPresent = new Date(stats.last_present).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      const streakEmoji = currentStreak > 0 
        ? '🔥'.repeat(Math.min(Math.ceil(currentStreak / 5), 5))
        : '❄️';
      
      embed.setDescription(`Stats for <@${targetUser.id}>`);
      embed.addFields(
        { name: '🔥 Current Streak', value: `**${currentStreak}** days ${streakEmoji}`, inline: true },
        { name: '🔢 Total Days', value: `**${stats.total_presents}** days`, inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: '📅 First Check-in', value: firstPresent, inline: true },
        { name: '🕐 Last Check-in', value: lastPresent, inline: true },
        { name: '\u200B', value: '\u200B', inline: true }
      );
      
      // Add motivational message based on streak
      let message = '';
      if (currentStreak >= 20) message = '🏆 **UNSTOPPABLE!** 20+ day streak - You\'re a legend!';
      else if (currentStreak >= 10) message = '⭐ **Incredible!** 10+ day streak - Keep it going!';
      else if (currentStreak >= 5) message = '🔥 **On Fire!** 5+ day streak - Building discipline!';
      else if (currentStreak >= 3) message = '💪 **Nice streak!** Keep the momentum!';
      else if (currentStreak > 0) message = '🌟 Streak started! Don\'t break it!';
      else message = '🌅 No active streak. Start one tomorrow at 5AM!';
      
      embed.addFields({ name: '\u200B', value: message });
    }
    
    await interaction.editReply({ embeds: [embed] });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch stats. Please try again!'
    });
  }
}
