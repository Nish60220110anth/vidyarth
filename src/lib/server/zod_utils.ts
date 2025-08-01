import { DOMAIN } from "@prisma/client";
import { z } from "zod";

export const asSingle = (v: unknown) => (Array.isArray(v) ? v[0] : v);

export const ToInt = z.preprocess((v) => {
    const x = asSingle(v);
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : undefined;
}, z.number().int().positive());

export const ToBool = z.preprocess((v) => {
    const x = asSingle(v);
    if (typeof x === "boolean") return x;
    if (typeof x === "string") return x.toLowerCase() === "true";
    return undefined;
}, z.boolean());

export const ToStr = z.preprocess((v) => {
    const x = asSingle(v);
    if (x == null) return undefined;
    return typeof x === "string" ? x : String(x);
}, z.string().trim().min(1));

export const ToDomains = z.preprocess((v) => {
    if (v == null) return undefined;

    let list: unknown[] = [];

    if (Array.isArray(v)) {
        list = v;
    } else if (typeof v === "string") {
        const s = v.trim();
        if (s.startsWith("[") && s.endsWith("]")) {
            try {
                list = JSON.parse(s);
            } catch {
                list = [s];
            }
        } else {
            list = s.split(",");
        }
    } else {
        list = [v];
    }

    return list
        .flat(Infinity)
        .map((d) => String(d).trim().toUpperCase())
        .filter((d) => d.length > 0);
}, z.array(z.enum(DOMAIN)).min(1));
