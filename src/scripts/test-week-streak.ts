import sql from '../db/connection.js';

// ==========================================
// HELPER FUNCTIONS (Same as queries.ts)
// ==========================================

function getDateStringInTimezone(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function getCurrentDateInTimezone(timezone: string): Date {
  const dateStr = getDateStringInTimezone(timezone);
  return new Date(dateStr + 'T12:00:00');
}

function getStartDateForStreakCalculation(timezone: string): Date {
  const today = getCurrentDateInTimezone(timezone);
  const dayOfWeek = today.getDay();

  if (dayOfWeek === 0) { // Sunday
    today.setDate(today.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    today.setDate(today.getDate() - 1);
  }

  return today;
}

function getDayName(dayNum: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayNum];
}

function dateToString(date: Date | string): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(date);
}

// ==========================================
// STREAK CALCULATION (Same as queries.ts)
// ==========================================

function calculateConsecutiveWeekdayStreak(presentDates: Set<string>, timezone: string): { streak: number, log: string[] } {
  let streak = 0;
  const log: string[] = [];

  const checkDate = getStartDateForStreakCalculation(timezone);
  const maxIterations = 260;

  const realToday = getCurrentDateInTimezone(timezone);
  const realTodayStr = formatDateInTimezone(realToday, timezone);
  const checkDateStr = formatDateInTimezone(checkDate, timezone);
  const isCheckDateToday = (realTodayStr === checkDateStr);

  log.push(`Today: ${realTodayStr} (${getDayName(realToday.getDay())})`);
  log.push(`Starting check from: ${checkDateStr} (${getDayName(checkDate.getDay())})`);

  if (!presentDates.has(checkDateStr) && isCheckDateToday) {
    checkDate.setDate(checkDate.getDate() - 1);
    const day = checkDate.getDay();
    if (day === 0) checkDate.setDate(checkDate.getDate() - 2);
    else if (day === 6) checkDate.setDate(checkDate.getDate() - 1);
    log.push(`Not present today yet, checking from: ${formatDateInTimezone(checkDate, timezone)}`);
  }

  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    const dateStr = formatDateInTimezone(checkDate, timezone);

    // Skip weekends
    if (day === 0 || day === 6) {
      log.push(`  ${dateStr} (${getDayName(day)}) - SKIPPED (weekend)`);
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }

    if (presentDates.has(dateStr)) {
      streak++;
      log.push(`  ${dateStr} (${getDayName(day)}) - ✅ PRESENT (streak: ${streak})`);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      log.push(`  ${dateStr} (${getDayName(day)}) - ❌ ABSENT (streak broken)`);
      break;
    }
  }

  return { streak, log };
}

// ==========================================
// MAIN - READ ONLY
// ==========================================

async function run() {
  const guildId = process.argv[2];
  const userId = process.argv[3];

  if (!guildId) {
    console.log(`
Usage:
  npx tsx src/scripts/test-week-streak.ts <guild_id>           # Show all users
  npx tsx src/scripts/test-week-streak.ts <guild_id> <user_id> # Show specific user
`);
    process.exit(1);
  }

  // Get timezone
  const tzResult = await sql`SELECT timezone FROM guild_settings WHERE guild_id = ${guildId}`;
  const timezone = tzResult.length > 0 ? tzResult[0].timezone : 'Asia/Jakarta';

  console.log(`\n🧪 DEBUG STREAK CALCULATION (READ ONLY)`);
  console.log(`==========================================`);
  console.log(`Guild ID: ${guildId}`);
  console.log(`Timezone: ${timezone}`);
  console.log(`Today:    ${getDateStringInTimezone(timezone)} (${getDayName(getCurrentDateInTimezone(timezone).getDay())})`);
  console.log(`==========================================\n`);

  if (userId) {
    // Show specific user
    await checkUserStreak(guildId, userId, timezone);
  } else {
    // Show all users in guild
    await checkAllUsers(guildId, timezone);
  }

  process.exit(0);
}

