export type ErrorCode =
  | "INSUFFICIENT_RESOURCES"
  | "COOLDOWN"
  | "VERSION_CONFLICT"
  | "NOT_OWNER"
  | "RATE_LIMITED"
  | "INVALID_INPUT";

export interface GameError {
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type Result<T, E = GameError> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E = GameError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function createGameError(
  code: ErrorCode,
  messageKey: string,
  details?: Record<string, unknown>,
): GameError {
  return {
    code,
    messageKey,
    ...(details ? { details: Object.freeze({ ...details }) } : {}),
  };
}
