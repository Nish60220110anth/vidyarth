import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from '@prisma/client';
import { apiHelpers } from '@/lib/server/responseHelpers';
import { createNotification } from '@/lib/server/notificationSink';
import { generateSecureURL } from '@/utils/shared/secureUrlApi';
import { baseUrl } from '@/pages/_app';

const OVERVIEW_DIR = path.join(process.cwd(), 'public', 'overview');

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY],
    },
    put: {
        permissions: [ACCESS_PERMISSION.EDIT_COMPANY_INFO],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (method === 'GET') {
        const companyId = req.query.companyId as string;

        if (!companyId) {
            apiHelpers.badRequest(res, "Missing companyID in query");
            return;
        }

        const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, "", 'utf-8');
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            apiHelpers.success(res, { content });
            return;
        } catch (err) {
            apiHelpers.error(res, "File not found", 500)
            return;
        }
    }

    if (method === 'PUT') {
        const { companyId, content } = req.body;

        if (!companyId || typeof content !== 'string') {
            apiHelpers.badRequest(res, "companyId and content are required in body")
            return;
        }

        try {
            fs.mkdirSync(OVERVIEW_DIR, { recursive: true });

            const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);
            fs.writeFileSync(filePath, content, 'utf-8');

            const secureUrlResp = await generateSecureURL("COMPANY", companyId)

            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.UPDATED,
                    companyId: companyId,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Overview`,
                        link_name: "Overview"
                    }]
                });
            } else {
                console.error(secureUrlResp.error)
            }

            apiHelpers.success(res, {})
            return;
        } catch (err) {
            apiHelpers.error(res, "Failed to write file")
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);