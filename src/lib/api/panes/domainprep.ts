import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchDomainContent = async (domain: string) => {
    try {
        const queryParams = new URLSearchParams({
            rType: 'domain',
            d: domain
        });

        const res = await axios.get(`${baseUrl}/api/prep/?${queryParams.toString()}&t=${Date.now()}`, {
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

const updateDomainContent = async (domain: string, content: string) => {

    try {
        const res = await axios.put(`${baseUrl}/api/prep/`, {
            rType: 'domain',
            d: domain,
            content
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
            }
        });

        if (!res.data.success) {
            console.error("Failed to update domain content:", res.data.error);
            toast.error("Failed to update domain content");
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error updating domain content:", err);
        toast.error("Failed to update domain content");

        return null;
    }
}

export {
    fetchDomainContent,
    updateDomainContent
}
