import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { prisma } from "@/lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/pages/_app";

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
};


async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "GET") {

        const whereClause = (req as any).filter ?? {};

        const { cid } = req.query;

        if (cid && cid > "0") {
            whereClause.id = Number(cid);
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

    if (req.method === "DELETE") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) {
            apiHelpers.badRequest(res, "Invalid ID")
            return
        }

        const company = await prisma.company.findUnique({
            where: { id }
        });

        if (company) {
            await prisma.company.delete({ where: { id } });
            return res.status(200).json({ success: true });
        } else {
            return res.status(404).json({ error: "Company not found", success: false });
        }
    }

    if (req.method === "PUT") {
        const { id, company_name, company_full } = req.body;
        let { is_featured, is_legacy } = req.body;

        const company_id = parseInt(id as string);
        if (isNaN(company_id)) return res.status(400).json({ error: "Invalid ID", success: false });

        if (is_legacy) {
            is_featured = true;
        }

        const oldRes = await prisma.company.findUnique({
            where: {
                id
            },
            select: {
                is_featured: true
            }
        })

        if (!oldRes?.is_featured && is_featured) {
            const secureUrlResp = await generateSecureURL("COMPANY", company_id)

            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY,
                    subtype: NOTIFICATION_SUBTYPE.ADDED,
                    companyId: company_id,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Overview`,
                        link_name: "company_link"
                    }]
                });
            } else {
                console.error(secureUrlResp.error)
            }
        }

        await prisma.company.update({
            where: { id: company_id },
            data: {
                company_name,
                company_full,
                is_featured,
                is_legacy
            },
        });

        return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed", success: false });
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);