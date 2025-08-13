import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_MY_SECTION,
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_MY_SECTION]: {
                priority: 2,
                filter: {
                    is_featured: true
                },
            }
        },
    }
};

const GetQuerySchema = z.object({
    cid: z.array(z.string().transform((id) => parseInt(id)))
});

async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method === "GET") {
        try {

            const parsedQuery = GetQuerySchema.safeParse(req.query);

            if (!parsedQuery.success) {
                apiHelpers.error(res, `Invalid query parameters: ${parsedQuery.error.message}`, 400);
                return;
            }

            const { cid: companyIds } = parsedQuery.data;

            const companyFilter =
                companyIds.length > 0
                    ? {
                        companies: {
                            some: {
                                company_id: {
                                    in: companyIds,
                                },
                            },
                        },
                    }
                    : {};

            const newsList = await prisma.news.findMany({
                where: {
                    ...companyFilter,
                    is_active: true,
                    is_approved: true,
                },
                include: {
                    domains: true,
                    companies: {
                        include: {
                            company: true,
                        },
                    },
                },
                orderBy: { created_at: "desc" },
            });

            apiHelpers.success(res, {
                data: newsList
            });
            return;
        } catch (err: any) {
            apiHelpers.error(res, `Could not fetch news: ${err.message}`, 500);
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);