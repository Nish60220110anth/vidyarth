import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { baseUrl } from '@/lib/config';
import { ACCESS_PERMISSION, announcements } from '@prisma/client';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

// Helpers
const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
};
const isSameDay = (a: Date, b: Date) => startOfDay(a).getTime() === startOfDay(b).getTime();
const isToday = (d: Date) => isSameDay(d, new Date());
const isYesterday = (d: Date) => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return isSameDay(d, y);
};
const headerLabelFor = (d: Date) => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export default function Announcements({ id }: { id: number | undefined }) {
    const [announcements, setAnnouncements] = useState<announcements[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // If you want "no userId = no filter", remove this early return
        if (id === undefined || id === null) return;

        const fetchAnnouncements = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axios.get(`${baseUrl}/api/announcements/?userId=${id}&take=100`, {
                    headers: {
                        'x-access-permission': ACCESS_PERMISSION.ENABLE_ANNOUNCEMENTS,
                    },
                });
                if (res.data.success) {
                    // sort newest first
                    const sorted = (res.data.data as announcements[]).slice().sort(
                        (a, b) =>
                            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                    );
                    setAnnouncements(sorted);
                } else {
                    setError('Failed to fetch announcements');
                }
            } catch (err: any) {
                setError(err.message || 'Something went wrong');
            } finally {
                setLoading(false);
            }
        };

        fetchAnnouncements();
    }, [id]);

    // Group by date header
    const grouped = useMemo(() => {
        // Array of sections so we can preserve order
        type Section = { label: string; keyTime: number; items: announcements[] };
        const map = new Map<string, Section>();

        for (const item of announcements) {
            const d = new Date(item.updated_at);
            const label = headerLabelFor(d);
            const dayStart = startOfDay(d).getTime();

            if (!map.has(label)) {
                map.set(label, { label, keyTime: dayStart, items: [] });
            }
            map.get(label)!.items.push(item);
        }

        // Sort sections by day descending
        const sections = Array.from(map.values()).sort((a, b) => b.keyTime - a.keyTime);

        return sections;
    }, [announcements]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-12 p-6 max-w-screen-xl bg-[#0d1b24] text-white rounded-xl shadow-xl font-[Urbanist]"
        >
            <div className="flex items-center gap-3 mb-8">
                <SpeakerWaveIcon className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold tracking-wide text-cyan-300">Announcements</h2>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-10">
                    <div className="w-6 h-6 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="ml-3 text-cyan-300 text-sm">Loading announcements...</span>
                </div>
            ) : error ? (
                <div className="text-red-400 text-sm text-center">{error}</div>
            ) : announcements.length === 0 ? (
                <div className="text-gray-400 text-sm">No announcements available.</div>
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
                            {/* Sticky date header inside the section */}
                            <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-[#0d1b24]/80 backdrop-blur-sm border-l-4 border-cyan-600 rounded-r">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                                        {section.label}
                                    </span>
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
                                            className="bg-gray-800 border border-cyan-800/30 p-4 rounded-xl shadow-md hover:shadow-lg hover:bg-gray-700/90 transition-all duration-300"
                                        >
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-cyan-100 font-semibold text-base">
                                                    {item.title}
                                                </h3>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(item.created_at).toLocaleString('en-IN', {
                                                        dateStyle: 'medium',
                                                        timeStyle: 'short',
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-300 mt-2">{item.brief}</p>
                                            {item.is_link && (
                                                <a
                                                    href={item.where_to_look}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-block mt-3 text-sm text-cyan-400 hover:underline hover:text-cyan-300 transition"
                                                >
                                                    {item.link_name || 'View'}
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
