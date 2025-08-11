import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";

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

const GetQuerySchema = z.object({
    role: z.enum(USER_ROLE),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    const parsedQuery = GetQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
        apiHelpers.error(res, `Invalid query parameters: ${parsedQuery.error}`, 400);
        return;
    }

    console.log("Session role:", session.role);

    if (session.role !== USER_ROLE.ADMIN) {
        apiHelpers.forbidden(res, "You do not have permission to access this resource");
        return;
    }

    if (req.method === "GET") {
        try {
            const rolePerm = await prisma.role_permission.findUnique({
                where: { role: parsedQuery.data.role },
                include: {
                    permissions: {
                        select: {
                            permission: true
                        }
                    }
                }
            });

            apiHelpers.success(res, {
                data: {
                    permissions: rolePerm ? rolePerm.permissions.map(p => p.permission) : [],
                    description: rolePerm ? rolePerm.description : "No description available"
                }
            });

            return;

        } catch (error) {
            apiHelpers.error(res, `Error fetching role permissions: ${error}`, 500);
            return;
        }
    }


    apiHelpers.methodNotAllowed(res, `Method ${req.method} not allowed`);
    return;
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);