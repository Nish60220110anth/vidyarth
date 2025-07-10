import React, { useState } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import {  NewsPaneProps } from "@/types/panes";
import { motion } from "framer-motion";


const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
    FINANCE: { bg: "bg-green-900/20", text: "text-green-300 border-green-500" },
    MARKETING: { bg: "bg-pink-900/20", text: "text-pink-300 border-pink-500" },
    CONSULTING: { bg: "bg-yellow-900/20", text: "text-yellow-300 border-yellow-500" },
    PRODMAN: { bg: "bg-cyan-900/20", text: "text-cyan-300 border-cyan-500" },
    OPERATIONS: { bg: "bg-orange-900/20", text: "text-orange-300 border-orange-500" },
    GENMAN: { bg: "bg-purple-900/20", text: "text-purple-300 border-purple-500" },
};

const NewsPane: React.FC<NewsPaneProps> = ({
    props
}) => {
    const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
        new Set()
    );

    const { news } = props;

    const toggleExpanded = (index: number) => {
        setExpandedIndices((prev) => {
            const newSet = new Set(prev);
            newSet.has(index) ? newSet.delete(index) : newSet.add(index);
            return newSet;
        });
    };

    if (!news?.length) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-blue-900 bg-gradient-to-b from-[#0d1b24] to-[#0a141d] shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#112531] border border-blue-800 mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 12h-15m12 4.5l3-3-3-3M4.5 16.5l-3-3 3-3"
                        />
                    </svg>
                </div>
                <p className="text-base font-semibold text-cyan-100">
                    No news entries available
                </p>
                <p className="text-sm text-gray-400 mt-1">Please check back later.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6">

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.map((entry, idx) => {
                    const isClickable = !!entry.source_link;
                    const Wrapper = isClickable ? "a" : "div";
                    const isExpanded = expandedIndices.has(idx);

                    return (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                        >
                            <Wrapper
                                key={idx}
                                {...(isClickable && {
                                    href: entry.source_link,
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                })}
                                className={`group relative flex flex-col rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] shadow-[0_0_25px_rgba(0,255,255,0.1)] hover:shadow-[0_0_40px_rgba(0,255,255,0.25)] transition-all duration-300 p-4 overflow-hidden hover:-translate-y-1 ${isClickable ? "cursor-pointer" : "cursor-default"
                                    }`}
                            >
                                {/* Image */}
                                <div className="w-full h-40 mb-3 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
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

                                {/* Title */}
                                <h3 className="text-lg font-semibold text-cyan-100 leading-snug mb-1">
                                    {entry.title}
                                </h3>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {entry.domains?.map((domain, i) => {
                                        const color = DOMAIN_COLORS[domain.toUpperCase()] || { bg: "bg-gray-800", text: "text-gray-300 border-gray-600" };
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

                                {/* Content */}
                                <p
                                    className={`text-sm text-gray-300 mb-2 ${isExpanded ? "" : "line-clamp-3"
                                        }`}
                                >
                                    {entry.content}
                                </p>

                                {entry.content && entry.content.length > 120 && (
                                    <div className="flex justify-end">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                toggleExpanded(idx);
                                            }}
                                            className="text-xs text-cyan-400 font-medium hover:underline"
                                        >
                                            {isExpanded ? "Show Less" : "Read More"}
                                        </button>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-4 pt-2 border-t border-gray-700/50">
                                    <span>
                                        {entry.created_at
                                            ? new Date(entry.created_at).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })
                                            : "Unknown"}
                                    </span>
                                    {isClickable && (
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </Wrapper>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default NewsPane;
