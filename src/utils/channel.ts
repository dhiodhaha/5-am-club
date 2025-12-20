import { Guild, TextChannel, ChannelType } from 'discord.js';

/**
 * Find the appropriate text channel to post announcements
 * Priority: configured channel > 5am/morning channel > general > any writable channel
 */
export function findAnnouncementChannel(guild: Guild, preferredChannelId?: string): TextChannel | undefined {
  // Try preferred channel first
  if (preferredChannelId) {
    const preferred = guild.channels.cache.get(preferredChannelId);
    if (preferred?.type === ChannelType.GuildText) {
      return preferred as TextChannel;
    }
  }

  // Try to find a 5am/morning related channel
  const fiveAmChannel = findChannelByName(guild, ['5am', 'morning', 'general']);
  if (fiveAmChannel) {
    return fiveAmChannel;
  }

  // Fallback to first writable text channel
  return findFirstWritableChannel(guild);
}

/**
 * Find a text channel by name patterns
 */
function findChannelByName(guild: Guild, patterns: string[]): TextChannel | undefined {
  return guild.channels.cache.find((ch): ch is TextChannel => {
    if (ch.type !== ChannelType.GuildText) {
      return false;
    }
    return patterns.some(pattern => ch.name.includes(pattern));
  });
}

/**
 * Find the first text channel the bot can write to
 */
function findFirstWritableChannel(guild: Guild): TextChannel | undefined {
  const botMember = guild.members.me;
  if (!botMember) {
    return undefined;
  }

  return guild.channels.cache.find((ch): ch is TextChannel => {
    if (ch.type !== ChannelType.GuildText) {
      return false;
    }
    const permissions = ch.permissionsFor(botMember);
    return permissions?.has('SendMessages') === true;
  });
}

