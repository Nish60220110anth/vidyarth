import { IncomingForm, File } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from "@/lib/prisma";
import { ACCESS_PERMISSION } from '@prisma/client';
import { MethodConfig, withPermissionCheck } from '@/lib/server/withPermissionCheck';

export const config = {
    api: {
        bodyParser: false,
    },
};

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_COMPANY_LIST],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {

    if (req.method === "POST") {

        const companyId = req.query.id;
        if (!companyId || Array.isArray(companyId)) {
            return res.status(400).json({ error: 'Invalid company ID' });
        }

        const uploadDir = path.join(process.cwd(), 'public', 'company-logo');
        await fs.mkdir(uploadDir, { recursive: true });

        const form = new IncomingForm({
            keepExtensions: true,
            uploadDir,
            multiples: false,
        });

        try {
            const { files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
                form.parse(req, (err, fields, files) => {
                    if (err) reject(err);
                    else resolve({ fields, files });
                });
            });

            const file = Array.isArray(files.logo) ? files.logo[0] : files.logo as File;
            if (!file || !file.filepath) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const ext = path.extname(file.originalFilename || '.png');
            const newFilename = `${companyId}${ext}`;
            const newPath = path.join(uploadDir, newFilename);

            const existingFiles = await fs.readdir(uploadDir);
            for (const existing of existingFiles) {
                if (existing.startsWith(`${companyId}.`) && existing !== newFilename) {
                    await fs.unlink(path.join(uploadDir, existing));
                }
            }

            await fs.copyFile(file.filepath, newPath);
            await fs.unlink(file.filepath);

            const publicUrl = `/company-logo/${newFilename}`;

            await prisma.company.update({
                where: { id: Number(companyId) },
                data: { logo_url: publicUrl },
            });

            return res.status(200).json({ success: true, image_url: publicUrl });

        } catch (error) {
            return res.status(500).json({ error: 'Failed to upload logo', success: false });
        }
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);