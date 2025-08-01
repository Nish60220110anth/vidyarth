import { prisma } from "@/lib/prisma";
import { PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";

async function getActiveCycle () {
    const activeCycle = await prisma.placement_cycle.findFirst({
        where: {
            status: PLACEMENT_CYCLE_STATUS.OPEN
        }
    });

    if (!activeCycle) {
        console.warn("No active placement cycle found");
        return null;
    }

    return activeCycle;
}

async function getCycleById(cycleId: number, filters: any) {
    const cycle = await prisma.placement_cycle.findUnique({
        where: { id: cycleId, ...filters }
    });

    return cycle;
}

async function getAllCycles() {
    const cycles = await prisma.placement_cycle.findMany({
        orderBy: { created_at: "desc" }
    });

    return cycles;
}

async function createDefaultCycle() {
    const defaultCycle = await prisma.placement_cycle.create({
        data: {
            year: new Date().getFullYear(),
            batch_name: "Default Batch",
            placement_type: "SUMMERS" as PLACEMENT_CYCLE_TYPE,
            status: PLACEMENT_CYCLE_STATUS.CLOSED,
        },
    });

    return defaultCycle;
}

async function updateCycle(
    cycleId: number,
    data: {
        year: number;
        batch_name: string;
        placement_type: PLACEMENT_CYCLE_TYPE;
        status: PLACEMENT_CYCLE_STATUS;
    }
) {
    const updatedCycle = await prisma.placement_cycle.update({
        where: { id: cycleId },
        data,
    });

    return updatedCycle;
}

async function deleteCycleById(cycleId: number) {
    const res = await prisma.placement_cycle.delete({
        where: { id: cycleId },
    });

    if (!res) {
        throw new Error(`Failed to delete cycle with ID ${cycleId}`);
    }

    return res;
}

export {
    getActiveCycle,
    getCycleById,
    getAllCycles,
    createDefaultCycle,
    updateCycle,
    deleteCycleById
};
