// pages/api/company/set-domains.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, DOMAIN } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { company_id, domains } = req.body;

    if (!company_id || !Array.isArray(domains)) {
        return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    try {

        await prisma.companyDomainMapping.deleteMany({
            where: { company_id: Number(company_id) },
        });

        await prisma.companyDomainMapping.createMany({
            data: domains.map((domain: DOMAIN) => ({
                company_id: Number(company_id),
                domain,
            })),
            skipDuplicates: true,
        });

        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("Set domains error:", error);
        return res.status(500).json({ error: "Failed to set domains", details: error.message });
    }
}
