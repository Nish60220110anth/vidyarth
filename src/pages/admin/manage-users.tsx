import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';


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

const roles = [
    "STUDENT", "SUPER_STUDENT", "DISHA", "CCA_CONSULT", "CCA_FINANCE",
    "CCA_PRODMAN", "CCA_OPERATIONS", "CCA_GENMAN", "CCA_MARKETING",
    "PLACECOM", "ALUMNI"
];

export default function UserManagementPage() {

    const [roleFilter, setRoleFilter] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<boolean | null>(null);
    const [verifiedFilter, setVerifiedFilter] = useState<boolean | null>(null);


    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        axios.get("/api/admin/users").then(res => setUsers(res.data));
    }, []);

    const updateUser = async (id: number, updates: Partial<User>) => {
        try {
            const res = await axios.patch(`/api/admin/users/${id}`, updates);
            if (res.status === 200) {
                setUsers(users.map(u => (u.id === id ? { ...u, ...updates } : u)));
                toast.success("User updated successfully");
            } else if (res.status === 403) {
                toast.error("Unauthorized to update user");
            } else {
                toast.error("Update failed");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Something went wrong while updating";
            toast.error(msg);
        }
    };


    const deleteUser = async (id: number) => {
        try {
            const res = await axios.delete(`/api/admin/users/${id}`);
            if (res.status === 200) {
                setUsers(users.filter(u => u.id !== id));
                toast.success("User deleted");
            } else if (res.status === 403) {
                toast.error("Not authorized to delete this user");
            } else {
                toast.error("Delete failed");
            }
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Something went wrong while deleting";
            toast.error(msg);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
            <h1 className="text-3xl font-bold mb-6 text-cyan-300">Manage Users</h1>

            <div className="flex flex-wrap gap-4 mb-6">
                <div>
                    <label className="block text-sm mb-1 text-gray-300">Role</label>
                    <select
                        value={roleFilter || ''}
                        onChange={(e) => setRoleFilter(e.target.value || null)}
                        className="bg-gray-800 text-white border border-gray-700 px-3 py-1 rounded"
                    >
                        <option value="">All</option>
                        {roles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1 text-gray-300">Active</label>
                    <select
                        value={activeFilter === null ? '' : String(activeFilter)}
                        onChange={(e) => {
                            const value = e.target.value;
                            setActiveFilter(value === '' ? null : value === 'true');
                        }}
                        className="bg-gray-800 text-white border border-gray-700 px-3 py-1 rounded"
                    >
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm mb-1 text-gray-300">Verified</label>
                    <select
                        value={verifiedFilter === null ? '' : String(verifiedFilter)}
                        onChange={(e) => {
                            const value = e.target.value;
                            setVerifiedFilter(value === '' ? null : value === 'true');
                        }}
                        className="bg-gray-800 text-white border border-gray-700 px-3 py-1 rounded"
                    >
                        <option value="">All</option>
                        <option value="true">Verified</option>
                        <option value="false">Unverified</option>
                    </select>
                </div>
            </div>

            <button
                onClick={() => {
                    setRoleFilter(null);
                    setActiveFilter(null);
                    setVerifiedFilter(null);
                }}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm px-4 py-1 rounded shadow"
            >
                Reset Filters
            </button>



            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse table-auto">
                    <thead>
                        <tr className="bg-gray-800 text-left">
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Email</th>
                            <th className="px-4 py-2">Role</th>
                            <th className="px-4 py-2">Active</th>
                            <th className="px-4 py-2">Verified</th>
                            <th className="px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.filter(u => roleFilter ? u.role === roleFilter : true)
                            .filter(u => activeFilter === null ? true : u.is_active === activeFilter)
                            .filter(u => verifiedFilter === null ? true : u.is_verified === verifiedFilter).
                            map(user => (
                                <tr key={user.id} className="border-t border-gray-700">
                                    <td className="px-4 py-2">{user.name}</td>
                                    <td className="px-4 py-2">{user.email_id}</td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={user.role}
                                            onChange={(e) => updateUser(user.id, { role: e.target.value })}
                                            className="bg-gray-700 text-white rounded px-2 py-1"
                                        >
                                            {roles.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => updateUser(user.id, { is_active: !user.is_active })}
                                                className="focus:outline-none"
                                                title="Toggle Active"
                                            >
                                                {user.is_active ? (
                                                    <CheckCircleIcon className="h-6 w-6 text-green-400 hover:text-green-300 transition" />
                                                ) : (
                                                    <XCircleIcon className="h-6 w-6 text-gray-500 hover:text-red-400 transition" />
                                                )}
                                            </button>
                                        </td>

                                    </td>
                                    <td className="px-4 py-2">
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => updateUser(user.id, { is_verified: !user.is_verified })}
                                                className="focus:outline-none"
                                                title="Toggle Verified"
                                            >
                                                {user.is_verified ? (
                                                    <CheckCircleIcon className="h-6 w-6 text-blue-400 hover:text-blue-300 transition" />
                                                ) : (
                                                    <XCircleIcon className="h-6 w-6 text-gray-500 hover:text-yellow-300 transition" />
                                                )}
                                            </button>
                                        </td>

                                    </td>
                                    <td className="px-4 py-2">
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center text-gray-500 py-4">No users found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
