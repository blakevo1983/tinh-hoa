export declare const RATE_LIMITS: {
    readonly command: {
        readonly capacity: 60;
        readonly refillRatePerSec: 1;
    };
    readonly ping: {
        readonly capacity: 10;
        readonly refillRatePerSec: 0.1667;
    };
    readonly chat: {
        readonly capacity: 10;
        readonly refillRatePerSec: 0.1667;
    };
};
export declare const GAME_LIMITS: {
    readonly minStatValue: 1;
    readonly maxStatValue: 100;
    readonly maxTraitsPerCreature: 3;
    readonly defaultOfflineCapSec: number;
    readonly maxChatMessageLength: 300;
    readonly maxDisplayNameLength: 32;
    readonly minDisplayNameLength: 3;
};
export declare const CHAT_LIMITS: {
    readonly maxContentLength: 300;
    readonly minIntervalSec: 2;
    readonly maxMessagesPerMinute: 20;
    readonly globalMinIntervalSec: 10;
    readonly minAccountAgeHoursForGlobal: 24;
    readonly minAccountAgeHoursForDm: 24;
    readonly maxRepeatedMessages: 2;
    readonly historyPageLimit: 50;
};
//# sourceMappingURL=limits.d.ts.map