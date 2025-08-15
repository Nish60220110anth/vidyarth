import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";
import { baseUrl } from "../config";

type ApiResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};


const fetchRoundPrepContent = async (r: string): Promise<ApiResult<string>> => {
    try {
        const queryParams = new URLSearchParams({ rType: "round", r });

        const res = await axios.get(`${baseUrl}/api/prep/?${queryParams.toString()}&t=${Date.now()}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch round content:", res.data.error);
            toast.error("Failed to fetch round content");
            return {
                success: false,
                error: res.data.error
            };
        }

        return {
            success: true,
            data: res.data.data
        };

    } catch (err: any) {
        console.error("Error fetching round content:", err);
        toast.error("Failed to fetch round content");
        return {
            success: false,
            error: "Failed to fetch round content"
        };
    }
}

const updateRoundPrepContent = async (r: string, content: string): Promise<ApiResult<string>> => {
    try {
        const res = await axios.put(`${baseUrl}/api/prep`, {
            content,
            rType: "round",
            r
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO
            }
        });

        if (!res.data.success) {
            console.error("Failed to update round prep content:", res.data.error);
            toast.error("Failed to update round prep content");
            return {
                success: false,
                error: res.data.error
            };
        }

        return {
            success: true,
            data: res.data.data
        };
    } catch (err: any) {
        console.error("Error updating round content:", err);
        toast.error("Failed to update round content");
        return {
            success: false,
            error: "Failed to update round content"
        };
    }
}

export {
    fetchRoundPrepContent,
    updateRoundPrepContent
}