// pages/api/company/fetch-multiple.ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { ids } = req.body;

    if (!Array.isArray(ids)) {
        return res.status(400).json({ error: "Invalid request" });
    }

    try {
        const companies = await prisma.company.findMany({
            where: { id: { in: ids } },
            include: { domains: true },
        });

        res.status(200).json({ companies });
    } catch (error) {
        console.error("Fetch multiple error:", error);
        res.status(500).json({ error: "Failed to fetch companies" });
    }
}
