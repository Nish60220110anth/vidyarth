export function shallowEqualByKeys(a: Record<string, unknown>, b: Record<string, unknown>) {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for (const k of keys) {
        if (a?.[k] !== b?.[k]) return false;
    }
    return true;
}
