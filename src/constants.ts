/**
 * Centralized constants for the 5AM Club bot
 */

/**
 * Default timezone used when guild hasn't configured one
 */
export const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Presence window configuration
 */
export const PRESENCE_WINDOW = {
  START_HOUR: 5,
  END_HOUR: 6,
} as const;

/**
 * Leaderboard announcement hour
 */
export const ANNOUNCEMENT_HOUR = 6;

/**
 * Bot shutdown hour (for PM2)
 */
export const SHUTDOWN_HOUR = 6;
export const SHUTDOWN_MINUTE = 15;

/**
 * Maximum leaderboard entries to show
 */
export const MAX_LEADERBOARD_ENTRIES = 10;

/**
 * Maximum streak entries to show in daily summary
 */
export const MAX_STREAK_ENTRIES = 5;

