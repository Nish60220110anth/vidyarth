"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BriefcaseIcon, UserIcon, ClipboardIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

type Shortlist = {
    id: number;
    company: {
        company_name: string;
    };
    role: string;
    round_details: string;
    shortlist_type: string;
    created_at: string;
};

const SHORTLIST_TYPE_COLORS: Record<string, string> = {
    SL: "bg-green-100 text-green-700",
    WL: "bg-yellow-100 text-yellow-800",
    RJ: "bg-red-100 text-red-600",
};

export default function UserShortlistTable() {
    const [shortlists, setShortlists] = useState<Shortlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchShortlists = async () => {
        setIsRefreshing(true);
        setLoading(true);
        try {
            const res = await fetch("/api/shortlists");
            const data = await res.json();
            if (data.success) setShortlists(data.shortlists);
        } catch (error) {
            console.error("Error fetching shortlists:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };


    useEffect(() => {
        fetchShortlists();
    }, []);

    const filteredShortlists = shortlists.filter(
        (s) =>
            s.company.company_name.toLowerCase().includes(search.toLowerCase()) ||
            s.role.toLowerCase().includes(search.toLowerCase()) ||
            s.shortlist_type.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between mb-4"
            >
                <h2 className="text-2xl font-bold text-cyan-900 tracking-wide">
                    Shortlists
                </h2>

                <button
                    onClick={fetchShortlists}
                    className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                    title="Refresh Shortlists"
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
            </motion.div>


            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search by company, role, or type..."
                    className="w-full px-4 py-2 rounded-lg bg-[#0e1c27] border border-cyan-800 text-cyan-100 placeholder:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-600"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {loading ? (
                <p className="text-cyan-300 italic">Loading shortlists...</p>
            ) : filteredShortlists.length === 0 ? (
                <div className="text-center text-cyan-600 italic mt-10">No matching shortlists found.</div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto bg-gradient-to-b from-[#0d1b24] to-[#0a141d] rounded-lg border border-blue-900 shadow-xl">
                        <table className="min-w-full text-sm text-left text-cyan-100">
                            <thead className="text-xs uppercase bg-[#112531] text-cyan-400">
                                <tr>
                                    <th className="px-6 py-3 flex items-center gap-2">
                                        <BriefcaseIcon className="h-4 w-4" />Company
                                    </th>
                                    <th className="px-6 py-3">Role</th>
                                    <th className="px-6 py-3">Round Details</th>
                                    <th className="px-6 py-3">Shortlist Type</th>
                                </tr>
                            </thead>
                                    <motion.tbody
                                        className="divide-y divide-cyan-800"
                                        initial="hidden"
                                        animate="visible"
                                        variants={{
                                            hidden: {},
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.06,
                                                },
                                            },
                                        }}
                                    >
                                        {filteredShortlists.map((s) => (
                                            <motion.tr
                                                key={s.id}
                                                className="hover:bg-[#10212b] transition-all duration-150"
                                                variants={{
                                                    hidden: { opacity: 0, y: 5 },
                                                    visible: { opacity: 1, y: 0 },
                                                }}
                                                transition={{ duration: 0.3, ease: "easeOut" }}
                                            >
                                                <td className="px-6 py-3 font-semibold">{s.company.company_name}</td>
                                                <td className="px-6 py-3">{s.role}</td>
                                                <td className="px-6 py-3">{s.round_details}</td>
                                                <td className="px-6 py-3">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full font-semibold ${SHORTLIST_TYPE_COLORS[s.shortlist_type] || "bg-cyan-900 text-cyan-300"
                                                            }`}
                                                    >
                                                        {s.shortlist_type}
                                                    </span>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </motion.tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                        {filteredShortlists.map((s) => (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="bg-[#0d1b24] border border-cyan-800 rounded-lg p-4 shadow-md"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-cyan-300 font-semibold text-lg">{s.company.company_name}</h3>
                                    <span
                                        className={`text-xs px-2 py-1 rounded-full font-semibold ${SHORTLIST_TYPE_COLORS[s.shortlist_type] || "bg-cyan-900 text-cyan-300"
                                            }`}
                                    >
                                        {s.shortlist_type}
                                    </span>
                                </div>
                                <p className="text-cyan-100 text-sm">
                                    <UserIcon className="inline h-4 w-4 mr-1 text-cyan-400" />
                                    <strong>Role:</strong> {s.role}
                                </p>
                                <p className="text-cyan-100 text-sm mt-1">
                                    <ClipboardIcon className="inline h-4 w-4 mr-1 text-cyan-400" />
                                    <strong>Round:</strong> {s.round_details}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
