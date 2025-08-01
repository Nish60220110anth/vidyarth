import { NotificationProperty } from "@/components/EmailProps";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { toast } from "react-hot-toast";
import { baseUrl } from "../config";

const fetchEmailProps = async (): Promise<any> => {
    try {

        const res = await axios.get(`${baseUrl}/api/email/props`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            },
        });

        if (!res.data.success) {
            toast.error(res.data.error || "Failed to load data");
            return {};
        }

        const grouped: Record<string, NotificationProperty> = {};
        for (const item of res.data.data) {
            grouped[item.type] = item;
        }
        return grouped;
    } catch (error) {
        console.error("Failed to fetch email properties:", error);
        toast.error("Failed to load email properties");
        return {};
    }
}

const updateEmailProps = async (entry: NotificationProperty): Promise<boolean> => {
    try {
        const res = await axios.put(`${baseUrl}/api/email/props`, entry, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
            },
        });

        if (!res.data.success) {
            toast.error(res.data.error || "Failed to update email properties");
            return false;
        }

        toast.success("Email properties updated successfully");
        return true;
    } catch (error) {
        console.error("Failed to update email properties:", error);
        toast.error("Failed to update email properties");
        return false;
    }
}

export {
    fetchEmailProps,
    updateEmailProps,
}