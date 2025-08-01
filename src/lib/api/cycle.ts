import axios from "axios";
import { baseUrl } from "../config";
import { ACCESS_PERMISSION, PLACEMENT_CYCLE_STATUS, PLACEMENT_CYCLE_TYPE } from "@prisma/client";
import { PlacementCycle } from "@/components/ManagePlacementCycle";
import { toast } from "react-hot-toast";

const fetchAllCycles = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/placement-cycles`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_COMPANY_JD
            }
        });

        if (!res.data.success) {
            throw new Error(res.data.message || "Failed to fetch placement cycles");
        }

        if (!res.data.data || !Array.isArray(res.data.data)) {
            throw new Error("Invalid response format for placement cycles");
        }

        const data = res.data.data;

        return data.map((value: PlacementCycle): {
            id: number;
            label: string,
            status: PLACEMENT_CYCLE_STATUS,
            type: PLACEMENT_CYCLE_TYPE
        } => {
            return {
                id: value.id,
                label: `${value.placement_type.charAt(0).toUpperCase() + value.placement_type.slice(1).toLowerCase()} ${value.year}`,
                status: value.status,
                type: value.placement_type
            }
        });
    } catch (err) {
        console.error("Failed to fetch active placement cycles:", err);
        toast.error("Failed to fetch active placement cycles. Please try again later.");
        return [];
    }
}

const fetchAllCyclesWithDetails = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/placement-cycles`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE
            }
        });

        if (!res.data.success) {
            toast.error(res.data.message || "Failed to fetch placement cycles");
            return [];
        }

        if (!res.data.data || !Array.isArray(res.data.data)) {
            toast.error("Invalid response format for placement cycles");
            return [];
        }

        return res.data.data;
    } catch (err) {
        console.error("Failed to fetch active placement cycles:", err);
        toast.error("Failed to fetch active placement cycles. Please try again later.");
        return [];
    }
}

const updateCycle = async (cycleId: number, content: Partial<PlacementCycle>) => {
    try {
        const res = await axios.put(`${baseUrl}/api/placement-cycles/${cycleId}`, {
            ...content
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE
            }
        });

        if (!res.data.success) {
            console.error("Failed to update placement cycle:", res.data.message);
            toast.error(res.data.message || "Failed to update placement cycle");
            return null;
        }

        return res.data.data;
    } catch (err) {
        console.error("Failed to update placement cycle:", err);
        toast.error("Failed to update placement cycle. Please try again later.");
        return null;
    }
}

const deleteCycle = async (cycleId: number) => {
    try {
        const res = await axios.delete(`${baseUrl}/api/placement-cycles/${cycleId}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE
            }
        });

        if (!res.data.success) {
            toast.error(res.data.message || "Failed to delete placement cycle");
            return null;
        }

        return res.data.data;
    } catch (err) {
        console.error("Failed to delete placement cycle:", err);
        toast.error("Failed to delete placement cycle. Please try again later.");
        return null;
    }
}

const createCycle = async () => {
    try {
        const res = await axios.post(`${baseUrl}/api/placement-cycles`, {}, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_PLACEMENT_CYCLE
            }
        });

        if (!res.data.success) {
            toast.error(res.data.message || "Failed to create new placement cycle");
            return null;
        }

        return res.data.data;
    } catch (err) {
        console.error("Failed to create new placement cycle:", err);
        toast.error("Failed to create new placement cycle. Please try again later.");
        return null;
    }
}

export {
    fetchAllCycles,
    fetchAllCyclesWithDetails,
    updateCycle,
    deleteCycle,
    createCycle
};

