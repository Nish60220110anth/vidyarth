import React, { useCallback, useMemo, useState, memo } from "react";
import { ArrowPathIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { NewsPaneProps } from "@/types/panes";
import { motion, AnimatePresence } from "framer-motion";
import { SmartImage } from "@/components/SmartImage";
import type { Variants } from "framer-motion";

const DOMAIN_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    FINANCE: { bg: "bg-green-900/20", text: "text-green-300", ring: "ring-green-600/40" },
    MARKETING: { bg: "bg-pink-900/20", text: "text-pink-300", ring: "ring-pink-600/40" },
    CONSULTING: { bg: "bg-yellow-900/20", text: "text-yellow-300", ring: "ring-yellow-600/40" },
    PRODMAN: { bg: "bg-cyan-900/20", text: "text-cyan-300", ring: "ring-cyan-600/40" },
    OPERATIONS: { bg: "bg-orange-900/20", text: "text-orange-300", ring: "ring-orange-600/40" },
    GENMAN: { bg: "bg-purple-900/20", text: "text-purple-300", ring: "ring-purple-600/40" },
};

const EASE_CB = [0.25, 1, 0.5, 1] as const;

export const wrapVariants: Variants = {
    hidden: { opacity: 0, y: 6 },
    show: {
        opacity: 1,
        y: 0,
        transition: { when: "beforeChildren", staggerChildren: 0.05, ease: EASE_CB },
    },
};

export const cardVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { ease: EASE_CB } },
};

const Skeleton: React.FC = () => (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
            <div
                key={i}
                className="mb-6 rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] p-4 animate-pulse"
                style={{ breakInside: "avoid", pageBreakInside: "avoid", WebkitColumnBreakInside: "avoid" as any }}
            >
                <div className="w-full aspect-[16/9] mb-3 rounded-lg bg-cyan-900/20" />
                <div className="h-4 w-3/4 rounded bg-cyan-900/30 mb-2" />
                <div className="h-3 w-5/6 rounded bg-cyan-900/20 mb-1" />
                <div className="h-3 w-2/3 rounded bg-cyan-900/20" />
            </div>
        ))}
    </div>
);

type EnhancedProps = NewsPaneProps & {
    props: NewsPaneProps["props"] & { loading?: boolean; error?: string; onRefresh?: () => void };
};

