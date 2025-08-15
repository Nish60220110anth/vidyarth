// /pages/api/admin/users.ts
import { NextApiRequest, NextApiResponse } from "next";
import {  ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ADMIN
        ],
        filters: {
            [ACCESS_PERMISSION.ADMIN]: {
                priority: 1,
                filter: {},
            }
        }
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

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

            apiHelpers.success(res, {
                data: users,
            });
            return;
        } catch (err) {
            console.error("Failed to fetch users:", err);
            apiHelpers.error(res, "Failed to fetch users", 500);
            return;
        }
    }

    apiHelpers.methodNotAllowed(res);
    return;
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);