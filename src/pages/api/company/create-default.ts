// pages/api/company/create-default.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const company = await prisma.company.create({
            data: {
                company_name: "new-company",
                company_full: "New Company",
                logo_url: "/company-logo/default-logo.jpg",
            },
        });
        return res.status(200).json(company);
    } catch (err) {
        return res.status(500).json({ error: "Failed to create company" });
    }
}

