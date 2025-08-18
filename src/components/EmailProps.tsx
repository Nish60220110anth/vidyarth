import { useEffect, useState, useMemo } from 'react';
import { notification_properties, NOTIFICATION_TYPE, USER_ROLE } from '@prisma/client';
import { AnimatePresence, motion } from "framer-motion";
import { ArrowPathIcon, CheckCircleIcon, CheckIcon, PencilIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { shallowEqualByKeys } from '@/utils/shallowEqual';
import { fetchEmailProps, updateEmailProps } from '@/lib/api/emailprops';

export type NotificationProperty = notification_properties;

export default function EmailProps() {
    const router = useRouter();

    const types = Object.keys(NOTIFICATION_TYPE);

    const [originalProperties, setOriginalProperties] = useState<Record<string, NotificationProperty>>({});
    const [editProperties, setEditProperties] = useState<Record<string, NotificationProperty>>({});
    const [editId, setEditId] = useState<NOTIFICATION_TYPE | null>(null);

    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const isDisabled = useMemo(() => {
        if (!editId) return true;
        const o = originalProperties[editId];
        const e = editProperties[editId];
        if (!o || !e) return true;
        return shallowEqualByKeys(o, e);
    }, [editId, originalProperties, editProperties]);

    const fetchProps = async () => {
        setLoading(true);
        const res = await fetchEmailProps();
        setOriginalProperties(res);
        setEditProperties(res);
        setLoading(false);
    };

    useEffect(() => {
        fetchProps();
    }, []);

    const handleChange = (
        type: string,
        key: keyof NotificationProperty,
        value: any
    ) => {
        if (key === "role") {
            value = value === "" ? null : value; // map empty string to null
        }

        setEditProperties(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [key]: value,
            },
        }));
    };

    const clampDelay = (v: number) => {
        if (Number.isNaN(v)) return 0;
        return Math.max(0, Math.min(240, v));
    };

    const handleSave = async (entry: NotificationProperty) => {
        const res = await updateEmailProps(entry);
        if (res) {
            // immutable updates to trigger re-render
            setOriginalProperties(prev => ({ ...prev, [entry.type]: entry }));
            setEditProperties(prev => ({ ...prev, [entry.type]: entry }));
        }
        setEditId(null);
    };

    if (loading) return (
        <div
            className="flex flex-col items-center justify-center min-w-full py-12 bg-gradient-to-r from-cyan-50 to-white border border-cyan-200 rounded-2xl shadow-xl animate-pulse"
            aria-live="polite"
            role="status"
        >
            <div className="flex items-center justify-center w-full py-12">
                <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="mt-4 text-lg font-semibold text-cyan-700">Loading Email Notification Properties...</p>
            <div className="mt-6 space-y-2 w-3/4">
                <div className="h-3 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded-full w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded-full w-2/3"></div>
            </div>
        </div>
    );

    return (
        <div className="px-4 py-6 md:px-10 md:py-10 bg-white min-h-full font-[Urbanist] text-gray-800">
            <div className="sticky top-0 bg-white pb-4 z-20 border-b border-gray-200">
                <div className="text-sm text-gray-500 flex gap-2 mb-2">
                    <span onClick={() => router.push("/")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage Notifications Properties</span>
                </div>
                <div className="flex items-center justify-between gap-3">
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
                        onClick={async () => {
                            setIsRefreshing(true);
                            setEditId(null);
                            await fetchProps();
                            setIsRefreshing(false);
                        }}
                        className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                        title="Refresh properties"
                        aria-label="Refresh properties"
                    >
                        <motion.div
                            animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ repeat: isRefreshing ? Infinity : 0, repeatType: "loop", ease: "linear", duration: 1 }}
                        >
                            <ArrowPathIcon className="h-5 w-5" />
                        </motion.div>
                    </button>
                </div>
            </div>

            {/* Desktop header */}
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
                    const isEditing = editId === (type as NOTIFICATION_TYPE);
                    const current = editProperties[type];
                    if (!current) return null;

                    return (
                        <motion.div
                            key={type}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35, ease: "easeOut" }}
                            className="mt-4 grid grid-cols-1 md:grid-cols-8 gap-4 md:items-center md:py-3 bg-white shadow-sm rounded-xl border border-gray-200 px-4 py-4"
                        >
                            {/* Type */}
                            <div className="col-span-2 text-center md:text-center">
                                <span className="md:hidden block text-[11px] uppercase tracking-wide text-gray-500">Type</span>
                                <span className="text-black break-words">{type}</span>
                            </div>

                            {/* Send Email */}
                            <div className="col-span-1 flex flex-col items-center">
                                <span className="md:hidden block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Send Email</span>
                                {isEditing ? (
                                    <button
                                        onClick={() => handleChange(type, "send_email", !current.send_email)}
                                        className="focus:outline-none"
                                        aria-pressed={current.send_email}
                                        aria-label="Toggle send email"
                                    >
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
                            <div className="col-span-1 flex flex-col items-center">
                                <span className="md:hidden block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Delay (mins)</span>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        min={0}
                                        max={240}
                                        inputMode="numeric"
                                        className="w-24 border border-gray-300 px-2 py-1 rounded text-sm shadow-sm focus:ring-1 focus:ring-cyan-500 text-center"
                                        value={current.delay_minutes}
                                        onChange={e => {
                                            const next = clampDelay(Number(e.target.value));
                                            handleChange(type, "delay_minutes", next);
                                        }}
                                        onBlur={e => {
                                            const next = clampDelay(Number(e.target.value));
                                            handleChange(type, "delay_minutes", next);
                                        }}
                                    />
                                ) : (
                                    <span className="text-sm text-gray-700">{current.delay_minutes}</span>
                                )}
                            </div>

                            {/* Only for Target */}
                            <div className="col-span-1 flex flex-col items-center">
                                <span className="md:hidden block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Only for Target</span>
                                {isEditing ? (
                                    <button
                                        onClick={() => handleChange(type, "only_for_target", !current.only_for_target)}
                                        className="focus:outline-none"
                                        aria-pressed={current.only_for_target}
                                        aria-label="Toggle only for target"
                                    >
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
                            <div className="col-span-2 flex flex-col items-center">
                                <span className="md:hidden block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Role</span>
                                {isEditing ? (
                                    <select
                                        value={current.role ?? ""}
                                        onChange={e => handleChange(type, "role", e.target.value || null)}
                                        className="w-40 border border-gray-300 px-2 py-1 rounded text-sm shadow-sm focus:ring-1 focus:ring-cyan-500"
                                    >
                                        <option value="">None</option>
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
                            <div className="col-span-1 flex flex-wrap md:flex-nowrap items-center gap-2 text-sm justify-end">
                                {isEditing ? (
                                    <>
                                        <button
                                            disabled={isDisabled}
                                            onClick={() => handleSave(current)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm shadow transition ${isDisabled
                                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                    : "bg-green-500 hover:bg-green-600 text-white"
                                                }`}
                                        >
                                            <CheckIcon className="w-4 h-4" /> Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditId(null);
                                                setEditProperties(prev => ({ ...prev, [type]: originalProperties[type] }));
                                            }}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white rounded-md text-sm shadow transition"
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
