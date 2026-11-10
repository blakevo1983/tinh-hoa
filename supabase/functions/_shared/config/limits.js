export const RATE_LIMITS = {
    command: {
        capacity: 60,
        refillRatePerSec: 1, // 60 requests per minute
    },
    ping: {
        capacity: 10,
        refillRatePerSec: 0.1667, // 10 requests per minute
    },
    chat: {
        capacity: 10,
        refillRatePerSec: 0.1667, // 10 messages per minute
    },
};
export const GAME_LIMITS = {
    minStatValue: 1,
    maxStatValue: 100,
    maxTraitsPerCreature: 3,
    defaultOfflineCapSec: 8 * 60 * 60, // 8 hours offline progression cap
    maxChatMessageLength: 300,
    maxDisplayNameLength: 32,
    minDisplayNameLength: 3,
};
export const CHAT_LIMITS = {
    maxContentLength: 300,
    minIntervalSec: 2, // Maximum 1 message per 2 seconds
    maxMessagesPerMinute: 20,
    globalMinIntervalSec: 10, // Global channel interval: 1 message per 10s
    minAccountAgeHoursForGlobal: 24, // Requires account age >= 24h for global chat
    minAccountAgeHoursForDm: 24, // Requires account age >= 24h for DM with strangers
    maxRepeatedMessages: 2, // Block 2+ identical consecutive messages
    historyPageLimit: 50,
};
//# sourceMappingURL=limits.js.map