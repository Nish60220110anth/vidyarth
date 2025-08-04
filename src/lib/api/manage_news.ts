import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { baseUrl } from "../config";
import { toast } from "react-hot-toast";

const getNewsOnQuery = async (query: URLSearchParams, perm: ACCESS_PERMISSION = ACCESS_PERMISSION.ENABLE_NEWS) => {
    try {

        const res = await axios.get(`${baseUrl}/api/news`, {
            params: query,
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": perm
            },
        });

        if (!res.data.success) {
            console.error("Failed to fetch news:", res.data.message);
            toast.error("Failed to fetch news. Please try again later.");
            return [];
        }

        return res.data.data;
    } catch (error) {
        console.error("Error fetching news:", error);
        toast.error("Failed to fetch news. Please try again later.");
        return [];
    }
}

const updateNews = async (id: number, data: any) => {
    try {
        const res = await axios.put(`${baseUrl}/api/news`, data, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
            },
        });

        if( !res.data.success) {
            console.error("Failed to update news:", res.data.message);
            toast.error("Failed to update news. Please try again later.");
            return null;
        }

        return res.data.data;
    } catch (error) {
        console.error("Error updating news:", error);
        toast.error("Failed to update news. Please try again later.");
        return null;
    }
}

const uploadImage = async (formData: FormData) => {
    try {
        const res = await axios.post(`${baseUrl}/api/news/upload-image`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
            },
        });

        return res.data.success;

    } catch (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image. Please try again later.");
        return false;
    }
}

const deleteNewById = async (id: number) => {
    try {
        const res = await axios.delete(`${baseUrl}/api/news`, {
            params: { id },
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
            },
        });

        return res.data.success;
    } catch (error) {
        console.error("Error deleting news:", error);
        toast.error("Failed to delete news. Please try again later.");
        return false;
    }
}

const createDefaultNews = async () => {
    try {
        const res = await axios.post(`${baseUrl}/api/news`, {
            is_default: true
        }, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.MANAGE_NEWS
            },
        });

        if (!res.data.success) {
            console.error("Failed to create default news:", res.data.message);
            toast.error("Failed to create default news. Please try again later.");
            return null;
        }

        return res.data.data;
    } catch (error) {
        console.error("Error creating default news:", error);
        toast.error("Failed to create default news. Please try again later.");
        return null;
    }
}

export {
    getNewsOnQuery,
    updateNews,
    uploadImage,
    deleteNewById,
    createDefaultNews
}