import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs/promises';
import path from 'path';

const OVERVIEW_DIR = path.join(process.cwd(), 'public', 'overview');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;

    if (method === 'GET') {
        const companyId = req.query.companyId as string;

        if (!companyId) {
            return res.status(400).json({ success: false, message: "Missing companyId in query" });
        }

        const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);

        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return res.status(200).json({ success: true, content });
        } catch (err) {
            return res.status(404).json({ success: false, message: "File not found" });
        }
    }

    if (method === 'PUT') {
        const { companyId, content } = req.body;

        if (!companyId || typeof content !== 'string') {
            return res.status(400).json({ success: false, message: "companyId and content are required in body" });
        }

        try {

            await fs.mkdir(OVERVIEW_DIR, { recursive: true });

            const filePath = path.join(OVERVIEW_DIR, `${companyId}.txt`);
            await fs.writeFile(filePath, content, 'utf-8');

            return res.status(200).json({ success: true, message: "Overview saved" });
        } catch (err) {
            console.error("Error writing file:", err);
            return res.status(500).json({ success: false, message: "Failed to write file" });
        }
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
}
