// /pages/api/users/get-specific.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '@/lib/prisma';
import z from "zod";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";

const GetQuerySchema = z.object({
    id: z.array(z.number()).nonempty("IDs array cannot be empty"),
});

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ADMIN, ACCESS_PERMISSION.MANAGE_MY_COHORT],
    }
}; 


async function handler(req: NextApiRequest, res: NextApiResponse) {
    const parsedQuery = GetQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        return res.status(400).json({ error: parsedQuery.error.issues });
    }

    const { id: ids } = parsedQuery.data;

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

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);