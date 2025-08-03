import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchSummaryByCid = async (cid: number): Promise<any> => {
    try {
        const res = await axios.get(`${baseUrl}/api/summary`, {
            params: { companyId: cid },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Error fetching summary:", res.data.error);
            toast.error(res.data.error);
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error fetching summary:", err);
        toast.error("Failed to load summary");
        return null;
    }
}

const updateSummaryByCid = async (cid: number, content: string): Promise<any> => {
    try {
        const res = await axios.put(`${baseUrl}/api/summary`, {
            companyId: cid,
            content,
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
            }
        });

        if (!res.data.success) {
            console.error("Error updating summary:", res.data.error);
            toast.error(res.data.error);
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error updating summary:", err);
        toast.error("Failed to update summary");
        return null;
    }
}

export {
    fetchSummaryByCid,
    updateSummaryByCid
}