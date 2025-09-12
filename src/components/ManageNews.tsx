import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import NewsCard from "@/components/NewsCard";
import { ALL_DOMAINS } from "./ManageCompanyList";
import { ACCESS_PERMISSION, news } from "@prisma/client";
import { createDefaultNews, getNewsOnQuery } from "../lib/api/manage_news";
import { debounceAsync } from "@/utils/debounce";

export default function ManageNews() {
    const router = useRouter();
    const { basePath } = router;

    const [newsList, setNewsList] = useState<news[]>([]);
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isActive, setIsActive] = useState("ALL");
    const [isApproved, setIsApproved] = useState("ALL");

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
            if (isActive !== "ALL") q.append("is_active", isActive);
            if (isApproved !== "ALL") q.append("is_approved", isApproved);
            if (newsDomainTag !== "ALL") q.append("domain_tag", newsDomainTag);
            if (newsSubdomainTag !== "ALL") q.append("subdomain_tag", newsSubdomainTag);
            if (overrides?.id) q.append("id", String(overrides.id));

            return q;
        },
        [
            selectedDomain,
            search,
            dateRange.from,
            dateRange.to,
            isActive,
            isApproved,
            newsDomainTag,
            newsSubdomainTag,
        ]
    );

    const debouncedRefresh = useMemo(
        () =>
            debounceAsync(async (opts?: { id?: number; search?: string }) => {
                setIsRefreshing(true);
                try {
                    const q = buildQuery(opts);
                    const data = await getNewsOnQuery(q, ACCESS_PERMISSION.MANAGE_NEWS);
                    if (data.success) {
                        setNewsList(data.data);
                    }
                } finally {
                    setIsRefreshing(false);
                }
            }, 400),
        [buildQuery]
    );

    const fetchNews = useCallback(() => debouncedRefresh(), [debouncedRefresh]);

    useEffect(() => {
        debouncedRefresh({ search });
    }, [
        selectedDomain,
        search,
        dateRange.from,
        dateRange.to,
        isActive,
        isApproved,
        newsDomainTag,
        newsSubdomainTag,
        debouncedRefresh,
    ]);

    return (
        <div className="p-4 sm:p-6 md:p-10 bg-gray-100 min-h-full">
            <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur supports-[backdrop-filter]:bg-gray-100/80 pb-4">

                {/* Breadcrumbs */}
                <div className="text-xs sm:text-sm text-gray-600 flex flex-wrap items-center gap-2 mb-2">
                    <span onClick={() => router.push("/")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage News</span>
                </div>

                {/* Title */}
                <motion.h1
                    layoutScroll
                    className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage News
                </motion.h1>

                {/* Controls */}
                <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Left section: filters */}
                    <div className="flex items-center gap-2 flex-wrap overflow-x-auto">
                        {/* Domain Filter */}
                        <select
                            value={selectedDomain}
                            onChange={(e) => setSelectedDomain(e.target.value)}
                            className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                            <option value="ALL">All Domains</option>
                            {ALL_DOMAINS.map((domain) => (
                                <option key={domain} value={domain}>
                                    {domain}
                                </option>
                            ))}
                        </select>

                        {/* Active Status Filter */}
                        <div className="flex flex-col text-gray-600">
                            <select
                                className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                value={isActive}
                                onChange={(e) => {
                                    setIsActive(e.target.value);
                                }}
                            >
                                <option value="ALL">All</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        {/* Approval Status Filter */}
                        <div className="flex flex-col text-gray-600">
                            <select
                                className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                value={isApproved}
                                onChange={(e) => {
                                    setIsApproved(e.target.value);
                                }}
                            >
                                <option value="ALL">All</option>
                                <option value="true">Approved</option>
                                <option value="false">Not Approved</option>
                            </select>
                        </div>

                        {/* Search */}
                        <motion.input
                            type="text"
                            placeholder="Search news..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            whileFocus={{ scale: 1.02 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-200"
                        />

                        {/* Date Range */}
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                        />
                        <span className="text-gray-600 hidden sm:inline">to</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                        />

                        {/* Refresh Button */}
                        <button
                            onClick={fetchNews}
                            className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-cyan-600 hover:border-cyan-500 transition shadow-sm hover:shadow-md"
                            title="Refresh news"
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

                    {/* Right section: Add button */}
                    <button
                        onClick={async () => {
                            const res = await createDefaultNews();
                            if (res.success) {
                                setNewsList([...newsList, res.data]);
                            }
                        }}
                        className="self-start md:self-auto bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        + Add News
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 overflow-x-auto">
                    {/* News Domain Tag Filter */}
                    <select
                        value={newsDomainTag}
                        onChange={(e) => setNewsDomainTag(e.target.value)}
                        className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="ALL">All News Domain Tags</option>
                        {["BUSINESS", "WORLD", "TECHNOLOGY", "COMPANY"].map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>

                    {/* News Subdomain Tag Filter */}
                    {/* <select
                        value={newsSubdomainTag}
                        onChange={(e) => setNewsSubdomainTag(e.target.value)}
                        className="w-full sm:w-auto px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="ALL">All News Subdomain Tags</option>
                        {Object.keys(NEWS_SUBDOMAIN_TAG).map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select> */}
                </div>

                {newsList.length > 0 && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-2 ml-1">
                        Showing {newsList.length} news item{newsList.length > 1 ? "s" : ""}
                    </p>
                )}
            </div>

            <div className="md:max-h-[65vh] overflow-y-auto pr-1">
                {newsList.length > 0 ? (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 mt-4">
                        {newsList.map((news: news) => (
                            <div key={`${news.id}-${news.updated_at}`} className="break-inside-avoid">
                                <NewsCard
                                    news={news}
                                    search={search}
                                    is_read={false}
                                    OnNewsDelete={(id) => {
                                        setNewsList(newsList.filter((g) => g.id !== id));
                                    }}
                                    OnNewsUpdate={(unews) => {
                                        setNewsList(
                                            newsList.map((g) => (g.id === unews.id ? { ...g, ...unews } : g))
                                        );
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-16 md:py-24">
                        <div className="text-gray-500 text-center text-base">No news available.</div>
                    </div>
                )}
            </div>
        </div>
    );
}
