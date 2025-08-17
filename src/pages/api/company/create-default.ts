// pages/api/company/create-default.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "POST") {

            try {

                const lastCompanyID = await prisma.company.findFirst({
                    orderBy: { id: "desc" },
                    select: { id: true }
                });

                const company = await prisma.company.create({
                    data: {
                        company_name: `${(lastCompanyID?.id || 0) + 1}-company-name`,
                        company_full: `${(lastCompanyID?.id || 0) + 1}-company-full-name`,
                        firebase_path: "company-logo/0.png",
                        logo_url: "https://firebasestorage.googleapis.com/v0/b/vidyarth-systems.firebasestorage.app/o/company-logo%2F0.png?alt=media&token=07e200b6-715f-4d7e-9596-0cf444d0fd41",
                        is_featured: false,
                        is_legacy: false,
                    },
                });

                apiHelpers.success(res, {
                    data: company
                });

                return;
            } catch (err: any) {
                console.error("Error creating company:", err);
                apiHelpers.error(res, `${err.message}`);
                return;
            }
        }
    } catch (err: any){
        console.error("Error creating company:", err);
        apiHelpers.error(res, `${err.message}`);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);