// /pages/api/users/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, USER_ROLE } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    // if (!session || session?.role !== "ADMIN") {
    //     return res.status(403).json({ error: "Access denied" });
    // }

    if (!session) {
        return res.status(403).json({ error: "Access denied" });
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
                    ...whereClause, is_active: true,
                    is_verified: true,
                },
                select: {
                    id: true,
                    name: true,
                    email_id: true,
                    pgpid: true,
                    pcomid: true,
                    role: true,
                    is_active: true,
                    is_verified: true,
                    created_at: true,
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
