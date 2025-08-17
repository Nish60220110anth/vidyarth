// pages/api/company/set-domains.ts
import { NextApiRequest, NextApiResponse } from "next";
import { DOMAIN, ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";
import z from "zod";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    }
};

const PostQuerySchema = z.object({
    company_id: z.number().int().positive(),
    domains: z.array(z.enum(DOMAIN)),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {

        if (req.method === "POST") {
            const parsedBody = PostQuerySchema.safeParse(req.body);

            if (!parsedBody.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${JSON.stringify(parsedBody.error)}`);
                return;
            }

            const { company_id, domains } = parsedBody.data;

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

                apiHelpers.success(res, {});
                return;
            } catch (error: any) {
                apiHelpers.error(res, error || "Failed to set domains")
                return;
            }
        }
    } catch (err: any) {
        console.error(`${err.message}`);
        apiHelpers.error(res, `Error setting domains: ${err.message}`);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);