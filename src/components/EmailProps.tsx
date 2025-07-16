import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import toast from "react-hot-toast";
import { ACCESS_PERMISSION, NOTIFICATION_TYPE, USER_ROLE } from '@prisma/client';
import { AnimatePresence, motion } from "framer-motion";
import { ArrowPathIcon, CheckCircleIcon, CheckIcon, PencilIcon, TrashIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';

interface NotificationProperty {
    type: string;
    send_email: boolean;
    delay: number;
    only_for_target: boolean;
    role: string | null;
}

export default function EmailProps() {
    const router = useRouter();

    const types = Object.keys(NOTIFICATION_TYPE);
    const roles = useMemo(() => {
        return [null, ...Object.keys(USER_ROLE).filter(role => !role.startsWith("CCA_"))];
    }, []);

    const [originalPropeties, setOriginalProperties] = useState<Record<string, NotificationProperty>>({});
    const [editProperties, setEditProperties] = useState<Record<string, NotificationProperty>>({});
    const [editId, setEditId] = useState<NOTIFICATION_TYPE | null>(null);

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isDisabled = useMemo(() => {
        if (!editId) {
            return;
        }
        const original = originalPropeties[editId];
        const edited = editProperties[editId];

        return (
            original.delay === edited.delay &&
            original.only_for_target === edited.only_for_target &&
            original.role === edited.role &&
            original.send_email === edited.send_email
        );
    }, [editId, editProperties]);


    const fetchData = async () => {
        try {
            const res = await axios.get('/api/email/props', {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
                },
            });

            if (!res.data.success) {
                toast.error(res.data.error || "Failed to load data");
                return;
            }

            const grouped: Record<string, NotificationProperty> = {};
            for (const item of res.data.data) {
                grouped[item.type] = item;
            }

            setOriginalProperties(grouped);
            setEditProperties(grouped);
        } catch {
            toast.error("Failed to load properties");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (
        type: string,
        key: keyof NotificationProperty,
        value: any
    ) => {

        if (key === "role") {
            value = value === "None" ? null : value
        }

        setEditProperties(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [key]: value,
            },
        }));
    };

    const handleSave = async (entry: NotificationProperty) => {
        try {
            const res = await axios.put('/api/email/props', entry, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.MANAGE_ANNOUNCEMENTS,
                },
            });

            if (!res.data.success) {
                toast.error(res.data.error || "Update failed");
                return;
            }

            originalPropeties[entry.type] = editProperties[entry.type]

        } catch {
            toast.error("Failed to update");
        } finally {
            setEditId(null);
        }
    };

    if (loading) return <div className="text-center mt-10 text-gray-600">Loading...</div>;

    return (
        <div className="px-4 py-6 md:px-10 md:py-10 bg-gray-100 min-h-screen">
            <div className="sticky top-0 bg-gray-100 pb-4 z-20">
                {/* Breadcrumb */}
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Notifications Properties</span>
                </div>

                {/* Title */}
                <motion.h1
                    layoutScroll
                    className="text-2xl md:text-3xl font-bold text-gray-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage Notifications Properties
                </motion.h1>

                <button
                    onClick={async (e) => {
                        setIsRefreshing(true);
                        await fetchData();
                    }}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                    title="Refresh properties"
                >
                    <motion.div
                        animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                        transition={{
                            repeat: isRefreshing ? Infinity : 0,
                            repeatType: "loop",
                            ease: "linear",
                            duration: 1,
                        }}
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                    </motion.div>

                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="hidden md:grid mt-6 grid-cols-8 gap-4 font-semibold text-gray-700 text-sm uppercase tracking-wide"
            >
                <div className="col-span-2 text-center">Type</div>
                <div className="col-span-1 text-center">Send Email</div>
                <div className="col-span-1 text-center">Delay (in mins)</div>
                <div className="col-span-1 text-center">Only for Target</div>
                <div className="col-span-2 text-center">Role</div>
                <div className="col-span-1 text-center">Actions</div>
            </motion.div>

            <AnimatePresence>
                {types.map(type => {
                    const isEditing = editId === type;
                    const current = editProperties[type];

                    return (
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="mt-4 grid grid-cols-1 md:grid-cols-8 gap-4 md:items-center md:py-3 bg-white shadow-sm rounded-lg px-4 py-3"

                        >
                            {/* Type */}
                            <div className="col-span-2 text-center">{type}</div>

                            {/* Send Email */}
                            <div className="col-span-1 flex justify-center">
                                {isEditing ? (
                                    <button onClick={() => handleChange(type, "send_email", !current.send_email)}>
                                        {current.send_email ? (
                                            <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                ) : current.send_email ? (
                                    <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-gray-400" />
                                )}
                            </div>

                            {/* Delay (in minutes) */}
                            <div className="col-span-1 flex justify-center">
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min={0}
                                        max={240}
                                        className="w-16 border px-2 py-1 rounded text-sm"
                                        value={current.delay}
                                        onChange={e => handleChange(type, "delay", parseInt(e.target.value))}
                                    />
                                ) : (
                                    <span className="text-sm text-gray-700">{current.delay}</span>
                                )}
                            </div>

                            {/* Only for Target */}
                            <div className="col-span-1 flex justify-center">
                                {isEditing ? (
                                    <button onClick={() => handleChange(type, "only_for_target", !current.only_for_target)}>
                                        {current.only_for_target ? (
                                            <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                        ) : (
                                            <XCircleIcon className="w-5 h-5 text-gray-400" />
                                        )}
                                    </button>
                                ) : current.only_for_target ? (
                                    <CheckCircleIcon className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <XCircleIcon className="w-5 h-5 text-gray-400" />
                                )}
                            </div>

                            {/* Role */}
                            <div className="col-span-2 flex justify-center">
                                {isEditing ? (
                                    <select
                                        value={current.role ?? ""}
                                        onChange={e => handleChange(type, "role", e.target.value || null)}
                                        className="w-32 border px-2 py-1 rounded text-sm"
                                    >
                                        <option value="None">None</option>
                                        {Object.keys(USER_ROLE)
                                            .filter(role => !role.startsWith("CCA_"))
                                            .map(role => (
                                                <option key={role} value={role}>
                                                    {role}
                                                </option>
                                            ))}
                                    </select>
                                ) : (
                                    <span className="text-sm text-gray-700">{current.role ?? "None"}</span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex items-center gap-2 text-sm justify-end">
                                {isEditing ? (
                                    <>
                                        <button
                                            disabled={isDisabled}
                                            onClick={() => handleSave(current)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm shadow transition ${isDisabled
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-green-600 hover:bg-green-700 text-white"
                                                }`}
                                        >
                                            <CheckIcon className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                            onClick={() => setEditId(null)}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-md text-sm shadow hover:bg-gray-700 transition"
                                        >
                                            <XMarkIcon className="w-4 h-4" /> Cancel
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditId(type as NOTIFICATION_TYPE)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm shadow hover:bg-cyan-700 transition"
                                    >
                                        <PencilIcon className="w-4 h-4" /> Edit
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

        </div>
    );
}
