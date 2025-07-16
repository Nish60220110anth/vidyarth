// pages/api/shortlists/index.ts
import { sessionOptions } from "@/lib/session";
import { getIronSession, IronSessionData } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({ message: "Method not allowed" });
        }

        const userSession = await getIronSession<IronSessionData>(req, res, sessionOptions);
        if (!userSession) {
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (!userSession?.email) {
            return res.status(401).json({ message: "Unauthorized: No email in session" });
        }

        const user = await prisma.user.findFirst({
            where: { email_id: userSession.email },
            select: {
                id: true,
                pcomid: true,
                is_active: true,
                is_verified: true,
            },
        });

        if (!user || !user.is_active || !user.is_verified) {
            return res.status(403).json({ message: "User not authorized or not verified" });
        }

        const shortlists = await prisma.shortlist.findMany({
            where: {
                shortlisted_users: {
                    some: {
                        pcomid: user.pcomid,
                    },
                },
            },
            orderBy: {
                created_at: "desc",
            },
            include: {
                company: true,
                shortlisted_users: true
            },
        });

        return res.status(200).json({ success: true, shortlists });
    } catch (error) {
        console.error("Error fetching user shortlists:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}
