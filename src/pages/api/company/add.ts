// pages/api/company/add.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { company_name, company_full } = req.body;

    if (!company_name || !company_full) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const company = await prisma.company.create({
            data: { company_name, company_full },
        });
        res.status(200).json(company);
    } catch (err: any) {
        if (err.code === "P2002") {
            return res.status(400).json({ error: "Company name must be unique" });
        }
        res.status(500).json({ error: "Server error" });
    }
}
