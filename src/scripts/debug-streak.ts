
import {
  getStartDateForStreakCalculation,
  formatDateInTimezone,
  getCurrentDateInTimezone
} from '../db/queries.js'; // Adjust path if needed
import sql from '../db/connection.js';

// Re-implement logic with logging
function debugStreak(presentDates: Set<string>, timezone: string) {
  let streak = 0;
  const checkDate = getStartDateForStreakCalculation(timezone);
  const maxIterations = 50; // Limit output

  const realToday = getCurrentDateInTimezone(timezone);
  const realTodayStr = formatDateInTimezone(realToday, timezone);
  const checkDateStr = formatDateInTimezone(checkDate, timezone);

  console.log(`
🔍 DEBUG CALCULATION:`);
  console.log(`   Timezone: ${timezone}`);
  console.log(`   Real Today: ${realTodayStr}`);
  console.log(`   Start Check Date: ${checkDateStr}`);

  const isCheckDateToday = (realTodayStr === checkDateStr);

  if (!presentDates.has(checkDateStr) && isCheckDateToday) {
    console.log(`   ℹ️  Today (${checkDateStr}) is missing. Checking backward (allow pending post)...`);
    checkDate.setDate(checkDate.getDate() - 1);

    // Adjust for weekend
    const day = checkDate.getDay();
    if (day === 0) {
        checkDate.setDate(checkDate.getDate() - 2);
        console.log(`   ℹ️  Skipped weekend -> Friday`);
    } else if (day === 6) {
        checkDate.setDate(checkDate.getDate() - 1);
        console.log(`   ℹ️  Skipped weekend -> Friday`);
    }
  }

  console.log(`   -------------------------------------------`);

  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    const dateStr = formatDateInTimezone(checkDate, timezone);

    // Skip weekends
    if (day === 0 || day === 6) {
      console.log(`   ⏭️  ${dateStr} (Weekend) - SKIP`);
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    if (presentDates.has(dateStr)) {
      console.log(`   ✅ ${dateStr} (Weekday) - FOUND! (+1)`);
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      console.log(`   ❌ ${dateStr} (Weekday) - MISSING! (Streak Ends)`);
      break;
    }
  }

  console.log(`   -------------------------------------------`);
  console.log(`   🔥 FINAL STREAK: ${streak}`);
  return streak;
}

async function run() {
  const userId = process.argv[2];
  const guildId = process.argv[3];

  if (!userId || !guildId) {
    console.error('Usage: npx tsx src/scripts/debug-streak.ts <user_id> <guild_id>');
    process.exit(1);
  }

  try {
    // 1. Get Timezone
    console.log(`Fetching timezone for guild ${guildId}...`);
    const tzResult = await sql`SELECT timezone FROM guild_settings WHERE guild_id = ${guildId}`;
    const timezone = tzResult.length > 0 ? tzResult[0].timezone : 'Asia/Jakarta';

    // 2. Get Records
    console.log(`Fetching records for user ${userId}...`);
    const records = await sql`
        SELECT present_date 
        FROM presence_records 
        WHERE user_id = ${userId} AND guild_id = ${guildId}
        ORDER BY present_date DESC
    `;

    const presentDates = new Set(records.map(r => r.present_date));
    console.log(`Found ${presentDates.size} records.`);
    console.log(`Latest 5: ${[...presentDates].slice(0, 5).join(', ')}`);

    // 3. Debug
    debugStreak(presentDates, timezone);

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();
