// pages/api/company/remove-domain.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { company_id, domain } = req.body;

    if (!company_id || !domain)
        return res.status(400).json({ error: "Missing parameters" });

    try {
        await prisma.companyDomainMapping.delete({
            where: {
                company_id_domain: {
                    company_id: Number(company_id),
                    domain,
                },
            },
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to remove domain" });
    }
}
