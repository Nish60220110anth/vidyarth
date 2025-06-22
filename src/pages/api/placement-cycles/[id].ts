// /pages/api/placement-cycles/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Invalid ID" });
    }

    try {
        const cycleId = parseInt(id);

        if (req.method === "PUT") {
            const { year, batch_name, placement_type, status } = req.body;

            if (status === "OPEN") {
                const existingOpen = await prisma.placement_Cycle.findFirst({
                    where: {
                        status: "OPEN",
                        NOT: { id: cycleId },
                    },
                });

                if (existingOpen) {
                    return res.status(400).json({ error: "Another cycle is already OPEN. Close it before setting this one to OPEN." });
                }
            }

            const updated = await prisma.placement_Cycle.update({
                where: { id: cycleId },
                data: { year, batch_name, placement_type, status },
            });

            return res.status(200).json(updated);
        }
        
        if (req.method === "DELETE") {
            await prisma.placement_Cycle.delete({
                where: { id: cycleId },
            });

            return res.status(204).end();
        }

        res.setHeader("Allow", ["PUT", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}