async function checkAllUsers(guildId: string, timezone: string) {
  const users = await sql`
    SELECT DISTINCT user_id, username
    FROM presence_records
    WHERE guild_id = ${guildId}
  `;

  console.log(`👥 Found ${users.length} users with records\n`);

  const results: { username: string, streak: number, totalRecords: number, weekdayRecords: number }[] = [];

  for (const user of users) {
    const records = await sql`
      SELECT present_date
      FROM presence_records
      WHERE user_id = ${user.user_id} AND guild_id = ${guildId}
      ORDER BY present_date DESC
    `;

    const presentDates = new Set(records.map(r => dateToString(r.present_date)));
    const { streak } = calculateConsecutiveWeekdayStreak(presentDates, timezone);

    const weekdayRecords = records.filter(r => {
      const d = new Date(r.present_date + 'T12:00:00');
      return d.getDay() !== 0 && d.getDay() !== 6;
    }).length;

    results.push({
      username: user.username,
      streak,
      totalRecords: records.length,
      weekdayRecords
    });
  }

  // Sort by streak
  results.sort((a, b) => b.streak - a.streak);

  console.log('🏆 STREAK LEADERBOARD');
  console.log('--------------------------------------------------------------------------------');
  console.log(`| ${'#'.padEnd(3)} | ${'Username'.padEnd(25)} | ${'Streak'.padEnd(6)} | ${'Weekdays'.padEnd(8)} | ${'Total'.padEnd(6)} |`);
  console.log('--------------------------------------------------------------------------------');

  results.forEach((r, i) => {
    console.log(`| ${(i + 1).toString().padEnd(3)} | ${r.username.padEnd(25)} | ${r.streak.toString().padEnd(6)} | ${r.weekdayRecords.toString().padEnd(8)} | ${r.totalRecords.toString().padEnd(6)} |`);
  });

  console.log('--------------------------------------------------------------------------------');
  console.log(`\n💡 Streak = consecutive weekdays (Mon-Fri). Weekends are skipped.`);
}

async function checkUserStreak(guildId: string, userId: string, timezone: string) {
  // Get user info
  const userResult = await sql`
    SELECT DISTINCT username
    FROM presence_records
    WHERE user_id = ${userId} AND guild_id = ${guildId}
    LIMIT 1
  `;

  const username = userResult.length > 0 ? userResult[0].username : 'Unknown';
  console.log(`👤 User: ${username} (${userId})\n`);

  // Get presence records
  const records = await sql`
    SELECT present_date
    FROM presence_records
    WHERE user_id = ${userId} AND guild_id = ${guildId}
    ORDER BY present_date DESC
  `;

  console.log(`📅 PRESENCE RECORDS IN DATABASE (${records.length} total)`);
  console.log('------------------------------------------');

  if (records.length === 0) {
    console.log('  No records found');
  } else {
    // Show last 14 records
    const showRecords = records.slice(0, 14);
    showRecords.forEach(r => {
      const d = new Date(r.present_date + 'T12:00:00');
      const dayName = getDayName(d.getDay());
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      console.log(`  ${r.present_date} (${dayName}) ${isWeekend ? '← WEEKEND (ignored)' : ''}`);
    });

    if (records.length > 14) {
      console.log(`  ... and ${records.length - 14} more`);
    }
  }

  // Calculate streak
  const presentDates = new Set(records.map(r => dateToString(r.present_date)));
  const { streak, log } = calculateConsecutiveWeekdayStreak(presentDates, timezone);

  console.log('\n📈 STREAK CALCULATION STEP-BY-STEP');
  console.log('------------------------------------------');
  log.forEach(l => console.log(l));

  // Count weekday vs weekend records
  const weekdayRecords = records.filter(r => {
    const d = new Date(r.present_date + 'T12:00:00');
    return d.getDay() !== 0 && d.getDay() !== 6;
  }).length;

  const weekendRecords = records.length - weekdayRecords;

  console.log('\n==========================================');
  console.log(`🔥 CURRENT STREAK: ${streak}`);
  console.log(`==========================================`);
  console.log(`   Total records:   ${records.length}`);
  console.log(`   Weekday records: ${weekdayRecords} (counted)`);
  console.log(`   Weekend records: ${weekendRecords} (ignored)`);
}

run().catch(console.error);
