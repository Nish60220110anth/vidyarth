import { NextApiRequest, NextApiResponse } from "next";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { prisma } from "../../../lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.ADMIN],
        filters: {
            [ACCESS_PERMISSION.ADMIN]: {
                priority: 1,
                filter: {},
            }
        }
    },
};

const PostBodySchema = z.object({
    role: z.enum(USER_ROLE),
    permissions: z.array(z.enum(ACCESS_PERMISSION)),
    description: z.string().optional(),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const parsedBody = PostBodySchema.safeParse(req.body);

    if (!parsedBody.success) {
        return res.status(400).json({ error: `Invalid request body: ${parsedBody.error}` });
    }

    const { role, permissions, description } = parsedBody.data;

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

        apiHelpers.success(res, {
            message: `Permissions updated for ${role}`,
            role,
            permissions,
            description,
        });

        return;

    } catch (error) {
        console.error("Permission update error:", error);
        apiHelpers.error(res, "Failed to update permissions", 500);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);