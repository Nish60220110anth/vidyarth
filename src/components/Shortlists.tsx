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
import axios, { AxiosResponse } from "axios";
import { ACCESS_PERMISSION } from "@prisma/client";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";

type ApiResponse<T> = { success: boolean; data?: T; error?: string };

type Shortlist = {
    id: number;
    company: { company_name: string };
    role: string;
    round_details: string;
    shortlist_type: string;
    created_at: string;
};

const TYPE_BADGES: Record<string, string> = {
    SL: "bg-green-900/40 text-green-200 ring-1 ring-inset ring-green-700/50",
    ESL: "bg-emerald-900/30 text-emerald-200 ring-1 ring-inset ring-emerald-700/50",
    WL: "bg-yellow-900/30 text-yellow-200 ring-1 ring-inset ring-yellow-700/50",
    RJ: "bg-red-900/30 text-red-200 ring-1 ring-inset ring-red-700/50",
};
const TYPE_FALLBACK =
    "bg-cyan-900/40 text-cyan-200 ring-1 ring-inset ring-cyan-700/50";

const Spinner: React.FC<{ size?: number; className?: string }> = ({
    size = 16,
    className = "",
}) => (
    <div
        className={`rounded-full border-4 border-cyan-400/90 border-t-transparent animate-spin ${className}`}
        style={{ width: size, height: size }}
    />
);

