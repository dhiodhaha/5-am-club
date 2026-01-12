
// Mock Leaderboard Test
// Run with: npx tsx test-mock-leaderboard.ts

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
  const now = new Date(); // assume "now" is the test run time
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return new Date(formatter.format(now) + 'T12:00:00');
}

function getStartDateForStreakCalculation(timezone: string): Date {
  const today = getCurrentDateInTimezone(timezone);
  const dayOfWeek = today.getDay();
  if (dayOfWeek === 0) today.setDate(today.getDate() - 2);
  else if (dayOfWeek === 6) today.setDate(today.getDate() - 1);
  return today;
}

// ---------------------------------------------------------
// STREAK LOGIC (The exact code from your bot)
// ---------------------------------------------------------
function calculateStreak(presentDates: Set<string>, timezone: string): number {
  let streak = 0;
  const checkDate = getStartDateForStreakCalculation(timezone);
  const maxIterations = 260;
  
  const realToday = getCurrentDateInTimezone(timezone);
  const realTodayStr = formatDateInTimezone(realToday, timezone);
  const checkDateStr = formatDateInTimezone(checkDate, timezone);
  const isCheckDateToday = (realTodayStr === checkDateStr);
  
  // Logic: "Pending" check for today
  if (!presentDates.has(checkDateStr) && isCheckDateToday) {
    checkDate.setDate(checkDate.getDate() - 1);
    const day = checkDate.getDay();
    if (day === 0) checkDate.setDate(checkDate.getDate() - 2);
    else if (day === 6) checkDate.setDate(checkDate.getDate() - 1);
  }

  for (let i = 0; i < maxIterations; i++) {
    const day = checkDate.getDay();
    // Skip weekends
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

// ---------------------------------------------------------
// SIMULATION
// ---------------------------------------------------------
const TZ = 'Asia/Jakarta';

// Helper to generate dates
function generateDates(count: number, includeWeekends: boolean): Set<string> {
  const dates = new Set<string>();
  const d = new Date(); // Start from today
  // Backdate slightly to ensure we have history
  
  let added = 0;
  let daysBack = 0;
  
  while (added < count) {
      const temp = new Date(d);
      temp.setDate(temp.getDate() - daysBack);
      const day = temp.getDay();
      
      const isWeekend = (day === 0 || day === 6);
      
      if (includeWeekends || !isWeekend) {
          dates.add(formatDateInTimezone(temp, TZ));
          added++;
      }
      daysBack++;
  }
  return dates;
}

console.log('🧪 MOCK LEADERBOARD TEST');
console.log('=============================================');

// Mock Users
const users = [
    { 
        name: 'User Strict (Mon-Fri only)', 
        records: generateDates(28, false) // 28 weekdays
    },
    { 
        name: 'User Continuous (28 days incl. Sat/Sun)', 
        records: generateDates(28, true) // 28 total days (approx 20 weekdays)
    },
    { 
        name: 'User Short (3 days)', 
        records: generateDates(3, false) 
    },
    { 
        name: 'User New (0 days)', 
        records: new Set<string>() 
    }
];

// Calculate Leaderboard
const leaderboard = users.map(u => {
    const s = calculateStreak(u.records, TZ);
    return { ...u, streak: s };
}).sort((a, b) => b.streak - a.streak);

// Display
console.log(`| ${'Rank'.padEnd(4)} | ${'User'.padEnd(40)} | ${'Streak'.padEnd(6)} | ${'Actual Data Points'.padEnd(18)} |`);
console.log('--------------------------------------------------------------------------------');
leaderboard.forEach((u, i) => {
    console.log(`| ${('#' + (i+1)).padEnd(4)} | ${u.name.padEnd(40)} | ${u.streak.toString().padEnd(6)} | ${u.records.size.toString().padEnd(18)} |`);
});
console.log('--------------------------------------------------------------------------------');
console.log('Analyze "User Continuous": They have 28 records, but streak is lower because weekends are skipped.');
