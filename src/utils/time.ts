import 'dotenv/config';
import type { TimeCheckResult } from '../types/index.js';

const TIMEZONE = process.env.TIMEZONE || 'Asia/Jakarta';

/**
 * Get current time in the configured timezone
 */
export function getCurrentTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
}

/**
 * Check if current time is within presence window (5AM - 6AM, Monday - Friday)
 */
export function isPresenceTime(): TimeCheckResult {
  const now = getCurrentTime();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Check if it's a weekday (Monday = 1, Friday = 5)
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

  // Check if it's between 5:00 AM and 5:59 AM (before 6:00 AM)
  const isValidHour = hour === 5;

  if (!isWeekday) {
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    return {
      isValid: false,
      reason: '📅 Presence recording is only available **Monday to Friday**.',
      hint: `Come back on Monday at 5AM! (${daysUntilMonday} day${daysUntilMonday > 1 ? 's' : ''} away)`,
    };
  }

  if (hour < 5) {
    const minutesUntil = (5 - hour - 1) * 60 + (60 - minute);
    return {
      isValid: false,
      reason: "⏰ It's too early! The presence window hasn't opened yet.",
      hint: `Window opens at **5:00 AM** (in ${formatMinutes(minutesUntil)})`,
    };
  }

  if (!isValidHour) {
    const hoursUntilTomorrow = 24 - hour + 5;
    return {
      isValid: false,
      reason: '⏰ The presence window has closed for today.',
      hint: `Window is **5:00 AM - 6:00 AM**. Try again tomorrow! (in ~${hoursUntilTomorrow} hours)`,
    };
  }

  return { isValid: true };
}

/**
 * Format minutes into a readable string
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format time remaining until a specific hour
 */
export function formatTimeRemaining(targetHour: number): string {
  const now = getCurrentTime();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour >= targetHour) {
    return 'now';
  }

  const hoursRemaining = targetHour - currentHour - 1;
  const minutesRemaining = 60 - currentMinute;

  if (hoursRemaining === 0) {
    return `${minutesRemaining} minutes`;
  }

  return `${hoursRemaining}h ${minutesRemaining}m`;
}

/**
 * Get the cron expression for 6 AM in the configured timezone
 */
export function getLeaderboardCron(): string {
  // Run at 6:00 AM every weekday (Monday-Friday)
  return '0 6 * * 1-5';
}

/**
 * Check if today is a weekday
 */
export function isWeekday(): boolean {
  const now = getCurrentTime();
  const dayOfWeek = now.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get the configured timezone
 */
export function getTimezone(): string {
  return TIMEZONE;
}

