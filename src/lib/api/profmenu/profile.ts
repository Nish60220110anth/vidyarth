import { baseUrl } from "@/lib/config";
import { USER_ROLE } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";

const fetchUserInfoQuery = async (name: string, email: string, role: USER_ROLE) => {
    try {
        const queryRes = await axios.get(`${baseUrl}/api/users/query`, {
            params: { name, email, role },
        });

        if (!queryRes.data.success) {
            console.error("Error in /api/users/query:", queryRes.data.error);
            toast.error(queryRes.data.error);
            return null;
        }

        const userId = queryRes.data.data.id;
        const detailRes = await axios.get(`${baseUrl}/api/users/${userId}`);

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