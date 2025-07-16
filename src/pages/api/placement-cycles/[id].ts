// /pages/api/placement-cycles/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION } from "@prisma/client";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE],
    }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
        res.status(400).json({ error: "Invalid ID" });
        return;
    }

    try {
        const cycleId = parseInt(id);

        if (req.method === "PUT") {
            const { year, batch_name, placement_type, status } = req.body;

            if (status === "OPEN") {
                const existingOpen = await prisma.placement_cycle.findFirst({
                    where: {
                        status: "OPEN",
                        NOT: { id: cycleId },
                    },
                });

                if (existingOpen) {
                    res.status(400).json({
                        error: "Another cycle is already OPEN. Close it before setting this one to OPEN.",
                    });
                    return;
                }
            }

            const updated = await prisma.placement_cycle.update({
                where: { id: cycleId },
                data: { year, batch_name, placement_type, status },
            });

            res.status(200).json(updated);
            return;
        }

        if (req.method === "DELETE") {
            await prisma.placement_cycle.delete({
                where: { id: cycleId },
            });

            res.status(204).end();
            return;
        }

        res.setHeader("Allow", ["PUT", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);