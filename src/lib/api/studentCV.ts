import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";

const fetchCVForUserID = async (id: number) => {
    try {
        const res = await axios.get(`${baseUrl}/api/cv/?user_id=${id}`, {
            headers: {
                'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV
            }
        });

        if (!res.data.success) {
            toast.error(res.data.error);
            return [];
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error fetching CVs:", err);
        toast.error("Failed to fetch CVs. Please try again later.");
        return [];
    }
};

const fetchCVFile = async (cv_path: string) => {
    const res = await fetch(`${baseUrl}/api/cv/fetch?file=${encodeURIComponent(cv_path)}`, {
        headers: {
            'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV
        }
    });
    const blob = await res.blob();
    return URL.createObjectURL(blob);
}

const putStudentCV = async (cv_id: number, domain?: string, comment?: string) => {
    try {
        const res = await axios.put(`${baseUrl}/api/cv/`, {
            cv_id,
            domain,
            comment
        }, {
            headers: {
                'x-access-permission': ACCESS_PERMISSION.ENABLE_MY_CV
            }
        });

        if (!res.data.success) {
            toast.error(res.data.error);
            return null;
        }

        return res.data.data;
    } catch (err: any) {
        console.error("Error updating CV:", err);
        toast.error("Failed to update CV. Please try again later.");
        return null;
    }
};

export {
    fetchCVForUserID,
    fetchCVFile,
    putStudentCV
};