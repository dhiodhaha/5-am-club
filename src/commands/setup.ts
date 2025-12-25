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
import {
  addHoliday,
  removeHoliday,
  getHolidays,
  getUpcomingHolidays,
  syncApiHolidays,
  getHolidayCounts,
  isValidDateString,
  formatDateRange,
  Holiday,
} from '../db/holidays.js';
import { fetchCurrentYearHolidays } from '../services/holidayApi.js';

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
  )
  .addSubcommandGroup(group =>
    group
      .setName('holiday')
      .setDescription('Manage holidays (presence paused on holidays)')
      .addSubcommand(subcommand =>
        subcommand
          .setName('add')
          .setDescription('Add a holiday period (presence will be paused)')
          .addStringOption(option =>
            option
              .setName('start')
              .setDescription('Start date (YYYY-MM-DD)')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('end')
              .setDescription('End date (YYYY-MM-DD), same as start if single day')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('name')
              .setDescription('Holiday name (e.g., "Liburan Natal")')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('remove')
          .setDescription('Remove a holiday')
          .addIntegerOption(option =>
            option
              .setName('id')
              .setDescription('Holiday ID (use /setup holiday list to see IDs)')
              .setRequired(true)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('View all configured holidays')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('sync')
          .setDescription('Sync Indonesian national holidays from API')
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

  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const subcommand = interaction.options.getSubcommand();

  // Handle holiday subcommand group
  if (subcommandGroup === 'holiday') {
    await handleHolidaySubcommand(interaction, guildId, subcommand);
    return;
  }

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
  await interaction.deferReply();
  
  try {
    const settings = await getGuildSettings(guildId);
    const embed = await buildStatusEmbed(settings);
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error fetching status:', error);
    await interaction.editReply({
      content: '❌ Failed to fetch configuration. Please try again!',
    });
  }
}

async function buildStatusEmbed(settings: Awaited<ReturnType<typeof getGuildSettings>>): Promise<EmbedBuilder> {
  const embed = new EmbedBuilder()
    .setTitle('⚙️ 5AM Club Configuration')
    .setColor(0x3498DB)
    .setTimestamp();

  const isConfigured = settings && settings.fiveam_channel_id;
  
  if (isConfigured) {
    await setActiveStatusDescription(embed, settings);
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

async function setActiveStatusDescription(
  embed: EmbedBuilder,
  settings: NonNullable<Awaited<ReturnType<typeof getGuildSettings>>>
): Promise<void> {
  const timezone = settings.timezone || 'Asia/Jakarta';
  const setupDate = formatSetupDate(settings.setup_at);
  
  // Get upcoming holidays
  const upcomingHolidays = await getUpcomingHolidays(settings.guild_id, 3);
  const holidaySection = formatUpcomingHolidaysSection(upcomingHolidays);

  embed.setDescription(
    '**Status:** ✅ Active\n\n' +
    `**5AM Channel:** <#${settings.fiveam_channel_id}>\n` +
    `**Timezone:** ${getTimezoneDisplay(timezone)}\n` +
    `**Current time:** ${getFormattedTime(timezone)}\n` +
    `**Configured on:** ${setupDate}\n\n` +
    '**Schedule (in your timezone):**\n' +
    '• Presence window: 3:00 AM - 5:59 AM (Mon-Fri)\n' +
    '• Leaderboard posted: 6:00 AM\n\n' +
    holidaySection +
    '**Testing:**\n' +
    '• Use `/setup test` to test anytime!\n\n' +
    '*Use `/setup remove` to disable the bot.*'
  );
}

function formatUpcomingHolidaysSection(holidays: Holiday[]): string {
  if (holidays.length === 0) {
    return '';
  }
  
  const lines = holidays.map(h => {
    const dateDisplay = formatDateRange(h.start_date, h.end_date);
    return `• ${h.name} (${dateDisplay})`;
  });
  
  return `**🏖️ Upcoming Holidays:**\n${lines.join('\n')}\n\n`;
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

// ============================================
// Holiday Subcommand Handlers
// ============================================

async function handleHolidaySubcommand(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  subcommand: string
): Promise<void> {
  switch (subcommand) {
    case 'add':
      await handleHolidayAdd(interaction, guildId);
      break;
    case 'remove':
      await handleHolidayRemove(interaction, guildId);
      break;
    case 'list':
      await handleHolidayList(interaction, guildId);
      break;
    case 'sync':
      await handleHolidaySync(interaction, guildId);
      break;
  }
}

async function handleHolidayAdd(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const startDate = interaction.options.getString('start', true);
  const endDate = interaction.options.getString('end', true);
  const name = interaction.options.getString('name', true);

  // Validate date formats
  if (!isValidDateString(startDate)) {
    await interaction.reply({
      content: `❌ Invalid start date: \`${startDate}\`\n\nUse format: **YYYY-MM-DD** (e.g., 2025-12-25)`,
      ephemeral: true,
    });
    return;
  }

  if (!isValidDateString(endDate)) {
    await interaction.reply({
      content: `❌ Invalid end date: \`${endDate}\`\n\nUse format: **YYYY-MM-DD** (e.g., 2025-12-31)`,
      ephemeral: true,
    });
    return;
  }

  // Validate date range
  if (new Date(endDate) < new Date(startDate)) {
    await interaction.reply({
      content: '❌ End date cannot be before start date!',
      ephemeral: true,
    });
    return;
  }

  try {
    const holiday = await addHoliday(guildId, startDate, endDate, name, interaction.user.id);
    const dateDisplay = formatDateRange(startDate, endDate);

    const embed = new EmbedBuilder()
      .setTitle('🏖️ Holiday Added!')
      .setColor(0x00FF00)
      .setDescription(
        `**Name:** ${name}\n` +
        `**Date:** ${dateDisplay}\n` +
        `**ID:** #${holiday.id}\n\n` +
        '✅ Presence recording will be paused during this period.'
      )
      .setFooter({ text: `Added by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error adding holiday:', error);
    await interaction.reply({
      content: '❌ Failed to add holiday. Please try again!',
      ephemeral: true,
    });
  }
}

async function handleHolidayRemove(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  const holidayId = interaction.options.getInteger('id', true);

  try {
    const removed = await removeHoliday(guildId, holidayId);

    if (!removed) {
      await interaction.reply({
        content: `❌ Holiday #${holidayId} not found.\n\nUse \`/setup holiday list\` to see available holidays.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: `✅ Holiday #${holidayId} has been removed.`,
    });
  } catch (error) {
    console.error('Error removing holiday:', error);
    await interaction.reply({
      content: '❌ Failed to remove holiday. Please try again!',
      ephemeral: true,
    });
  }
}

async function handleHolidayList(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  try {
    const holidays = await getHolidays(guildId);
    const counts = await getHolidayCounts(guildId);

    const embed = new EmbedBuilder()
      .setTitle('🏖️ Holiday Schedule')
      .setColor(0x3498DB)
      .setTimestamp();

    if (holidays.length === 0) {
      embed.setDescription(
        '**No holidays configured.**\n\n' +
        'Use `/setup holiday add` to add custom holidays, or\n' +
        'Use `/setup holiday sync` to import Indonesian national holidays.'
      );
    } else {
      const holidayList = formatHolidayList(holidays);
      embed.setDescription(
        `**Total:** ${holidays.length} holidays\n` +
        `(🇮🇩 API: ${counts.api} | 📝 Manual: ${counts.manual})\n\n` +
        holidayList
      );
    }

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error listing holidays:', error);
    await interaction.reply({
      content: '❌ Failed to fetch holidays. Please try again!',
      ephemeral: true,
    });
  }
}

function formatHolidayList(holidays: Holiday[]): string {
  const lines: string[] = [];
  
  for (const holiday of holidays) {
    const dateDisplay = formatDateRange(holiday.start_date, holiday.end_date);
    const sourceEmoji = getSourceEmoji(holiday.source);
    const typeEmoji = getTypeEmoji(holiday.type);
    
    lines.push(`${typeEmoji} **#${holiday.id}** ${holiday.name}\n   ${sourceEmoji} ${dateDisplay}`);
  }
  
  return lines.join('\n\n');
}

function getSourceEmoji(source: string): string {
  if (source === 'api') {
    return '🇮🇩';
  }
  return '📝';
}

function getTypeEmoji(type: string): string {
  switch (type) {
    case 'national':
      return '🎌';
    case 'cuti_bersama':
      return '🏠';
    default:
      return '📅';
  }
}

async function handleHolidaySync(
  interaction: ChatInputCommandInteraction,
  guildId: string
): Promise<void> {
  await interaction.deferReply();

  try {
    const holidays = await fetchCurrentYearHolidays();
    const insertedCount = await syncApiHolidays(guildId, holidays, interaction.user.id);
    const currentYear = new Date().getFullYear();

    const embed = new EmbedBuilder()
      .setTitle('🇮🇩 Indonesian Holidays Synced!')
      .setColor(0x00FF00)
      .setDescription(
        `**Year:** ${currentYear}\n` +
        `**Imported:** ${insertedCount} holidays\n\n` +
        '✅ National holidays and cuti bersama have been imported.\n\n' +
        '*Existing API holidays for this year were replaced.*\n' +
        '*Manual holidays are kept unchanged.*'
      )
      .setFooter({ text: `Synced by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error syncing holidays:', error);
    await interaction.editReply({
      content: '❌ Failed to sync holidays from API.\n\n' +
        'This could be due to network issues. Please try again later.',
    });
  }
}
