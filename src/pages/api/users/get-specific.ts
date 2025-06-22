// /pages/api/users/get-specific.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, USER_ROLE } from "@prisma/client";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getIronSession(req, res, sessionOptions);

    if (!session || (session.role !== "ADMIN" && session.role !== "DISHA")) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Invalid or missing user IDs" });
    }

    try {
        const users = await prisma.user.findMany({
            where: { id: { in: ids } },
            select: {
                id: true,
                name: true,
                pcomid: true,
                pgpid: true,
                disha_profile: {
                    select: {
                        mentor_id: true,
                        placement_cycle: {
                            select: {
                                placement_type: true,
                            },
                        },
                    },
                },
                shadow_as_user1: {
                    select: {
                        user1Id: true,
                        user2Id: true,
                    },
                },
                shadow_as_user2: {
                    select: {
                        user1Id: true,
                        user2Id: true
                    },
                },
            },
        });

        return res.status(200).json(users);
    } catch (err) {
        console.error("Fetch specific users error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
}
