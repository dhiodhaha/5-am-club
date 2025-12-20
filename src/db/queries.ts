import sql from './connection.js';
import type { LeaderboardEntry, TodayPresenceEntry, UserStats, StreakEntry } from '../types/index.js';

interface RecordPresenceResult {
  success: boolean;
  alreadyPresent: boolean;
}

/**
 * Record user presence for today
 */
export async function recordPresence(
  userId: string,
  username: string,
  guildId: string
): Promise<RecordPresenceResult> {
  const today = new Date().toISOString().split('T')[0];

  try {
    await sql`
      INSERT INTO presence_records (user_id, username, guild_id, present_date)
      VALUES (${userId}, ${username}, ${guildId}, ${today})
      ON CONFLICT (user_id, guild_id, present_date) DO NOTHING
    `;

    return { success: true, alreadyPresent: false };
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return { success: true, alreadyPresent: true };
    }
    throw error;
  }
}

/**
 * Check if user already recorded presence today
 */
export async function hasRecordedToday(userId: string, guildId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  const result = await sql`
    SELECT id FROM presence_records 
    WHERE user_id = ${userId} 
      AND guild_id = ${guildId} 
      AND present_date = ${today}
  `;

  return result.length > 0;
}

/**
 * Get today's presence records for a guild
 */
export async function getTodayPresence(guildId: string): Promise<TodayPresenceEntry[]> {
  const today = new Date().toISOString().split('T')[0];

  const result = await sql`
    SELECT user_id, username, present_at
    FROM presence_records 
    WHERE guild_id = ${guildId} 
      AND present_date = ${today}
    ORDER BY present_at ASC
  `;

  return result as TodayPresenceEntry[];
}

/**
 * Get weekly leaderboard (current week's stats)
 */
export async function getWeeklyLeaderboard(guildId: string): Promise<LeaderboardEntry[]> {
  // Get Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().split('T')[0];

  const result = await sql`
    SELECT 
      user_id,
      username,
      COUNT(*) as week_presents
    FROM presence_records 
    WHERE guild_id = ${guildId} 
      AND present_date >= ${mondayStr}
    GROUP BY user_id, username
    ORDER BY week_presents DESC, MIN(present_at) ASC
    LIMIT 10
  `;

  return result as LeaderboardEntry[];
}

/**
 * Get all-time leaderboard
 */
export async function getAllTimeLeaderboard(guildId: string): Promise<LeaderboardEntry[]> {
  const result = await sql`
    SELECT 
      user_id,
      username,
      COUNT(*) as total_presents
    FROM presence_records 
    WHERE guild_id = ${guildId}
    GROUP BY user_id, username
    ORDER BY total_presents DESC, MIN(present_at) ASC
    LIMIT 10
  `;

  return result as LeaderboardEntry[];
}

/**
 * Get user stats
 */
export async function getUserStats(userId: string, guildId: string): Promise<UserStats | null> {
  const result = await sql`
    SELECT 
      COUNT(*) as total_presents,
      MAX(present_date) as last_present,
      MIN(present_date) as first_present
    FROM presence_records 
    WHERE user_id = ${userId} 
      AND guild_id = ${guildId}
  `;

  if (result.length === 0 || result[0].total_presents === '0') {
    return null;
  }

  return result[0] as UserStats;
}

/**
 * Get all weekdays between two dates (for streak calculation)
 */
function getWeekdaysBetween(startDate: Date, endDate: Date): string[] {
  const weekdays: string[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const day = current.getDay();
    // Only include weekdays (Mon=1 to Fri=5)
    if (day >= 1 && day <= 5) {
      weekdays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekdays;
}

/**
 * Calculate current streak for a user
 * Streak = consecutive weekdays (Mon-Fri) the user has been present
 */
export async function getUserStreak(userId: string, guildId: string): Promise<number> {
  // Get all presence records for this user, ordered by date descending
  const result = await sql`
    SELECT present_date
    FROM presence_records 
    WHERE user_id = ${userId} 
      AND guild_id = ${guildId}
    ORDER BY present_date DESC
  `;

  if (result.length === 0) {
    return 0;
  }

  const presentDates = new Set(result.map(r => r.present_date));
  
  // Start from today and go backwards
  const today = new Date();
  let streak = 0;
  let checkDate = new Date(today);
  
  // If today is weekend, start from last Friday
  const dayOfWeek = checkDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    checkDate.setDate(checkDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    checkDate.setDate(checkDate.getDate() - 1);
  }
  
  // Count consecutive weekdays with presence
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const day = checkDate.getDay();
    
    // Skip weekends
    if (day === 0 || day === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    
    // Check if user was present on this weekday
    if (presentDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Streak broken
      break;
    }
    
    // Safety: don't go back more than 365 days
    if (streak > 260) break; // ~52 weeks * 5 weekdays
  }
  
  return streak;
}

/**
 * Get streak leaderboard for a guild
 * Shows users with their current consecutive weekday streaks
 */
export async function getStreakLeaderboard(guildId: string): Promise<StreakEntry[]> {
  // Get all unique users in this guild
  const users = await sql`
    SELECT DISTINCT user_id, username
    FROM presence_records 
    WHERE guild_id = ${guildId}
  `;

  // Calculate streak for each user
  const streakEntries: StreakEntry[] = [];
  
  for (const user of users) {
    const streak = await getUserStreak(user.user_id, guildId);
    if (streak > 0) {
      streakEntries.push({
        user_id: user.user_id,
        username: user.username,
        current_streak: streak
      });
    }
  }
  
  // Sort by streak descending
  streakEntries.sort((a, b) => b.current_streak - a.current_streak);
  
  return streakEntries.slice(0, 10);
}

