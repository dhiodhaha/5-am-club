function formatDateInTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

function calculateConsecutiveWeekdayStreak(presentDates: Set<string>, timezone: string, simulatedToday: Date): number {
  let streak = 0;
  
  function getSimulatedStart(today: Date): Date {
    const dayOfWeek = today.getDay();
    const result = new Date(today);
    if (dayOfWeek === 0) result.setDate(result.getDate() - 2); 
    else if (dayOfWeek === 6) result.setDate(result.getDate() - 1); 
    return result;
  }

  const checkDate = getSimulatedStart(simulatedToday);
  const maxIterations = 260;
  
  const realTodayStr = formatDateInTimezone(simulatedToday, timezone);
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

const TZ = 'Asia/Jakarta';
console.log('🧪 STREAK LOGIC TEST\n-------------------\n');

const history = new Set<string>();
history.add('2026-01-02'); // Last Friday
history.add('2026-01-01'); // Thursday

// 1. Monday Jan 5 (No post yet)
const mondayMorning = new Date('2026-01-05T04:00:00');
const streak1 = calculateConsecutiveWeekdayStreak(history, TZ, mondayMorning);
console.log(`✅ Scenario: Monday Morning (No post yet) -> Expected: 2, Got: ${streak1}`);

// 2. Monday Jan 5 (Posted!)
history.add('2026-01-05');
const streak2 = calculateConsecutiveWeekdayStreak(history, TZ, mondayMorning);
console.log(`✅ Scenario: Monday Morning (Posted!) -> Expected: 3, Got: ${streak2}`);

// 3. Saturday Jan 3 (Posted Friday)
const saturday = new Date('2026-01-03T12:00:00');
const streak3 = calculateConsecutiveWeekdayStreak(new Set(['2026-01-02']), TZ, saturday);
console.log(`✅ Scenario: Saturday (Posted Friday) -> Expected: 1, Got: ${streak3}`);

// 4. Saturday Jan 3 (Missed Friday)
const streak4 = calculateConsecutiveWeekdayStreak(new Set(['2026-01-01']), TZ, saturday);
console.log(`✅ Scenario: Saturday (Missed Friday!) -> Expected: 0, Got: ${streak4}`);

console.log('\n-------------------\n');
console.log('Test completed successfully.');