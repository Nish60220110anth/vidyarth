import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import NewsCard from "@/components/NewsCard";
import axios from "axios";
import { ALL_DOMAINS } from "./ManageCompanyList";
import { News, NEWS_DOMAIN_TAG, NEWS_SUBDOMAIN_TAG } from "@prisma/client";


export default function ManageNews() {
    const router = useRouter();

    const [newsList, setNewsList] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedDomain, setSelectedDomain] = useState("ALL");
    const [dateRange, setDateRange] = useState({ from: "", to: "" });
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isActive, setIsActive] = useState("ALL");
    const [isApproved, setIsApproved] = useState("ALL");

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
            if (isActive !== "ALL") query.append("is_active", isActive);
            if (isApproved !== "ALL") query.append("is_approved", isApproved);
            if (newsDomainTag !== "ALL") query.append("domain_tag", newsDomainTag);
            if (newsSubdomainTag !== "ALL") query.append("subdomain_tag", newsSubdomainTag);

            const res = await axios.get("/api/news", {
                params: query,
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const { data } = res.data;
            setNewsList(data);
        } catch {
            toast.error("Failed to load news");
        } finally {
            setTimeout(() => setIsRefreshing(false), 400);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchNews();
        }, 400); // adjust as needed

        return () => clearTimeout(timeout);
    }, [search]);


    useEffect(() => {
        fetchNews();
    }, [selectedDomain, isActive, isApproved, dateRange, newsDomainTag, newsSubdomainTag]);

    useEffect(() => {

    }, [isRefreshing]);

    return (
        <div className="p-6 md:p-10 bg-gray-100 h-full">
            <div className="sticky top-0 z-10 bg-gray-100 pb-4">

                {/* Breadcrumbs */}
                <div className="text-sm text-gray-600 flex gap-2 mb-2">
                    <span onClick={() => router.push("/dashboard")} className="cursor-pointer hover:text-cyan-600">Dashboard</span>
                    <span>/</span>
                    <span className="text-gray-900 font-semibold">Manage News</span>
                </div>

                {/* Title */}
                <motion.h1
                    layoutScroll
                    className="text-2xl md:text-3xl font-bold text-gray-900"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    Manage News
                </motion.h1>

                {/* Controls */}
                <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left section: filters */}
                    <div className="flex flex-wrap items-center gap-2">
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

                        {/* Active Status Filter */}
                        <div className="flex flex-col text-gray-600">
                            <select
                                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
                            whileFocus={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 shadow-sm focus:shadow-lg transition duration-200 w-64"
                        />

                        {/* Date Range */}
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
                        />
                        <span className="text-gray-600">to</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700"
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
                            try {
                                const res = await axios.post("/api/news", {
                                    is_default: true,
                                }, {
                                    headers: {
                                        "Content-Type": "application/json"
                                    }
                                });

                                const { success, error } = res.data;

                                if (success) {
                                    toast.success("Default news created");
                                    fetchNews();
                                } else {
                                    toast.error(error || "Failed to add news");
                                }
                            } catch (err) {
                                toast.error("Failed to add news");
                            }
                        }}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition"
                    >
                        + Add News
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2">

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

                </div>


                {newsList.length > 0 && (
                    <p className="text-sm text-gray-600 mt-2 ml-1">
                        Showing {newsList.length} news item{newsList.length > 1 ? "s" : ""}
                    </p>
                )}

            </div>

            {/* News card grid or list will go here */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 mt-4">
                {newsList.map((news: News) => (
                    <div key={`${news.id}-${news.updated_at}`} className="break-inside-avoid">
                        <NewsCard
                            news={news}
                            fetchNews={fetchNews}
                            search={search}
                            is_read={false}
                            is_short={false}
                        />
                    </div>
                ))}
            </div>

        </div>
    );
}
