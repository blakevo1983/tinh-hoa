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
} as const;

export const GAME_LIMITS = {
  minStatValue: 1,
  maxStatValue: 100,
  maxTraitsPerCreature: 3,
  defaultOfflineCapSec: 8 * 60 * 60, // 8 hours offline progression cap
  maxChatMessageLength: 300,
  maxDisplayNameLength: 32,
  minDisplayNameLength: 3,
} as const;
