import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";
import { baseUrl } from "../config";

const fetchOverviewContent = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/prep/?rType=overview`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch overview content:", res.data.error);
            toast.error("Failed to fetch overview content");
            return null;
        }

        return res.data.data;

    } catch (err: any) {
        console.error("Error fetching overview content:", err);
        toast.error("Failed to fetch overview content");
        return null;
    }
}

const updateOveriewContent = async (content: string) => {
    try {
        const res = await axios.put(`${baseUrl}/api/prep`, {
            content,
            rType: "overview"
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
            }
        });

        if (!res.data.success) {
            console.error("Failed to update overview content:", res.data.error);
            toast.error("Failed to update overview content");
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error updating overview content:", err);
        toast.error("Failed to update overview content");
        return null;
    }
}

export {
    fetchOverviewContent,
    updateOveriewContent
}