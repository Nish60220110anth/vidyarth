// lib/server/withPermissionCheck.ts
import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getPermissions } from "./permissions";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";

import fs from "fs";
import path from "path";

import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

type Handler = (req: NextApiRequest & { filter?: Record<string, any> }, res: NextApiResponse) => Promise<any>;

export type MethodConfig = {
    permissions: ACCESS_PERMISSION[];
    filters?: Partial<Record<
        ACCESS_PERMISSION,
        { priority: number; filter: Record<string, any> }
    >>;
};

type PermissionMap = Record<string, MethodConfig>;

// const redis = new Redis({
//     host: "127.0.0.1",          // or use your Redis host/IP
//     port: 6379,                 // default Redis port
//     password: "nishanth@9344905119",               // add password if your Redis is secured
//     db: 0,                      // Redis DB index (0–15)
//     name: "vidyarth-backend",   // client name
//     lazyConnect: false,         // immediately connect
//     connectTimeout: 10000,      // ms before connection fails
//     maxRetriesPerRequest: 2,    // max retry attempts
//     enableReadyCheck: true,     // ensure server is ready before use
//     enableOfflineQueue: true,   // queue commands while connecting
//     tls: undefined              // add TLS config if using secure Redis
// });
  

// const rateLimiter = new RateLimiterRedis({
//     storeClient: redis,
//     keyPrefix: "api",
//     points: 100, // max requests
//     duration: 60, // per 60 seconds
// });

// async function checkRateLimit(req: NextApiRequest, res: NextApiResponse) {
//     const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

//     try {
//         await rateLimiter.consume(ip as string);
//     } catch {
//         res.status(429).json({ error: "Too many requests" });
//         return true;
//     }

//     return false;
// }

const logUnauthorizedAccess = (details: Record<string, any>) => {
    const logDir = path.join(process.cwd(), "logs");
    const logPath = path.join(logDir, "unauthorized.log");
    const logEntry = `[${new Date().toISOString()}] ${JSON.stringify(details)}\n`;

    fs.mkdir(logDir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
            console.error("Failed to create logs directory:", mkdirErr);
            return;
        }

        fs.appendFile(logPath, logEntry, (err) => {
            if (err) {
                console.error("Failed to write to unauthorized log:", err);
            }
        });
    });
};


export function withPermissionCheck(METHOD_PERMISSIONS: PermissionMap) {
    return function wrap(handler: Handler) {
        return async function wrappedHandler(req: NextApiRequest, res: NextApiResponse) {
            // if (await checkRateLimit(req, res)) return;

            const session: IronSessionData = await getIronSession(req, res, sessionOptions);
            const role: USER_ROLE = (session?.role as USER_ROLE) ?? USER_ROLE.STUDENT;

            const permissions = await getPermissions(role);
            const method = req.method?.toLowerCase() || "";
            const methodConfig = METHOD_PERMISSIONS[method];

            if (!methodConfig) {
                return res.status(405).json({ error: "Method not allowed" });
            }

            const declaredPermissions = methodConfig.permissions ?? [];

            const requestedPermissionRaw = req.headers["x-access-permission"] as string | undefined;
            const requestedPermission = requestedPermissionRaw as ACCESS_PERMISSION | undefined;

            if (!requestedPermission) {
                return res.status(400).json({ error: "Missing or invalid x-access-permission header" });
            }

            const isDeclared = declaredPermissions.includes(requestedPermission);
            const isGranted = permissions.includes(requestedPermission);

            if (!isDeclared || !isGranted) {
                logUnauthorizedAccess({
                    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
                    method: req.method,
                    url: req.url,
                    role,
                    requiredPermissions: declaredPermissions,
                    userPermissions: permissions,
                    attemptedPermission: requestedPermission,
                    reason: !isDeclared ? "Permission not declared for this method" : "Permission not granted to user",
                });

                return res.status(403).json({ error: "Forbidden: Permission denied" });
            }

            if (methodConfig.filters?.[requestedPermission]) {
                (req as any).filter = methodConfig.filters[requestedPermission]?.filter;
            }

            return handler(req as any, res);
        };
    };
}
