/**
 * Generate streak fire emoji based on streak count
 * More fires for longer streaks (1 fire per 5 days, max 5)
 */
export function getStreakEmoji(streak: number): string {
  if (streak <= 0) {
    return '❄️';
  }
  const fireCount = Math.min(Math.ceil(streak / 5), 5);
  return '🔥'.repeat(fireCount);
}

/**
 * Get medal emoji for leaderboard position
 */
export function getMedalEmoji(position: number): string {
  const medals = ['🥇', '🥈', '🥉'];
  return medals[position] || `**${position + 1}.**`;
}

/**
 * Get motivational message based on streak
 */
export function getStreakMotivation(streak: number): string {
  if (streak >= 20) {
    return '🏆 **UNSTOPPABLE!** 20+ day streak - You\'re a legend!';
  }
  if (streak >= 10) {
    return '⭐ **Incredible!** 10+ day streak - Keep it going!';
  }
  if (streak >= 5) {
    return '🔥 **On Fire!** 5+ day streak - Building discipline!';
  }
  if (streak >= 3) {
    return '💪 **Nice streak!** Keep the momentum!';
  }
  if (streak > 0) {
    return '🌟 Streak started! Don\'t break it!';
  }
  return '🌅 No active streak. Start one tomorrow at 5AM!';
}

/**
 * Get random motivational quote
 */
export function getRandomMotivation(): string {
  const motivations = [
    '💪 *"The early morning has gold in its mouth."* - Benjamin Franklin',
    '🔥 *"Wake up determined, go to bed satisfied."*',
    '⭐ *"Your future is created by what you do today, not tomorrow."*',
    '🚀 *"The secret of getting ahead is getting started."* - Mark Twain',
    '🌟 *"It is well to be up before daybreak, for such habits contribute to health, wealth, and wisdom."* - Aristotle'
  ];
  const randomIndex = Math.floor(Math.random() * motivations.length);
  return motivations[randomIndex];
}

/**
 * Pluralize "day" based on count
 */
export function pluralizeDays(count: number): string {
  return count === 1 ? 'day' : 'days';
}


