import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions } from '@/lib/session';

import { prisma } from "@/lib/prisma";
import { apiHelpers } from '@/lib/server/responseHelpers';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);

    if (!(req.method === 'GET' || req.method === "DELETE")) {
        apiHelpers.methodNotAllowed(res, req.method, ['GET', 'DELETE']);
        return;
    }

    const userSession = session.user;

    if (!userSession) {
        apiHelpers.unauthorized(res, "User not logged in");
        return;
    }

    const email = userSession?.email;

    if (req.method === 'DELETE') {
        session.destroy();
        apiHelpers.success(res, { message: 'Session cleared' });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { email_id: email },
    });

    if (!user || !user.is_active) {
        session.destroy();
        apiHelpers.unauthorized(res, "User not found or inactive");
        return;
    }

    const signoutExists = await prisma.signouts.findFirst({
        where: {
            userId: user.id,
        }
    });

    if (!user.is_verified) {
        session.destroy();
        apiHelpers.unauthorized(res, "User not verified");
        return;
    }

    if (!!signoutExists) {
        session.destroy();
        apiHelpers.unauthorized(res, "User signed out of process");
        return;
    }

    if (userSession.role != user.role) {
        session.destroy();
        apiHelpers.unauthorized(res, "Permissions Updated, please login again");
        return;
    }

    const role_id = await prisma.role_permission.findUnique({
        where: { role: user.role },
    });

    let permissions: string[] = [];

    if (role_id) {
        permissions = await prisma.rolepermissionmap.findMany({
            where: { role_permission_id: role_id.id },
            select: { permission: true },
        }).then(perms => perms.map(perm => perm.permission));
    }

    session.user = {
        email: user.email_id,
        role: user.role,
        name: user.name,
        id: user.id,
        is_active: user.is_active,
        is_verified: user.is_verified,
        permissions,
        pcomid: user.pcomid ? user.pcomid : undefined,
    };

    await session.save();

    apiHelpers.success(res, {
        data: {...session.user },
    });

    return;
}

export default handler;
