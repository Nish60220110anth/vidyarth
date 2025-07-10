// pages/api/company/get-domain/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

import { prisma } from "@/lib/prisma";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
            ACCESS_PERMISSION.MANAGE_COMPANY_JD
        ],
        filters: {
            [ACCESS_PERMISSION.MANAGE_COMPANY_LIST]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 3,
                filter: { is_featured: true, is_legacy: true },
            },
            [ACCESS_PERMISSION.MANAGE_COMPANY_JD]: {
                priority: 2,
                filter: {}
            }
        },
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "GET") {

        const { id } = req.query;

        const company_id = parseInt(Array.isArray(id) ? id[0] : id || "", 0);
        if (isNaN(company_id) || company_id <= 0) {
            return res.status(400).json({ error: "Invalid or missing company_id" });
        }

        try {
            const mappings = await prisma.companyDomainMapping.findMany({
                where: { company_id: company_id },
                select: { domain: true },
            });

            const domains = mappings.map((m) => m.domain);

            return res.status(200).json({ domains });
        } catch (error) {
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);