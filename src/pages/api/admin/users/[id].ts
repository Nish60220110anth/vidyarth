// /pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from "@/lib/prisma";
import { apiHelpers } from '@/lib/server/responseHelpers';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION } from '@prisma/client';

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    patch: {
        permissions: [
            ACCESS_PERMISSION.ADMIN
        ],
        filters: {
            [ACCESS_PERMISSION.ADMIN]: {
                priority: 1,
                filter: {},
            }
        }
    },
    delete: {
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
                apiHelpers.notFound(res, "User not found")
                return;
            }

            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    role,
                    is_active,
                    is_verified,
                },
            });

            apiHelpers.success(res, {
                data: updatedUser
            });
            return;
        } catch (error: any) {
            apiHelpers.error(res, error || 'User update failed', 500);
            return;
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
                apiHelpers.notFound(res, "User not found")
                return;
            }

            await prisma.user.delete({
                where: { id: userId },
            });

            apiHelpers.success(res, {});
            return;
        } catch (error: any) {
            apiHelpers.error(res, error || 'User deletion failed', 500);
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);