import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { PrismaClient, USER_ROLE, ACCESS_PERMISSION } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSessionData = await getIronSession(req, res, sessionOptions);

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }
    
    if (!session?.email || session.role?.toUpperCase() !== USER_ROLE.ADMIN) {
        return res.status(403).json({ error: "Unauthorized: Admin access required" });
    }
    
    const { role, permissions, description } = req.body;

    if (
        !role ||
        !Object.values(USER_ROLE).includes(role) ||
        !Array.isArray(permissions) ||
        !permissions.every((p) => Object.values(ACCESS_PERMISSION).includes(p))
    ) {
        return res.status(400).json({ error: "Invalid role or permissions" });
    }

    try {
        const rolePerm = await prisma.role_permission.upsert({
            where: { role },
            update: { description },
            create: { role, description },
        });

        await prisma.rolepermissionmap.deleteMany({
            where: { role_permission_id: rolePerm.id },
        });

        await prisma.rolepermissionmap.createMany({
            data: permissions.map((permission: ACCESS_PERMISSION) => ({
                role_permission_id: rolePerm.id,
                permission,
            })),
            skipDuplicates: true,
        });

        return res.status(200).json({ message: `Permissions updated for ${role}` });

    } catch (error) {
        console.error("Permission update error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
