import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import NewsCard from "@/components/NewsCard";
import axios from "axios";
import { ALL_DOMAINS } from "./ManageCompanyList";
import { ACCESS_PERMISSION, News, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG } from "@prisma/client";
import { ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";

export default function ManageNews() {

    const [newsList, setNewsList] = useState<News[]>([]);
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const [newsDomainTag, setNewsDomainTag] = useState("ALL");
    const [newsSubdomainTag, setNewsSubdomainTag] = useState("ALL");


    const fetchNews = async () => {
        try {
            setIsRefreshing(true);

            const query = new URLSearchParams();

            if (selectedDomain !== "ALL") query.append("domain", selectedDomain);
            if (search.trim()) query.append("title", search);
            if (dateRange.from) query.append("from", dateRange.from);
            if (dateRange.to) query.append("to", dateRange.to);
            if (newsDomainTag !== "ALL") query.append("domain_tag", newsDomainTag);
            if (newsSubdomainTag !== "ALL") query.append("subdomain_tag", newsSubdomainTag);

            const res = await axios.get("/api/news", {
                params: query,
                headers: {
                    "Content-Type": "application/json",
                    "x-access-permission": ACCESS_PERMISSION.ENABLE_NEWS
                },
            });

            if (!res.data.success) {
                toast.error(res.data.error)
                return;
            }

            setNewsList(res.data.newsList);
        } catch (err: any) {
            toast.error("Failed to load news");
        } finally {
            setTimeout(() => setIsRefreshing(false), 400);
        }
    };

    const fetchNewsOnId = async (id: string) => {
        try {
            setIsRefreshing(true);

            const query = new URLSearchParams();

            if (selectedDomain !== "ALL") query.append("domain", selectedDomain);
            if (search.trim()) query.append("title", search);
            if (dateRange.from) query.append("from", dateRange.from);
            if (dateRange.to) query.append("to", dateRange.to);
            if (newsDomainTag !== "ALL") query.append("domain_tag", newsDomainTag);
            if (newsSubdomainTag !== "ALL") query.append("subdomain_tag", newsSubdomainTag);

            const res = await axios.get(`/api/news?id=${id}`, {
                params: query,
                headers: {
                    "Content-Type": "application/json",
                    "x-access-permission": "MANAGE_NEWS"
                },
            });

            const { news } = res.data;

            if (news) {
                setNewsList((prevList) =>
                    prevList.map((item) =>
                        item.id === news.id ? news : item
                    )
                );
            }

        } catch {
            toast.error("Failed to load news");
        } finally {
            setTimeout(() => setIsRefreshing(false), 400);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchNews();
        }, 400);

        return () => clearTimeout(timeout);
    }, [search]);

    const groupedNews = useMemo(() => {
        const grouped: Record<string, News[]> = {};

        newsList.forEach((item) => {
            const date = format(new Date(item.created_at), "yyyy-MM-dd");
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(item);
        });

        return grouped;
    }, [newsList]);

    useEffect(() => {
        fetchNews();
    }, [selectedDomain, dateRange, newsDomainTag, newsSubdomainTag]);

    useEffect(() => {

    }, [isRefreshing]);

    return (
        <div className="p-6 md:p-10 bg-gray-100 h-full">

            {/* Controls */}
            <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left section: filters */}
                <div className="flex flex-wrap items-center gap-2">

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

                    {/* Reset Filters Button */}
                    <button
                        onClick={() => {
                            setIsResetting(true);
                            setSearch("");
                            setSelectedDomain("ALL");
                            setDateRange({ from: "", to: "" });
                            setNewsDomainTag("ALL");
                            setNewsSubdomainTag("ALL");

                            // stop animation after a short delay
                            setTimeout(() => setIsResetting(false), 400);
                        }}
                        className="p-2 rounded-md border border-gray-300 text-gray-600 hover:text-rose-600 hover:border-rose-500 transition shadow-sm hover:shadow-md"
                        title="Reset all filters"
                    >
                        <motion.div
                            animate={isResetting ? { x: [-5, 0] } : { x: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 300,
                                damping: 10,
                            }}
                        >
                            <ArrowUturnLeftIcon className="h-5 w-5" />
                        </motion.div>
                    </button>



                    {/* Domain Filter */}
                    <select
                        value={selectedDomain}
                        onChange={(e) => setSelectedDomain(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="ALL">All Domains</option>
                        {ALL_DOMAINS.map((domain) => (
                            <option key={domain} value={domain}>
                                {domain}
                            </option>
                        ))}
                    </select>

                    {/* Search */}
                    <motion.input
                        type="text"
                        placeholder="Search news..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        whileFocus={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-200 w-64"
                    />

                    {/* News Domain Tag Filter */}
                    <select
                        value={newsDomainTag}
                        onChange={(e) => setNewsDomainTag(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="ALL">All News Domain Tags</option>
                        {Object.keys(NEWS_DOMAIN_TAG).map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>

                    {/* News Subdomain Tag Filter */}
                    <select
                        value={newsSubdomainTag}
                        onChange={(e) => setNewsSubdomainTag(e.target.value)}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                        <option value="ALL">All News Subdomain Tags</option>
                        {Object.keys(NEWS_SUBDOMAIN_TAG).map((tag) => (
                            <option key={tag} value={tag}>
                                {tag}
                            </option>
                        ))}
                    </select>

                    {/* Date Range */}
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                    />
                    <span className="text-gray-600">to</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                    />

                </div>
            </div>

            {newsList.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 ml-1">
                    Showing {newsList.length} news item{newsList.length > 1 ? "s" : ""}
                </p>
            )}

            {/* News card grid or list will go here */}
            <div>
                {newsList.length > 0 ? (
                    Object.entries(groupedNews).map(([date, newsItems]) => (
                        <div key={date} className="mt-8">
                            {/* Date Header */}
                            <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-1">
                                {format(new Date(date), "dd MMM yyyy")}
                            </h2>

                            {/* News Cards in 3-column layout */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {newsItems.map((news: News) => (
                                    <div key={`${news.id}-${news.updated_at}`}>
                                        <NewsCard
                                            news={news}
                                            fetchAllNews={fetchNews}
                                            fetchNewsOnId={fetchNewsOnId}
                                            search={search}
                                            is_read={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex justify-center items-center py-12 text-cyan-700 text-base font-medium italic w-full">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-10 h-10 mb-2 text-cyan-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 9V5.25m-7.5 3.75V5.25M3 9h18M4.5 19.5h15a.75.75 0 00.75-.75V9.75H3.75v9a.75.75 0 00.75.75z"
                            />
                        </svg>
                        <p className="italic text-center">
                            No news found. Try adjusting your filters or search keywords.
                        </p>
                    </div>
                )}
            </div>



        </div>
    );
}
