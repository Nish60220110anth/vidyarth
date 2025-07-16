import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { ACCESS_PERMISSION, NOTIFICATION_TYPE, USER_ROLE } from '@prisma/client';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { apiHelpers } from '@/lib/server/responseHelpers';

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS],
        filters: {
            [ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS]: {
                priority: 1,
                filter: {},
            },
        },
    },
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS],
    },
};

const ALL_NOTIFICATION_TYPES = Object.values(NOTIFICATION_TYPE);

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (method === 'GET') {
        try {
            const allEntries = [];

            for (const type of ALL_NOTIFICATION_TYPES) {
                const existing = await prisma.notification_properties.findFirst({
                    where: { type },
                });

                if (!existing) {
                    const created = await prisma.notification_properties.create({
                        data: {
                            type,
                            send_email: false,
                            delay: 0,
                            only_for_target: true,
                        },
                    });
                    allEntries.push(created);
                } else {
                    allEntries.push(existing);
                }
            }

            apiHelpers.success(res, { data: allEntries });
            return;
        } catch (error) {
            apiHelpers.error(res, 'Failed to fetch or create notification properties.', 500, { error });
            return;
        }
    }

    if (method === 'PUT') {
        const { type, role, send_email, delay, only_for_target } = req.body;

        if (!type || typeof send_email !== 'boolean' || typeof delay !== 'number') {
            apiHelpers.badRequest(res, 'Invalid request body');
            return;
        }

        try {
            const updated = await prisma.notification_properties.upsert({
                where: {
                    type: type as NOTIFICATION_TYPE,
                },
                update: {
                    send_email,
                    delay,
                    only_for_target,
                    role: role || null,
                },
                create: {
                    type: type as NOTIFICATION_TYPE,
                    send_email,
                    delay,
                    only_for_target,
                    role: role || null,
                },
            });

            apiHelpers.success(res, { data: updated });
            return;
        } catch (error) {
            apiHelpers.error(res, 'Failed to update notification property.', 500, { error });
            return;
        }
    }

    apiHelpers.methodNotAllowed(res);
    return;
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
