import { sessionOptions } from '@/lib/session';
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from "@/lib/prisma";
import { apiHelpers } from '@/lib/server/responseHelpers';

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (!(req.method === 'POST')) {
        apiHelpers.methodNotAllowed(res, req.method, ['POST']);
        return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
        apiHelpers.badRequest(res, 'Missing credentials');
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email_id: email },
        });

        if (!user) {
            apiHelpers.unauthorized(res, 'Invalid email or password');
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            apiHelpers.unauthorized(res, 'Invalid email or password');
            return;
        }

        if (user.is_active === false) {
            apiHelpers.forbidden(res, 'Account is inactive. Please contact support.');
            return;
        }

        if (user.is_verified === false) {
            apiHelpers.forbidden(res, 'Account is not verified. Please contact support.');
            return;
        }

        const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);
        session.user = {
            id: user.id,
            email: user.email_id,
            role: user.role,
            name: user.name,
            is_active: user.is_active,
            is_verified: user.is_verified,
            pcomid: user.pcomid ? user.pcomid : undefined,
        };
        await session.save();

        apiHelpers.success(res, {user: session.user });
        return;

    } catch (error) {
        console.error('Login error:', error);
        apiHelpers.error(res, 'Internal server error');
        return;
    }
}

export default handler;
