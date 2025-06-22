// pages/api/company/get-domain/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { id } = req.query;

    const company_id = parseInt(Array.isArray(id) ? id[0] : id || "", 0);
    if (isNaN(company_id) || company_id <= 0) {
        return res.status(400).json({ error: "Invalid or missing company_id" });
    }

    try {
        const mappings = await prisma.companyDomainMapping.findMany({
            where: { company_id: company_id },
            select: { domain: true },
        });

        const domains = mappings.map((m) => m.domain);

        return res.status(200).json({ domains });
    } catch (error) {
        return res.status(500).json({ error: "Internal server error" });
    }
}