export default function UserShortlistTable() {
    const router = useRouter();
    const { basePath } = router;

    const [rows, setRows] = useState<Shortlist[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<string>("ANY");
    const [roundFilter, setRoundFilter] = useState<string>("ANY");
    const [companySort, setCompanySort] = useState<"asc" | "desc">("asc");

    const deferredSearch = useDeferredValue(search);

    const mountedRef = useRef(true);
    const inFlightRef = useRef<AbortController | null>(null);
    const lastFetchedRef = useRef<number>(0);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            inFlightRef.current?.abort();
        };
    }, []);

    const unwrap = <T,>(res: AxiosResponse<ApiResponse<T>>): T => {
        if (res?.data?.success) return res.data.data as T;
        throw new Error(res?.data?.error || `HTTP ${res?.status}`);
    };
    const getErr = (e: any) =>
        e?.response?.data?.error || e?.message || "Something went wrong";

    const fetchShortlists = useCallback(
        async (force = false) => {
            const recent = Date.now() - lastFetchedRef.current < 60_000;
            if (!force && recent && rows.length) return;

            try {
                setRefreshing(true);
                if (!loading) setLoading(true);

                inFlightRef.current?.abort();
                const ac = new AbortController();
                inFlightRef.current = ac;

                const res = await axios.get<ApiResponse<Shortlist[]>>(
                    `${basePath}/api/shortlists`,
                    {
                        signal: ac.signal,
                        headers: {
                            "x-access-permission": ACCESS_PERMISSION.ENABLE_MY_SECTION,
                        },
                    }
                );
                const data = unwrap<Shortlist[]>(res) || [];
                if (!mountedRef.current) return;

                setRows(Array.isArray(data) ? data : []);
                lastFetchedRef.current = Date.now();
            } catch (e) {
                if (!mountedRef.current) return;
                setRows([]);
                toast.error(getErr(e));
            } finally {
                if (!mountedRef.current) return;
                setLoading(false);
                setRefreshing(false);
            }
        },
        [basePath, rows.length, loading]
    );

    useEffect(() => {
        fetchShortlists(false);
    }, [fetchShortlists]);

    const roundOptions = useMemo(() => {
        const set = new Set<string>();
        for (const s of rows) {
            const r = s.round_details?.trim();
            if (r) set.add(r);
        }
        return ["ANY", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }, [rows]);

    const typeOptions = useMemo(() => {
        const set = new Set<string>();
        for (const s of rows) {
            const t = s.shortlist_type?.trim();
            if (t) set.add(t);
        }
        return ["ANY", ...Array.from(set)];
    }, [rows]);

    const filtered = useMemo(() => {
        const q = deferredSearch.trim().toLowerCase();
        let list = rows;

        if (q) {
            list = list.filter(
                (s) =>
                    s.company.company_name.toLowerCase().includes(q) ||
                    s.role.toLowerCase().includes(q) ||
                    s.shortlist_type.toLowerCase().includes(q) ||
                    s.round_details.toLowerCase().includes(q)
            );
        }
        if (typeFilter !== "ANY") {
            list = list.filter((s) => s.shortlist_type === typeFilter);
        }
        if (roundFilter !== "ANY") {
            list = list.filter((s) => s.round_details === roundFilter);
        }

        return [...list].sort((a, b) => {
            const A = a.company.company_name ?? "";
            const B = b.company.company_name ?? "";
            const cmp = A.localeCompare(B);
            return companySort === "asc" ? cmp : -cmp;
        });
    }, [rows, deferredSearch, typeFilter, roundFilter, companySort]);

    const toggleCompanySort = () =>
        setCompanySort((p) => (p === "asc" ? "desc" : "asc"));

    return (
        <div className="p-6 h-full w-full flex flex-col bg-gradient-to-b from-[#081118] to-[#0a141d] text-cyan-50 font-[Urbanist]">
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
                        onClick={async () => {
                            await fetchShortlists(true);
                            toast.success("Refreshed");
                        }}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-cyan-900/40 text-cyan-200 bg-[#0b1721] hover:bg-[#0d1f2b] hover:border-cyan-800 transition shadow-sm hover:shadow-md disabled:opacity-60"
                        title="Refresh shortlists"
                        aria-label="Refresh shortlists"
                    >
                        {refreshing ? <Spinner size={18} /> : <ArrowPathIcon className="h-5 w-5" />}
                        <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
                    </button>
                </div>
            </motion.div>

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
                    onChange={(e) => setTypeFilter(e.target.value)}
                    aria-label="Filter by shortlist type"
                >
                    {typeOptions.map((t) => (
                        <option key={t} value={t}>
                            {t === "ANY" ? "Type: Any" : t}
                        </option>
                    ))}
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
                    aria-label={`Sort company name ${companySort === "asc" ? "descending" : "ascending"
                        }`}
                >
                    <ArrowsUpDownIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">
                        Company: {companySort === "asc" ? "A→Z" : "Z→A"}
                    </span>
                </button>
            </div>

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
                            <div key={i} className="bg-[#0b1721] border border-cyan-900/40 rounded-lg p-4">
                                <div className="h-5 w-2/3 bg-cyan-900/30 rounded animate-pulse mb-2" />
                                <div className="h-4 w-1/2 bg-cyan-900/30 rounded animate-pulse mb-2" />
                                <div className="h-4 w-3/4 bg-cyan-900/30 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-cyan-300/80 mt-10 bg-[#0b1721] border border-cyan-900/40 rounded-xl p-8 shadow-[0_0_30px_rgba(0,255,255,0.06)]">
                    No shortlists found.
                </div>
            ) : (
                <>
                    <div className="hidden md:block overflow-x-auto rounded-lg flex-1 overflow-auto border border-cyan-900/40 bg-[#0b1721] shadow-[0_0_30px_rgba(0,255,255,0.06)]">
                        <table className="min-w-full text-sm text-left text-cyan-100">
                            <thead className="text-xs uppercase bg-[#0d1f2b] text-cyan-300/90">
                                <tr>
                                    <th scope="col" className="px-6 py-3 sticky top-0 z-10 bg-[#0d1f2b]">
                                        <button
                                            onClick={toggleCompanySort}
                                            className="flex items-center gap-2 hover:text-cyan-200"
                                            aria-label={`Sort company name ${companySort === "asc" ? "descending" : "ascending"
                                                }`}
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
                                {filtered.map((s) => (
                                    <tr key={s.id} className="hover:bg-[#0d1f2b] transition-colors">
                                        <td className="px-6 py-3 font-semibold text-cyan-100">
                                            {s.company.company_name}
                                        </td>
                                        <td className="px-6 py-3 text-cyan-100/90">{s.role}</td>
                                        <td className="px-6 py-3 text-cyan-100/80">{s.round_details}</td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full font-semibold ${TYPE_BADGES[s.shortlist_type] ?? TYPE_FALLBACK
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

                    <div className="md:hidden space-y-4 md:flex-1 md:overflow-auto">
                        {filtered.map((s) => (
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
                                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${TYPE_BADGES[s.shortlist_type] ?? TYPE_FALLBACK
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
