import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchOverviewContent = async (company_id: number) => {
    try {

        const res = await axios.get(`${baseUrl}/api/overview`, {
            params: { companyId: company_id },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Error fetching overview content:", res.data.error);
            toast.error(res.data.error);
            return null;
        }

        return res.data.data;

    } catch (err: any) {
        console.error("Error fetching overview content:", err);
        toast.error("Failed to load overview content");
        return null;
    }
}

const updateOverviewContent = async (company_id: number, content: string) => {
    try {
        const res = await axios.put(`${baseUrl}/api/overview`, {
            companyId: company_id,
            content
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
            }
        });

        if (!res.data.success) {
            console.error("Error updating overview content:", res.data.error);
            toast.error(res.data.error);
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
    updateOverviewContent
}