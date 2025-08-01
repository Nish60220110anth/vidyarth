// pages/api/shortlists/index.ts
import { sessionOptions } from "@/lib/session";
import { getIronSession, IronSessionData } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_MY_SECTION,
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_MY_SECTION]: {
                priority: 1,
                filter: {},
            }
        },
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const userSession = await getIronSession<IronSessionData>(req, res, sessionOptions);
        const rawCount = req.query.count;
        const count = rawCount ? Number(rawCount) : undefined;

        if (rawCount && count && isNaN(count)) {
            apiHelpers.badRequest(res, "Count should be a number");
            return;
        }

        const user = await prisma.user.findUniqueOrThrow({
            where: { email_id: userSession.email },
            select: {
                id: true,
                pcomid: true,
                is_active: true,
                is_verified: true,
            },
        });

        const shortlists = await prisma.shortlist.findMany({
            where: {
                shortlisted_users: {
                    some: {
                        pcomid: user.pcomid,
                    },
                },
                company: {
                    is_featured: true
                },
                is_active: true,
                is_featured: true
            },
            orderBy: {
                created_at: "desc",
            },
            include: {
                company: true,
                shortlisted_users: true
            },
            take: count
        });

        apiHelpers.success(res, { shortlists })
        return;
    } catch (error) {
        console.error("Error fetching user shortlists:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);