import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import { sessionOptions } from '@/lib/session';

import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);

    if (!(req.method === 'GET' || req.method === "DELETE")) {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const email = session.email;

    if (!email) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // On DELETE: logout (destroy session)
    if (req.method === 'DELETE') {
        session.destroy();
        return res.status(200).json({ message: 'Session cleared' });
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
        return res.status(403).json({ error: 'Inactive or unauthorized user' });
    }

    if( !user.is_verified ) {
        session.destroy();
        return res.status(403).json({ error: 'User not verified' });
    }

    if(session.role != user.role) {
        session.destroy();
        return res.status(403).json({ error: 'Permissions Updated' });
    }

    session.email = user.email_id;
    session.role = user.role;
    session.name = user.name;

    session.save();

    return res.status(200).json({
        email: user.email_id,
        role: user.role,
        name: user.name,
        is_active: user.is_active,
        is_verified: user.is_verified,
    });
}

export default handler;
