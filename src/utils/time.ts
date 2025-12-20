import type { TimeCheckResult } from '../types/index.js';

const DEFAULT_TIMEZONE = 'Asia/Jakarta';

/**
 * Get current time in a specific timezone
 */
export function getCurrentTime(timezone: string = DEFAULT_TIMEZONE): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

/**
 * Check if current time is within presence window (5AM - 6AM, Monday - Friday)
 */
export function isPresenceTime(timezone: string = DEFAULT_TIMEZONE): TimeCheckResult {
  const now = getCurrentTime(timezone);
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Check if it's a weekday (Monday = 1, Friday = 5)
  const isWeekdayNow = dayOfWeek >= 1 && dayOfWeek <= 5;

  // Check if it's between 5:00 AM and 5:59 AM (before 6:00 AM)
  const isValidHour = hour === 5;

  if (!isWeekdayNow) {
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
 * Check if it's 6 AM in the given timezone (for leaderboard announcement)
 */
export function isAnnouncementTime(timezone: string = DEFAULT_TIMEZONE): boolean {
  const now = getCurrentTime(timezone);
  const hour = now.getHours();
  const minute = now.getMinutes();
  const dayOfWeek = now.getDay();
  
  // Check if it's a weekday and 6:00 AM (with 5 minute window)
  const isWeekdayNow = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isSixAm = hour === 6 && minute < 5;
  
  return isWeekdayNow && isSixAm;
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
 * Check if today is a weekday in the given timezone
 */
export function isWeekday(timezone: string = DEFAULT_TIMEZONE): boolean {
  const now = getCurrentTime(timezone);
  const dayOfWeek = now.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

/**
 * Get list of common timezones for autocomplete
 */
export function getCommonTimezones(): string[] {
  return [
    'Asia/Jakarta',      // WIB (UTC+7)
    'Asia/Makassar',     // WITA (UTC+8)
    'Asia/Jayapura',     // WIT (UTC+9)
    'Asia/Singapore',    // SGT (UTC+8)
    'Asia/Bangkok',      // ICT (UTC+7)
    'Asia/Tokyo',        // JST (UTC+9)
    'Asia/Seoul',        // KST (UTC+9)
    'Asia/Shanghai',     // CST (UTC+8)
    'Asia/Kolkata',      // IST (UTC+5:30)
    'Asia/Dubai',        // GST (UTC+4)
    'Europe/London',     // GMT/BST
    'Europe/Paris',      // CET/CEST
    'Europe/Berlin',     // CET/CEST
    'America/New_York',  // EST/EDT
    'America/Chicago',   // CST/CDT
    'America/Denver',    // MST/MDT
    'America/Los_Angeles', // PST/PDT
    'Australia/Sydney',  // AEST/AEDT
    'Pacific/Auckland',  // NZST/NZDT
  ];
}

/**
 * Validate if a timezone string is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get formatted current time string for a timezone
 */
export function getFormattedTime(timezone: string): string {
  const now = getCurrentTime(timezone);
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get formatted timezone display name
 */
export function getTimezoneDisplay(timezone: string): string {
  try {
    const now = new Date();
    const offset = now.toLocaleString('en-US', { 
      timeZone: timezone, 
      timeZoneName: 'short' 
    }).split(' ').pop() || timezone;
    return `${timezone} (${offset})`;
  } catch {
    return timezone;
  }
}
