import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { ACCESS_PERMISSION, NOTIFICATION_TYPE, USER_ROLE } from '@prisma/client';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { apiHelpers } from '@/lib/server/responseHelpers';
import { z } from 'zod';

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

const PutQuerySchema = z.object({
    type: z.enum(NOTIFICATION_TYPE),
    role: z.enum(USER_ROLE).nullable().optional(),
    send_email: z.boolean().default(true),
    delay_minutes: z.number().int().min(0).default(10),
    only_for_target: z.boolean().default(false),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    try {
        if (method === 'GET') {
            try {

                const DEFAULTS = {
                    send_email: true,
                    delay_minutes: 10,
                    only_for_target: false,
                    role: USER_ROLE.ADMIN
                };

                const allEntries = await prisma.$transaction(async (tx) => {
                    await tx.notification_properties.createMany({
                        data: ALL_NOTIFICATION_TYPES.map((type) => ({ type, ...DEFAULTS })),
                        skipDuplicates: true,
                    });

                    const rows = await tx.notification_properties.findMany({
                        where: { type: { in: ALL_NOTIFICATION_TYPES } },
                    });

                    const order = new Map(ALL_NOTIFICATION_TYPES.map((t, i) => [t, i]));
                    rows.sort((a, b) => (order.get(a.type)! - order.get(b.type)!));

                    return rows;
                });

                apiHelpers.success(res, { data: allEntries });
                return;
            } catch (error) {
                apiHelpers.error(res, 'Failed to fetch or create notification properties.', 500, { error });
                return;
            }
        }
        else if (method === 'PUT') {

            const parsedQuery = PutQuerySchema.safeParse(req.body);

            if (!parsedQuery.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${parsedQuery.error.message}`);
                return;
            }

            const { type, send_email, delay_minutes, only_for_target, role } = parsedQuery.data;

            const data = {
                send_email,
                delay_minutes,
                only_for_target,
                role: role ?? null,
            };

            const updated = await prisma.notification_properties.upsert({
                where: { type },
                update: data,
                create: { type, ...data },
                select: {
                    type: true,
                    send_email: true,
                    delay_minutes: true,
                    only_for_target: true,
                    role: true,
                },
            });

            apiHelpers.success(res, { data: updated });
            return;
        }

        apiHelpers.methodNotAllowed(res);
        return;
    }
    catch (error) {
        console.error('Error in notification properties handler:', error);
        apiHelpers.error(res, 'Internal server error', 500, { error });
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
