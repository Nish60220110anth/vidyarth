import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { baseUrl } from "../config";

type ApiResult<T> = {
    success: boolean;
    data: T;
    error: string | null;
};

const errMsg = (e: any, fallback: string) =>
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    fallback;

/** Fetch news by query */
const getNewsOnQuery = async (
    query: URLSearchParams,
    perm: ACCESS_PERMISSION = ACCESS_PERMISSION.ENABLE_NEWS
): Promise<ApiResult<any[]>> => {
    try {
        const res = await axios.get(`${baseUrl}/api/news`, {
            params: query,
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": perm,
            },
        });

        if (!res.data?.success) {
            const error = res.data?.error || res.data?.message || "Failed to fetch news.";
            console.error("Failed to fetch news:", error);
            return { success: false, data: [], error };
        }

        return { success: true, data: res.data.data ?? [], error: null };
    } catch (error: any) {
        console.error("Error fetching news:", error);
        return { success: false, data: [], error: errMsg(error, "Failed to fetch news.") };
    }
};

/** Update a news item */
const updateNews = async (id: number, data: any): Promise<ApiResult<any>> => {
    try {
        const res = await axios.put(`${baseUrl}/api/news`, data, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS,
            },
        });

        if (!res.data?.success) {
            const error = res.data?.error || res.data?.message || "Failed to update news.";
            console.error("Failed to update news:", error);
            return { success: false, data: null, error };
        }

        return { success: true, data: res.data.data ?? null, error: null };
    } catch (error: any) {
        console.error("Error updating news:", error);
        return { success: false, data: null, error: errMsg(error, "Failed to update news.") };
    }
};

/** Upload news image */
const uploadImage = async (formData: FormData): Promise<ApiResult<any>> => {
    try {
        const res = await axios.post(`${baseUrl}/api/news/upload-image`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS,
            },
        });

        if (!res.data?.success) {
            const error = res.data?.error || res.data?.message || "Failed to upload image.";
            console.error("Failed to upload image:", error);
            return { success: false, data: null, error };
        }

        // Some backends return updated news/image meta in `data`; pass it through if present.
        return { success: true, data: res.data.data ?? true, error: null };
    } catch (error: any) {
        console.error("Error uploading image:", error);
        return { success: false, data: null, error: errMsg(error, "Failed to upload image.") };
    }
};

/** Delete news by id */
const deleteNewById = async (id: number): Promise<ApiResult<true>> => {
    try {
        const res = await axios.delete(`${baseUrl}/api/news`, {
            params: { id },
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS,
            },
        });

        if (!res.data?.success) {
            const error = res.data?.error || res.data?.message || "Failed to delete news.";
            console.error("Failed to delete news:", error);
            return { success: false, data: null as any, error };
        }

        return { success: true, data: true, error: null };
    } catch (error: any) {
        console.error("Error deleting news:", error);
        return { success: false, data: null as any, error: errMsg(error, "Failed to delete news.") };
    }
};

/** Create a default/blank news item */
const createDefaultNews = async (): Promise<ApiResult<any>> => {
    try {
        const res = await axios.post(
            `${baseUrl}/api/news`,
            { is_default: true },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS,
                },
            }
        );

        if (!res.data?.success) {
            const error = res.data?.error || res.data?.message || "Failed to create default news.";
            console.error("Failed to create default news:", error);
            return { success: false, data: null, error };
        }

        return { success: true, data: res.data.data ?? null, error: null };
    } catch (error: any) {
        console.error("Error creating default news:", error);
        return { success: false, data: null, error: errMsg(error, "Failed to create default news.") };
    }
};

export { getNewsOnQuery, updateNews, uploadImage, deleteNewById, createDefaultNews };
