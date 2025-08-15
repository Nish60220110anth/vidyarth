import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";

type ApiResult<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

const fetchDomainContent = async (domain: string): Promise<ApiResult<string>> => {
    try {
        const queryParams = new URLSearchParams({ rType: "domain", d: domain });

        const res = await axios.get(
            `${baseUrl}/api/prep/?${queryParams.toString()}&t=${Date.now()}`,
            {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
                },
            }
        );

        if (!res.data?.success) {
            return {
                success: false,
                error: res.data?.error || "Failed to fetch domain content",
            };
        }

        return { success: true, data: res.data.data ?? "" };
    } catch (err: any) {
        return {
            success: false,
            error:
                err?.response?.data?.error ||
                err?.message ||
                "Failed to fetch domain content",
        };
    }
};

const updateDomainContent = async (
    domain: string,
    content: string
): Promise<ApiResult<string>> => {
    try {
        const res = await axios.put(
            `${baseUrl}/api/prep/`,
            { rType: "domain", d: domain, content },
            {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.EDIT_COMPANY_INFO,
                },
            }
        );

        if (!res.data?.success) {
            return {
                success: false,
                error: res.data?.error || "Failed to update domain content",
            };
        }

        return { success: true, data: res.data.data };
    } catch (err: any) {
        return {
            success: false,
            error:
                err?.response?.data?.error ||
                err?.message ||
                "Failed to update domain content",
        };
    }
};

export { fetchDomainContent, updateDomainContent };
