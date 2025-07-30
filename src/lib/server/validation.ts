import { z } from "zod";
import { NextApiResponse } from "next";
import { apiHelpers } from "@/lib/server/responseHelpers";


export function parseQueryOr400<T extends z.ZodType>(
    schema: T,
    query: unknown,
    res: NextApiResponse
): z.infer<T> | null {
    const parsed = schema.safeParse(query);
    if (!parsed.success) {
        const errors = z.flattenError(parsed.error);
        apiHelpers.badRequest(
            res,
            `Invalid query parameters: ${JSON.stringify(errors)}`
        );
        return null;
    }
    return parsed.data;
}

export function parseBodyOr400<T extends z.ZodType>(
    schema: T,
    body: unknown,
    res: NextApiResponse
): z.infer<T> | null {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        const errors = z.flattenError(parsed.error); // v4 replacement for .flatten()
        apiHelpers.badRequest(
            res,
            `Invalid request body: ${JSON.stringify(errors)}`
        );
        return null;
    }
    return parsed.data;
}
