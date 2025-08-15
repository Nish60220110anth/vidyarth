import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION, DOMAIN, NOTIFICATION_SOURCE_INITIATOR, NOTIFICATION_TYPE, ROUND_TYPE } from '@prisma/client';
import { apiHelpers } from '@/lib/server/responseHelpers';
import crypto from 'crypto'; // For optional ETag
import { createNotification } from '@/lib/server/notificationSink';
import { generateSecureURL } from '@/utils/shared/secureUrlApi';
import { baseUrl } from '@/lib/config';
import z from 'zod';
import { defaultEmptyRichText } from '@/utils/defaultEmptyRichText';

const PREP_DIR = path.join(process.cwd(), 'public', 'content', 'prep');

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY],
    },
    put: {
        permissions: [ACCESS_PERMISSION.EDIT_COMPANY_INFO],
    }
};

const GetQuerySchema = z.object({
    rType: z.enum(['round', 'domain']),
    d: z.enum(Object.values(DOMAIN)).optional(),
    r: z.enum(Object.values(ROUND_TYPE)).optional(),
});

const PutBodySchema = z.object({
    rType: z.enum(['round', 'domain']),
    content: z.string().min(1, "Content is required"),
    d: z.enum(Object.values(DOMAIN)).optional(),
    r: z.enum(Object.values(ROUND_TYPE)).optional(),
}).strict();

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (method === 'GET') {
        const parsedQuery = GetQuerySchema.safeParse(req.query);

        if (!parsedQuery.success) {
            apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
            return;
        }

        let filePath = "";

        if (parsedQuery.data.rType === "round") {
            filePath = path.join(PREP_DIR, `round_type-${parsedQuery.data.r}.txt`);
        } else {
            filePath = path.join(PREP_DIR, `domain-${parsedQuery.data.d}.txt`);
        }

        try {
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(PREP_DIR, { recursive: true });
                fs.writeFileSync(filePath, defaultEmptyRichText, 'utf-8');
            }
            const content = fs.readFileSync(filePath, 'utf-8');

            const etag = crypto.createHash("md5").update(content + parsedQuery.data.d).digest("hex");
            res.setHeader("ETag", `"${etag}"`);
            res.setHeader("Cache-Control", "public, max-age=300");
            res.setHeader("Vary", "Accept-Encoding");

            apiHelpers.success(res, { data: content });
            return;
        } catch (err) {
            apiHelpers.error(res, "File not found", 500);
            return;
        }
    }
    else if (method === 'PUT') {
        const parsedBody = PutBodySchema.safeParse(req.body);

        if (!parsedBody.success) {
            apiHelpers.badRequest(res, `Invalid request body: ${parsedBody.error.message}`);
            return;
        }

        const { rType, content, d, r } = parsedBody.data;

        try {
            let filePath = "";

            if (rType === "round") {
                filePath = path.join(PREP_DIR, `round_type-${r}.txt`);
            } else {
                filePath = path.join(PREP_DIR, `domain-${d}.txt`);
            }

            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(PREP_DIR, { recursive: true });
            }

            fs.writeFileSync(filePath, content, 'utf-8');

            if (rType === "round") {

                const secureUrlResp = await generateSecureURL("ROUND_PREP", 0)

                if (secureUrlResp.success) {
                    createNotification({
                        type: NOTIFICATION_TYPE.ROUND_PREP,
                        initiator: NOTIFICATION_SOURCE_INITIATOR.UPDATED,
                        round: r,
                        links: [{
                            link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=${r}`,
                            link_name: "round_prep_link"
                        }]
                    });
                } else {
                    console.error(secureUrlResp.error)
                    apiHelpers.error(res, "Failed to generate secure URL", 500);
                    return;
                }
            } else {
                const secureUrlResp = await generateSecureURL("DOMAIN_PREP", 0)
                if (secureUrlResp.success) {
                    createNotification({
                        type: NOTIFICATION_TYPE.DOMAIN_PREP,
                        initiator: NOTIFICATION_SOURCE_INITIATOR.UPDATED,
                        domain: d,
                        links: [{
                            link: `${baseUrl}/dashboard/?auth=${encodeURIComponent(secureUrlResp.url)}&tab=${d}`,
                            link_name: "domain_link"
                        }]
                    });
                } else {
                    console.error(secureUrlResp.error)
                    apiHelpers.error(res, "Failed to generate secure URL", 500);
                    return;
                }
            }

            apiHelpers.success(res, {data: content});
            return;
        } catch (err) {
            apiHelpers.error(res, "Failed to write file", 500);
            return;
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