const NewsPane: React.FC<EnhancedProps> = ({ props }) => {
    const p = (props as unknown) as any;
    const list = (p?.news ?? []) as Array<any>;
    const loading = Boolean(p?.loading);
    const error = (p?.error as string) || "";
    const onRefresh = p?.onRefresh as (() => void) | undefined;
    const companyId = (p?.companyId as number) ?? 0;

    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const [query, setQuery] = useState("");
    const [domainFilter, setDomainFilter] = useState<string>("ALL");
    const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

    const computedNews = useMemo(
        () =>
            list.map((n) => ({
                ...n,
                hasLink: !!n.source_link,
                dateVal: n.created_at ? new Date(n.created_at).getTime() : 0,
                dateStr: n.created_at
                    ? new Date(n.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                    })
                    : "Unknown",
                lcTitle: (n.title ?? "").toLowerCase(),
                lcContent: (n.content ?? "").toLowerCase(),
                domainsUp: (n.domains ?? []).map((d: string) => String(d).toUpperCase()),
            })),
        [list]
    );

    const filteredSorted = useMemo(() => {
        const q = query.trim().toLowerCase();
        let rows = computedNews;
        if (domainFilter !== "ALL") rows = rows.filter((n) => n.domainsUp.includes(domainFilter));
        if (q) rows = rows.filter((n) => n.lcTitle.includes(q) || n.lcContent.includes(q));
        rows = [...rows].sort((a, b) => (sortDir === "desc" ? b.dateVal - a.dateVal : a.dateVal - b.dateVal));
        return rows;
    }, [computedNews, query, domainFilter, sortDir]);

    const toggleExpanded = useCallback((i: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    }, []);

    return (
        <div className="w-full flex flex-col gap-4">
            {/* Sticky controls */}
            <div className="sticky top-0 z-30">
                <div className="relative">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[#0d1f2b] shadow-[0_0_20px_rgba(0,255,255,0.06)] border-b border-cyan-900/40" />
                    <div className="relative bg-[#0d1f2b] border border-cyan-900/40 rounded-xl p-3 sm:p-4 shadow-[0_0_20px_rgba(0,255,255,0.06)]">
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                            <h3 className="text-cyan-200 font-semibold">News</h3>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search title or content…"
                                    className="px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 placeholder:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-600/70"
                                />
                                <button
                                    onClick={() => setSortDir((s) => (s === "desc" ? "asc" : "desc"))}
                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0b1721] border border-cyan-900/40 text-cyan-100 hover:bg-[#0d1f2b]"
                                    aria-label={`Sort by date ${sortDir === "desc" ? "oldest first" : "newest first"}`}
                                >
                                    {sortDir === "desc" ? "Newest → Oldest" : "Oldest → Newest"}
                                </button>
                                {onRefresh && (
                                    <button
                                        onClick={onRefresh}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-900/40 text-cyan-200 bg-[#0b1721] hover:bg-[#0f2130]"
                                        title="Refresh news"
                                        aria-label="Refresh news"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        Refresh
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <Skeleton />
            ) : error ? (
                <div className="w-full rounded-xl border border-red-900/40 bg-[#1a0f12] p-6 text-red-100">
                    <div className="flex items-center justify-between">
                        <p className="font-semibold">Failed to load news</p>
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                className="inline-flex items-center gap-2 rounded-md border border-red-800 bg-red-900/20 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/30"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Retry
                            </button>
                        )}
                    </div>
                    <p className="text-sm mt-1 opacity-80">{error}</p>
                </div>
            ) : filteredSorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center text-cyan-300 p-10 rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0a141d] to-[#0e1e2b] shadow-[0_0_24px_rgba(0,255,255,0.10)] backdrop-blur-sm">
                    <div className="w-14 h-14 flex items-center justify-center rounded-full bg-[#10202c] border border-cyan-900/50 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m12 4.5l3-3-3-3M4.5 16.5l-3-3 3-3" />
                        </svg>
                    </div>
                    <p className="text-base font-semibold text-cyan-100">No news entries match your filters</p>
                    <p className="text-sm text-cyan-300/70 mt-1">Try clearing search or changing the domain.</p>
                </div>
            ) : (
                <motion.div className="w-full flex flex-col gap-6" variants={wrapVariants} initial="hidden" animate="show">
                    {/* Masonry via CSS columns */}
                    <div className="w-full columns-1 sm:columns-2 lg:columns-3 gap-6 [column-fill:_balance]">
                        <AnimatePresence initial={false}>
                            {filteredSorted.map((entry, idx) => {
                                const isExpanded = expanded.has(idx);
                                const clickable = !!entry.hasLink;

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
                                    <motion.div
                                        key={`${entry.title}-${idx}`}
                                        variants={cardVariants}
                                        layout
                                        className="mb-6"
                                        style={{
                                            breakInside: "avoid",
                                            pageBreakInside: "avoid",
                                            WebkitColumnBreakInside: "avoid" as any,
                                        }}
                                    >
                                        <Wrapper
                                            {...wrapperProps}
                                            className={`group relative flex flex-col rounded-xl border border-cyan-900/40 bg-gradient-to-br from-[#0a161f] to-[#0e1e2b] shadow-[0_0_25px_rgba(0,255,255,0.10)] hover:shadow-[0_0_38px_rgba(0,255,255,0.22)] transition-all duration-300 p-4 overflow-hidden hover:-translate-y-0.5 ${clickable ? "cursor-pointer" : "cursor-default"
                                                }`}
                                        >
                                            <div className="w-full aspect-[16/9] mb-3 rounded-lg overflow-hidden bg-black/30 flex items-center justify-center">
                                                <SmartImage
                                                    companyId={companyId}
                                                    src={entry.image_url}
                                                    alt={entry.title}
                                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                />
                                            </div>

                                            <h3 className="text-lg font-semibold text-cyan-100 leading-snug mb-1">{entry.title}</h3>

                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {(entry.domains ?? []).map((domain: string, i: number) => {
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

                                            <p className={`text-sm text-cyan-100/80 mb-2 ${isExpanded ? "" : "line-clamp-3"}`}>{entry.content}</p>

                                            {entry.content && entry.content.length > 120 && (
                                                <div className="flex justify-end">
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
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default memo(NewsPane);
