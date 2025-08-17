import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { prisma } from "../../../lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/lib/config";
import { getCompanies, updateCompanyById } from "@/lib/server/services/company";
import z from "zod";
import { bucket } from "@/lib/firebase-admin";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_COMPANY_LIST,
            ACCESS_PERMISSION.MANAGE_NEWS,
            ACCESS_PERMISSION.MANAGE_COMPANY_JD,
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
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    },
}

const GetCompaniesQuerySchema = z.object({
    cid: z.preprocess((val) => {
        const v = Array.isArray(val) ? val[0] : val;
        if (v === "" || v == null) return undefined;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : v;
    }, z.number().int().positive().optional()),
});

const DeleteCompaniesSchema = z.object({
    cid: z.preprocess((val) => {
        const v = Array.isArray(val) ? val[0] : val;
        if (v === "" || v == null) return undefined;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : v;
    }, z.number().int().positive()),
});

const UpdateCompanyBodySchema = z.object({
    id: z.coerce.number().int().positive(),
    company_name: z.string().trim().min(1, "company_name cannot be empty").optional(),
    company_full: z.string().trim().min(1, "company_full cannot be empty").optional(),
    is_featured: z.coerce.boolean().optional(),
    is_legacy: z.coerce.boolean().optional(),
}).refine(d => !(d.is_legacy === true && d.is_featured === false), {
    path: ["is_featured"],
    message: "is_featured must be true when is_legacy is true",
});

async function handler(req: NextApiRequest, res: NextApiResponse) {

    try {
        if (req.method === "GET") {

            const whereClause = (req as any).filter ?? {};
            const parsedQuery = GetCompaniesQuerySchema.safeParse(req.query);

            if (!parsedQuery.success) {
                apiHelpers.badRequest(res, `Invalid query parameters: ${JSON.stringify(parsedQuery.error)}`);
                return;
            }

            if (parsedQuery.data.cid) {
                whereClause.id = parsedQuery.data.cid;
            }

            const company = await getCompanies(parsedQuery.data.cid, whereClause);

            if (company.length === 0) {
                apiHelpers.notFound(res, "No company found");
                return;
            }

            apiHelpers.success(res, { data: company })
            return;
        } else if (req.method === "DELETE") {

            const parsedBody = DeleteCompaniesSchema.safeParse({
                cid: (req.query as any).cid
            });

            if (!parsedBody.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${JSON.stringify(parsedBody.error)}`);
                return;
            }

            const id = parsedBody.data.cid;

            const company = await getCompanies(id);

            if (company.length === 0) {
                return res.status(404).json({ error: "Company not found", success: false });
            }

            // delete stored image
            if (company[0].firebase_path) {
                try {
                    const isdefault = company[0].firebase_path === "company-logo/0.png";
                    if (!isdefault) {
                        await bucket.file(company[0].firebase_path).delete();
                    }
                } catch (err: any) {
                    console.error("Error deleting company logo:", err);
                }
            }

            await prisma.company.delete({
                where: { id }
            });

            apiHelpers.success(res, {});
            return;
        }
        else if (req.method === "PUT") {
            const parsedBody = UpdateCompanyBodySchema.safeParse(req.body);

            if (!parsedBody.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${JSON.stringify(parsedBody.error)}`);
                return;
            }

            const { id, company_name, company_full, is_featured, is_legacy } = parsedBody.data;

            const oldRes = await getCompanies(id, {
                is_featured: true,
            });

            await updateCompanyById(id, {
                company_name,
                company_full,
                is_featured,
                is_legacy
            });

            if (oldRes) {
                const secureUrlResp = await generateSecureURL("COMPANY", id)

                if (secureUrlResp.success) {
                    createNotification({
                        type: NOTIFICATION_TYPE.COMPANY,
                        initiator: NOTIFICATION_SOURCE_INITIATOR.ADDED,
                        companyId: id,
                        links: [{
                            link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Overview`,
                            link_name: `company_link`
                        }]
                    });
                } else {
                    console.error(secureUrlResp.error)
                    apiHelpers.error(res, "Failed to generate secure URL for company");
                    return;
                }
            }

            apiHelpers.success(res, {});
            return;
        }
    }
    catch (error: any) {
        console.error("Error in company API handler:", error);
        apiHelpers.error(res, `${error.message}`);
        return;
    }

}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);