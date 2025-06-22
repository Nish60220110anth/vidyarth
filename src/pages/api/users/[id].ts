// /pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = parseInt(req.query.id as string);

    const session = await getIronSession(req, res, sessionOptions);

    if (!session || session?.role !== "ADMIN") {
        return res.status(403).json({ error: "Access denied" });
    }

    if (req.method === 'PATCH') {
        const { role, is_active, is_verified } = req.body;

        try {
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    role,
                    is_active,
                    is_verified,
                },
            });

            return res.status(200).json(updatedUser);
        } catch (error) {
            return res.status(500).json({ error: 'User update failed' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            await prisma.user.delete({
                where: { id: userId },
            });
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ error: 'User deletion failed' });
        }
    }
  
    return res.status(405).json({ error: 'Method not allowed' });
}
