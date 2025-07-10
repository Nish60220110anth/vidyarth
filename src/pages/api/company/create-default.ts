// pages/api/company/create-default.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {

        try {
            const company = await prisma.company.create({
                data: {
                    company_name: "new-company",
                    company_full: "New Company",
                    logo_url: "/company-logo/default-logo.jpg",
                    is_featured: false,
                    is_legacy: false,
                },
            });
            return res.status(200).json(company);
        } catch (err: any) {
            return res.status(500).json({ error: "Failed to create company" , success: false});
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);