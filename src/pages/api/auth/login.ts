import { sessionOptions } from '@/lib/session';
import { getIronSession, IronSession, IronSessionData } from 'iron-session';
import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { prisma } from "@/lib/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email_id: email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if(user.is_active === false) {
            return res.status(403).json({ error: 'Account is inactive. Please contact support.', success: false });
        }

        if(user.is_verified === false) {
            return res.status(403).json({ error: 'Account is not verified. Please contact support', success: false });
        }

        const session: IronSession<IronSessionData> = await getIronSession(req, res, sessionOptions);
        session.email = user.email_id;
        session.role = user.role;
        session.name = user.name;
        
        await session.save();

        return res.status(200).json({ message: 'Login successful', role: user.role, success: true });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' , success: false});
    }
}

export default handler;
