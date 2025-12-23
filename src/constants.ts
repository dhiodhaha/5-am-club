/**
 * Centralized constants for the 5AM Club bot
 */

/**
 * Default timezone used when guild hasn't configured one
 */
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Presence window configuration (3:00 AM - 5:59 AM)
 */
export const PRESENCE_WINDOW = {
  START_HOUR: 3,
  END_HOUR: 6,
} as const;

/**
 * Leaderboard announcement hour (6:00 AM)
 */
export const ANNOUNCEMENT_HOUR = 6;

/**
 * Bot shutdown time (6:05 AM for PM2)
 */
export const SHUTDOWN_HOUR = 6;
export const SHUTDOWN_MINUTE = 5;

/**
 * Emoji used when reacting to presence messages
 */
export const PRESENCE_EMOJI = '✅';

/**
 * Maximum leaderboard entries to show
 */
export const MAX_LEADERBOARD_ENTRIES = 10;

/**
 * Maximum streak entries to show in daily summary
 */
export const MAX_STREAK_ENTRIES = 5;


