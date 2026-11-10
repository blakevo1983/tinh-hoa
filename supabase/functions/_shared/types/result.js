export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
export function createGameError(code, messageKey, details) {
    return {
        code,
        messageKey,
        ...(details ? { details: Object.freeze({ ...details }) } : {}),
    };
}
//# sourceMappingURL=result.js.map