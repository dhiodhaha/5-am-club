function formatDateInTimezone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function calculateConsecutiveWeekdayStreak(presentDates: Set<string>, timezone: string): number {
  let streak = 0;
  
  // Start from "Today" (simulated as Monday, Jan 29, 2024 to capture the 28 days prior)
  // Let's assume the 28 days ended yesterday (Sunday) or Friday.
  // Let's simplify: Start checking from a known date and go back.
  
  const checkDate = new Date('2024-01-29T12:00:00'); // A Monday
  const maxIterations = 260;

  // STRICT Logic (copied from your bot)
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

const TZ = 'Asia/Jakarta';

// Create 28 days of continuous data (including weekends)
// From Jan 1, 2024 to Jan 28, 2024
const history = new Set<string>();
for (let i = 1; i <= 28; i++) {
  const day = i.toString().padStart(2, '0');
  history.add(`2024-01-${day}`);
}

console.log('🧪 VERIFYING 28 DAYS CONTINUOUS DATA (Strict Mon-Fri Logic)');
console.log('---------------------------------------------------------');
console.log(`Database contains: 28 records (Jan 01 - Jan 28)`);
console.log(`Includes: 20 Weekdays, 8 Weekend days`);

// We simulate checking on Monday, Jan 29
const streak = calculateConsecutiveWeekdayStreak(history, TZ);

console.log(`\n🔥 Calculated Streak: ${streak}`);
console.log('---------------------------------------------------------');

if (streak === 20) {
    console.log("❌ RESULT: The bot ignores the 8 weekend days.");
    console.log("   It counts only the 20 weekdays.");
} else if (streak === 28) {
    console.log("✅ RESULT: It counted everything.");
}
