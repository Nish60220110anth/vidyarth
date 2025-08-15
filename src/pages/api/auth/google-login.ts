// pages/api/auth/google-login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { sessionOptions } from '@/lib/session';
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { apiHelpers } from '@/lib/server/responseHelpers';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { email, name } = req.body;

    if (!email || !name) return res.status(400).json({ error: 'Invalid request' });

    const existingUser = await prisma.user.findUnique({ where: { email_id: email } });
    const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);

    if (existingUser) {
        if (existingUser.is_active && existingUser.is_verified) {
            session.user = {
                email: existingUser.email_id,
                role: existingUser.role,
                name: existingUser.name,
                id: existingUser.id,
                is_active: existingUser.is_active,
                is_verified: existingUser.is_verified,
            };
            await session.save();
            apiHelpers.success(res, { user: session.user });
            return;
        } else if (existingUser.is_active && !existingUser.is_verified) {
            apiHelpers.success(res, { error: 'Approval pending', user: session.user });
            return;
        } else {
            apiHelpers.unauthorized(res, 'Account inactive');
            return;
        }
    }

    apiHelpers.notFound(res, 'User not found');
    return;
}
