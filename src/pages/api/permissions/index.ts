import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { prisma } from "../../../lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {},
            }
        }
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);
    const role = session?.user?.role as USER_ROLE;

    if (req.method === "GET") {
        try {
            const rolePerm = await prisma.role_permission.findUnique({
                where: { role },
                include: {
                    permissions: {
                        select: {
                            permission: true
                        }
                    }
                }
            });

            apiHelpers.success(res, {
                permissions: rolePerm?.permissions.map(p => p.permission) || [],
                description: rolePerm?.description || ""
            });

            return;

        } catch (error) {
            console.error("Error fetching permissions:", error);
            apiHelpers.error(res, "Failed to fetch permissions", 500);
            return;
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
