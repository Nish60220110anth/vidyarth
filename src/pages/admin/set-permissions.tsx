import { useEffect, useMemo, useState, useCallback } from "react";
import axios, { AxiosResponse } from "axios";
import { toast, Toaster } from "react-hot-toast";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type RolePermissionsPayload = {
    permissions: string[];
    description?: string | null;
};

const groupPermissions = (permissions: typeof ACCESS_PERMISSION): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};
    for (const perm of Object.values(permissions)) {
        const key =
            perm.startsWith("MANAGE_")
                ? "Access & Admin"
                : perm.startsWith("ENABLE_")
                    ? "Enable Features"
                    : perm.startsWith("EDIT_")
                        ? "Editable Sections"
                        : perm.includes("COMPANY")
                            ? "Company Related"
                            : perm.includes("CV") || perm.includes("DOMAIN")
                                ? "CV & Domain Prep"
                                : perm.includes("ALUMNI")
                                    ? "Alumni Experience"
                                    : "Miscellaneous";
        (grouped[key] ||= []).push(perm);
    }
    return grouped;
};

const PERMISSION_GROUPS = groupPermissions(ACCESS_PERMISSION);

export default function SetPermissionsPerUser() {
    const { basePath } = useRouter();

    const [selectedRole, setSelectedRole] = useState<USER_ROLE>(USER_ROLE.STUDENT);
    const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");

    const unwrap = <T,>(res: AxiosResponse<ApiResponse<T>>): T => {
        if (res?.data?.success) return res.data.data as T;
        throw new Error(res?.data?.error || `HTTP ${res?.status}`);
    };

    const getErr = (e: any) => e?.response?.data?.error || e?.message || "Something went wrong";

    const loadRole = useCallback(
        async (signal?: AbortSignal) => {
            try {
                setLoading(true);
                const res = await axios.get<ApiResponse<RolePermissionsPayload>>(
                    `${basePath}/api/permissions/${selectedRole}`,
                    {
                        signal,
                        headers: { "x-access-permission": ACCESS_PERMISSION.ADMIN },
                    }
                );
                const data = unwrap<RolePermissionsPayload>(res);
                setRolePermissions(new Set(data.permissions || []));
                setDescription(data.description || "");
            } catch (e) {
                toast.error(getErr(e));
                setRolePermissions(new Set());
                setDescription("");
            } finally {
                setLoading(false);
            }
        },
        [basePath, selectedRole]
    );

    useEffect(() => {
        const ac = new AbortController();
        loadRole(ac.signal);
        return () => ac.abort();
    }, [loadRole]);

    const handleCheckboxChange = (permission: string) => {
        setRolePermissions(prev => {
            const next = new Set(prev);
            next.has(permission) ? next.delete(permission) : next.add(permission);
            return next;
        });
    };

    const toggleGroup = (perms: string[], on: boolean) => {
        setRolePermissions(prev => {
            const next = new Set(prev);
            perms.forEach(p => (on ? next.add(p) : next.delete(p)));
            return next;
        });
    };

    const savePermissions = async () => {
        try {
            setSaving(true);
            const res = await axios.post<ApiResponse<{}>>(
                `${basePath}/api/permissions/save`,
                {
                    role: selectedRole,
                    permissions: Array.from(rolePermissions),
                    description,
                },
                { headers: { "x-access-permission": ACCESS_PERMISSION.ADMIN } }
            );
            unwrap(res);
            toast.success("Saved");
        } catch (e) {
            toast.error(getErr(e));
        } finally {
            setSaving(false);
        }
    };

    const filteredGroups = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return PERMISSION_GROUPS;
        const out: Record<string, string[]> = {};
        for (const [label, perms] of Object.entries(PERMISSION_GROUPS)) {
            const list = perms.filter(p => p.toLowerCase().includes(q));
            if (list.length) out[label] = list;
        }
        return out;
    }, [search]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0b1520] via-[#0a141d] to-[#0b1520] text-cyan-100">
            <Toaster position="top-right" />
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-300">Set Role Permissions</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value as USER_ROLE)}
                            disabled={saving}
                            className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        >
                            {Object.keys(USER_ROLE).map(r => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={() => loadRole()}
                            disabled={loading || saving}
                            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-[#0a141d] hover:bg-cyan-300 disabled:opacity-50"
                        >
                            Reload
                        </button>
                    </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <input
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Role description"
                        className="sm:col-span-2 rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm placeholder-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search permissions"
                        className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm placeholder-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                </div>

                <div className="space-y-8">
                    {loading ? (
                        <div className="grid grid-cols-1 gap-6">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="rounded-2xl border border-cyan-900/60 bg-[#0b1014]/80 p-6">
                                    <div className="h-5 w-40 rounded bg-cyan-900/30 mb-4 animate-pulse" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Array.from({ length: 6 }).map((__, j) => (
                                            <div key={j} className="h-9 rounded bg-cyan-900/30 animate-pulse" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        Object.entries(filteredGroups).map(([label, perms]) => {
                            const selectedCount = perms.filter(p => rolePermissions.has(p)).length;
                            const allSelected = selectedCount === perms.length && perms.length > 0;
                            const noneSelected = selectedCount === 0;
                            return (
                                <div key={label} className="rounded-2xl border border-cyan-900/60 bg-[#0b1014]/80 p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-cyan-300">{label}</h2>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-cyan-300/70">
                                                {selectedCount}/{perms.length} selected
                                            </span>
                                            <button
                                                onClick={() => toggleGroup(perms, true)}
                                                disabled={saving || allSelected}
                                                className="rounded border border-cyan-900/60 bg-[#0a141d] px-2 py-1 hover:bg-[#0e1e2b] disabled:opacity-50"
                                            >
                                                Select all
                                            </button>
                                            <button
                                                onClick={() => toggleGroup(perms, false)}
                                                disabled={saving || noneSelected}
                                                className="rounded border border-cyan-900/60 bg-[#0a141d] px-2 py-1 hover:bg-[#0e1e2b] disabled:opacity-50"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {perms.map(perm => {
                                            const checked = rolePermissions.has(perm);
                                            return (
                                                <label
                                                    key={perm}
                                                    className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${checked
                                                            ? "border-cyan-700/60 bg-[#0f1b25]"
                                                            : "border-cyan-900/60 bg-[#0f1822]"
                                                        } ${saving ? "opacity-60" : "hover:bg-[#102231]"}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={checked}
                                                        onChange={() => handleCheckboxChange(perm)}
                                                        disabled={saving}
                                                    />
                                                    {checked ? (
                                                        <CheckCircleIcon className="h-5 w-5 text-cyan-400" />
                                                    ) : (
                                                        <XCircleIcon className="h-5 w-5 text-cyan-500/40" />
                                                    )}
                                                    <span className="text-cyan-100 break-all">{perm}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="mt-10 flex justify-center">
                    <button
                        onClick={savePermissions}
                        disabled={saving || loading}
                        className="rounded-xl bg-cyan-400 px-8 py-3 text-sm font-semibold text-[#0a141d] hover:bg-cyan-300 disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Permissions"}
                    </button>
                </div>
            </div>
        </div>
    );
}
