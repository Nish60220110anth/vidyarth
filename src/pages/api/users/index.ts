// /pages/api/users/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from '@/lib/prisma';
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ADMIN],
    },
};

const GetQuerySchema = z.object({
    role: z.enum(USER_ROLE),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "GET") {

        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters`);
            return;
        }

        const { role } = parsedQuery.data;
        const whereClause = role ? { role } : { role: { not: USER_ROLE.ADMIN } };

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

            apiHelpers.success(res, users);
            return;
        } catch (err) {
            console.error("Failed to fetch users:", err);
            apiHelpers.error(res, "Failed to fetch users");
            return;
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}


export default withPermissionCheck(METHOD_PERMISSIONS)(handler);