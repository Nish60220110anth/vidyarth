import { useEffect, useMemo, useState, useCallback } from "react";
import axios, { AxiosResponse } from "axios";
import { toast } from "react-hot-toast";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type User = {
    id: number;
    name: string;
    pgpid?: string | null;
    pcomid?: string | null;
    email_id: string;
    role: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
};

export default function UserManagementPage() {
    const { basePath } = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
    const [verifiedFilter, setVerifiedFilter] = useState<boolean | null>(null);
    const [busyIds, setBusyIds] = useState<Set<number>>(new Set());

    const unwrap = <T,>(res: AxiosResponse<ApiResponse<T>>): T => {
        if (res?.data?.success) return res.data.data as T;
        throw new Error(res?.data?.error || `HTTP ${res?.status}`);
    };

    const getErr = (e: any) =>
        e?.response?.data?.error || e?.message || "Something went wrong";

    const fetchUsers = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const res = await axios.get<ApiResponse<User[]>>(
                `${basePath}/api/admin/users`,
                { signal, headers: { 'x-access-permission': ACCESS_PERMISSION.ADMIN } }
            );
            const data = unwrap<User[]>(res);
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error(getErr(e));
        } finally {
            setLoading(false);
        }
    }, [basePath]);

    useEffect(() => {
        const ac = new AbortController();
        fetchUsers(ac.signal);
        return () => ac.abort();
    }, [fetchUsers]);

    const refresh = useCallback(() => fetchUsers(), [fetchUsers]);

    const setBusy = (id: number, on: boolean) =>
        setBusyIds(prev => {
            const next = new Set(prev);
            on ? next.add(id) : next.delete(id);
            return next;
        });

    const updateUser = useCallback(
        async (id: number, updates: Partial<User>) => {
            try {
                setBusy(id, true);
                const res = await axios.patch<ApiResponse<User>>(
                    `${basePath}/api/admin/users/${id}`,
                    updates,
                    { headers: { 'x-access-permission': ACCESS_PERMISSION.ADMIN } }
                );
                const updated = unwrap<User>(res);
                setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
                toast.success("Saved");
            } catch (e) {
                toast.error(getErr(e));
            } finally {
                setBusy(id, false);
            }
        },
        [basePath]
    );

    const deleteUser = useCallback(
        async (id: number) => {
            try {
                setBusy(id, true);
                const res = await axios.delete<ApiResponse<{ id: number }>>(
                    `${basePath}/api/admin/users/${id}`,
                    { headers: { 'x-access-permission': ACCESS_PERMISSION.ADMIN } }
                );
                unwrap(res);
                setUsers(prev => prev.filter(u => u.id !== id));
                toast.success("Deleted");
            } catch (e) {
                toast.error(getErr(e));
            } finally {
                setBusy(id, false);
            }
        },
        [basePath]
    );

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        return users
            .filter(u => (roleFilter ? u.role === roleFilter : true))
            .filter(u => (activeFilter === null ? true : u.is_active === activeFilter))
            .filter(u => (verifiedFilter === null ? true : u.is_verified === verifiedFilter))
            .filter(u =>
                s
                    ? u.name.toLowerCase().includes(s) ||
                    u.email_id.toLowerCase().includes(s) ||
                    String(u.pgpid || "").toLowerCase().includes(s)
                    : true
            );
    }, [users, roleFilter, activeFilter, verifiedFilter, search]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b1520] via-[#0a141d] to-[#0b1520] text-cyan-100">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-cyan-300">
                            Manage Users
                        </h1>
                        <p className="text-cyan-300/70 text-sm mt-1">
                            Search, filter, update roles and statuses.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setRoleFilter(null);
                                setActiveFilter(null);
                                setVerifiedFilter(null);
                                setSearch("");
                            }}
                            className="rounded-lg border border-cyan-800 bg-[#0a141d] px-3 py-2 text-sm hover:bg-[#0e1e2b]"
                        >
                            Reset
                        </button>
                        <button
                            onClick={refresh}
                            className="rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-[#0a141d] hover:bg-cyan-300"
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name, email, PGP ID"
                        className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm placeholder-cyan-500/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                    <select
                        value={roleFilter || ""}
                        onChange={e => setRoleFilter(e.target.value || null)}
                        className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                        <option value="">All roles</option>
                        {Object.keys(USER_ROLE).map(role => (
                            <option key={role} value={role}>
                                {role}
                            </option>
                        ))}
                    </select>
                    <select
                        value={activeFilter === null ? "" : String(activeFilter)}
                        onChange={e =>
                            setActiveFilter(e.target.value === "" ? null : e.target.value === "true")
                        }
                        className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                        <option value="">Active: All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <select
                        value={verifiedFilter === null ? "" : String(verifiedFilter)}
                        onChange={e =>
                            setVerifiedFilter(
                                e.target.value === "" ? null : e.target.value === "true"
                            )
                        }
                        className="rounded-lg border border-cyan-900/60 bg-[#0f1822] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                        <option value="">Verified: All</option>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                    </select>
                </div>

                <div className="rounded-xl border border-cyan-900/60 bg-[#0b1014]/80 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[#0e1e2b] text-cyan-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Name</th>
                                    <th className="px-4 py-3 text-left font-semibold">Email</th>
                                    <th className="px-4 py-3 text-left font-semibold">Role</th>
                                    <th className="px-4 py-3 text-left font-semibold">Active</th>
                                    <th className="px-4 py-3 text-left font-semibold">Verified</th>
                                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading &&
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`sk-${i}`} className="border-t border-cyan-900/40">
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-40 rounded bg-cyan-900/30 animate-pulse" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-4 w-52 rounded bg-cyan-900/30 animate-pulse" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-8 w-28 rounded bg-cyan-900/30 animate-pulse" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-6 w-6 rounded-full bg-cyan-900/30 animate-pulse" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-6 w-6 rounded-full bg-cyan-900/30 animate-pulse" />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="h-8 w-20 rounded bg-cyan-900/30 animate-pulse" />
                                            </td>
                                        </tr>
                                    ))}

                                {!loading &&
                                    filtered.map(user => {
                                        const busy = busyIds.has(user.id);
                                        return (
                                            <tr key={user.id} className="border-t border-cyan-900/40">
                                                <td className="px-4 py-3">{user.name}</td>
                                                <td className="px-4 py-3">{user.email_id}</td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        disabled={busy}
                                                        value={user.role}
                                                        onChange={e =>
                                                            updateUser(user.id, { role: e.target.value })
                                                        }
                                                        className="rounded-md border border-cyan-900/60 bg-[#0f1822] px-2 py-1 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                                                    >
                                                        {Object.keys(USER_ROLE).map(role => (
                                                            <option key={role} value={role}>
                                                                {role}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        disabled={busy}
                                                        onClick={() =>
                                                            updateUser(user.id, { is_active: !user.is_active })
                                                        }
                                                        className="disabled:opacity-50"
                                                        title="Toggle Active"
                                                    >
                                                        {user.is_active ? (
                                                            <CheckCircleIcon className="h-6 w-6 text-emerald-400 hover:text-emerald-300 transition" />
                                                        ) : (
                                                            <XCircleIcon className="h-6 w-6 text-cyan-500/40 hover:text-rose-400 transition" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        disabled={busy}
                                                        onClick={() =>
                                                            updateUser(user.id, { is_verified: !user.is_verified })
                                                        }
                                                        className="disabled:opacity-50"
                                                        title="Toggle Verified"
                                                    >
                                                        {user.is_verified ? (
                                                            <CheckCircleIcon className="h-6 w-6 text-sky-400 hover:text-sky-300 transition" />
                                                        ) : (
                                                            <XCircleIcon className="h-6 w-6 text-cyan-500/40 hover:text-amber-300 transition" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        disabled={busy}
                                                        onClick={() => deleteUser(user.id)}
                                                        className="rounded-md bg-rose-600 px-3 py-1 text-white hover:bg-rose-500 disabled:opacity-50"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                {!loading && filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-6 text-center text-cyan-300/70"
                                        >
                                            No users match your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 text-xs text-cyan-300/70">
                        <span>Total: {users.length}</span>
                        <span>Showing: {filtered.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
