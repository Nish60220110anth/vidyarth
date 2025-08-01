
import { VideoEntry } from "@/components/ManageVideo";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { baseUrl } from "../config";
import toast from "react-hot-toast";

const fetchVideos = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/video`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_VIDEOS
            }
        });

        if (!res.data.success) {
            console.error("Failed to fetch videos:", res.data.message);
            toast.error("Failed to fetch videos. Please try again later.");
            return [];
        }

        const transformed = res.data.data.map((video: any): VideoEntry => ({
            id: video.id,
            embed_id: video.embed_id,
            title: video.title,
            video_type: video.type,
            stream_source: video.source,
            thumbnail_url: video.thumbnail_url,
            thumbnail_image_name: video.thumbnail_image_name,
            is_featured: video.is_featured,

            company_id: video.company.id,
            company_full: video.company.company_full,
            company_logo: video.company.logo_url || "",
        }));

        return transformed;
    } catch (error) {
        console.error("Failed to fetch videos:", error);
        toast.error("Failed to fetch videos. Please try again later.");
        return [];
    }
}

const deleteVideoById = async (id: number) => {
    try {
        const res = await axios.delete(`${baseUrl}/api/video/?id=${id}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_VIDEOS
            },
        });

        if (!res.data.success) {
            console.error("Failed to delete video:", res.data.message);
            toast.error("Failed to delete video. Please try again later.");
            return false;
        }

        toast.success("Video deleted.");
        return true;
    } catch (error) {
        console.error("Failed to delete video:", error);
        toast.error("Failed to delete video. Please try again later.");
        return false;
    }
}

const updateVideoById = async (formData: any) => {
    try {
        const res = await axios.put(`${baseUrl}/api/video`, formData, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_VIDEOS
            }
        });

        if (!res.data.success) {
            console.error("Failed to update video:", res.data.message);
            toast.error("Failed to update video. Please try again later.");
            return false;
        }

        toast.success("Video updated.");
        return res.data.data;
    } catch (error) {
        console.error("Failed to update video:", error);
        toast.error("Failed to update video. Please try again later.");
        return null;
    }
}

const createDefaultVideo = async () => {
    try {
        const res = await axios.post(`${baseUrl}/api/video`, {
            is_default: true
        }, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_VIDEOS
            }
        });

        if (!res.data.success) {
            console.error("Failed to create default video:", res.data.message);
            toast.error("Failed to create default video. Please try again later.");
            return null;
        }

        return res.data.data;
    } catch (error) {
        console.error("Failed to create default video:", error);
        toast.error("Failed to create default video. Please try again later.");
        return null;
    }
}

export {
    fetchVideos,
    deleteVideoById,
    updateVideoById,
    createDefaultVideo
}