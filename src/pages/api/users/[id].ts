// /pages/api/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getIronSession, IronSessionData } from 'iron-session';
import { sessionOptions } from '@/lib/session';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const userId = parseInt(req.query.id as string);

    if (isNaN(userId)) {
        return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const session = await getIronSession<IronSessionData>(req, res, sessionOptions);

    // if (!session || !session.name || !session.email) {
    //     return res.status(401).json({ success: false, error: "Unauthorized or session invalid" });
    // }

    if (req.method === 'GET') {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    disha_profile: {
                        include: {
                            mentor: true,
                        },
                    },
                    shadow_as_user2: {
                        include: {
                            user1: true,
                        },
                    },
                    shadow_as_user1: {
                        include: {
                            user2: true
                        }
                    },
                    disha_mentees: {
                        include: {
                            user: true,
                        },
                    },
                },
            });

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            // const isSelf = user.name === session.name && user.email_id === session.email;

            // if (!isSelf) {
            //     return res.status(403).json({ success: false, error: "Access denied" });
            // }

            let result: Record<string, any> = {
                id: user.id,
                name: user.name,
                role: user.role,
                email_id: user.email_id,
                pgpid: user.pgpid,
                pcomid: user.pcomid
            };

            // For STUDENT or SUPER_STUDENT
            if (user.role === "STUDENT" || user.role === "SUPER_STUDENT") {
                result.disha_mentor = user.disha_profile?.mentor
                    ? {
                        name: user.disha_profile.mentor.name,
                        email_id: user.disha_profile.mentor.email_id,
                    }
                    : null;

                if (user.shadow_as_user2?.user1) {
                    result.shadow = {
                        name: user.shadow_as_user2.user1.name,
                        email_id: user.shadow_as_user2.user1.email_id,
                    };
                } else if (user.shadow_as_user1?.user2) {
                    result.shadow = {
                        name: user.shadow_as_user1.user2.name,
                        email_id: user.shadow_as_user1.user2.email_id,
                    };
                } else {
                    result.shadow = null;
                }
            }

            if (user.disha_mentees.length > 0) {
                result.mentees = user.disha_mentees.map((mentee) => ({
                    name: mentee.user.name,
                    email_id: mentee.user.email_id,
                }));
            }

            result.is_student = (user.role === "STUDENT" || user.role === "SUPER_STUDENT");

            return res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error("User fetch failed:", error);
            return res.status(500).json({ success: false, error: "Failed to retrieve user" });
        }
    }



    if (req.method === 'PATCH') {
        if (session.role !== "ADMIN") {
            return res.status(403).json({ success: false, error: "Access denied" });
        }

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
        if (session.role !== "ADMIN") {
            return res.status(403).json({ success: false, error: "Access denied" });
        }
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
