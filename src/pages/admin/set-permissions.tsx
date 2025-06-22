import { useEffect, useState } from "react";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { ACCESS_PERMISSION, USER_ROLE } from "@prisma/client";
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const groupPermissions = (permissions: typeof ACCESS_PERMISSION): Record<string, string[]> => {
    const grouped: Record<string, string[]> = {};

    for (const perm of Object.values(permissions)) {
        const key = (() => {
            if (perm.startsWith("MANAGE_")) return "Access & Admin";
            if (perm.startsWith("ENABLE_")) return "Enable Features";
            if (perm.startsWith("EDIT_")) return "Editable Sections";
            if (perm.includes("COMPANY")) return "Company Related";
            if (perm.includes("CV") || perm.includes("DOMAIN")) return "CV & Domain Prep";
            if (perm.includes("ALUMNI")) return "Alumni Experience";
            return "Miscellaneous";
        })();

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(perm);
    }

    return grouped;
};

const permissionGroups = groupPermissions(ACCESS_PERMISSION);


export default function SetPermissionsPerUser() {
    const [selectedRole, setSelectedRole] = useState("STUDENT");
    const [rolePermissions, setRolePermissions] = useState<Set<string>>(new Set());
    const [description, setDescription] = useState("");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => { setIsClient(true); }, []);

    useEffect(() => {
        if (selectedRole) {
            axios.get(`/api/permissions/${selectedRole}`).then((res) => {
                setRolePermissions(new Set(res.data.permissions));
                setDescription(res.data.description || "");
            });
        }
    }, [selectedRole]);

    const handleCheckboxChange = (permission: string) => {
        setRolePermissions(prev => {
            const updated = new Set(prev);
            updated.has(permission) ? updated.delete(permission) : updated.add(permission);
            return updated;
        });
    };

    const savePermissions = async () => {
        await axios.post("/api/permissions/save", {
            role: selectedRole,
            permissions: Array.from(rolePermissions),
            description,
        });
        toast.success(`Permissions updated for ${selectedRole}`);
    };

    const renderPermissions = (label: string, permissions: string[]) => {
        return (
            <div className="mb-10">
                <h2 className="text-2xl font-semibold text-cyan-300 mb-4 tracking-wide">{label}</h2>
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-800 border border-gray-700 p-6 rounded-xl shadow-md min-h-[50px] max-w-6xl w-full mx-auto"
                >
                    {permissions.map((perm) => {
                        const isChecked = rolePermissions.has(perm);
                        return (
                            <div
                                key={perm}
                                className="flex items-center gap-3 text-gray-200 cursor-pointer"
                                onClick={() => handleCheckboxChange(perm)}
                            >
                                {isChecked ? (
                                    <CheckCircleIcon className="h-5 w-5 text-cyan-400" />
                                ) : (
                                    <XCircleIcon className="h-5 w-5 text-gray-500" />
                                )}
                                <span>{perm}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };
    

    return (
        <div className="min-h-screen px-4 py-10 md:px-12 bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white">
            {isClient && <Toaster position="top-right" />}

            <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-500 animate-fade-in">
                Set Role Permissions
            </h1>

            <div className="flex flex-col items-center gap-6 max-w-5xl mx-auto">
                <div className="w-full text-center">
                    <label className="text-lg font-semibold">
                        Select Role:
                        <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                            className="ml-3 px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                            {Object.keys(USER_ROLE).map((role) => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="w-full max-w-2xl">
                    <input
                        type="text"
                        placeholder="Enter description for this role"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 rounded-md bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                </div>

                <div className="w-full mt-8 space-y-10 max-w-5xl">
                    {Object.entries(permissionGroups).map(([label, perms]) =>
                        <div key={label}>
                            {renderPermissions(label, perms)}
                        </div>
                    )}
                    <div className="flex justify-center">
                        <button
                            onClick={savePermissions}
                            className="bg-cyan-400 hover:bg-cyan-300 text-gray-900 font-semibold px-8 py-3 rounded-xl shadow transition duration-300 ease-in-out"
                        >
                            Save Permissions
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
