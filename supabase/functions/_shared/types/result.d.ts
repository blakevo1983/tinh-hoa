export type ErrorCode = "INSUFFICIENT_RESOURCES" | "COOLDOWN" | "VERSION_CONFLICT" | "NOT_OWNER" | "RATE_LIMITED" | "INVALID_INPUT";
export interface GameError {
    readonly code: ErrorCode;
    readonly messageKey: string;
    readonly details?: Readonly<Record<string, unknown>>;
}
export type Result<T, E = GameError> = {
    readonly ok: true;
    readonly value: T;
} | {
    readonly ok: false;
    readonly error: E;
};
export declare function ok<T>(value: T): Result<T, never>;
export declare function err<E = GameError>(error: E): Result<never, E>;
export declare function createGameError(code: ErrorCode, messageKey: string, details?: Record<string, unknown>): GameError;
//# sourceMappingURL=result.d.ts.map