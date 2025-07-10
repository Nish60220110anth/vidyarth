import type { NextApiResponse } from "next";

type Extra = Record<string, any>;

export const apiHelpers = {
    // 200 OK
    success<T>(res: NextApiResponse, data: T, status = 200) {
        return res.status(status).json({ success: true, ...data });
    },

    // 201 Created
    created<T>(res: NextApiResponse, data: T) {
        return res.status(201).json({ success: true, ...data });
    },

    // 204 No Content
    noContent(res: NextApiResponse) {
        return res.status(204).end();
    },

    // 400 Bad Request
    badRequest(res: NextApiResponse, message = "Bad Request", extra: Extra = {}) {
        return apiHelpers.error(res, message, 400, extra);
    },

    // 401 Unauthorized
    unauthorized(res: NextApiResponse, message = "Unauthorized", extra: Extra = {}) {
        return apiHelpers.error(res, message, 401, extra);
    },

    // 403 Forbidden
    forbidden(res: NextApiResponse, message = "Forbidden", extra: Extra = {}) {
        return apiHelpers.error(res, message, 403, extra);
    },

    // 404 Not Found
    notFound(res: NextApiResponse, message = "Not Found", extra: Extra = {}) {
        return apiHelpers.error(res, message, 404, extra);
    },

    // 405 Method Not Allowed
    methodNotAllowed(res: NextApiResponse, message = "Method Not Allowed", extra: Extra = {}) {
        return apiHelpers.error(res, message, 405, extra);
    },

    // 409 Conflict
    conflict(res: NextApiResponse, message = "Conflict", extra: Extra = {}) {
        return apiHelpers.error(res, message, 409, extra);
    },

    // 422 Unprocessable Entity
    unprocessableEntity(res: NextApiResponse, message = "Unprocessable Entity", extra: Extra = {}) {
        return apiHelpers.error(res, message, 422, extra);
    },

    // 429 Too Many Requests
    tooManyRequests(res: NextApiResponse, message = "Too Many Requests", extra: Extra = {}) {
        return apiHelpers.error(res, message, 429, extra);
    },

    // 500+ Server Error
    error(res: NextApiResponse, message = "Internal Server Error", status = 500, extra: Extra = {}) {
        if (status >= 500) console.error("[API Error]", message, extra);
        return res.status(status).json({ success: false, error: message, ...extra });
    },
};
