import sql from '../db/connection.js';

async function run() {
  const guildId = '1241378547680022529';

  console.log('📅 CHECKING DATABASE RECORDS\n');

  // Get raw record to see actual format
  const rawRecords = await sql`
    SELECT present_date
    FROM presence_records
    WHERE guild_id = ${guildId}
    LIMIT 5
  `;

  console.log('Raw present_date format from DB:');
  rawRecords.forEach(r => {
    console.log(`  Value: "${r.present_date}"`);
    console.log(`  Type: ${typeof r.present_date}`);
    console.log(`  Is Date: ${r.present_date instanceof Date}`);
    if (r.present_date instanceof Date) {
      console.log(`  toISOString: ${r.present_date.toISOString()}`);
    }
    console.log('');
  });

  // The fix: convert Date to YYYY-MM-DD string
  const records = await sql`
    SELECT user_id, username, present_date
    FROM presence_records
    WHERE guild_id = ${guildId}
    ORDER BY present_date DESC
    LIMIT 20
  `;

  console.log('\n📊 Records with proper date format:');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  records.forEach(r => {
    // Convert to YYYY-MM-DD format
    let dateStr: string;
    if (r.present_date instanceof Date) {
      // Extract date parts in local timezone
      const year = r.present_date.getFullYear();
      const month = String(r.present_date.getMonth() + 1).padStart(2, '0');
      const day = String(r.present_date.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    } else {
      dateStr = String(r.present_date);
    }

    const d = new Date(dateStr + 'T12:00:00');
    const dayName = days[d.getDay()];
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    console.log(`  ${dateStr} (${dayName}) - ${r.username} ${isWeekend ? '← WEEKEND' : ''}`);
  });

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
