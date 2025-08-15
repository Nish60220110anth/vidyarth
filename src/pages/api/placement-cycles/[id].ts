// /pages/api/placement-cycles/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { ACCESS_PERMISSION, PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";
import { ToInt } from "@/lib/server/zod_utils";
import z from "zod";
import { apiHelpers } from "@/lib/server/responseHelpers";
import { deleteCycleById, updateCycle } from "@/lib/server/services/cycle";

const METHOD_PERMISSIONS: Record<string, MethodConfig> = {
    put: {
        permissions: [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE],
    },
    delete: {
        permissions: [ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE],
    }
};

const BasicQuerySchema = z.object({
    id: ToInt.refine((val) => (val > 0), {
        message: "id must be a positive integer or undefined",
    }),
}).strict();

const PutBodySchema = z.object({
    year: z.number().int().min(2000, "Year must be a valid year"),
    batch_name: z.string().min(1, "Batch name cannot be empty"),
    placement_type: z.enum(Object.keys(PLACEMENT_CYCLE_TYPE)),
    status: z.enum(Object.keys(PLACEMENT_CYCLE_STATUS)),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
    const parsedId = BasicQuerySchema.safeParse(req.query);

    if (!parsedId.success) {
        apiHelpers.badRequest(res, `Invalid query parameters: ${parsedId.error.message}`);
        return;
    }

    const { id: cycleId } = parsedId.data;

    try {
        if (req.method === "PUT") {

            const parsedBody = PutBodySchema.safeParse(req.body);

            if (!parsedBody.success) {
                apiHelpers.badRequest(res, `Invalid request body: ${parsedBody.error.message}`);
                return;
            }

            const { year, batch_name, placement_type, status } = parsedBody.data;

            if (status === PLACEMENT_CYCLE_STATUS.OPEN) {

                const existingOpen = await prisma.placement_cycle.findFirst({
                    where: {
                        status: PLACEMENT_CYCLE_STATUS.OPEN,
                        NOT: { id: cycleId },
                    },
                });

                if (existingOpen) {
                    apiHelpers.badRequest(res, "There is already an open placement cycle.");
                    return;
                }
            }

            const updated = await updateCycle(cycleId, {
                year,
                batch_name,
                placement_type: placement_type as PLACEMENT_CYCLE_TYPE,
                status: status as PLACEMENT_CYCLE_STATUS,
            });

            apiHelpers.success(res, {
                data: updated
            });
            return;
        }
        else if (req.method === "DELETE") {
            const resp = await deleteCycleById(cycleId);
            apiHelpers.success(res, {
                data: resp
            });

            return;
        }

        res.setHeader("Allow", ["PUT", "DELETE"]);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error("Error handling placement cycle request:", error);
        apiHelpers.error(res, "An error occurred while processing your request", 500);
        return;
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);