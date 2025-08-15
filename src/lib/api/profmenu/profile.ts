import { baseUrl } from "@/lib/config";
import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchUserInfoQuery = async (userId: number) => {
    try {
        const detailRes = await axios.get(`${baseUrl}/api/users/${userId}`, {
            headers: {
                "x-access-permission": ACCESS_PERMISSION.ENABLE_PROFILE,
            }
        });

        if (detailRes.data.success) {
            return detailRes.data.data;
        } else {
            console.error("Error fetching user details:", detailRes.data.error);
            toast.error(detailRes.data.error);
            return null;
        }
    } catch (error) {
        toast.error("Failed to load user info");
        console.error("Error fetching user info:", error);
        return null;
    }
}

export {
    fetchUserInfoQuery
}