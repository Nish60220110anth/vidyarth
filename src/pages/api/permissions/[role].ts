import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {},
            }
        }
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const { role } = req.query;

    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    if(session.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
    }

    if (typeof role !== "string") {
        return res.status(400).json({ error: "Invalid role format" });
    }

    if(!role) {
        return res.status(400).json({ error: "Role cannot be undefined" });
    }


    if (req.method === "GET") {
        try {
            const rolePerm = await prisma.role_Permission.findUnique({
                where: { role },
                include: {
                    permissions: {
                        select: {
                            permission: true
                        }
                    }
                }
            });

            return res.status(200).json({
                permissions: rolePerm?.permissions.map(p => p.permission) || [],
                description: rolePerm?.description || ""
            });

        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);