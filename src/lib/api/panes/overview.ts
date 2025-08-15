import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";

type ApiResult<T> = {
    success: boolean;
    data: T | null;
    error?: string;
};

export const fetchOverviewContent = async (
    company_id: number
): Promise<ApiResult<string>> => {
    try {
        const res = await axios.get(`${baseUrl}/api/overview`, {
            params: { companyId: company_id },
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            },
        });

        const { success, data, error } = res.data ?? {};
        if (!success) {
            return { success: false, data: null, error: error || "Failed to load overview content" };
        }

        return { success: true, data: (data as string) ?? "", error: undefined };
    } catch (e: any) {
        return { success: false, data: null, error: e?.message || "Failed to load overview content" };
    }
};

export const updateOverviewContent = async (
    company_id: number,
    content: string
): Promise<ApiResult<string>> => {
    try {
        const res = await axios.put(
            `${baseUrl}/api/overview`,
            { companyId: company_id, content },
            {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO,
                },
            }
        );

        const { success, data, error } = res.data ?? {};
        if (!success) {
            return { success: false, data: null, error: error || "Failed to update overview content" };
        }

        return { success: true, data: (data as string) ?? "", error: undefined };
    } catch (e: any) {
        return { success: false, data: null, error: e?.message || "Failed to update overview content" };
    }
};
