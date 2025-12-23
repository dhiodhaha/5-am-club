import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from 'discord.js';
import { 
  setFiveAmChannel, 
  removeFiveAmChannel, 
  getGuildSettings,
  setGuildTimezone,
  getGuildTimezone,
  getFiveAmChannelId
} from '../db/guildSettings.js';
import { 
  isValidTimezone, 
  getFormattedTime,
  getTimezoneDisplay,
  getCommonTimezones
} from '../utils/time.js';
import { hasRecordedToday, getUserStreak, getTodayPresence, getStreakLeaderboard } from '../db/queries.js';
import { getRandomPresenceQuote } from '../utils/quotes.js';
import { getStreakEmoji, pluralizeDays } from '../utils/emoji.js';
import { buildDailySummaryEmbed } from '../utils/embedBuilders.js';

export const data = new SlashCommandBuilder()
  .setName('setup')
  .setDescription('Configure the 5AM Club bot (Admin only)')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(subcommand =>
    subcommand
      .setName('channel')
      .setDescription('Set the 5AM Club presence channel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel for 5AM presence (leave empty to see current)')
          .setRequired(false)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('timezone')
      .setDescription('Set the timezone for this server')
      .addStringOption(option =>
        option
          .setName('timezone')
          .setDescription('Timezone (e.g., Asia/Jakarta, America/New_York)')
          .setRequired(true)
          .setAutocomplete(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('remove')
      .setDescription('Remove the 5AM channel configuration')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('status')
      .setDescription('View current 5AM Club configuration')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('test')
      .setDescription('Preview bot features (no data recorded)')
      .addStringOption(option =>
        option
          .setName('action')
          .setDescription('What to preview')
          .setRequired(true)
          .addChoices(
            { name: 'Presence - Preview presence message', value: 'presence' },
            { name: 'Leaderboard - Preview 6 AM announcement', value: 'leaderboard' }
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({
      content: '❌ This command can only be used in a server!',
      ephemeral: true,
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'channel':
      await handleSetChannel(interaction, guildId);
      break;
    case 'timezone':
      await handleSetTimezone(interaction, guildId);
      break;
    case 'remove':
      await handleRemoveChannel(interaction, guildId);
      break;
    case 'status':
      await handleStatus(interaction, guildId);
      break;
    case 'test':
      await handleTest(interaction, guildId);
      break;
  }
}

async function handleTest(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const action = interaction.options.getString('action', true);
  const channelId = await getFiveAmChannelId(guildId);

  if (!channelId) {
    await interaction.reply({
      content: '❌ **5AM Club not configured!**\n\nUse `/setup channel #channel` first.',
      ephemeral: true,
    });
    return;
  }

  switch (action) {
    case 'presence':
      await testPresence(interaction, guildId);
      break;
    case 'leaderboard':
      await testLeaderboard(interaction, guildId);
      break;
  }
}

async function testPresence(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const { user } = interaction;

  const currentStreak = await getUserStreak(user.id, guildId);
  const alreadyPresent = await hasRecordedToday(user.id, guildId);
  
  const simulatedStreak = calculateSimulatedStreak(currentStreak, alreadyPresent);
  const previewNote = getPreviewNote(alreadyPresent);
  const message = buildPresencePreviewMessage(user, simulatedStreak, previewNote);

  await interaction.reply({
    content: message,
    allowedMentions: { users: [] },
  });
}

function calculateSimulatedStreak(currentStreak: number, alreadyPresent: boolean): number {
  if (alreadyPresent) {
    return currentStreak;
  }
  return currentStreak + 1;
}

function getPreviewNote(alreadyPresent: boolean): string {
  if (alreadyPresent) {
    return `\n\n📝 *You're already present today. This is what it looked like!*`;
  }
  return `\n\n📝 *This is a PREVIEW. No data was recorded.*`;
}

function buildPresencePreviewMessage(
  user: { username: string; id: string },
  streak: number,
  previewNote: string
): string {
  const quote = getRandomPresenceQuote();
  const streakEmoji = getStreakEmoji(streak);
  const dayWord = pluralizeDays(streak);

  return (
    `🧪 **PREVIEW MODE**\n\n` +
    `🌅 **${user.username}** present today @5AM Club! <@${user.id}>\n\n` +
    `${quote}\n\n` +
    `🔥 Current streak: **${streak}** ${dayWord} ${streakEmoji}` +
    previewNote
  );
}

async function testLeaderboard(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  try {
    const timezone = await getGuildTimezone(guildId);
    const todayPresence = await getTodayPresence(guildId);
    const streakLeaderboard = await getStreakLeaderboard(guildId);
    
    const embed = buildDailySummaryEmbed(todayPresence, streakLeaderboard, timezone, true);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error in test leaderboard:', error);
    await interaction.editReply({
      content: '❌ Failed to generate test leaderboard.',
    });
  }
}

async function handleSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const channel = interaction.options.getChannel('channel');

  if (!channel) {
    await handleStatus(interaction, guildId);
    return;
  }

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: '❌ Please select a text channel!',
      ephemeral: true,
    });
    return;
  }

  try {
    await setFiveAmChannel(guildId, channel.id, interaction.user.id);
    const timezone = await getGuildTimezone(guildId);

    const embed = new EmbedBuilder()
      .setTitle('✅ 5AM Club Channel Configured!')
      .setColor(0x00FF00)
      .setDescription(
        `The 5AM Club presence channel has been set to <#${channel.id}>\n\n` +
        '**What happens now:**\n' +
        '• Members can use `/present` in this channel\n' +
        '• Any message in this channel (5-6 AM) counts as presence\n' +
        '• Streak leaderboard will be posted here at 6 AM\n\n' +
        `**Current timezone:** ${getTimezoneDisplay(timezone)}\n` +
        `**Current time:** ${getFormattedTime(timezone)}\n\n` +
        '**Testing:**\n' +
        '• Use `/setup test` to test the bot anytime!\n\n' +
        '*Use `/setup timezone` to change the timezone.*'
      )
      .setFooter({ text: `Configured by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error setting channel:', error);
    await interaction.reply({
      content: '❌ Failed to save channel configuration. Please try again!',
      ephemeral: true,
    });
  }
}

async function handleSetTimezone(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const timezone = interaction.options.getString('timezone', true);

  if (!isValidTimezone(timezone)) {
    const suggestions = getCommonTimezones().slice(0, 5).join(', ');
    await interaction.reply({
      content: (
        `❌ **Invalid timezone:** \`${timezone}\`\n\n` +
        `Try one of these: ${suggestions}\n\n` +
        '*Use autocomplete to see all available timezones.*'
      ),
      ephemeral: true,
    });
    return;
  }

  try {
    await setGuildTimezone(guildId, timezone, interaction.user.id);

    const embed = new EmbedBuilder()
      .setTitle('✅ Timezone Updated!')
      .setColor(0x00FF00)
      .setDescription(
        `**Timezone:** ${getTimezoneDisplay(timezone)}\n` +
        `**Current time:** ${getFormattedTime(timezone)}\n\n` +
        '**Schedule (in your timezone):**\n' +
        '• Presence window: 3:00 AM - 5:59 AM (Mon-Fri)\n' +
        '• Leaderboard posted: 6:00 AM'
      )
      .setFooter({ text: `Updated by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error setting timezone:', error);
    await interaction.reply({
      content: '❌ Failed to save timezone. Please try again!',
      ephemeral: true,
    });
  }
}

async function handleRemoveChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  try {
    await removeFiveAmChannel(guildId);

    await interaction.reply({
      content: '✅ 5AM Club channel configuration has been removed.\n\n' +
        '*The bot will no longer track presence until a new channel is set up.*',
    });
  } catch (error) {
    console.error('Error removing channel:', error);
    await interaction.reply({
      content: '❌ Failed to remove channel configuration. Please try again!',
      ephemeral: true,
    });
  }
}

async function handleStatus(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  try {
    const settings = await getGuildSettings(guildId);
    const embed = buildStatusEmbed(settings);
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching status:', error);
    await interaction.reply({
      content: '❌ Failed to fetch configuration. Please try again!',
      ephemeral: true,
    });
  }
}

function buildStatusEmbed(settings: Awaited<ReturnType<typeof getGuildSettings>>): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('⚙️ 5AM Club Configuration')
    .setColor(0x3498DB)
    .setTimestamp();

  const isConfigured = settings && settings.fiveam_channel_id;
  
  if (isConfigured) {
    setActiveStatusDescription(embed, settings);
  } else {
    setNotConfiguredDescription(embed, settings);
  }

  return embed;
}

function setNotConfiguredDescription(
  embed: EmbedBuilder, 
  settings: Awaited<ReturnType<typeof getGuildSettings>>
): void {
  const timezone = getTimezoneFromSettings(settings);
  
  embed.setDescription(
    '**Status:** ❌ Not configured\n\n' +
    `**Timezone:** ${getTimezoneDisplay(timezone)}\n` +
    `**Current time:** ${getFormattedTime(timezone)}\n\n` +
    'Use `/setup channel #channel-name` to set up the 5AM Club!\n\n' +
    '*Only administrators can configure the bot.*'
  );
}

function setActiveStatusDescription(
  embed: EmbedBuilder,
  settings: NonNullable<Awaited<ReturnType<typeof getGuildSettings>>>
): void {
  const timezone = settings.timezone || 'Asia/Jakarta';
  const setupDate = formatSetupDate(settings.setup_at);

  embed.setDescription(
    '**Status:** ✅ Active\n\n' +
    `**5AM Channel:** <#${settings.fiveam_channel_id}>\n` +
    `**Timezone:** ${getTimezoneDisplay(timezone)}\n` +
    `**Current time:** ${getFormattedTime(timezone)}\n` +
    `**Configured on:** ${setupDate}\n\n` +
    '**Schedule (in your timezone):**\n' +
    '• Presence window: 3:00 AM - 5:59 AM (Mon-Fri)\n' +
    '• Leaderboard posted: 6:00 AM\n\n' +
    '**Testing:**\n' +
    '• Use `/setup test` to test anytime!\n\n' +
    '*Use `/setup remove` to disable the bot.*'
  );
}

function getTimezoneFromSettings(
  settings: Awaited<ReturnType<typeof getGuildSettings>>
): string {
  if (settings && settings.timezone) {
    return settings.timezone;
  }
  return 'Asia/Jakarta';
}

function formatSetupDate(setupAt: Date): string {
  return new Date(setupAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
