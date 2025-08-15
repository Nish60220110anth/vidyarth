import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios, { AxiosResponse } from "axios";
import { SpeakerWaveIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ACCESS_PERMISSION, announcements as Announcement } from "@prisma/client";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
const cardVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => { const y = new Date(); y.setDate(y.getDate() - 1); return isSameDay(d, y); };
const headerLabelFor = (d: Date) => isToday(d) ? "Today" : isYesterday(d) ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

export default function Announcements({ id }: { id: number | undefined }) {
    const { basePath } = useRouter();
    const [items, setItems] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const unwrap = <T,>(res: AxiosResponse<ApiResponse<T>>): T => {
        if (res?.data?.success) return res.data.data as T;
        throw new Error(res?.data?.error || `HTTP ${res?.status}`);
    };
    const getErr = (e: any) => e?.response?.data?.error || e?.message || "Something went wrong";

    const fetchAnnouncements = useCallback(async (signal?: AbortSignal) => {
        if (id == null) return;
        try {
            setError("");
            setLoading(true);
            const res = await axios.get<ApiResponse<Announcement[]>>(
                `${basePath}/api/announcements/?userId=${id}&take=100`,
                { signal, headers: { "x-access-permission": ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS } }
            );
            const data = unwrap<Announcement[]>(res);
            const sorted = [...(data || [])].sort(
                (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
            setItems(sorted);
        } catch (e) {
            const msg = getErr(e);
            setError(msg);
            toast.error(msg);
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [id, basePath]);

    useEffect(() => {
        // const ac = new AbortController();
        fetchAnnouncements();
        // return () => ac.abort();
    }, [fetchAnnouncements]);

    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await fetchAnnouncements();
            toast.success("Refreshed");
        } catch { }
        finally {
            setRefreshing(false);
        }
    }, [fetchAnnouncements]);

    const grouped = useMemo(() => {
        type Section = { label: string; keyTime: number; items: Announcement[] };
        const map = new Map<string, Section>();
        for (const it of items) {
            const d = new Date(it.updated_at);
            const label = headerLabelFor(d);
            const key = startOfDay(d).getTime();
            if (!map.has(label)) map.set(label, { label, keyTime: key, items: [] });
            map.get(label)!.items.push(it);
        }
        return Array.from(map.values()).sort((a, b) => b.keyTime - a.keyTime);
    }, [items]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-12 p-6 max-w-screen-xl bg-[#0d1b24] text-white rounded-xl shadow-xl font-[Urbanist]"
        >
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <SpeakerWaveIcon className="w-6 h-6 text-cyan-400" />
                    <h2 className="text-xl font-semibold tracking-wide text-cyan-300">Announcements</h2>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={refreshing || loading || id == null}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition ${refreshing
                            ? "border-cyan-700 text-cyan-300 bg-[#0d1f2b]"
                            : "border-cyan-800 text-cyan-200 hover:bg-[#0f2130]"
                        } disabled:opacity-50`}
                >
                    <ArrowPathIcon className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl border border-cyan-800/30 bg-[#0f1f2b] animate-pulse" />
                    ))}
                </div>
            ) : error ? (
                <div className="flex items-center justify-between rounded-lg border border-rose-800/50 bg-rose-900/10 px-4 py-3 text-rose-200">
                    <span className="text-sm">{error}</span>
                    <button
                        onClick={onRefresh}
                        className="rounded-md border border-rose-800/60 px-3 py-1 text-sm hover:bg-rose-900/20"
                    >
                        Retry
                    </button>
                </div>
            ) : items.length === 0 ? (
                <div className="text-cyan-300/80 text-sm">No announcements available.</div>
            ) : (
                <div className="space-y-8">
                    {grouped.map((section) => (
                        <motion.div
                            key={section.keyTime + section.label}
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="space-y-4"
                        >
                            <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-[#0d1b24]/80 backdrop-blur-sm border-l-4 border-cyan-600 rounded-r">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">{section.label}</span>
                                    <span className="text-xs text-cyan-500">{section.items.length}</span>
                                </div>
                            </div>

                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                            >
                                <AnimatePresence>
                                    {section.items.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            variants={cardVariants}
                                            className="bg-[#0f1f2b] border border-cyan-800/30 p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-[#112433] transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <h3 className="text-cyan-100 font-semibold text-base">{item.title}</h3>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                                </span>
                                            </div>
                                            {item.brief && <p className="text-sm text-gray-300 mt-2">{item.brief}</p>}
                                            {item.is_link && item.where_to_look && (
                                                <a
                                                    href={item.where_to_look}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block mt-3 text-sm text-cyan-400 hover:underline hover:text-cyan-300 transition"
                                                >
                                                    {item.link_name || "View"}
                                                </a>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
