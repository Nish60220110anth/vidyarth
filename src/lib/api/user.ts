import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import toast from "react-hot-toast";
import { baseUrl } from "../config";

type PermissionMap = Record<string, boolean>;

interface FetchPermissionsArgs {
    sections_permissions: Record<string, { perm: ACCESS_PERMISSION }>;
    profile_dropdown_items: Record<string, { perm: ACCESS_PERMISSION }>;
}

export const fetchPermissions = async (permission: ACCESS_PERMISSION = ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY) => {
    try {
        const res = await axios.get(`${baseUrl}/api/permissions`, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": permission,
            },
        });

        if (!res.data.success) {
            toast.error("Failed to fetch permissions");
            return [];
        }

        return res.data.permissions || [];
    }
    catch (error: any) {
        console.error("Failed to fetch permissions:", error.message || error);
        toast.error("Failed to fetch permissions");
        return [];
    }
}

export const fetchPermissionsFromSession = async (
    { sections_permissions, profile_dropdown_items }: FetchPermissionsArgs
): Promise<PermissionMap> => {
    try {
        const res = await axios.get(`${baseUrl}/api/permissions`, {
            headers: {
                "Content-Type": "application/json",
                "x-access-permission": ACCESS_PERMISSION.ENABLE_COMPANY_DIRECTORY,
            },
        });

        if(!res.data.success) {
            toast.error("Failed to fetch permissions");
            console.error("Error fetching permissions:", res.data.error);
            return {};
        }

        if (!res.data || !Array.isArray(res.data.permissions)) {
            toast.error("Invalid permission response format");
            return {};
        }

        const perms: PermissionMap = {};
        const extraPerms = [ACCESS_PERMISSION.ENABLE_NOTIFICATIONS];

        const allPerms = [
            ...Object.values(sections_permissions).map(({ perm }) => perm),
            ...Object.values(profile_dropdown_items).map(({ perm }) => perm),
            ...extraPerms,
        ];

        allPerms.forEach((perm) => {
            perms[perm] = res.data.permissions.includes(perm);
        });

        return perms;
    } catch (error: any) {
        console.error("Failed to fetch permissions:", error.message || error);
        toast.error("Failed to fetch permissions")
        return {};
    }
};

export const getUserFromSession = async () => {
    try {
        const res = await axios.get(`${baseUrl}/api/auth/user`);

        if(!res.data.success) {
            toast.error("Failed to fetch user session");
            return null;
        }

        return res.data;
    } catch (err: any) {
        console.log("Error fetching user from session:", err.message || err);
        toast.error("Failed to fetch user session");
    };
}
