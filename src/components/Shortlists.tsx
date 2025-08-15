"use client";

import {
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";
import { motion } from "framer-motion";
import {
    BriefcaseIcon,
    UserIcon,
    ClipboardIcon,
    ArrowPathIcon,
    ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";

/* ---------------------------------- Types ---------------------------------- */

type Shortlist = {
    id: number;
    company: { company_name: string };
    role: string;
    round_details: string;
    shortlist_type: string;
    created_at: string;
};

/* ----------------------------- Theming / helpers ---------------------------- */

const SHORTLIST_TYPE_COLORS: Record<string, string> = {
    SL: "bg-green-900/40 text-green-200 ring-1 ring-inset ring-green-700/50",
    WL: "bg-yellow-900/30 text-yellow-200 ring-1 ring-inset ring-yellow-700/50",
    RJ: "bg-red-900/30 text-red-200 ring-1 ring-inset ring-red-700/50",
};
const fallbackTypeClass =
    "bg-cyan-900/40 text-cyan-200 ring-1 ring-inset ring-cyan-700/50";

/** Simple spinner circle */
const Spinner: React.FC<{ size?: number; className?: string }> = ({
    size = 16,
    className = "",
}) => (
    <div
        className={`rounded-full border-4 border-cyan-400/90 border-t-transparent animate-spin ${className}`}
        style={{ width: size, height: size }}
    />
);

/* -------------------------------- Component -------------------------------- */

export default function UserShortlistTable() {
    const [shortlists, setShortlists] = useState<Shortlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const {basePath} = useRouter();

    // query + filters
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"ANY" | "SL" | "WL" | "RJ">(
        "ANY"
    );
    const [roundFilter, setRoundFilter] = useState<string>("ANY");

    // sorting
    const [companySort, setCompanySort] = useState<"asc" | "desc">("asc");

    // smooth search
    const deferredSearch = useDeferredValue(search);

    // unmount guard
    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const fetchShortlists = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setLoading(true);
            const res = await axios.get(`${basePath}/api/shortlists`, {
                headers: {
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_MY_SECTION,
                },
            });
            if (!mountedRef.current) return;

            if (!res.data?.success) {
                toast.error(res.data?.error || "Failed to fetch shortlists");
                setShortlists([]);
                return;
            }
            setShortlists(Array.isArray(res.data.data) ? res.data.data : []);
        } catch {
            if (mountedRef.current) toast.error("Error fetching shortlists");
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchShortlists();
    }, [fetchShortlists]);

    // Build the unique rounds list for the filter (based on data)
    const roundOptions = useMemo(() => {
        const set = new Set<string>();
        for (const s of shortlists) {
            if (s.round_details?.trim()) set.add(s.round_details.trim());
        }
        return ["ANY", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [shortlists]);

    // Apply search + filters + sorting
    const filteredAndSorted = useMemo(() => {
        const q = deferredSearch.trim().toLowerCase();
        let rows = shortlists;

        // search filter
        if (q) {
            rows = rows.filter(
                (s) =>
                    s.company.company_name.toLowerCase().includes(q) ||
                    s.role.toLowerCase().includes(q) ||
                    s.shortlist_type.toLowerCase().includes(q) ||
                    s.round_details.toLowerCase().includes(q)
            );
        }

        // shortlist type filter
        if (typeFilter !== "ANY") {
            rows = rows.filter((s) => s.shortlist_type === typeFilter);
        }

        // round filter
        if (roundFilter !== "ANY") {
            rows = rows.filter((s) => s.round_details === roundFilter);
        }

        // sort by company name
        rows = [...rows].sort((a, b) => {
            const A = a.company.company_name ?? "";
            const B = b.company.company_name ?? "";
            const cmp = A.localeCompare(B);
            return companySort === "asc" ? cmp : -cmp;
        });

        return rows;
    }, [shortlists, deferredSearch, typeFilter, roundFilter, companySort]);

    const toggleCompanySort = () =>
        setCompanySort((p) => (p === "asc" ? "desc" : "asc"));

    /* --------------------------------- Render --------------------------------- */

    return (
        <div className="p-6 h-full w-full flex flex-col bg-gradient-to-b from-[#081118] to-[#0a141d] text-cyan-50 font-[Urbanist]">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4"
            >
                <h2 className="text-2xl font-bold tracking-wide text-cyan-100">
                    Shortlists
                </h2>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={fetchShortlists}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-cyan-900/40 text-cyan-200 bg-[#0b1721] hover:bg-[#0d1f2b] hover:border-cyan-800 transition shadow-sm hover:shadow-md"
                        title="Refresh shortlists"
                        aria-label="Refresh shortlists"
                    >
                        {isRefreshing ? (
                            <Spinner size={18} />
                        ) : (
                            <ArrowPathIcon className="h-5 w-5" />
                        )}
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </motion.div>

            {/* Controls: search + filters + sort */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search by company, role, round or type…"
                    className="w-full px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 placeholder:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-600/70"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Search"
                />

                <select
                    className="px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/70"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    aria-label="Filter by shortlist type"
                >
                    <option value="ANY">Any</option>
                    <option value="SL">SL</option>
                    <option value="ESL">ESL</option>
                </select>

                <select
                    className="px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-600/70"
                    value={roundFilter}
                    onChange={(e) => setRoundFilter(e.target.value)}
                    aria-label="Filter by round details"
                >
                    {roundOptions.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt === "ANY" ? "Round: Any" : opt}
                        </option>
                    ))}
                </select>

                <button
                    onClick={toggleCompanySort}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 hover:bg-[#0d1f2b] hover:border-cyan-800 transition"
                    aria-label={`Sort company name ${companySort === "asc" ? "descending" : "ascending"}`}
                >
                    <ArrowsUpDownIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">
                        Company: {companySort === "asc" ? "A→Z" : "Z→A"}
                    </span>
                </button>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="space-y-4">
                    <div className="hidden md:block rounded-lg border border-cyan-900/40 bg-[#0b1721] p-4">
                        <div className="h-6 w-40 bg-cyan-900/30 rounded animate-pulse mb-4" />
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-12 gap-3 py-3 border-b border-cyan-900/30 last:border-0"
                            >
                                <div className="col-span-3 h-4 bg-cyan-900/30 rounded animate-pulse" />
                                <div className="col-span-3 h-4 bg-cyan-900/30 rounded animate-pulse" />
                                <div className="col-span-4 h-4 bg-cyan-900/30 rounded animate-pulse" />
                                <div className="col-span-2 h-4 bg-cyan-900/30 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    <div className="md:hidden space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="bg-[#0b1721] border border-cyan-900/40 rounded-lg p-4"
                            >
                                <div className="h-5 w-2/3 bg-cyan-900/30 rounded animate-pulse mb-2" />
                                <div className="h-4 w-1/2 bg-cyan-900/30 rounded animate-pulse mb-2" />
                                <div className="h-4 w-3/4 bg-cyan-900/30 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : filteredAndSorted.length === 0 ? (
                <div className="text-center text-cyan-300/80 mt-10 bg-[#0b1721] border border-cyan-900/40 rounded-xl p-8 shadow-[0_0_30px_rgba(0,255,255,0.06)]">
                    No shortlists found.
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto rounded-lg flex-1 overflow-auto border border-cyan-900/40 bg-[#0b1721] shadow-[0_0_30px_rgba(0,255,255,0.06)]">
                        <table className="min-w-full text-sm text-left text-cyan-100">
                            <thead className="text-xs uppercase bg-[#0d1f2b] text-cyan-300/90">
                                <tr>
                                            <th scope="col" className="px-6 py-3 sticky top-0 z-10 bg-[#0d1f2b]">
                                        <button
                                            onClick={toggleCompanySort}
                                            className="flex items-center gap-2 hover:text-cyan-200"
                                            aria-label={`Sort company name ${companySort === "asc" ? "descending" : "ascending"}`}
                                        >
                                            <BriefcaseIcon className="h-4 w-4" />
                                            Company ({companySort === "asc" ? "A→Z" : "Z→A"})
                                        </button>
                                    </th>
                                            <th scope="col" className="px-6 py-3 sticky top-0 z-10 bg-[#0d1f2b]">
                                        Role
                                    </th>
                                            <th scope="col" className="px-6 py-3 sticky top-0 z-10 bg-[#0d1f2b]">
                                        Round Details
                                    </th>
                                            <th scope="col" className="px-6 py-3 sticky top-0 z-10 bg-[#0d1f2b]">
                                        Shortlist Type
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-cyan-900/30">
                                {filteredAndSorted.map((s) => (
                                    <tr
                                        key={s.id}
                                        className="hover:bg-[#0d1f2b] transition-colors"
                                    >
                                        <td className="px-6 py-3 font-semibold text-cyan-100">
                                            {s.company.company_name}
                                        </td>
                                        <td className="px-6 py-3 text-cyan-100/90">{s.role}</td>
                                        <td className="px-6 py-3 text-cyan-100/80">
                                            {s.round_details}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full font-semibold ${SHORTLIST_TYPE_COLORS[s.shortlist_type] ?? fallbackTypeClass
                                                    }`}
                                            >
                                                {s.shortlist_type}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-4 md:flex-1 md:overflow-auto">
                        {filteredAndSorted.map((s) => (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="bg-[#0b1721] border border-cyan-900/40 rounded-lg p-4 shadow-[0_0_20px_rgba(0,255,255,0.05)]"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-cyan-200 font-semibold text-lg">
                                        {s.company.company_name}
                                    </h3>
                                    <span
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${SHORTLIST_TYPE_COLORS[s.shortlist_type] ?? fallbackTypeClass
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
