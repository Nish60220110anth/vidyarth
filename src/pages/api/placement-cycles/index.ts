// /pages/api/placement-cycles/index.ts
import { NextApiRequest, NextApiResponse } from "next";
import { ACCESS_PERMISSION } from "@prisma/client";
import { MethodConfig, withPermissionCheck } from "@/lib/server/withPermissionCheck";
import { apiHelpers } from "@/lib/server/responseHelpers";
import z from "zod";
import { ToInt } from "@/lib/server/zod_utils";
import { createDefaultCycle, getAllCycles, getCycleById } from "@/lib/server/services/cycle";

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

const GetQuerySchema = z.object({
    id: ToInt.optional().refine((val) => !val || (val > 0), {
        message: "id must be a positive integer or undefined",
    }),
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === "GET") {

            const parsedQuery = GetQuerySchema.safeParse(req.query);

            if (!parsedQuery.success) {
                apiHelpers.badRequest(res, `Invalid query parameters: ${parsedQuery.error.message}`);
                return;
            }

            const { id } = parsedQuery.data;

            if (id) {
                const permissionFilter = (req as any).filter;
                const cycle = await getCycleById(id, permissionFilter);

                if (!cycle) {
                    apiHelpers.notFound(res, "Placement cycle not found");
                    return;
                }

                apiHelpers.success(res, {
                    data: cycle
                });
            }

            const cycles = await getAllCycles();

            apiHelpers.success(res, {
                data: cycles
            });

            return;
        }
        else if (req.method === "POST") {
            const newCycle = await createDefaultCycle();
            apiHelpers.success(res, {
                data: newCycle
            });
            return;
        }


        res.setHeader("Allow", ["GET", "POST"]);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}

export default withPermissionCheck(METHOD_PERMISSIONS)(handler);