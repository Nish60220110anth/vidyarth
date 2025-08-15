import { ACCESS_PERMISSION } from "@prisma/client";
import axios from "axios";
import { baseUrl } from "../config";
import { SessionUser } from "../session";

type PermissionMap = Record<string, boolean>;

interface FetchPermissionsArgs {
    sections_permissions: Record<string, { perm: ACCESS_PERMISSION }>;
    profile_dropdown_items: Record<string, { perm: ACCESS_PERMISSION }>;
}

type ApiResult<T> = {
    success: boolean;
    data: T | null;
    error?: string;
};

export const fetchPermissionsFromSession = (
    { sections_permissions, profile_dropdown_items }: FetchPermissionsArgs,
    user: SessionUser | null
): ApiResult<PermissionMap> => {
    try {
        const userPerms = user?.permissions || [];
        const extraPerms = [ACCESS_PERMISSION.ENABLE_NOTIFICATIONS];

        const allPerms: ACCESS_PERMISSION[] = [
            ...Object.values(sections_permissions).map(({ perm }) => perm),
            ...Object.values(profile_dropdown_items).map(({ perm }) => perm),
            ...extraPerms,
        ];

        const perms: PermissionMap = {};
        allPerms.forEach((perm) => {
            perms[perm] = userPerms.includes(perm);
        });

        return { success: true, data: perms };
    } catch (e: any) {
        return { success: false, data: null, error: e?.message || "Failed to derive permissions from session" };
    }
};

export const getUserFromSession = async (): Promise<ApiResult<SessionUser>> => {
    try {
        const res = await axios.get(`${baseUrl}/api/auth/user`);
        const { success, data, error } = res.data ?? {};
        if (!success) {
            return { success: false, data: null, error: error || "Failed to fetch user session" };
        }
        return { success: true, data: data as SessionUser, error: undefined };
    } catch (e: any) {
        return { success: false, data: null, error: e?.message || "Failed to fetch user session" };
    }
};
