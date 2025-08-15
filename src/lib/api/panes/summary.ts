import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";

type ApiResult<T> = {
    success: boolean;
    data: T | null;
    error: string | null;
};

export const fetchSummaryByCid = async (
    cid: number
): Promise<ApiResult<string>> => {
    try {
        const res = await axios.get(`${baseUrl}/api/summary`, {
            params: { companyId: cid },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            },
        });

        if (res?.data?.success) {
            return { success: true, data: res.data.data ?? "", error: null };
        }

        return {
            success: false,
            data: null,
            error:
                (res?.data?.error as string) ||
                "Failed to load summary. Please try again.",
        };
    } catch (err: any) {
        return {
            success: false,
            data: null,
            error:
                err?.response?.data?.error ||
                err?.message ||
                "Failed to load summary. Please try again.",
        };
    }
};

export const updateSummaryByCid = async (
    cid: number,
    content: string
): Promise<ApiResult<string>> => {
    try {
        const res = await axios.put(
            `${baseUrl}/api/summary`,
            { companyId: cid, content },
            {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO,
                },
            }
        );

        if (res?.data?.success) {
            return { success: true, data: res.data.data ?? content, error: null };
        }

        return {
            success: false,
            data: null,
            error:
                (res?.data?.error as string) ||
                "Failed to update summary. Please try again.",
        };
    } catch (err: any) {
        return {
            success: false,
            data: null,
            error:
                err?.response?.data?.error ||
                err?.message ||
                "Failed to update summary. Please try again.",
        };
    }
};
