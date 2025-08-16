import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { prisma } from "../../../lib/prisma";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { createNotification } from "@/lib/server/notificationSink";
import { generateSecureURL } from "@/utils/shared/secureUrlApi";
import { baseUrl } from "@/lib/config";
import { getAllCompanies, getCompanies, updateCompanyById } from "@/lib/server/services/company";
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
}

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "GET") {

        const companies = await getAllCompanies();

        if (!companies) {
            apiHelpers.notFound(res, "No companies found");
            return;
        }

        apiHelpers.success(res, { data: companies })
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);