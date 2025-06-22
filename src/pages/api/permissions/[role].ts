import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const { role } = req.query;

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
            console.error("Error fetching permissions:", error);
            return res.status(500).json({ error: "Internal server error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
