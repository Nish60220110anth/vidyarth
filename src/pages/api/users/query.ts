import type { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, USER_ROLE } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

    const { email, name, role } = req.query;

    if (
        typeof email !== "string" ||
        typeof name !== "string" ||
        typeof role !== "string"
    ) {
        return res.status(400).json({ success: false, error: "Missing or invalid query parameters" });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                AND: [
                    { email_id: { contains: email.trim(), } },
                    { name: { contains: name.trim(), } },
                    { role: role as USER_ROLE }
                ]
            },
            select: { id: true },
        });
          
        if (!user) {
            return res.status(404).json({ success: false, error: "User not found" });
        }

        return res.status(200).json({ success: true, data: { id: user.id } });
    } catch (error) {
        console.error("Error in /api/users/query:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
}
