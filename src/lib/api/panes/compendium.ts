import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchCompendiumByCompanyID = async (company_id: number) => {
    try {
        const res = await axios.get(`${baseUrl}/api/compendium`, {
            params: { cid: company_id },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch compendium:", res.data.error);
            toast.error(res.data.error);
            return null;
        }

        return res.data;
    } catch (error) {
        console.error("Failed to fetch compendium:", error);
        toast.error("Failed to fetch compendium");
        return null;
    }
}

const updateCompendium = async (company_id: number, formData: FormData) => {
    try {
        const res = await axios.put(`${baseUrl}/api/compendium`, formData, {
            params: { cid: company_id },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_MY_COHORT,
                "Content-Type": "multipart/form-data"
            }
        });

        if (!res.data.success) {
            console.error("Failed to save compendium:", res.data.error);
            toast.error(res.data.error);
            return false;
        }

        return true;
    }
    catch (error) {
        console.error("Failed to save compendium:", error);
        toast.error("Failed to save compendium");
        return false;
    }
}

export { fetchCompendiumByCompanyID, updateCompendium };
