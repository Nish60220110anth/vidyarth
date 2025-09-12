// pages/api/company/get-logo.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { getCompanies } from "@/lib/server/services/company";
import z from "zod";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_NEWS,
            ACCESS_PERMISSION.ENABLE_MY_SECTION
        ],
        filters: {
            [ACCESS_PERMISSION.MANAGE_COMPANY_LIST]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.MANAGE_NEWS]: {
                priority: 2,
                filter: {},
            },
            [ACCESS_PERMISSION.MANAGE_COMPANY_JD]: {
                priority: 2,
                filter: {},
            },
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 3,
                filter: { is_featured: true },
            },
        },
    },
};

const GetLogoQuerySchema = z.object({
    cid: z.preprocess((val) => {
        const v = Array.isArray(val) ? val[0] : val;
        if (v === "" || v == null) return undefined;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : v;
    }, z.number().int().positive({ message: "cid must be a positive integer" })),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method !== "GET") {
            apiHelpers.methodNotAllowed(res);
            return;
        }

        const whereClause = (req as any).filter ?? {};
        const parsed = GetLogoQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${JSON.stringify(parsed.error.issues, null, 2)}`);
            return;
        }

        const cid = parsed.data.cid;
        const companies = await getCompanies(cid, whereClause);

        if (!companies || companies.length === 0) {
            apiHelpers.notFound(res, "Company not found");
            return;
        }

        const company = companies[0];

        apiHelpers.success(res, { logo_url: company.logo_url });
        return;
    } catch (error: any) {
        console.error("Error in get-logo API handler:", error);
        apiHelpers.error(res, `${error.message}`);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
