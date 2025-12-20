import sql from './connection.js';
import type { LeaderboardEntry, TodayPresenceEntry, UserStats, StreakEntry } from '../types/index.js';

interface RecordPresenceResult {
  success: boolean;
  alreadyPresent: boolean;
}

interface PresenceRecord {
  present_date: string;
}

interface UserRecord {
  user_id: string;
  username: string;
}

// ============================================
// Presence Recording
// ============================================

/**
 * Record user presence for today
 */
export async function recordPresence(
  userId: string,
  username: string,
  guildId: string
): Promise<RecordPresenceResult> {
  const today = getTodayDateString();

  try {
    await sql`
      INSERT INTO presence_records (user_id, username, guild_id, present_date)
      VALUES (${userId}, ${username}, ${guildId}, ${today})
      ON CONFLICT (user_id, guild_id, present_date) DO NOTHING
    `;
    return { success: true, alreadyPresent: false };
  } catch (error: unknown) {
    if (isUniqueConstraintError(error)) {
      return { success: true, alreadyPresent: true };
    }
    throw error;
  }
}

/**
 * Check if user already recorded presence today
 */
export async function hasRecordedToday(userId: string, guildId: string): Promise<boolean> {
  const today = getTodayDateString();

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
  const today = getTodayDateString();

  const result = await sql`
    SELECT user_id, username, present_at
    FROM presence_records 
    WHERE guild_id = ${guildId} 
      AND present_date = ${today}
    ORDER BY present_at ASC
  `;

  return result as TodayPresenceEntry[];
}

// ============================================
// Leaderboards
// ============================================

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
 * Get streak leaderboard for a guild
 */
export async function getStreakLeaderboard(guildId: string): Promise<StreakEntry[]> {
  const users = await getGuildUsers(guildId);
  const streakEntries = await calculateStreaksForUsers(users, guildId);
  
  return streakEntries
    .filter(entry => entry.current_streak > 0)
    .sort((a, b) => b.current_streak - a.current_streak)
    .slice(0, 10);
}

// ============================================
// User Stats & Streaks
// ============================================

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

  const hasNoRecords = result.length === 0 || result[0].total_presents === '0';
  if (hasNoRecords) {
    return null;
  }

  return result[0] as UserStats;
}

/**
 * Calculate current streak for a user
 * Streak = consecutive weekdays (Mon-Fri) the user has been present
 */
export async function getUserStreak(userId: string, guildId: string): Promise<number> {
  const presenceRecords = await getUserPresenceRecords(userId, guildId);

  if (presenceRecords.length === 0) {
    return 0;
  }

  const presentDates = new Set(presenceRecords.map(r => r.present_date));
  return calculateConsecutiveWeekdayStreak(presentDates);
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get today's date string in YYYY-MM-DD format
 * Uses local timezone to avoid midnight issues
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505'
  );
}

async function getGuildUsers(guildId: string): Promise<UserRecord[]> {
  const result = await sql`
    SELECT DISTINCT user_id, username
    FROM presence_records 
    WHERE guild_id = ${guildId}
  `;
  return result as UserRecord[];
}

async function getUserPresenceRecords(userId: string, guildId: string): Promise<PresenceRecord[]> {
  const result = await sql`
    SELECT present_date
    FROM presence_records 
    WHERE user_id = ${userId} 
      AND guild_id = ${guildId}
    ORDER BY present_date DESC
  `;
  return result as PresenceRecord[];
}

async function calculateStreaksForUsers(users: UserRecord[], guildId: string): Promise<StreakEntry[]> {
  const entries: StreakEntry[] = [];
  
  for (const user of users) {
    const streak = await getUserStreak(user.user_id, guildId);
    entries.push({
      user_id: user.user_id,
      username: user.username,
      current_streak: streak
    });
  }
  
  return entries;
}

function calculateConsecutiveWeekdayStreak(presentDates: Set<string>): number {
  let streak = 0;
  const checkDate = getStartDateForStreakCalculation();
  const maxIterations = 260; // ~52 weeks * 5 weekdays
  
  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    
    // Skip weekends
    if (day === 0 || day === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    
    const dateStr = checkDate.toISOString().split('T')[0];
    
    if (presentDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
}

function getStartDateForStreakCalculation(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // If today is weekend, start from last Friday
  if (dayOfWeek === 0) { // Sunday
    today.setDate(today.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    today.setDate(today.getDate() - 1);
  }
  
  return today;
}
