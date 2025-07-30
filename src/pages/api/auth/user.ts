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

    const email = session.email;

    if (!email) {
        session.destroy();
        apiHelpers.unauthorized(res, "User not logged in");
        return;
    }

    // On DELETE: logout (destroy session)
    if (req.method === 'DELETE') {
        session.destroy();
        apiHelpers.success(res, { message: 'Session cleared' });
        return;
    }

    // Validate user existence and activity
    const user = await prisma.user.findUnique({
        where: { email_id: email },
        select: {
            id: true,
            name: true,
            email_id: true,
            role: true,
            is_active: true,
            is_verified: true,
        },
    });

    if (!user || !user.is_active) {
        session.destroy();
        apiHelpers.unauthorized(res, "User not found or inactive");
        return;
    }

    const signoutExists = await prisma.signouts.findFirst({
        where: {
            userId: user.id,
        },
        select: {
            id: true,
        },
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

    if (session.role != user.role) {
        session.destroy();
        apiHelpers.unauthorized(res, "Permissions Updated, please login again");
        return;
    }

    session.email = user.email_id;
    session.role = user.role;
    session.name = user.name;

    session.save();

    apiHelpers.success(res, {
        email: user.email_id,
        role: user.role,
        name: user.name,
        id: user.id,
        is_active: user.is_active,
        is_verified: user.is_verified,
    });
    return;
}

export default handler;
