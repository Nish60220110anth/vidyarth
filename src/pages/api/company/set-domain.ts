// pages/api/company/set-domains.ts
import { NextApiRequest, NextApiResponse } from "next";
import { DOMAIN, ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "POST") {
        const { company_id, domains } = req.body;

        if (!company_id || !Array.isArray(domains)) {
            return apiHelpers.badRequest(res, "Missing or invalid parameters");
        }

        try {
            await prisma.companydomainmapping.deleteMany({
                where: { company_id: Number(company_id) },
            });

            await prisma.companydomainmapping.createMany({
                data: domains.map((domain: DOMAIN) => ({
                    company_id: Number(company_id),
                    domain,
                })),
                skipDuplicates: true,
            });

            return apiHelpers.success(res, { });
        } catch (error: any) {
            return apiHelpers.error(res, error || "Failed to set domains")
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);