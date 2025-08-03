import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_SUBTYPE, NOTIFICATION_TYPE } from '@prisma/client';
import { apiHelpers } from '@/lib/server/responseHelpers';
import { createNotification } from '@/lib/server/notificationSink';
import { generateSecureURL } from '@/utils/shared/secureUrlApi';
import { defaultEmptyRichText } from '@/utils/defaultEmptyRichText';
import { baseUrl } from '@/lib/config';
import { z } from 'zod';
import { ToInt } from '@/lib/server/zod_utils';
import { lexicalStateToHtml } from '@/utils/lexicalToHTML';
import { promises as fsp } from 'fs';

const OVERVIEW_DIR = path.join(process.cwd(), 'public', 'content', 'overview');

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY],
    },
    put: {
        permissions: [ACCESS_PERMISSION.EDIT_COMPANY_INFO],
    }
};

const GetQuerySchema = z.object({
    companyId: ToInt.refine((val) => val > 0, {
        message: "companyId must be a positive integer",
    }),
}).strict();

const PutBodySchema = z.object({
    companyId: ToInt.refine((val) => val > 0, {
        message: "companyId must be a positive integer",
    }),
    content: z.string().min(1, "Content is required"),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (!fs.existsSync(OVERVIEW_DIR)) {
        fs.mkdirSync(OVERVIEW_DIR)
    }

    if (method === 'GET') {
        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        const { companyId } = parsedQuery.data;

        const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);

        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, defaultEmptyRichText, 'utf-8');
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        apiHelpers.success(res, { data: content });
        return;

    }
    else if (method === 'PUT') {
        const parsedBody = PutBodySchema.safeParse(req.body);

        if (!parsedBody.success) {
            apiHelpers.badRequest(res, `Invalid request body: ${parsedBody.error.message}`);
            return;
        }

        const { companyId, content } = parsedBody.data;

        try {

            const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);

            if (!fs.existsSync(filePath)) {
                apiHelpers.error(res, "File not found", 404);
                return;
            }
            const htmlPath = path.join(OVERVIEW_DIR, `${companyId}.html`);

            const htmlPromise = lexicalStateToHtml(content);
            const writeTxtPromise = fsp.writeFile(filePath, content, 'utf-8');

            const htmlContent = await htmlPromise;
            await Promise.all([
                writeTxtPromise,
                fsp.writeFile(htmlPath, htmlContent, 'utf-8'),
            ]);

            const secureUrlResp = await generateSecureURL("COMPANY", companyId)

            if (secureUrlResp.success) {
                createNotification({
                    type: NOTIFICATION_TYPE.COMPANY_CONTENT,
                    subtype: NOTIFICATION_SUBTYPE.OVERVIEW,
                    initiator: NOTIFICATION_SOURCE_INITIATOR.UPDATED,
                    companyId: companyId,
                    links: [{
                        link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=Overview`,
                        link_name: "overview"
                    }]
                });
            } else {
                console.error(secureUrlResp.error)
                apiHelpers.error(res, "Failed to generate secure URL", 500);
                return;
            }

            apiHelpers.success(res, {data: content})
            return;
        } catch (err) {
            apiHelpers.error(res, "Failed to write file")
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);