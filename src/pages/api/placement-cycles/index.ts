// /pages/api/placement-cycles/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION, PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    get: {
        permissions: [
            ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE,
            ACCESS_PERMISSION.MANAGE_COMPANY_JD
        ],
        filters: {
            [ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY]: {
                priority: 1,
                filter: {
                    is_active: true
                },
            },
            [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE]: {
                priority: 1,
                filter: {},
            },
            [ACCESS_PERMISSION.MANAGE_COMPANY_JD]: {
                priority: 1,
                filter: {}
            }
        },
    },
    post: {
        permissions: [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE],
    },
};


async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "GET") {

            const { id } = req.query;

            if (id) {
                const permissionFilter = (req as any).filter;
                const cycle = await prisma.placement_cycle.findUnique({
                    where: { id: Number(id), ...permissionFilter },
                });

                if (!cycle) {
                    return res.status(404).json({ error: "Placement cycle not found" });
                }

                return res.status(200).json(cycle);
            }

            const cycles = await prisma.placement_cycle.findMany({
                orderBy: { created_at: "desc" }
            });
            return res.status(200).json(cycles);
        }

        if (req.method === "POST") {
            const newCycle = await prisma.placement_cycle.create({
                data: {
                    year: new Date().getFullYear(),
                    batch_name: "New Batch",
                    placement_type: "SUMMERS" as PLACEMENT_CYCLE_TYPE,
                    status: "CLOSED" as PLACEMENT_CYCLE_STATUS,
                },
            });

            res.status(201).json(newCycle);
        }


        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);