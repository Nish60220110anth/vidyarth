import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { z } from "zod";
import { ToInt } from "@/lib/server/zod_utils";

// GET: ?userId=123
// POST: { userId, title, brief, is_link, where_to_look, link_name }

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS,
            ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS]: {
                priority: 2,
                filter: {},
            },
            [ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS]: {
                priority: 1,
                filter: {},
            },
        },
    }
};

const GetQuerySchema = z.object({
    userId: ToInt.refine((val) => val > 0, {
        message: "userId must be a positive integer",
    }),
    take: ToInt.optional().default(3),
}).strict();

const PostBodySchema = z.object({
    userId: ToInt.refine((val) => val > 0, {
        message: "userId must be a positive integer",
    }),
    title: z.string().min(1, "Title is required"),
    brief: z.string().min(1, "Brief is required"),
    is_link: z.boolean(),
    where_to_look: z.string().min(1, "Where to look is required"),
    link_name: z.string().min(1, "Link name is required"),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "GET") {
            const parsedQuery = GetQuerySchema.safeParse(req.query);

            if (!parsedQuery.success) {
                apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
                return;
            }

            const session: IronSessionData = await getIronSession<IronSessionData>(req, res, sessionOptions);

            if (parsedQuery.data.userId) {
                const user = await prisma.user.findUnique({
                    where: {
                        id: parsedQuery.data.userId
                    }
                })

                if ((user?.email_id !== session.email) || !user?.is_active || !user?.is_verified) {
                    apiHelpers.forbidden(res, "You do not have permission to access this user's announcements");
                    return;
                }
            }

            const announcements = await prisma.announcements.findMany({
                where: {
                    ...(parsedQuery.data.userId
                        ? {
                            user: {
                                some: {
                                    id: parsedQuery.data.userId,
                                    is_active: true,
                                    is_verified: true,
                                },
                            },
                        }
                        : {}),
                },
                orderBy: {
                    updated_at: "desc",
                },
                take: parsedQuery.data.take,
            });


            apiHelpers.success(res, { data: announcements })
            return;
        }
        else if (req.method === "POST") {

            const parsedBody = PostBodySchema.safeParse(req.body);
            if (!parsedBody.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${parsedBody.error.message}`);
                return;
            }

            const { userId, title, brief, is_link, where_to_look, link_name } = parsedBody.data;

            const newAnnouncement = await prisma.announcements.create({
                data: {
                    user: {
                        connect: { id: userId },
                    },
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