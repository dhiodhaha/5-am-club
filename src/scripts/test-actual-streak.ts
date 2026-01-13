import { getStreakLeaderboard } from '../db/queries.js';
import { getGuildTimezone } from '../db/guildSettings.js';

async function run() {
  const guildId = '1241378547680022529';

  console.log('🧪 TESTING ACTUAL STREAK CALCULATION (with holiday skip)');
  console.log('=========================================================\n');

  const timezone = await getGuildTimezone(guildId);
  console.log(`Timezone: ${timezone}`);

  const today = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  console.log(`Today: ${formatter.format(today)}\n`);

  const leaderboard = await getStreakLeaderboard(guildId);

  console.log('🏆 STREAK LEADERBOARD (from actual queries.ts):');
  console.log('------------------------------------------------');
  console.log(`| ${'#'.padEnd(3)} | ${'Username'.padEnd(20)} | ${'Streak'.padEnd(6)} |`);
  console.log('------------------------------------------------');

  leaderboard.forEach((entry, i) => {
    console.log(`| ${(i + 1).toString().padEnd(3)} | ${entry.username.padEnd(20)} | ${entry.current_streak.toString().padEnd(6)} |`);
  });

  console.log('------------------------------------------------');

  if (leaderboard.length === 0) {
    console.log('\n⚠️ No users with active streaks found.');
  }

  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
