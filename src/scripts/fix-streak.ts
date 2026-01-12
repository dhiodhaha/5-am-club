
import sql from '../db/connection.js';
import { 
  getStartDateForStreakCalculation, 
  formatDateInTimezone, 
  getCurrentDateInTimezone 
} from '../db/queries.js';

// ==========================================
// HELPER FUNCTIONS (Copied to ensure standalone execution)
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
  if (dayOfWeek === 0) today.setDate(today.getDate() - 2);
  else if (dayOfWeek === 6) today.setDate(today.getDate() - 1);
  return today;
}

// ==========================================
// LOGIC
// ==========================================

function calculateStreak(presentDates: Set<string>, timezone: string): number {
  let streak = 0;
  const checkDate = getStartDateForStreakCalculation(timezone);
  const maxIterations = 260;
  
  const realToday = getCurrentDateInTimezone(timezone);
  const realTodayStr = formatDateInTimezone(realToday, timezone);
  const checkDateStr = formatDateInTimezone(checkDate, timezone);
  const isCheckDateToday = (realTodayStr === checkDateStr);
  
  if (!presentDates.has(checkDateStr) && isCheckDateToday) {
    checkDate.setDate(checkDate.getDate() - 1);
    const day = checkDate.getDay();
    if (day === 0) checkDate.setDate(checkDate.getDate() - 2);
    else if (day === 6) checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    if (day === 0 || day === 6) {
      checkDate.setDate(checkDate.getDate() - 1);
      continue;
    }
    const dateStr = formatDateInTimezone(checkDate, timezone);
    if (presentDates.has(dateStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break; 
    }
  }
  return streak;
}

async function run() {
  const userId = process.argv[2];
  const guildId = process.argv[3];
  const targetStreak = parseInt(process.argv[4]);

  if (!userId || !guildId || isNaN(targetStreak)) {
    console.error('Usage: npx tsx src/scripts/fix-streak.ts <user_id> <guild_id> <target_streak>');
    process.exit(1);
  }

  try {
    console.log(`\n🔧 FIXING STREAK for User: ${userId} in Guild: ${guildId}`);
    console.log(`   Target Streak: ${targetStreak}`);

    // 1. Get Timezone & Current Records
    const tzResult = await sql`SELECT timezone FROM guild_settings WHERE guild_id = ${guildId}`;
    const timezone = tzResult.length > 0 ? tzResult[0].timezone : 'Asia/Jakarta';
    
    const users = await sql`SELECT username FROM presence_records WHERE user_id = ${userId} LIMIT 1`;
    const username = users.length > 0 ? users[0].username : 'UnknownUser';
    console.log(`   Username: ${username} | Timezone: ${timezone}`);

    const records = await sql`
        SELECT present_date 
        FROM presence_records 
        WHERE user_id = ${userId} AND guild_id = ${guildId}
        ORDER BY present_date DESC
    `;
    const presentDates = new Set(records.map(r => r.present_date));
    
    // 2. Calculate Current
    const currentStreak = calculateStreak(presentDates, timezone);
    console.log(`   Current Calculated Streak: ${currentStreak}`);

    if (currentStreak >= targetStreak) {
        console.log(`✅ Streak is already ${currentStreak} (>= ${targetStreak}). No action needed.`);
        return;
    }

    // 3. Backfill
    const needed = targetStreak - currentStreak;
    console.log(`⚠️  Need to add ${needed} historic days...`);
    
    // Find where the streak broke
    // Run logic again but stop at break point
    let checkDate = getStartDateForStreakCalculation(timezone);
    const maxIterations = 500;
    
    // Fast forward through existing streak
    // (We re-run logic simplified to find the "next" missing date)
    // Actually simpler: just generate dates backwards from checkDate until we find 'needed' empty slots
    
    const datesToAdd: string[] = [];
    let addedCount = 0;

    // Align checkDate to logic start
    const realToday = getCurrentDateInTimezone(timezone);
    const realTodayStr = formatDateInTimezone(realToday, timezone);
    const checkDateStr = formatDateInTimezone(checkDate, timezone);
    const isCheckDateToday = (realTodayStr === checkDateStr);
    
    if (!presentDates.has(checkDateStr) && isCheckDateToday) {
       checkDate.setDate(checkDate.getDate() - 1);
       if (checkDate.getDay() === 0) checkDate.setDate(checkDate.getDate() - 2);
       else if (checkDate.getDay() === 6) checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < maxIterations; i++) {
        if (addedCount >= needed) break;

        const day = checkDate.getDay();
        if (day === 0 || day === 6) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }

        const dateStr = formatDateInTimezone(checkDate, timezone);
        if (!presentDates.has(dateStr)) {
            // Found a gap! Fill it.
            datesToAdd.push(dateStr);
            presentDates.add(dateStr); // Add to local set so next iteration sees it
            addedCount++;
        }
        
        checkDate.setDate(checkDate.getDate() - 1);
    }

    console.log(`   📝 Inserting dates: ${datesToAdd.join(', ')}`);
    
    // Execute SQL
    for (const date of datesToAdd) {
        await sql`
            INSERT INTO presence_records (user_id, username, guild_id, present_date)
            VALUES (${userId}, ${username}, ${guildId}, ${date})
            ON CONFLICT DO NOTHING
        `;
    }

    console.log(`✅ SUCCESS! Added ${datesToAdd.length} days.`);
    console.log(`🎉 New Streak should be: ${targetStreak}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
