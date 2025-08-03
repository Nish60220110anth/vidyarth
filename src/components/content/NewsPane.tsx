import React, { useCallback, useMemo, useState, memo } from "react";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { NewsPaneProps } from "@/types/panes";
import { motion } from "framer-motion";

const DOMAIN_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    FINANCE: { bg: "bg-green-900/20", text: "text-green-300", ring: "ring-green-600/40" },
    MARKETING: { bg: "bg-pink-900/20", text: "text-pink-300", ring: "ring-pink-600/40" },
    CONSULTING: { bg: "bg-yellow-900/20", text: "text-yellow-300", ring: "ring-yellow-600/40" },
    PRODMAN: { bg: "bg-cyan-900/20", text: "text-cyan-300", ring: "ring-cyan-600/40" },
    OPERATIONS: { bg: "bg-orange-900/20", text: "text-orange-300", ring: "ring-orange-600/40" },
    GENMAN: { bg: "bg-purple-900/20", text: "text-purple-300", ring: "ring-purple-600/40" },
};

const containerVariants = {
    hidden: { opacity: 0, y: 6 },
    show: {
        opacity: 1,
        y: 0,
        transition: { staggerChildren: 0.05, ease: [0.25, 1, 0.5, 1] },
    },
};

const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
};

const NewsPane: React.FC<NewsPaneProps> = ({ props }) => {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const list = props.news ?? [];

    // Precompute small derived fields to avoid work inside render loops
    const computedNews = useMemo(
        () =>
            list.map((n) => ({
                ...n,
                hasLink: !!n.source_link,
                dateStr: n.created_at
                    ? new Date(n.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })
                    : "Unknown",
            })),
        [list]
    );

    const toggleExpanded = useCallback((i: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    }, []);

    if (!computedNews.length) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0a141d] to-[#0e1e2b] shadow-[0_0_24px_rgba(0,255,255,0.10)] backdrop-blur-sm">
                <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#10202c] border border-cyan-900/50 mb-4">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-8 h-8 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m12 4.5l3-3-3-3M4.5 16.5l-3-3 3-3" />
                    </svg>
                </div>
                <p className="text-base font-semibold text-cyan-100">No news entries available</p>
                <p className="text-sm text-cyan-300/70 mt-1">Please check back later.</p>
            </div>
        );
    }

    return (
        <motion.div
            className="w-full flex flex-col gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="show"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {computedNews.map((entry, idx) => {
                    const isExpanded = expanded.has(idx);
                    const clickable = entry.hasLink;

                    const Wrapper: any = clickable ? "a" : "div";
                    const wrapperProps = clickable
                        ? {
                            href: entry.source_link,
                            target: "_blank",
                            rel: "noopener noreferrer",
                            "aria-label": `Open source for ${entry.title}`,
                        }
                        : {};

                    return (
                        <motion.div key={idx} variants={cardVariants}>
                            <Wrapper
                                {...wrapperProps}
                                className={`group relative flex flex-col rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] shadow-[0_0_25px_rgba(0,255,255,0.10)] hover:shadow-[0_0_38px_rgba(0,255,255,0.22)] transition-all duration-300 p-4 overflow-hidden hover:-translate-y-0.5 ${clickable ? "cursor-pointer" : "cursor-default"
                                    }`}
                            >
                                {/* Image (fixed aspect for stability) */}
                                <div className="w-full aspect-[16/9] mb-3 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                                    {entry.image_url ? (
                                        <img
                                            src={entry.image_url}
                                            alt={entry.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="text-xs text-cyan-300/50">No Image</div>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-lg font-semibold text-cyan-100 leading-snug mb-1">
                                    {entry.title}
                                </h3>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {entry.domains?.map((domain, i) => {
                                        const key = (domain || "").toUpperCase();
                                        const color = DOMAIN_COLORS[key] || {
                                            bg: "bg-slate-800/50",
                                            text: "text-slate-300",
                                            ring: "ring-slate-600/30",
                                        };
                                        return (
                                            <span
                                                key={`${domain}-${i}`}
                                                className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${color.bg} ${color.text} ring-1 ring-inset ${color.ring}`}
                                            >
                                                {domain}
                                            </span>
                                        );
                                    })}

                                    {entry.subdomain_tag && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-cyan-600/50 text-cyan-300 bg-cyan-900/10">
                                            {entry.subdomain_tag}
                                        </span>
                                    )}
                                    {entry.news_tag && (
                                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full border border-purple-600/40 text-purple-300 bg-purple-900/10">
                                            {entry.news_tag}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <p className={`text-sm text-cyan-100/80 mb-2 ${isExpanded ? "" : "line-clamp-3"}`}>
                                    {entry.content}
                                </p>

                                {entry.content && entry.content.length > 120 && (
                                    <div className="flex justify-end">
                                        {/* Prevent anchor navigation when toggling */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleExpanded(idx);
                                            }}
                                            className="text-xs text-cyan-300 font-medium hover:underline"
                                        >
                                            {isExpanded ? "Show Less" : "Read More"}
                                        </button>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between text-[11px] text-cyan-200/60 mt-4 pt-2 border-t border-cyan-900/40">
                                    <span>{entry.dateStr}</span>
                                    {clickable && (
                                        <ArrowTopRightOnSquareIcon className="w-4 h-4 text-cyan-300 opacity-80 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </Wrapper>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default memo(NewsPane);
