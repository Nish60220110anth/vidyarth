// /pages/api/placement-cycles/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "GET") {

            const { id } = req.query;

            if (id) {
                const cycle = await prisma.placement_Cycle.findUnique({
                    where: { id: Number(id) },
                });

                if (!cycle) {
                    return res.status(404).json({ error: "Placement cycle not found" });
                }

                return res.status(200).json(cycle);
            }
            
            const cycles = await prisma.placement_Cycle.findMany({
                orderBy: { created_at: "desc" }
            });
            return res.status(200).json(cycles);
        }

        if (req.method === "POST") {
            const newCycle = await prisma.placement_Cycle.create({
                data: {
                    year: new Date().getFullYear(),
                    batch_name: "New Batch",
                    placement_type: "SUMMERS" as PLACEMENT_CYCLE_TYPE,
                    status: "CLOSED" as PLACEMENT_CYCLE_STATUS,
                },
            });

            return res.status(201).json(newCycle);
        }
        

        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}
