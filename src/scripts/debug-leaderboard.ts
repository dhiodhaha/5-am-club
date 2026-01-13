import sql from '../db/connection.js';

// ==========================================
// HELPER FUNCTIONS (Copied from src/db/queries.ts)
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
  
  // If today is weekend, start from last Friday
  if (dayOfWeek === 0) { // Sunday
    today.setDate(today.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    today.setDate(today.getDate() - 1);
  }
  
  return today;
}

// ==========================================
// LOGIC
// ==========================================

// Logic strictly mimicking the bot
function calculateDebugStreak(presentDates: Set<string>, timezone: string): { streak: number, details: string[] } {
  let streak = 0;
  const details: string[] = [];
  
  const checkDate = getStartDateForStreakCalculation(timezone);
  const maxIterations = 260;
  
  const realToday = getCurrentDateInTimezone(timezone);
  const realTodayStr = formatDateInTimezone(realToday, timezone);
  const checkDateStr = formatDateInTimezone(checkDate, timezone);
  const isCheckDateToday = (realTodayStr === checkDateStr);
  
  // Logic: If checking today (weekday) and not present yet, assume pending and check yesterday
  if (!presentDates.has(checkDateStr) && isCheckDateToday) {
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Weekend skip
    const day = checkDate.getDay();
    if (day === 0) checkDate.setDate(checkDate.getDate() - 2);
    else if (day === 6) checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    const dateStr = formatDateInTimezone(checkDate, timezone);

    // Skip weekends
    if (day === 0 || day === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    
    if (presentDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      details.push(`Broken at ${dateStr}`);
      break; 
    }
  }
  return { streak, details };
}

async function run() {
  const guildId = process.argv[2];

  if (!guildId) {
    console.error('Usage: npx tsx src/scripts/debug-leaderboard.ts <guild_id>');
    process.exit(1);
  }

  try {
    console.log(`
📊 DEBUGGING LEADERBOARD for Guild: ${guildId}`);
    
    // 1. Get Timezone
    const tzResult = await sql`SELECT timezone FROM guild_settings WHERE guild_id = ${guildId}`;
    const timezone = tzResult.length > 0 ? tzResult[0].timezone : 'Asia/Jakarta';
    console.log(`🌍 Timezone: ${timezone}\n`);

    // 2. Get All Users
    const users = await sql`
        SELECT DISTINCT user_id, username 
        FROM presence_records 
        WHERE guild_id = ${guildId}
    `;
    console.log(`👥 Found ${users.length} users with records.\n`);

    const leaderboard = [];

    // 3. Calculate for each
    for (const user of users) {
        const records = await sql`
            SELECT present_date 
            FROM presence_records 
            WHERE user_id = ${user.user_id} AND guild_id = ${guildId}
        `;
        const presentDates = new Set(records.map(r => r.present_date));
        
        const { streak, details } = calculateDebugStreak(presentDates, timezone);
        
        leaderboard.push({
            username: user.username,
            streak,
            total_records: records.length,
            debug: details[0] || 'Active'
        });
    }

    // 4. Sort and Print
    leaderboard.sort((a, b) => b.streak - a.streak);

    console.log('🏆 STREAK LEADERBOARD (Debug View)');
    console.log('----------------------------------------------------------------------------------');
    console.log(`| ${'Rank'.padEnd(4)} | ${'Username'.padEnd(20)} | ${'Streak'.padEnd(6)} | ${'Total Recs'.padEnd(10)} | ${'Note'.padEnd(25)} |`);
    console.log('----------------------------------------------------------------------------------');
    
    leaderboard.slice(0, 20).forEach((entry, index) => {
        console.log(`| ${('#' + (index + 1)).padEnd(4)} | ${(entry.username || 'Unknown').padEnd(20)} | ${entry.streak.toString().padEnd(6)} | ${entry.total_records.toString().padEnd(10)} | ${entry.debug.padEnd(25)} |`);
    });
    console.log('----------------------------------------------------------------------------------');

  } catch (error) {
    console.error(error);
  } finally {
    process.exit(0);
  }
}

run();