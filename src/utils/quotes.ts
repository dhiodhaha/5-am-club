/**
 * 50 motivational quotes for 5AM Club presence feedback
 */
const PRESENCE_QUOTES: string[] = [
  // Success & Achievement
  "🌅 The world belongs to those who wake up early!",
  "💪 Champions are made at 5AM while others sleep.",
  "🏆 Success starts before the sun rises.",
  "⭐ Early risers write history, late sleepers read about it.",
  "🚀 Your future self will thank you for this moment.",
  
  // Discipline & Consistency
  "🔥 Discipline is choosing what you want most over what you want now.",
  "💎 Small daily improvements lead to stunning results.",
  "⚡ The pain of discipline weighs ounces, regret weighs tons.",
  "🎯 Consistency beats intensity. You showed up, that's what matters.",
  "🛡️ Build habits that build you.",
  
  // Morning Power
  "☀️ Sunrise is nature's way of saying: let's start fresh!",
  "🌄 The early morning has gold in its mouth.",
  "🐦 The early bird doesn't just get the worm—it gets the whole garden.",
  "🌟 While the world sleeps, winners are already winning.",
  "✨ 5AM: when dreams meet determination.",
  
  // Motivation
  "💥 You didn't come this far to only come this far!",
  "🔱 Greatness is earned in the quiet hours.",
  "👑 Wear your 5AM wake-up like a crown.",
  "🎖️ Every morning is a chance to be legendary.",
  "⚔️ Conquer the morning, conquer the day.",
  
  // Growth Mindset
  "🌱 Growth happens outside your comfort zone—like your bed.",
  "📈 Today's sacrifice is tomorrow's success.",
  "🧠 Your mind is strongest when the world is quietest.",
  "💡 Ideas flow better when the world is still asleep.",
  "🔮 The magic happens when no one is watching.",
  
  // Community
  "🤝 You're not alone. The 5AM Club rises together!",
  "👊 Respect. Another warrior joins the morning ranks.",
  "🦁 The pride gathers at dawn. Welcome, lion.",
  "🐺 The pack hunts at 5AM. You're one of us.",
  "⚡ United we rise, literally.",
  
  // Humor & Fun
  "☕ Coffee tastes better when you've earned it at 5AM.",
  "😴 Your bed called. You didn't answer. Respect.",
  "🛏️ Bed: 'Come back!' You: 'I have a legacy to build.'",
  "📱 Your alarm worked and so did your willpower!",
  "🏃 Running from excuses since 5AM.",
  
  // Wisdom
  "🦉 The wise know that mornings are for warriors.",
  "📚 Learn, earn, and rise—all before breakfast.",
  "🧘 Peace is found in the stillness of early hours.",
  "🌊 Ride the morning wave while others drown in snooze.",
  "🏔️ Mountains are climbed one early morning at a time.",
  
  // Energy & Power
  "⚡ Charged up and ready to dominate the day!",
  "🔋 Battery at 100%. You're powered by discipline.",
  "💣 You just dropped an energy bomb on today.",
  "🎸 Rock the day like you rock the morning.",
  "🥊 Today didn't stand a chance. You're already winning.",
  
  // Reflection
  "🪞 Look in the mirror—that's a 5AM champion staring back.",
  "🌈 After the darkness of sleep comes the light of achievement.",
  "🎭 Not everyone will understand the grind. But the results will.",
  "📝 Another day, another entry in your success journal.",
  "🏅 Medal unlocked: Morning Warrior."
];

/**
 * Get a random motivational quote for presence feedback
 */
export function getRandomPresenceQuote(): string {
  const randomIndex = Math.floor(Math.random() * PRESENCE_QUOTES.length);
  return PRESENCE_QUOTES[randomIndex];
}

/**
 * Get a random quote different from the last one shown
 */
export function getUniqueRandomQuote(lastQuote?: string): string {
  let quote = getRandomPresenceQuote();
  
  // Try to get a different quote if it matches the last one
  if (lastQuote && quote === lastQuote) {
    const maxAttempts = 3;
    for (let i = 0; i < maxAttempts; i++) {
      quote = getRandomPresenceQuote();
      if (quote !== lastQuote) break;
    }
  }
  
  return quote;
}

