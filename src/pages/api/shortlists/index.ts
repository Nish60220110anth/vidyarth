// pages/api/shortlists/index.ts
import { sessionOptions } from "@/lib/session";
import { getIronSession, IronSessionData } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import z from "zod";
import { ToInt } from "@/lib/server/zod_utils";

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

const GetQuerySchema = z.object({
    count: ToInt.optional(),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const userSession = await getIronSession<IronSessionData>(req, res, sessionOptions);
        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${JSON.stringify(parsedQuery.error)}`);
            return;
        }

        const { count } = parsedQuery.data;

        const user = await prisma.user.findUniqueOrThrow({
            where: { email_id: userSession.user?.email },
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

        apiHelpers.success(res, { data: shortlists });
        return;
    } catch (error) {
        console.error("Error in server while fetching shortlists:", error);
        apiHelpers.error(res, "An error occurred while processing your request.");
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);