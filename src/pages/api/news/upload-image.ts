// /pages/api/news/upload-image.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm } from "formidable";
import path from "path";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { bucket } from "@/lib/firebase-admin";
import fs from "fs";

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_NEWS],
    },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "POST") {

        const form = new IncomingForm({
            keepExtensions: true,
            multiples: false,
        });

        form.parse(req, async (err, fields, files) => {
            if (err) {
                apiHelpers.error(res, "Server couldn't read request", 500, { error: err })
                return;
            }

            const newsId = Array.isArray(fields.id) ? fields.id[0] : fields.id;
            const file = Array.isArray(files.file) ? files.file[0] : files.file;

            if (!newsId || !file || !file.filepath) {
                apiHelpers.badRequest(res, "Missing news ID or file")
                return;
            }

            if (!fs.existsSync(file.filepath) || fs.statSync(file.filepath).size === 0) {
                apiHelpers.badRequest(res, "Invalid or empty file");
                return;
            }

            try {
                const ext = path.extname(file.originalFilename || ".png");
                const newFilename = `${newsId}${ext}`;

                const oldFileNews = await prisma.news.findUnique({
                    where: {
                        id: newsId
                    }, select: {
                        firebase_path: true,
                        updated_at: true
                    }
                })

                if (oldFileNews && oldFileNews.firebase_path && (!oldFileNews.firebase_path.includes("default-image.png"))) {
                    const oldFileRef = bucket.file(oldFileNews?.firebase_path)
                    await oldFileRef.delete();
                }

                const fileBuffer = fs.readFileSync(file.filepath);
                const firebasePath = `news-images/${newFilename}-${oldFileNews?.updated_at}`;

                const fileRef = bucket.file(firebasePath);

                await fileRef.save(fileBuffer, {
                    metadata: {
                        contentType: file.mimetype || "image/png",
                        cacheControl: "public, max-age=31536000",
                    },
                });

                const [signedUrl] = await fileRef.getSignedUrl({
                    action: "read",
                    expires: "03-01-2030",
                });

                await prisma.news.update({
                    where: { id: newsId },
                    data: { image_url: signedUrl, firebase_path: firebasePath },
                });

                apiHelpers.created(res, {})
                return;

            } catch (e) {
                console.error("File processing error:", e);
                return res.status(500).json({ error: "Failed to process file" });
            }
        });
    }
};

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);
