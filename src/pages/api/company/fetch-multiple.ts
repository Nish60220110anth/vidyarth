// pages/api/company/fetch-multiple.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [
            ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
        ],
        filters: {
            [ACCESS_PERMISSION.MANAGE_COMPANY_LIST]: {
                priority: 1,
                filter: {},
            }
        },
    }
};

const PostQuerySchema = z.object({
    ids: z.array(z.number()).min(1),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {

    const result = PostQuerySchema.safeParse(req.body);

    if (!result.success) {
        apiHelpers.badRequest(res, `Invalid request ${result.error.issues}`);
        return;
    }

    const { ids } = result.data;
    try {
        const companies = await prisma.company.findMany({
            where: { id: { in: ids } },
            include: { domains: true },
        });

        apiHelpers.success(res, {
            data: companies
        });
        return;
    } catch (error: any) {
        console.error("Fetch multiple error:", error);
        apiHelpers.error(res, `${error.message}`);
        return;

    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);