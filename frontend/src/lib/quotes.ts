// Motivational Quotes and Suggestions for Mental Health Support
// Categorized by mood and time of day for contextual support

export const QUOTES_BY_MOOD = {
    sad: [
        "It's okay to not be okay. Your feelings are valid.",
        "This feeling is temporary. You've overcome hard times before.",
        "Be gentle with yourself. You're doing the best you can.",
        "It's okay to take a break and rest.",
        "You don't have to be perfect. Progress, not perfection.",
        "Your worth isn't measured by your productivity.",
        "It's okay to ask for help. That takes courage.",
        "Small steps still move you forward.",
    ],
    neutral: [
        "Take a moment to breathe and check in with yourself.",
        "Every day is a new opportunity for growth.",
        "You're exactly where you need to be right now.",
        "Balance is a practice, not a destination.",
        "It's okay to take things one step at a time.",
        "Your journey is uniquely yours.",
        "Rest when you need to. You deserve it.",
        "Progress isn't always linear, and that's okay.",
    ],
    happy: [
        "Celebrate this moment. You've earned it.",
        "Your positive energy is contagious. Share it!",
        "Keep nurturing what brings you joy.",
        "You're doing amazing. Keep going!",
        "This is what resilience looks like.",
        "Your growth is inspiring.",
        "Savor this feeling. You deserve happiness.",
        "Your light makes a difference.",
    ],
};

export const QUOTES_BY_TIME = {
    morning: [
        "Good morning. Today is full of possibilities.",
        "Start your day with kindness—toward yourself and others.",
        "You woke up today. That's already an achievement.",
        "Take a deep breath. You've got this.",
    ],
    afternoon: [
        "You're halfway through the day. Take a moment to pause.",
        "It's okay if today didn't go as planned.",
        "Give yourself credit for what you've accomplished so far.",
        "A short break can make a big difference.",
    ],
    evening: [
        "As the day winds down, be gentle with yourself.",
        "Reflect on one thing that went well today.",
        "It's okay to let go of what didn't work out.",
        "Rest is productive too.",
    ],
    night: [
        "You made it through another day. That matters.",
        "Tomorrow is a fresh start.",
        "Let go of today's worries. You deserve peace.",
        "Sleep is healing. Give yourself permission to rest.",
    ],
};

type Mood = 'sad' | 'neutral' | 'happy';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Get the current time of day category
 */
export function getTimeOfDay(): TimeOfDay {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Get a contextual quote based on mood or time of day
 * @param mood - Optional mood state (sad, neutral, happy)
 * @param timeOfDay - Optional time of day (morning, afternoon, evening, night)
 * @returns A motivational quote or suggestion
 */
export function getQuote(mood?: Mood, timeOfDay?: TimeOfDay): string {
    // Prioritize mood-based quotes if mood is provided
    if (mood && QUOTES_BY_MOOD[mood]) {
        const quotes = QUOTES_BY_MOOD[mood];
        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    // Fall back to time-based quotes
    const time = timeOfDay || getTimeOfDay();
    const quotes = QUOTES_BY_TIME[time];
    return quotes[Math.floor(Math.random() * quotes.length)];
}

/**
 * Get a grounding suggestion based on current state
 */
export function getGroundingSuggestion(): string {
    const suggestions = [
        "Try the 5-4-3-2-1 technique: Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, and 1 you taste.",
        "Take 5 deep breaths. Inhale for 4 counts, hold for 4, exhale for 4.",
        "Place your hand on your heart. Feel it beating. You're here, you're alive.",
        "Look around and name 3 things you're grateful for right now.",
        "Stand up and stretch. Notice how your body feels.",
        "Drink a glass of water slowly. Notice the sensation.",
        "Write down 3 things that went well today, no matter how small.",
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
}
