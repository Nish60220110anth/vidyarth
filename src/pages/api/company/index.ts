import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getIronSession, IronSessionData } from "iron-session";
import { sessionOptions } from "@/lib/session";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session: IronSessionData = await getIronSession(req, res, sessionOptions);
    const role = session?.role;

    if (req.method === "GET") {
        const companies = await prisma.company.findMany({
            include: {
                domains: {
                    select: { domain: true },
                },
            },
            orderBy: {
                created_at: "desc", 
            },
        });
        return res.status(200).json(companies);
    }

    if (req.method === "DELETE") {
        const id = parseInt(req.query.id as string);
        if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

        await prisma.company.delete({ where: { id } });
        return res.status(200).json({ success: true });
    }
    
    if (req.method === "PUT") {
        const { id, company_name, company_full } = req.body;
        await prisma.company.update({
            where: { id },
            data: {
                company_name,
                company_full,
            },
        });
        return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed" });
}
