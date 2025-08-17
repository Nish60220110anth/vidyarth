// /pages/api/company/upload-logo/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { bucket } from "@/lib/firebase-admin";
import z from "zod";

export const config = {
    api: { bodyParser: false },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: { permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST] },
};

const PostQuerySchema = z.object({
    id: z.string().regex(/^\d+$/, "Invalid company ID format").transform(Number).refine((val) => val > 0, {
        message: "Company ID must be a positive integer",
    }),
}).strict();

const handler = async (req: NextApiRequest, res: NextApiResponse) => {

    const validation = PostQuerySchema.safeParse(req.query);
    if (!validation.success) {
        apiHelpers.badRequest(res, `${validation.error}`);
        return;
    }

    const { id: companyId } = validation.data;

    const form = new IncomingForm({
        keepExtensions: true,
        multiples: false,
        maxFileSize: 2 * 1024 * 1024,
    });

    form.parse(req, async (err, _fields, files) => {
        if (err) {
            apiHelpers.error(res, "Server couldn't read request", 500, { error: err });
            return;
        }

        const raw = Array.isArray(files.logo) ? files.logo[0] : (files.logo as any);
        if (!raw || !raw.filepath) {
            apiHelpers.badRequest(res, 'Missing "logo" file');
            return;
        }

        if (!fs.existsSync(raw.filepath) || fs.statSync(raw.filepath).size === 0) {
            apiHelpers.badRequest(res, "Invalid or empty file");
            return;
        }

        const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
        const mimetype = String(raw.mimetype || "");
        if (!allowed.includes(mimetype)) {
            apiHelpers.badRequest(res, "Only image files are allowed");
            return;
        }

        try {
            const ext = path.extname(raw.originalFilename || ".png");
            const newFilename = `logo-${companyId}${ext}`;

            const old = await prisma.company.findUnique({
                where: { id: Number(companyId) },
                select: { firebase_path: true, updated_at: true },
            });

            if (old?.firebase_path) {
                const isdefault = old.firebase_path === "company-logo/0.png";
                try {
                    if (!isdefault) {
                        await bucket.file(old.firebase_path).delete();
                    }
                } catch (err: any) {
                    console.error("Error deleting old company logo:", err);
                }
            }

            const fileBuffer = fs.readFileSync(raw.filepath);
            const firebasePath = `company-logo/${companyId}/${newFilename}-${old?.updated_at?.toISOString?.() || Date.now()}`;

            const fileRef = bucket.file(firebasePath);
            await fileRef.save(fileBuffer, {
                metadata: {
                    contentType: mimetype || "image/png",
                    cacheControl: "public, max-age=31536000",
                },
            });

            const [signedUrl] = await fileRef.getSignedUrl({
                action: "read",
                expires: "03-01-2030",
                responseDisposition: `inline; filename="${newFilename}"`,
            });

            await prisma.company.update({
                where: { id: Number(companyId) },
                data: { logo_url: signedUrl, firebase_path: firebasePath },
            });

            apiHelpers.success(res, { logo_url: signedUrl, firebase_path: firebasePath });
            return;
        } catch (e) {
            console.error("Error uploading company logo:", e);
            apiHelpers.error(res, "Failed to upload logo", 500, { error: e });
            return;
        }
    });
};

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
