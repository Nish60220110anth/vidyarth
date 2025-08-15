import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import NewsCard from "@/components/NewsCard";
import { ALL_DOMAINS } from "./ManageCompanyList";
import { news, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG } from "@prisma/client";
import { debounceAsync } from "@/utils/debounce";
import { getNewsOnQuery } from "@/lib/api/manage_news";

export default function LatestNews() {
    const [newsList, setNewsList] = useState<news[]>([]);
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string>("");

    const [newsDomainTag, setNewsDomainTag] = useState("ALL");
    const [newsSubdomainTag, setNewsSubdomainTag] = useState("ALL");

    const buildQuery = useCallback(
        (overrides?: { id?: number; search?: string }) => {
            const q = new URLSearchParams();
            const s = overrides?.search ?? search;

            if (selectedDomain !== "ALL") q.append("domain", selectedDomain);
            if (s.trim()) q.append("title", s.trim());
            if (dateRange.from) q.append("from", dateRange.from);
            if (dateRange.to) q.append("to", dateRange.to);
            if (newsDomainTag !== "ALL") q.append("domain_tag", newsDomainTag);
            if (newsSubdomainTag !== "ALL") q.append("subdomain_tag", newsSubdomainTag);
            if (overrides?.id) q.append("id", String(overrides.id));
            return q;
        },
        [selectedDomain, search, dateRange.from, dateRange.to, newsDomainTag, newsSubdomainTag]
    );

    const debouncedRefresh = useMemo(
        () =>
            debounceAsync(async (opts?: { id?: number; search?: string }) => {
                setIsRefreshing(true);
                setErrorMsg("");
                try {
                    const q = buildQuery(opts);
                    const res = await getNewsOnQuery(q);
                    if (res.success) {
                        setNewsList(res.data ?? []);
                    } else {
                        setNewsList([]);
                        setErrorMsg(res.error || "Failed to fetch news.");
                    }
                } catch (e: any) {
                    setNewsList([]);
                    setErrorMsg(e?.message || "Failed to fetch news.");
                } finally {
                    setIsRefreshing(false);
                }
            }, 400),
        [buildQuery]
    );

    const fetchNews = useCallback(() => debouncedRefresh(), [debouncedRefresh]);

    // Initial + filter-driven fetch
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            await fetchNews();
            if (mounted) setLoading(false);
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDomain, dateRange, newsDomainTag, newsSubdomainTag]);

    // Debounced search
    useEffect(() => {
        const t = setTimeout(() => {
            fetchNews();
        }, 400);
        return () => clearTimeout(t);
    }, [search, fetchNews]);

    const groupedNews = useMemo(() => {
        const grouped: Record<string, news[]> = {};
        newsList.forEach((item) => {
            const d = item?.created_at ? new Date(item.created_at) : new Date();
            const dateKey = format(d, "yyyy-MM-dd");
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(item);
        });

        // Sort groups by date desc for a nicer read
        return Object.fromEntries(
            Object.entries(grouped).sort(
                ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
            )
        );
    }, [newsList]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0d1b24] to-[#0a141d] text-cyan-200">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
                    className="w-10 h-10"
                >
                    <ArrowPathIcon className="w-10 h-10 text-cyan-400" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#0d1b24] to-[#0a141d] text-cyan-100 px-4 md:px-10 pb-10 pt-4 overflow-hidden">
            {/* Sticky Filter Bar */}
            <div className="sticky top-0 z-10 bg-[#0d1b24]/90 backdrop-blur-md border-b border-cyan-800 p-4 rounded-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Refresh Button */}
                        <button
                            onClick={fetchNews}
                            disabled={isRefreshing}
                            className={`p-2 rounded-md border transition ${isRefreshing
                                    ? "border-cyan-900 text-cyan-700 cursor-wait"
                                    : "border-cyan-800 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400"
                                }`}
                            title="Refresh news"
                            aria-label="Refresh news"
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

                        {/* Reset Button */}
                        <button
                            onClick={() => {
                                setIsResetting(true);
                                setSearch("");
                                setSelectedDomain("ALL");
                                setDateRange({ from: "", to: "" });
                                setNewsDomainTag("ALL");
                                setNewsSubdomainTag("ALL");
                                setTimeout(() => setIsResetting(false), 400);
                            }}
                            className="p-2 rounded-md border border-rose-800 text-rose-400 hover:text-white hover:border-rose-500 transition"
                            title="Reset filters"
                            aria-label="Reset filters"
                        >
                            <motion.div
                                animate={isResetting ? { x: [-5, 0] } : { x: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 10 }}
                            >
                                <ArrowUturnLeftIcon className="h-5 w-5" />
                            </motion.div>
                        </button>

                        {/* Filters */}
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="px-2 py-1 rounded bg-[#10232c] border border-cyan-800 text-cyan-200"
                        >
                            <option value="ALL">All Domains</option>
                            {ALL_DOMAINS.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>

                        <select
                            value={newsDomainTag}
                            onChange={(e) => setNewsDomainTag(e.target.value)}
                            className="px-2 py-1 rounded bg-[#10232c] border border-cyan-800 text-cyan-200"
                        >
                            <option value="ALL">All News Domain Tags</option>
                            {Object.keys(NEWS_DOMAIN_TAG).map((tag) => (
                                <option key={tag} value={tag}>
                                    {tag}
                                </option>
                            ))}
                        </select>

                        <select
                            value={newsSubdomainTag}
                            onChange={(e) => setNewsSubdomainTag(e.target.value)}
                            className="px-2 py-1 rounded bg-[#10232c] border border-cyan-800 text-cyan-200"
                        >
                            <option value="ALL">All News Subdomain Tags</option>
                            {Object.keys(NEWS_SUBDOMAIN_TAG).map((tag) => (
                                <option key={tag} value={tag}>
                                    {tag}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="px-2 py-1 rounded bg-[#10232c] border border-cyan-800 text-cyan-200"
                        />
                        <span className="text-cyan-400">to</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="px-2 py-1 rounded bg-[#10232c] border border-cyan-800 text-cyan-200"
                        />

                        <motion.input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search news..."
                            whileFocus={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="px-2 py-1 rounded w-64 bg-[#10232c] border border-cyan-800 placeholder-cyan-500 text-cyan-200"
                        />
                    </div>

                    {/* Inline error (non-blocking) */}
                    {errorMsg && (
                        <div className="text-sm px-3 py-1.5 rounded-md border border-rose-900/60 bg-rose-900/20 text-rose-200">
                            {errorMsg}
                        </div>
                    )}
                </div>
            </div>

            {/* News List Scrollable */}
            <div className="overflow-y-auto max-h-[80vh] pr-2 mt-6">
                {newsList.length > 0 ? (
                    Object.entries(groupedNews).map(([date, newsItems]) => (
                        <div key={date} className="mt-6">
                            <h2 className="text-lg font-semibold text-cyan-200 mb-2 border-b border-cyan-800">
                                {format(new Date(date), "dd MMM yyyy")}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-fr">
                                {newsItems.map((n) => (
                                    <div key={`${n.id}-${n.updated_at}`} className="overflow-hidden rounded-lg">
                                        <motion.div
                                            whileHover={{ scale: 1.03 }}
                                            transition={{ duration: 0.2, ease: "easeInOut" }}
                                            className="h-full"
                                        >
                                            <NewsCard
                                                news={n}
                                                is_read={true}
                                                OnNewsDelete={() => { }}
                                                OnNewsUpdate={() => { }}
                                            />
                                        </motion.div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center text-cyan-500 py-20 italic">
                        <svg
                            className="w-8 h-8 mr-2"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 9V5.25m-7.5 3.75V5.25M3 9h18M4.5 19.5h15a.75.75 0 00.75-.75V9.75H3.75v9a.75.75 0 00.75.75z"
                            />
                        </svg>
                        No news found. Try adjusting filters or search.
                    </div>
                )}
            </div>
        </div>
    );
}
