// pages/api/auth/google-login.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { sessionOptions } from '@/lib/session';
import { getIronSession, IronSession, IronSessionData } from 'iron-session';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).end();

    const { email, name } = req.body;

    if (!email || !name) return res.status(400).json({ error: 'Invalid request' });

    const existingUser = await prisma.user.findUnique({ where: { email_id: email } });

    if (existingUser) {
        if (existingUser.is_active && existingUser.is_verified) {
            const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);
            session.email = existingUser.email_id;
            session.role = existingUser.role;
            session.name = existingUser.name;

            await session.save();
            return res.status(200).json({ message: 'Logged in', role: existingUser.role, is_active: existingUser.is_active, is_verified: existingUser.is_verified,
                name: existingUser.name
             });
        } else if (existingUser.is_active && !existingUser.is_verified) {
            return res.status(200).json({ error: 'Approval pending' , role: existingUser.role, is_active: existingUser.is_active, is_verified: existingUser.is_verified, success: false });
        } else {
            return res.status(403).json({ error: 'Account inactive', role: existingUser.role, is_active: existingUser.is_active, is_verified: existingUser.is_verified, sucess: false });
        }
    }

    await prisma.user.create({
        data: {
            email_id: email,
            name,
            role: 'STUDENT', // or assign default
            is_active: true,
            is_verified: false,
            password: '',
        },
    });

    return res.status(200).json({ message: 'Registered. Await admin approval.', role: 'STUDENT', is_active: true, is_verified: false , success: true});
}
