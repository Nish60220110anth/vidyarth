import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, MotionConfig, AnimatePresence } from "framer-motion";
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

        return Object.fromEntries(
            Object.entries(grouped).sort(
                ([a], [b]) => new Date(b).getTime() - new Date(a).getTime()
            )
        );
    }, [newsList]);

    const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019] text-cyan-200">
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
        <MotionConfig transition={{ duration: 0.18, ease: EASE }} reducedMotion="user">
            <div className="min-h-full w-full bg-gradient-to-br from-[#050b10] via-[#07131a] to-[#041019] text-cyan-100 px-4 md:px-8 pt-4 pb-10 overflow-hidden">
                {/* Sticky Filter Card */}
                <motion.div
                    className="sticky top-0 z-20 rounded-2xl border border-cyan-700/40 bg-[#081219]/85 backdrop-blur px-3 sm:px-4 lg:px-6 py-3"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            {/* Refresh */}
                            <motion.button
                                onClick={fetchNews}
                                disabled={isRefreshing}
                                className={`p-2 rounded-full border transition ${isRefreshing
                                        ? "border-cyan-700/60 text-cyan-300 bg-[#0b1f2b] cursor-wait"
                                        : "border-cyan-700/50 text-cyan-100 bg-[#0a1820] hover:border-cyan-400/60"
                                    }`}
                                title="Refresh news"
                                aria-label="Refresh news"
                                whileTap={{ scale: 0.96 }}
                            >
                                <motion.span
                                    animate={isRefreshing ? { rotate: 360 } : { rotate: 0 }}
                                    transition={{
                                        repeat: isRefreshing ? Infinity : 0,
                                        repeatType: "loop",
                                        ease: "linear",
                                        duration: 1,
                                    }}
                                    className="inline-flex"
                                >
                                    <ArrowPathIcon className="h-5 w-5" />
                                </motion.span>
                            </motion.button>

                            {/* Reset */}
                            <motion.button
                                onClick={() => {
                                    setIsResetting(true);
                                    setSearch("");
                                    setSelectedDomain("ALL");
                                    setDateRange({ from: "", to: "" });
                                    setNewsDomainTag("ALL");
                                    setNewsSubdomainTag("ALL");
                                    setTimeout(() => setIsResetting(false), 350);
                                }}
                                className="p-2 rounded-full border border-rose-800 text-rose-400 hover:text-white hover:border-rose-500 bg-[#0a1820] transition"
                                title="Reset filters"
                                aria-label="Reset filters"
                                whileTap={{ scale: 0.96 }}
                            >
                                <motion.span
                                    animate={isResetting ? { x: [-5, 0] } : { x: 0 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 12 }}
                                    className="inline-flex"
                                >
                                    <ArrowUturnLeftIcon className="h-5 w-5" />
                                </motion.span>
                            </motion.button>

                            {/* Domain */}
                            <select
                                value={selectedDomain}
                                onChange={(e) => setSelectedDomain(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="ALL">All Domains</option>
                                {ALL_DOMAINS.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>

                            {/* News Domain Tag */}
                            <select
                                value={newsDomainTag}
                                onChange={(e) => setNewsDomainTag(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="ALL">All News Domain Tags</option>
                                {Object.keys(NEWS_DOMAIN_TAG).map((tag) => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))}
                            </select>

                            {/* News Subdomain Tag */}
                            <select
                                value={newsSubdomainTag}
                                onChange={(e) => setNewsSubdomainTag(e.target.value)}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="ALL">All News Subdomain Tags</option>
                                {Object.keys(NEWS_SUBDOMAIN_TAG).map((tag) => (
                                    <option key={tag} value={tag}>
                                        {tag}
                                    </option>
                                ))}
                            </select>

                            {/* Date range */}
                            <input
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />
                            <span className="text-cyan-400 text-xs">to</span>
                            <input
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                className="px-3 py-1.5 text-xs rounded-full bg-[#0a1820] text-cyan-100 border border-cyan-700/50 hover:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />

                            {/* Search */}
                            <motion.div
                                className="relative"
                                whileHover={{ scale: 1.005 }}
                                whileTap={{ scale: 0.99 }}
                            >
                                <motion.input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search news…"
                                    whileFocus={{ scale: 1.02 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                                    className="px-3 py-1.5 text-sm rounded-xl w-64 max-w-[70vw] bg-[#0a1820] border border-cyan-700/50 placeholder-cyan-500 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                            </motion.div>
                        </div>

                        {/* Inline error */}
                        <AnimatePresence>
                            {errorMsg && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    className="text-sm px-3 py-1.5 rounded-md border border-rose-900/60 bg-rose-900/20 text-rose-200"
                                >
                                    {errorMsg}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* News list */}
                <div className="overflow-y-auto max-h-[calc(100vh-12rem)] pr-1.5 mt-5">
                    {newsList.length > 0 ? (
                        Object.entries(groupedNews).map(([date, newsItems]) => (
                            <motion.section
                                key={date}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="mt-6"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h2 className="text-lg font-semibold text-cyan-200">
                                        {format(new Date(date), "dd MMM yyyy")}
                                    </h2>
                                    <div className="h-px flex-1 ml-4 bg-gradient-to-r from-transparent via-cyan-800/40 to-transparent" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 auto-rows-fr">
                                    {newsItems.map((n) => (
                                        <div key={`${n.id}-${n.updated_at}`} className="overflow-hidden rounded-2xl border border-cyan-700/40 bg-[#081219]/85 backdrop-blur">
                                            <motion.div
                                                whileHover={{ scale: 1.02 }}
                                                transition={{ duration: 0.18, ease: "easeInOut" }}
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
                            </motion.section>
                        ))
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center justify-center text-cyan-300/90 py-16"
                        >
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-cyan-800/40 bg-gradient-to-b from-[#0b1f29] to-[#0a1820]">
                                <svg
                                    className="w-6 h-6"
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
                                <span>No news found. Try adjusting filters or search.</span>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
        </MotionConfig>
    );
}
