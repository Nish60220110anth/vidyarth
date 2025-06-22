// /pages/api/news/upload-image.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, File } from "formidable";
import { promises as fs } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const config = {
    api: {
        bodyParser: false,
    },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method Not Allowed" });
    }


    const uploadDir = path.join(process.cwd(), "public", "news-images");
    await fs.mkdir(uploadDir, { recursive: true });

    const form = new IncomingForm({
        keepExtensions: true,
        uploadDir,
        multiples: false,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Parsing error:", err);
            return res.status(500).json({ error: "Parsing error" });
        }

        const newsId = Array.isArray(fields.id) ? fields.id[0] : fields.id;
        const file = Array.isArray(files.file) ? files.file[0] : files.file;

        if (!newsId || !file || !file.filepath) {
            return res.status(400).json({ error: "Missing news ID or file" });
        }

        try {
            const ext = path.extname(file.originalFilename || ".png");
            const newFilename = `${newsId}${ext}`;
            const newPath = path.join(uploadDir, newFilename);

            // Remove older versions of the file for this ID
            const existingFiles = await fs.readdir(uploadDir);
            for (const existing of existingFiles) {
                if (existing.startsWith(`news-${newsId}`) && existing !== newFilename) {
                    await fs.unlink(path.join(uploadDir, existing));
                }
            }

            await fs.copyFile(file.filepath, newPath);
            await fs.unlink(file.filepath);

            const publicUrl = `/news-images/${newFilename}`;

            await prisma.news.update({
                where: { id: newsId },
                data: { path_to_image: publicUrl },
            });

            return res.status(200).json({ success: true, url: publicUrl });
        } catch (e) {
            console.error("File processing error:", e);
            return res.status(500).json({ error: "Failed to process file" });
        }
    });
};

export default handler;
