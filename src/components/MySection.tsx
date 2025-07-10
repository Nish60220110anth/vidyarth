"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    FINANCE: { bg: "bg-green-100", text: "text-green-800" },
    MARKETING: { bg: "bg-yellow-100", text: "text-yellow-800" },
    CONSULTING: { bg: "bg-blue-100", text: "text-blue-800" },
    PRODMAN: { bg: "bg-indigo-100", text: "text-indigo-800" },
    OPERATIONS: { bg: "bg-pink-100", text: "text-pink-800" },
    GENMAN: { bg: "bg-purple-100", text: "text-purple-800" },
};

type Shortlist = {
    id: number;
    company: { company_name: string, company_full: string };
    company_id: number;
    role: string;
    round_details: string;
};

type NewsEntry = {
    title: string;
    source_link: string;
    content: string;
    company_name: string;
    company_id: number;
    image_url: string;
    domains?: string[];
    subdomain_tag?: string;
    news_tag?: string;
    created_at?: Date;
};

export default function MySection() {
    const [shortlists, setShortlists] = useState<Shortlist[]>([]);
    const [news, setNews] = useState<NewsEntry[]>([]);
    const [loadingNews, setLoadingNews] = useState(true);
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(new Set());

    const toggleExpanded = (idx: number) => {
        setExpandedIndices((prev) => {
            const updated = new Set(prev);
            updated.has(idx) ? updated.delete(idx) : updated.add(idx);
            return updated;
        });
    };

    useEffect(() => {
        const fetchShortlists = async () => {
            const res = await fetch("/api/shortlists");
            const data = await res.json();
            if (data.success) setShortlists(data.shortlists);
        };
        fetchShortlists();
    }, []);

    useEffect(() => {
        if (shortlists.length === 0) return;

        const fetchNews = async () => {
            setLoadingNews(true);
            try {
                const companies = shortlists
                    .filter((s) => s.company_id !== undefined)
                    .map((s) => s.company_id);
                const params = new URLSearchParams();
                companies.forEach((id) => params.append("cid", id.toString()));

                const res = await axios.get(`/api/news-for-my-section?${params.toString()}`);
                const data = res.data;
                if (!data.success) return;
                const transformed = data.data.map((news: any): NewsEntry => ({
                    title: news.title,
                    source_link: news.source_link,
                    content: news.content,
                    company_name: news.company_name,
                    company_id: news.company_id,
                    image_url: news.image_url,
                    domains: news.domains.map((d: any) => d.domain),
                    subdomain_tag: news.subdomain_tag,
                    news_tag: news.news_tag,
                    created_at: new Date(news.created_at),
                }));

                setNews(transformed);
            } catch (error) {
                console.error("Error fetching news:", error);
            } finally {
                setLoadingNews(false);
            }
        };

        fetchNews();
    }, [shortlists]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 w-full max-w-full">
            {/* Left Pane */}
            <motion.div className="lg:w-5/12 w-full md:w-1/2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                <div className="bg-blue-950 rounded-lg p-4 shadow-md border border-blue-800">
                    <h3 className="text-xl font-semibold text-cyan-300 mb-3">My Shortlists</h3>
                    {shortlists.length === 0 ? (
                        <p className="text-cyan-200 italic">No shortlists found.</p>
                    ) : (
                        <div className="space-y-4">
                            {shortlists.map((s) => (
                                <div key={s.id} className="border border-cyan-700 bg-[#0e1c27] p-4 rounded-lg shadow-sm">
                                    <h4 className="text-lg font-semibold text-cyan-200">{s.company.company_full}</h4>
                                    <p className="text-cyan-100 text-sm"><strong>Role:</strong> {s.role}</p>
                                    <p className="text-cyan-100 text-sm"><strong>Round:</strong> {s.round_details}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Right Pane */}
            <motion.div className="flex-grow w-full" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
                {!news?.length ? (
                    <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-blue-900 bg-gradient-to-b from-[#0d1b24] to-[#0a141d] shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm">
                        <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#112531] border border-blue-800 mb-4">
                            <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12h-15m12 4.5l3-3-3-3M4.5 16.5l-3-3 3-3" />
                            </svg>
                        </div>
                        <p className="text-base font-semibold text-cyan-100">No news entries available</p>
                        <p className="text-sm text-gray-400 mt-1">Please check back later.</p>
                    </div>
                ) : (
                        <div className="grid grid-cols-1 gap-6 w-full">
                        {news.map((entry, idx) => {
                            const isExpanded = expandedIndices.has(idx);
                            return (
                                <motion.a
                                    key={idx}
                                    href={entry.source_link || "#"}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: idx * 0.05 }}
                                    className="group relative flex flex-row rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] shadow-[0_0_25px_rgba(0,255,255,0.1)] hover:shadow-[0_0_40px_rgba(0,255,255,0.25)] transition-all duration-300 p-4 overflow-hidden hover:-translate-y-1"
                                >
                                    {/* Image section on the left */}
                                    <div className="w-32 h-32 min-w-[8rem] rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                                        {entry.image_url ? (
                                            <img
                                                src={entry.image_url}
                                                alt={entry.title}
                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="text-xs text-gray-400">No Image</div>
                                        )}
                                    </div>

                                    {/* Content section on the right */}
                                    <div className="flex-1 flex flex-col ml-4">
                                        <h3 className="text-lg font-semibold text-cyan-100 leading-snug mb-1">{entry.title}</h3>

                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {entry.domains?.map((domain, i) => {
                                                const color = DOMAIN_COLORS[domain.toUpperCase()] || {
                                                    bg: "bg-gray-800",
                                                    text: "text-gray-300",
                                                };
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${color.bg} ${color.text}`}
                                                    >
                                                        {domain}
                                                    </span>
                                                );
                                            })}
                                            {entry.subdomain_tag && (
                                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-blue-400 text-blue-300 bg-blue-500/10">
                                                    {entry.subdomain_tag}
                                                </span>
                                            )}
                                            {entry.news_tag && (
                                                <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-purple-400 text-purple-300 bg-purple-500/10">
                                                    {entry.news_tag}
                                                </span>
                                            )}
                                        </div>

                                        <p className={`text-sm text-gray-300 mb-2 ${isExpanded ? "" : "line-clamp-3"}`}>{entry.content}</p>

                                        {entry.content.length > 120 && (
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        toggleExpanded(idx);
                                                    }}
                                                    className="text-xs text-cyan-400 font-medium hover:underline"
                                                >
                                                    {isExpanded ? "Show Less" : "Read More"}
                                                </button>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-auto pt-2 border-t border-gray-700/50">
                                            <span>
                                                {entry.created_at
                                                    ? new Date(entry.created_at).toLocaleDateString(undefined, {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    : "Unknown"}
                                            </span>
                                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </div>
                                </motion.a>
                            );
                        })}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
