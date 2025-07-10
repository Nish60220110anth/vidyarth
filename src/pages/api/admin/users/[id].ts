// /pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getIronSession, IronSessionData } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { prisma } from "@/lib/prisma";
import { apiHelpers } from '@/lib/server/responseHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);

    if (!session || session?.role !== "ADMIN") {
        return apiHelpers.unauthorized(res, "UnAuthorized Request")
    }
    if (req.method !== "PATCH" && req.method !== "DELETE") {
        res.setHeader("Allow", ["PATCH", "DELETE"]);
        return apiHelpers.methodNotAllowed(res)
    }

    const userId = parseInt(req.query.id as string);

    if (req.method === 'PATCH') {
        const { role, is_active, is_verified } = req.body;

        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) {
                return apiHelpers.notFound(res, "User not found")
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    role,
                    is_active,
                    is_verified,
                },
            });

            return apiHelpers.success(res, updatedUser);
        } catch (error: any) {
            return apiHelpers.error(res, error || 'User update failed', 500);
        }
    }
    else if (req.method === 'DELETE') {
        try {
            const user = await prisma.user.findUnique({
                where: {
                    id: userId
                }
            })

            if (!user) {
                return apiHelpers.notFound(res, "User not found")
            }

            await prisma.user.delete({
                where: { id: userId },
            });

            return apiHelpers.success(res, { success: true });
        } catch (error: any) {
            return apiHelpers.error(res, error || 'User deletion failed', 500);
        }
    }
}
