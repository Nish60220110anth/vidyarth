import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 3,
                filter: { is_featured: true },
            },
        },
    }
};


async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "GET") {

        const whereClause = (req as any).filter ?? {};

        const { cid } = req.query;

        if (cid && cid > "0") {
            whereClause.id = Number(cid);
        } else {
            apiHelpers.badRequest(res, "Invalid Company ID");
            return;
        }

        const companies = await prisma.company.findMany({
            where: whereClause,
            include: {
                domains: {
                    select: { domain: true },
                },
            },
            orderBy: [
                { company_full: "asc" },
                { company_name: "asc" },
                { created_at: "desc" },
            ],
        });

        return apiHelpers.success(res, { companies })
    }

    res.status(405).json({ error: "Method not allowed", success: false });
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);