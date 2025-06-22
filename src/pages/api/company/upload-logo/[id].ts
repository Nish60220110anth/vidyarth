import { IncomingForm, File } from 'formidable';
import { promises as fs } from 'fs';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

export const config = {
    api: {
        bodyParser: false,
    },
};

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const companyId = req.query.id;

    if (!companyId || Array.isArray(companyId)) {
        res.status(400).json({ error: 'Invalid company ID' });
        return;
    }

    const uploadDir = path.join(process.cwd(), 'public', 'company-logo');
    await fs.mkdir(uploadDir, { recursive: true });

    const form = new IncomingForm({
        keepExtensions: true,
        uploadDir,
        multiples: false,
    });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error('Parsing error:', err);
            res.status(500).json({ error: 'Parsing error' });
            return;
        }

        const file = Array.isArray(files.logo) ? files.logo[0] : files.logo as unknown as File;

        if (!file || !file.filepath) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        try {
            const ext = path.extname(file.originalFilename || '.png');
            const newFilename = `${companyId}${ext}`;
            const newPath = path.join(uploadDir, newFilename);

            // Delete old files for the same company ID
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

            res.status(200).json({ success: true, url: publicUrl });
        } catch (e) {
            console.error('File processing error:', e);
            res.status(500).json({ error: 'Failed to process file' });
        }
    });
}
