type Json =
    | null
    | string
    | number
    | boolean
    | Json[]
    | { [key: string]: Json };

export function deepEqual(a: Json, b: Json): boolean {
    if (a === b) return true;
    if (a === null || b === null) return a === b;

    const ta = typeof a, tb = typeof b;
    if (ta !== "object" || tb !== "object") return false;

    // arrays
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i] as Json, b[i] as Json)) return false;
        }
        return true;
    }

    // objects
    const ak = Object.keys(a as Record<string, Json>);
    const bk = Object.keys(b as Record<string, Json>);
    if (ak.length !== bk.length) return false;

    // compare values by sorted keys for determinism
    ak.sort();
    bk.sort();
    for (let i = 0; i < ak.length; i++) {
        if (ak[i] !== bk[i]) return false;
        const k = ak[i];
        if (!deepEqual(
            (a as Record<string, Json>)[k],
            (b as Record<string, Json>)[k]
        )) return false;
    }
    return true;
}
