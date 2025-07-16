import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getFieldValue } from "@/utils/parseApiField";
import { apiHelpers } from "@/lib/server/responseHelpers";

// GET: ?userId=123
// POST: { userId, title, brief, is_link, where_to_look, link_name }

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {},
            }
        },
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "GET") {
            const { userId } = req.query;

            const session: IronSessionData = await getIronSession<IronSessionData>(req, res, sessionOptions);

            const user = await prisma.user.findUnique({
                where: {
                    id: parseInt(getFieldValue(userId))
                }
            })

            if (user?.email_id !== session.email) {
                apiHelpers.forbidden(res, "Your not allowed to get this data")
                return;
            }

            if (!userId || Array.isArray(userId)) {
                return res.status(400).json({ error: "Missing or invalid userId" });
            }

            const announcements = await prisma.announcements.findMany({
                where: {
                    userId: parseInt(userId),
                },
                orderBy: {
                    created_at: "desc",
                },
            });

            apiHelpers.success(res, { data: announcements })
            return;
        }

        if (req.method === "POST") {
            const { userId, title, brief, is_link, where_to_look, link_name } = req.body;

            if (!userId || !title || !brief || !is_link || !where_to_look) {
                return res.status(400).json({ error: "All fields are required" });
            }

            const newAnnouncement = await prisma.announcements.create({
                data: {
                    userId: parseInt(userId),
                    title,
                    brief,
                    is_link,
                    where_to_look,
                    link_name
                },
            });

            apiHelpers.created(res, { data: newAnnouncement })
            return;
        }
    } catch (error: any) {
        console.error("Error handling announcements API:", error);
        apiHelpers.error(res, "Internal Server Error", 500, { error: error })
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);