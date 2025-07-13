import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';
import { ACCESS_PERMISSION } from '@prisma/client';
import { apiHelpers } from '@/lib/server/responseHelpers';
import crypto from 'crypto'; // For optional ETag

const PREP_DIR = path.join(process.cwd(), 'public', 'prep');

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
        const { rType, d } = req.query;

        if (!rType || typeof rType !== "string") {
            apiHelpers.badRequest(res, "Missing resource type");
            return;
        }

        if (rType === "domain" && !d) {
            apiHelpers.badRequest(res, "Missing domain type");
            return;
        }

        let filePath = "";

        if (rType === "overview") {
            filePath = path.join(PREP_DIR, `overview.txt`);
        } else {
            filePath = path.join(PREP_DIR, `domain-${d}.txt`);
        }

        try {
            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(PREP_DIR, { recursive: true });
                fs.writeFileSync(filePath, "", 'utf-8');
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            
            const etag = crypto.createHash("md5").update(content + d).digest("hex");
            res.setHeader("ETag", `"${etag}"`);
            res.setHeader("Cache-Control", "public, max-age=300");
            res.setHeader("Vary", "Accept-Encoding");

            apiHelpers.success(res, { content });
            return;
        } catch (err) {
            apiHelpers.error(res, "File not found", 500);
            return;
        }
    }

    if (method === 'PUT') {
        const { rType, content, d } = req.body;

        if (!rType || typeof content !== 'string') {
            apiHelpers.badRequest(res, "companyId and content are required in body");
            return;
        }

        if (rType === "domain" && !d) {
            apiHelpers.badRequest(res, "Missing domain type");
            return;
        }

        try {
            let filePath = "";

            if (rType === "overview") {
                filePath = path.join(PREP_DIR, `overview.txt`);
            } else {
                filePath = path.join(PREP_DIR, `domain-${d}.txt`);
            }

            if (!fs.existsSync(filePath)) {
                fs.mkdirSync(PREP_DIR, { recursive: true });
            }

            fs.writeFileSync(filePath, content, 'utf-8');

            apiHelpers.success(res, {});
            return;
        } catch (err) {
            apiHelpers.error(res, "Failed to write file", 500);
            return;
        }
    }
}

// export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
export default handler;
