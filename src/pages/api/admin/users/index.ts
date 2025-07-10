// /pages/api/admin/users.ts
import { NextApiRequest, NextApiResponse } from "next";
import {  USER_ROLE } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);

    if (!session || session?.role !== "ADMIN") {
        return apiHelpers.unauthorized(res, "UnAuthorized Request")
    }

    if (req.method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return apiHelpers.methodNotAllowed(res)
    }

    if (req.method === "GET") {
        const { role } = req.query;

        const whereClause =
            typeof role === "string"
                ? { role: role as USER_ROLE }
                : { role: { not: USER_ROLE.ADMIN } };

        try {
            const users = await prisma.user.findMany({
                where: {
                    ...whereClause
                },
                select: {
                    id: true,
                    name: true,
                    email_id: true,
                    pgpid: true,
                    pcomid: true,
                    role: true,
                    created_at: true,
                    is_active: true,
                    is_verified: true,
                    disha_profile: {
                        select: {
                            mentor_id: true,
                            placement_cycle: true
                        },
                    },
                    shadow_as_user1: {
                        select: { user1Id: true, user2Id: true },
                    },
                    shadow_as_user2: {
                        select: { user2Id: true, user1Id: true },
                    },
                },
                orderBy: {
                    created_at: "desc",
                },
            });

            return res.status(200).json(users);
        } catch (err) {
            console.error("Failed to fetch users:", err);
            return res.status(500).json({ error: "Failed to fetch users" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
