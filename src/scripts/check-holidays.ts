import sql from '../db/connection.js';

function dateToString(date: Date | string): string {
  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(date);
}

async function run() {
  const guildId = '1241378547680022529';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Check holidays
  const holidays = await sql`
    SELECT id, start_date, end_date, name, type, source
    FROM guild_holidays
    WHERE guild_id = ${guildId}
    ORDER BY start_date DESC
  `;

  console.log('🎄 HOLIDAYS SET:');
  if (holidays.length === 0) {
    console.log('  No holidays found');
  } else {
    holidays.forEach(h => {
      const startStr = dateToString(h.start_date);
      const endStr = dateToString(h.end_date);
      console.log(`  ${startStr} to ${endStr} - ${h.name} (${h.type}, ${h.source})`);
    });
  }

  // Check all records for agusmu7 to see the gap
  console.log('\n📅 AGUSMU7 ALL RECORDS:');
  const records = await sql`
    SELECT present_date
    FROM presence_records
    WHERE guild_id = ${guildId} AND username = 'agusmu7'
    ORDER BY present_date DESC
  `;

  let prevDate: Date | null = null;
  records.forEach(r => {
    const dateStr = dateToString(r.present_date);
    const d = new Date(dateStr + 'T12:00:00');

    // Check for gap
    let gapNote = '';
    if (prevDate) {
      const diffDays = Math.round((prevDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        gapNote = ` ⚠️ GAP: ${diffDays - 1} days missing`;
      }
    }

    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    console.log(`  ${dateStr} (${days[d.getDay()]})${isWeekend ? ' [WEEKEND]' : ''}${gapNote}`);
    prevDate = d;
  });

  // Build holiday date set for checking
  const holidayDates = new Set<string>();
  for (const h of holidays) {
    const start = new Date(dateToString(h.start_date) + 'T12:00:00');
    const end = new Date(dateToString(h.end_date) + 'T12:00:00');

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      holidayDates.add(dateToString(d));
    }
  }

  // Find what dates are missing between Jan 5 and Dec 26
  console.log('\n🔍 MISSING WEEKDAYS (Dec 27 2025 - Jan 4 2026):');
  const checkDates = [
    '2025-12-27', // Sat
    '2025-12-28', // Sun
    '2025-12-29', // Mon
    '2025-12-30', // Tue
    '2025-12-31', // Wed
    '2026-01-01', // Thu
    '2026-01-02', // Fri
    '2026-01-03', // Sat
    '2026-01-04', // Sun
  ];

  const presentDates = new Set(records.map(r => dateToString(r.present_date)));

  checkDates.forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    const hasRecord = presentDates.has(dateStr);
    const isHoliday = holidayDates.has(dateStr);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

    let status = hasRecord ? '✅ Present' : '❌ Missing';
    let notes: string[] = [];
    if (isWeekend) notes.push('WEEKEND');
    if (isHoliday) notes.push('🎄 HOLIDAY');

    console.log(`  ${dateStr} (${days[d.getDay()]}) - ${status} ${notes.join(' ')}`);
  });

  console.log('\n⚠️ IMPORTANT: Currently, streak calculation ONLY skips weekends.');
  console.log('   Holidays are NOT being skipped in streak count!');

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
